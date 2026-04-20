"""
update_patterns.py  —  MK-806 Pattern Analysis Aggregator
==========================================================

Runs daily (cron / GitHub Action) after update_results.py.

What it does
────────────
1. Fetches all resolved predictions (WIN / LOSS / HALF_WIN / HALF_LOSS).
2. For each prediction, extracts:
     • confidence_score  (stored as 0.0 – 1.0 decimal)
     • EV               (parsed from the selection string via regex)
     • predicted_odds   (for average odds calculation)
3. Assigns a 2-part pattern label:
     Confidence bucket   ×   EV bucket   →  e.g. "HConf & H(+)EV"
4. Aggregates per label:
     total_predictions, wins, losses, win_rate, avg_odds
5. Assigns pattern_type:  WIN | LOSS | NEUTRAL | INSUFFICIENT_DATA
6. Upserts into pattern_analysis (one row per label).

Pattern label vocabulary
─────────────────────────
Confidence buckets (decimal 0–1):
    LConf  :  0.00 – 0.45
    AConf  :  0.46 – 0.54
    HConf  :  0.55 – 1.00

EV buckets:
    Positive:
        L(+)EV : 0.000 – 0.044
        A(+)EV : 0.045 – 0.054
        H(+)EV : ≥ 0.055
    Negative:
        H(-)EV : -0.044 – 0.000   (closest to zero)
        A(-)EV : -0.054 – -0.045
        L(-)EV : ≤ -0.055          (furthest from zero)

Total distinct labels: 3 × 6 = 18

Dependencies:
    pip install supabase python-dotenv
"""

import os
import re
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from supabase import create_client, Client


# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Environment ───────────────────────────────────────────────────────────────
load_dotenv()
SUPABASE_URL: str         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str = os.environ["SUPABASE_SERVICE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ── EV regex ──────────────────────────────────────────────────────────────────
# Matches "(EV=+0.043)" or "(EV=-0.012)" anywhere in the selection string
EV_PATTERN = re.compile(r"\(EV=([+-]?\d+\.\d+)\)")


# ─────────────────────────────────────────────────────────────────────────────
# Bucket helpers
# ─────────────────────────────────────────────────────────────────────────────

def confidence_bucket(score: float) -> str:
    """Map a confidence score (0–1) to a confidence label."""
    if score <= 0.45:
        return "LConf"
    elif score <= 0.54:
        return "AConf"
    else:
        return "HConf"


def ev_bucket(ev: float) -> str:
    """Map an EV value to an EV bucket label."""
    if ev >= 0:
        # Positive EV
        if ev < 0.045:
            return "L(+)EV"
        elif ev < 0.055:
            return "A(+)EV"
        else:
            return "H(+)EV"
    else:
        # Negative EV  (ev < 0)
        if ev > -0.045:
            return "H(-)EV"   # closest to zero → "High" (least negative)
        elif ev > -0.055:
            return "A(-)EV"
        else:
            return "L(-)EV"   # furthest from zero → "Low" (most negative)


def pattern_label(conf_score: float, ev: float) -> str:
    """Combine confidence and EV buckets into a single pattern label."""
    return f"{confidence_bucket(conf_score)} & {ev_bucket(ev)}"


def extract_ev(selection: str) -> Optional[float]:
    """
    Parse the EV value from a selection string.
    Returns None if no EV annotation is found (older predictions).
    """
    match = EV_PATTERN.search(selection)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Pattern type determination
# ─────────────────────────────────────────────────────────────────────────────

def determine_pattern_type(total: int, win_rate: float) -> str:
    if total < 5:
        return "INSUFFICIENT_DATA"
    elif win_rate >= 55.0:
        return "WIN"
    elif win_rate <= 45.0:
        return "LOSS"
    else:
        return "NEUTRAL"


# ─────────────────────────────────────────────────────────────────────────────
# Main aggregation
# ─────────────────────────────────────────────────────────────────────────────

def fetch_resolved_predictions():
    """Fetch all WIN / LOSS / HALF_WIN / HALF_LOSS predictions."""
    try:
        res = (
            supabase.table("predictions")
            .select("id, confidence_score, selection, predicted_odds, status")
            .in_("status", ["WIN", "LOSS", "HALF_WIN", "HALF_LOSS"])
            .execute()
        )
        logger.info("Fetched %d resolved predictions", len(res.data or []))
        return res.data or []
    except Exception as e:
        logger.error("Failed to fetch predictions: %s", e)
        return []


def aggregate_patterns(predictions: list) -> Dict[str, Dict[str, Any]]:
    """
    Group predictions by pattern label and compute aggregated stats.

    Returns a dict:  pattern_label → {total, wins, losses, avg_odds_sum, count_with_odds}
    """
    groups: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "total":           0,
        "wins":            0.0,
        "losses":          0.0,
        "odds_sum":        0.0,
        "odds_count":      0,
    })

    skipped = 0
    for pred in predictions:
        conf  = pred.get("confidence_score")
        sel   = pred.get("selection", "") or ""
        odds  = pred.get("predicted_odds")
        status = pred.get("status", "")

        # Both confidence and EV must be available
        if conf is None:
            skipped += 1
            continue

        ev = extract_ev(sel)
        if ev is None:
            # Predictions before v4 had no EV annotation — skip them
            skipped += 1
            continue

        label  = pattern_label(float(conf), ev)
        bucket = groups[label]

        bucket["total"] += 1

        if status == "WIN":
            bucket["wins"] += 1.0
        elif status == "HALF_WIN":
            bucket["wins"] += 0.5
        elif status == "LOSS":
            bucket["losses"] += 1.0
        elif status == "HALF_LOSS":
            bucket["losses"] += 0.5

        if odds is not None:
            bucket["odds_sum"]   += float(odds)
            bucket["odds_count"] += 1

    if skipped:
        logger.info("Skipped %d predictions (missing conf or EV)", skipped)

    return dict(groups)


def build_upsert_rows(groups: Dict[str, Dict[str, Any]]) -> list:
    """Convert aggregated groups into Supabase upsert rows."""
    rows = []
    now  = datetime.now(timezone.utc).isoformat()

    for label, stats in groups.items():
        total  = stats["total"]
        wins   = stats["wins"]
        losses = stats["losses"]

        win_rate = round((wins / total) * 100, 2) if total > 0 else 0.0
        avg_odds = (
            round(stats["odds_sum"] / stats["odds_count"], 2)
            if stats["odds_count"] > 0 else 0.0
        )
        ptype = determine_pattern_type(total, win_rate)

        rows.append({
            "pattern_label":     label,
            "total_predictions": total,
            "wins":              wins,
            "losses":            losses,
            "win_rate":          win_rate,
            "pattern_type":      ptype,
            "avg_odds":          avg_odds,
            "updated_at":        now,
        })

        logger.info(
            "  %-30s  total=%3d  wins=%-5.1f  losses=%-5.1f  "
            "win_rate=%5.1f%%  type=%-18s  avg_odds=%.2f",
            label, total, wins, losses, win_rate, ptype, avg_odds,
        )

    return rows


def upsert_patterns(rows: list) -> None:
    """Upsert all pattern rows into Supabase (conflict on pattern_label)."""
    if not rows:
        logger.warning("No pattern rows to upsert — nothing to write")
        return

    try:
        supabase.table("pattern_analysis").upsert(
            rows, on_conflict="pattern_label"
        ).execute()
        logger.info("Upserted %d pattern rows into pattern_analysis", len(rows))
    except Exception as e:
        logger.error("Upsert failed: %s", e)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    logger.info("═══ MK-806 Pattern Aggregator starting ═══")

    predictions = fetch_resolved_predictions()
    if not predictions:
        logger.warning("No resolved predictions found — exiting")
        return

    logger.info("Aggregating patterns…")
    groups = aggregate_patterns(predictions)
    logger.info("Distinct pattern labels found: %d", len(groups))

    rows = build_upsert_rows(groups)
    upsert_patterns(rows)

    logger.info("═══ Pattern Aggregator complete (%d patterns) ═══", len(rows))


if __name__ == "__main__":
    main()