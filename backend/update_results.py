"""
update_results.py — MK-806 Result Updater (v5 — fixed)
=======================================================

What this script does
─────────────────────
1. Fetches all PENDING predictions from the DB (with match + team join).
2. Groups them by match date (UTC).
3. For each date, calls Football-Data.org /matches?status=FINISHED for a
   widened window (date → date+1) to catch late-UTC kick-offs.
4. Matches API results to our stored matches using TEAM NAMES + date proximity
   (never relies on ID equality across APIs).
5. Updates matches.home_score / away_score / winner / status.
6. Evaluates every bet type against the actual result and writes
   predictions.status = WIN | LOSS | HALF_WIN | HALF_LOSS | VOID.

Bug fixes vs original v5
─────────────────────────
• determine_result() previously received the raw API match dict but tested
  keys that only exist after normalisation (home_score, winner etc.).
  Fixed: we normalise the API response into a flat dict BEFORE calling it.
• API dict key spellings corrected: score.fullTime.home/away, score.winner.
• Added null-guard: skip if fullTime scores are None (match not fully reported).
• Added rate-limit retry logic (HTTP 429).
• Slip status update: after all predictions for a slip date are resolved,
  update ten_odds_slips.status to WIN/LOSS based on whether ALL picks won.
"""

import os
import logging
import time
import requests

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client


# ══════════════════════════════════════════════════════════════════════════════
# LOGGING
# ══════════════════════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# ENVIRONMENT & CLIENTS
# ══════════════════════════════════════════════════════════════════════════════

load_dotenv()
SUPABASE_URL: str          = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str  = os.environ["SUPABASE_SERVICE_KEY"]
# Note: use a separate key env var so you can rotate independently
FOOTBALL_DATA_API_KEY: str = os.environ.get(
    "FOOTBALL_DATA_API_KEY_H",
    os.environ.get("FOOTBALL_DATA_API_KEY_H", ""),   # fallback to main key
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
FD_HEADERS         = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}

# Tracked competition IDs (PL, La Liga, Serie A, Bundesliga, Ligue 1)
COMPETITION_IDS = "2021,2014,2019,2002,2015"

# Football-Data.org free tier: 10 req/min — wait 7 s between calls to be safe
REQUEST_DELAY = 7.0

# Max retries on HTTP 429 (rate limit)
MAX_RETRIES   = 3
RETRY_DELAY   = 15.0


# ══════════════════════════════════════════════════════════════════════════════
# TEAM-NAME FUZZY MATCHING  (mirrors main pipeline)
# ══════════════════════════════════════════════════════════════════════════════

def _normalise(name: str) -> str:
    """Lowercase + strip common club suffixes for fuzzy comparison."""
    strips = [
        " fc", " cf", " afc", " sc", " united", " city",
        "manchester ", "brighton & hove ", "wolverhampton ",
    ]
    n = name.lower().strip()
    for s in strips:
        n = n.replace(s, "")
    return n.strip()


def _team_names_match(a: str, b: str) -> bool:
    na, nb = _normalise(a), _normalise(b)
    return na == nb or na in nb or nb in na


def _find_api_match(
    api_matches: List[Dict[str, Any]],
    home_name: str,
    away_name: str,
    match_date_str: str,
) -> Optional[Dict[str, Any]]:
    """
    Find a match in the Football-Data API response by team names + date.
    Date tolerance is ±1 day to handle UTC vs local-time differences.
    """
    try:
        target_date = datetime.strptime(match_date_str, "%Y-%m-%d").date()
    except ValueError:
        return None

    for m in api_matches:
        api_home = m.get("homeTeam", {}).get("name", "")
        api_away = m.get("awayTeam", {}).get("name", "")
        api_date_str = (m.get("utcDate") or "")[:10]

        try:
            api_date = datetime.strptime(api_date_str, "%Y-%m-%d").date()
        except ValueError:
            continue

        if abs((api_date - target_date).days) > 1:
            continue

        if _team_names_match(home_name, api_home) and _team_names_match(away_name, api_away):
            return m

    return None


# ══════════════════════════════════════════════════════════════════════════════
# RESULT NORMALISATION  (API dict → flat result dict)
# ══════════════════════════════════════════════════════════════════════════════

def _normalise_api_match(api_match: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract the fields we care about from a raw Football-Data.org match object
    into a flat, typed dict.  Returns None if the match is not yet fully reported.

    Raw structure:
        {
          "status": "FINISHED",
          "score": {
            "winner": "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null,
            "fullTime": {"home": 2, "away": 1}
          },
          ...
        }
    """
    if api_match.get("status") != "FINISHED":
        return None

    score = api_match.get("score", {})
    ft    = score.get("fullTime", {})

    home_score = ft.get("home")
    away_score = ft.get("away")

    if home_score is None or away_score is None:
        return None  # scores not yet reported

    return {
        "status":     "FINISHED",
        "home_score": int(home_score),
        "away_score": int(away_score),
        "winner":     score.get("winner"),   # "HOME_TEAM" | "AWAY_TEAM" | "DRAW"
    }


# ══════════════════════════════════════════════════════════════════════════════
# RESULT DETERMINATION
# ══════════════════════════════════════════════════════════════════════════════

def determine_result(
    bet_type: str,
    match: Dict[str, Any],   # normalised flat dict from _normalise_api_match()
) -> str:
    """
    Determine the outcome of a single prediction given the actual result.

    Returns one of: WIN | LOSS | HALF_WIN | HALF_LOSS | VOID | PENDING

    Supported bet types
    ───────────────────
    1X2:              HOME_WIN, DRAW, AWAY_WIN
    Over/Under:       OVER_X.X, UNDER_X.X  (e.g. OVER_2.5, UNDER_1.5)
    BTTS:             BTTS_YES, BTTS_NO
    Exact goals:      TOTAL_GOALS_N         (e.g. TOTAL_GOALS_3)
    Correct score:    CORRECT_SCORE_H_A     (e.g. CORRECT_SCORE_2_1)
    """
    home_score  = match["home_score"]
    away_score  = match["away_score"]
    winner      = match["winner"]        # "HOME_TEAM" | "AWAY_TEAM" | "DRAW"
    total_goals = home_score + away_score

    # ── 1X2 ───────────────────────────────────────────────────────────────
    if bet_type == "HOME_WIN":
        return "WIN" if winner == "HOME_TEAM" else "LOSS"

    if bet_type == "AWAY_WIN":
        return "WIN" if winner == "AWAY_TEAM" else "LOSS"

    if bet_type == "DRAW":
        return "WIN" if winner == "DRAW" else "LOSS"

    # ── Over / Under ──────────────────────────────────────────────────────
    if bet_type.startswith("OVER_"):
        try:
            line = float(bet_type[5:])    # "OVER_2.5" → 2.5
        except ValueError:
            return "PENDING"
        if total_goals > line:   return "WIN"
        if total_goals == line:  return "VOID"   # can't happen with .5 lines but safe
        return "LOSS"

    if bet_type.startswith("UNDER_"):
        try:
            line = float(bet_type[6:])   # "UNDER_2.5" → 2.5
        except ValueError:
            return "PENDING"
        if total_goals < line:   return "WIN"
        if total_goals == line:  return "VOID"
        return "LOSS"

    # ── Both Teams to Score ───────────────────────────────────────────────
    if bet_type == "BTTS_YES":
        return "WIN" if (home_score > 0 and away_score > 0) else "LOSS"

    if bet_type == "BTTS_NO":
        return "WIN" if (home_score == 0 or away_score == 0) else "LOSS"

    # ── Exact Total Goals ─────────────────────────────────────────────────
    if bet_type.startswith("TOTAL_GOALS_"):
        try:
            target = int(bet_type[12:])   # "TOTAL_GOALS_3" → 3
        except ValueError:
            return "PENDING"
        return "WIN" if total_goals == target else "LOSS"

    # ── Correct Score ─────────────────────────────────────────────────────
    if bet_type.startswith("CORRECT_SCORE_"):
        # Format: CORRECT_SCORE_H_A  e.g. CORRECT_SCORE_2_1
        parts = bet_type.split("_")
        if len(parts) == 4:
            try:
                pred_home = int(parts[2])
                pred_away = int(parts[3])
                return "WIN" if (home_score == pred_home and away_score == pred_away) else "LOSS"
            except ValueError:
                return "PENDING"

    logger.warning("Unknown bet_type '%s' — leaving PENDING", bet_type)
    return "PENDING"


# ══════════════════════════════════════════════════════════════════════════════
# API FETCHING  (with rate-limit retry)
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_with_retry(url: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """GET with up to MAX_RETRIES retries on 429 or network errors."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, headers=FD_HEADERS, params=params, timeout=15)
            if resp.status_code == 429:
                logger.warning(
                    "Rate limited (429) on attempt %d/%d — waiting %.0fs",
                    attempt, MAX_RETRIES, RETRY_DELAY,
                )
                time.sleep(RETRY_DELAY)
                continue
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            logger.error("Request error attempt %d/%d: %s", attempt, MAX_RETRIES, e)
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY)
    return None


def fetch_finished_matches_for_date(date_str: str) -> List[Dict[str, Any]]:
    """
    Fetch all FINISHED matches for a date window from Football-Data.org.

    Uses dateFrom=date, dateTo=date+1 to catch matches that kick off late
    in UTC or whose final score is reported a few hours after midnight.
    """
    date_obj  = datetime.strptime(date_str, "%Y-%m-%d")
    date_next = (date_obj + timedelta(days=1)).strftime("%Y-%m-%d")

    data = _fetch_with_retry(
        f"{FOOTBALL_DATA_BASE}/matches",
        {
            "dateFrom":     date_str,
            "dateTo":       date_next,
            "status":       "FINISHED",
            "competitions": COMPETITION_IDS,
        },
    )
    if not data:
        logger.error("No data returned for date %s", date_str)
        return []

    matches = data.get("matches", [])
    logger.info("Fetched %d FINISHED matches for %s → %s", len(matches), date_str, date_next)
    return matches


# ══════════════════════════════════════════════════════════════════════════════
# SLIP STATUS UPDATER
# ══════════════════════════════════════════════════════════════════════════════

def _update_slip_status_for_date(slip_date_str: str) -> None:
    """
    After updating all predictions for a date, check if any slip for that date
    should be closed.

    A slip is:
      WIN   — ALL its picks are WIN
      LOSS  — ANY pick is LOSS (even one LOSS kills the accumulator)
      VOID  — all picks are VOID
      else  — leave PENDING (some picks still unresolved)
    """
    try:
        # Find the slip for this date
        slip_res = (supabase.table("ten_odds_slips")
                    .select("id, status")
                    .eq("slip_date", slip_date_str)
                    .execute())
        if not slip_res.data:
            return

        for slip in slip_res.data:
            if slip["status"] != "PENDING":
                continue   # already resolved

            slip_id = slip["id"]

            # Get all pick statuses for this slip
            picks_res = (supabase.table("slip_picks")
                         .select("prediction_id")
                         .eq("slip_id", slip_id)
                         .execute())
            pick_ids = [p["prediction_id"] for p in (picks_res.data or [])]
            if not pick_ids:
                continue

            pred_res = (supabase.table("predictions")
                        .select("status")
                        .in_("id", pick_ids)
                        .execute())
            statuses = [p["status"] for p in (pred_res.data or [])]

            if any(s == "PENDING" for s in statuses):
                continue   # not all resolved yet

            if any(s == "LOSS" for s in statuses):
                new_status = "LOSS"
            elif all(s == "WIN" for s in statuses):
                new_status = "WIN"
            elif all(s == "VOID" for s in statuses):
                new_status = "VOID"
            else:
                # Mix of WIN / VOID / HALF_WIN etc.
                new_status = "WIN" if all(s in ("WIN", "VOID", "HALF_WIN") for s in statuses) else "LOSS"

            supabase.table("ten_odds_slips").update(
                {"status": new_status}
            ).eq("id", slip_id).execute()
            logger.info("Slip %s (%s) → %s", slip_id, slip_date_str, new_status)

    except Exception as e:
        logger.error("Slip status update for %s: %s", slip_date_str, e)


# ══════════════════════════════════════════════════════════════════════════════
# PREDICTION UPDATE ORCHESTRATION
# ══════════════════════════════════════════════════════════════════════════════

def update_predictions_for_date(
    predictions: List[Dict[str, Any]],
    api_matches: List[Dict[str, Any]],
    match_date_str: str,
) -> None:
    """
    For every PENDING prediction on a given date:
      1. Look up its match in our DB (for team names).
      2. Find the corresponding match in the API response.
      3. Normalise the API response into a flat result dict.
      4. Update matches table with final score.
      5. Evaluate prediction outcome and update predictions.status.
    """
    for pred in predictions:
        match_id = pred["match_id"]
        pred_id  = pred["id"]
        bet_type = pred.get("bet_type", "")

        # ── 1. Get team names from our DB ─────────────────────────────────
        try:
            m_res = (supabase.table("matches")
                     .select(
                         "id, utc_date, "
                         "home_team:teams!matches_home_team_id_fkey(name), "
                         "away_team:teams!matches_away_team_id_fkey(name)"
                     )
                     .eq("id", match_id)
                     .single()
                     .execute())
            stored = m_res.data
        except Exception as e:
            logger.error("DB match lookup %s: %s", match_id, e)
            continue

        if not stored:
            logger.warning("Match %s not found in DB — skipping prediction %s", match_id, pred_id)
            continue

        home_name = stored["home_team"]["name"]
        away_name = stored["away_team"]["name"]

        # ── 2. Find result in API response ────────────────────────────────
        api_match = _find_api_match(api_matches, home_name, away_name, match_date_str)
        if not api_match:
            logger.info(
                "Match %s vs %s not in FINISHED API results for %s — still PENDING",
                home_name, away_name, match_date_str,
            )
            continue

        # ── 3. Normalise API response ─────────────────────────────────────
        result = _normalise_api_match(api_match)
        if not result:
            logger.info(
                "Match %s vs %s not fully reported yet (scores null) — skipping",
                home_name, away_name,
            )
            continue

        # ── 4. Update match row in DB ─────────────────────────────────────
        try:
            supabase.table("matches").update({
                "status":     result["status"],
                "home_score": result["home_score"],
                "away_score": result["away_score"],
                "winner":     result["winner"],
            }).eq("id", match_id).execute()
            logger.debug(
                "Match %s updated: %s %d–%d %s",
                match_id, home_name, result["home_score"], result["away_score"], away_name,
            )
        except Exception as e:
            logger.error("Match update %s: %s", match_id, e)

        # ── 5. Evaluate and update prediction ────────────────────────────
        new_status = determine_result(bet_type, result)
        if new_status != "PENDING":
            try:
                supabase.table("predictions").update({
                    "status":             new_status,
                    "result_recorded_at": datetime.utcnow().isoformat(),
                }).eq("id", pred_id).execute()
                logger.info(
                    "Prediction %s [%s] %s vs %s → %s",
                    pred_id, bet_type, home_name, away_name, new_status,
                )
            except Exception as e:
                logger.error("Prediction update %s: %s", pred_id, e)
        else:
            logger.info(
                "Prediction %s [%s] still PENDING (match not finished or unknown bet type)",
                pred_id, bet_type,
            )


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    logger.info("═══ MK-806 Result Updater v5 (fixed) starting ═══")

    # ── 1. Fetch all PENDING predictions with their match date ────────────
    try:
        pred_res = (supabase.table("predictions")
                    .select("id, match_id, bet_type, matches(utc_date)")
                    .eq("status", "PENDING")
                    .execute())
        predictions = pred_res.data or []
    except Exception as e:
        logger.error("Failed to fetch PENDING predictions: %s", e)
        return

    if not predictions:
        logger.info("No PENDING predictions found — nothing to do.")
        return

    logger.info("Found %d PENDING predictions", len(predictions))

    # ── 2. Group by UTC date ──────────────────────────────────────────────
    by_date: Dict[str, List[Dict[str, Any]]] = {}
    for pred in predictions:
        match_meta = pred.get("matches")
        if not match_meta:
            logger.warning("Prediction %s has no match metadata — skipping", pred["id"])
            continue
        utc_date = match_meta["utc_date"][:10]   # YYYY-MM-DD
        by_date.setdefault(utc_date, []).append(pred)

    unique_dates = sorted(by_date.keys())
    logger.info("Processing %d unique date(s): %s", len(unique_dates), unique_dates)

    # ── 3. Process each date ──────────────────────────────────────────────
    for idx, date_str in enumerate(unique_dates):
        logger.info(
            "─── Date %s (%d/%d) — %d predictions",
            date_str, idx + 1, len(unique_dates), len(by_date[date_str]),
        )

        api_matches = fetch_finished_matches_for_date(date_str)

        if api_matches:
            update_predictions_for_date(by_date[date_str], api_matches, date_str)
            _update_slip_status_for_date(date_str)
        else:
            logger.warning("No FINISHED matches from API for %s — skipping updates", date_str)

        # Rate-limit courtesy delay (skip after last date)
        if idx < len(unique_dates) - 1:
            logger.info("Waiting %.0fs before next date request…", REQUEST_DELAY)
            time.sleep(REQUEST_DELAY)

    logger.info("═══ MK-806 Result Updater v5 complete ═══")


if __name__ == "__main__":
    main()