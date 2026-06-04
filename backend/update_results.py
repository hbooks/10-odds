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
FOOTBALL_DATA_API_KEY: str = os.environ.get(
    "FOOTBALL_DATA_API_KEY_H",
    os.environ.get("FOOTBALL_DATA_API_KEY_H", ""),
)
BSD_API_KEY: str = os.environ.get("BSD_API", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
FD_HEADERS         = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}

# BSD API (same as in main pipeline)
BSD_API_BASE    = "https://sports.bzzoiro.com/api/v2"
BSD_API_HEADERS = {"Authorization": f"Token {BSD_API_KEY}"}
BSD_FRIENDLY_COMPETITION_ID = 31
BSD_TEAM_ID_OFFSET = 9_000_000

# League competition IDs
LEAGUE_COMPETITION_IDS = "2021,2014,2019,2002,2015"

# International competition IDs (WC, Euro)
INTL_COMPETITION_IDS = "2000,2018"

# Rate‑limit control
REQUEST_DELAY = 7.0
MAX_RETRIES   = 3
RETRY_DELAY   = 15.0


# ══════════════════════════════════════════════════════════════════════════════
# TEAM-NAME FUZZY MATCHING
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
    Find a match in the API response (either Football-Data or BSD) by team names + date.
    Date tolerance is ±1 day to handle UTC vs local‑time differences.
    """
    try:
        target_date = datetime.strptime(match_date_str, "%Y-%m-%d").date()
    except ValueError:
        return None

    for m in api_matches:
        # Different APIs store team names in different fields
        if "homeTeam" in m:   # Football-Data format
            api_home = m.get("homeTeam", {}).get("name", "")
            api_away = m.get("awayTeam", {}).get("name", "")
        else:                  # BSD format (already normalised)
            api_home = m.get("home_team", "")
            api_away = m.get("away_team", "")

        api_date_str = (m.get("utcDate") or m.get("event_date") or "")[:10]
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
# RESULT NORMALISATION (Football-Data & BSD → flat dict)
# ══════════════════════════════════════════════════════════════════════════════

def _normalise_api_match(api_match: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract result fields from either a Football-Data or BSD match object.
    Returns None if the match is not finished or scores are missing.
    """
    # Football-Data format
    if "status" in api_match and api_match.get("status") == "FINISHED":
        score = api_match.get("score", {})
        ft = score.get("fullTime", {})
        home_score = ft.get("home")
        away_score = ft.get("away")
        winner = score.get("winner")
        if home_score is not None and away_score is not None:
            return {
                "status": "FINISHED",
                "home_score": int(home_score),
                "away_score": int(away_score),
                "winner": winner,
            }

    # BSD format
    if api_match.get("status") == "FINISHED":
        home_score = api_match.get("home_score")
        away_score = api_match.get("away_score")
        if home_score is not None and away_score is not None:
            winner = None
            if home_score > away_score:
                winner = "HOME_TEAM"
            elif away_score > home_score:
                winner = "AWAY_TEAM"
            else:
                winner = "DRAW"
            return {
                "status": "FINISHED",
                "home_score": int(home_score),
                "away_score": int(away_score),
                "winner": winner,
            }

    return None


# ══════════════════════════════════════════════════════════════════════════════
# RESULT DETERMINATION (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

def determine_result(
    bet_type: str,
    match: Dict[str, Any],
) -> str:
    home_score  = match["home_score"]
    away_score  = match["away_score"]
    winner      = match["winner"]
    total_goals = home_score + away_score

    if bet_type == "HOME_WIN":
        return "WIN" if winner == "HOME_TEAM" else "LOSS"
    if bet_type == "AWAY_WIN":
        return "WIN" if winner == "AWAY_TEAM" else "LOSS"
    if bet_type == "DRAW":
        return "WIN" if winner == "DRAW" else "LOSS"

    if bet_type.startswith("OVER_"):
        try:
            line = float(bet_type[5:])
        except ValueError:
            return "PENDING"
        if total_goals > line:   return "WIN"
        if total_goals == line:  return "VOID"
        return "LOSS"

    if bet_type.startswith("UNDER_"):
        try:
            line = float(bet_type[6:])
        except ValueError:
            return "PENDING"
        if total_goals < line:   return "WIN"
        if total_goals == line:  return "VOID"
        return "LOSS"

    if bet_type == "BTTS_YES":
        return "WIN" if (home_score > 0 and away_score > 0) else "LOSS"
    if bet_type == "BTTS_NO":
        return "WIN" if (home_score == 0 or away_score == 0) else "LOSS"

    if bet_type.startswith("TOTAL_GOALS_"):
        try:
            target = int(bet_type[12:])
        except ValueError:
            return "PENDING"
        return "WIN" if total_goals == target else "LOSS"

    if bet_type.startswith("CORRECT_SCORE_"):
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
# API FETCHING (with retry)
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


def fetch_bsd_finished_fixtures_for_date(date_str: str) -> List[Dict[str, Any]]:
    """
    Fetch finished international friendlies from BSD API for a given date.
    Returns a list of matches in a normalised dict (similar to Football-Data).
    """
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    date_from = date_obj.strftime("%Y-%m-%d")
    date_to = (date_obj + timedelta(days=1)).strftime("%Y-%m-%d")

    url = f"{BSD_API_BASE}/events/"
    params = {
        "league_id": BSD_FRIENDLY_COMPETITION_ID,
        "date_from": date_from,
        "date_to": date_to,
        "status": "finished",
    }

    try:
        resp = requests.get(url, headers=BSD_API_HEADERS, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if not isinstance(results, list):
            return []

        # Normalise BSD fixtures to a common shape
        normalised = []
        for m in results:
            # Only take finished matches
            if m.get("status") != "finished":
                continue
            # Build a dict that _find_api_match can understand
            # We'll keep BSD-specific fields as well as the ones used for matching
            norm = {
                "id": int(m.get("id", 0)) + BSD_TEAM_ID_OFFSET,
                "home_team": m.get("home_team", ""),
                "away_team": m.get("away_team", ""),
                "event_date": m.get("event_date", ""),
                "status": "FINISHED",
                "home_score": m.get("home_score"),
                "away_score": m.get("away_score"),
                "competition_id": BSD_FRIENDLY_COMPETITION_ID,
            }
            normalised.append(norm)
        logger.info("BSD finished friendlies for %s: %d matches", date_str, len(normalised))
        return normalised
    except Exception as e:
        logger.error("BSD finished fetch failed for %s: %s", date_str, e)
        return []


def fetch_finished_matches_for_date(date_str: str) -> List[Dict[str, Any]]:
    """
    Fetch all FINISHED matches for a date window from:
      1. Football-Data.org (leagues + international comps + friendlies)
      2. BSD API (international friendlies not covered by Football-Data)
    Results are deduplicated by match ID across both sources.
    """
    date_obj  = datetime.strptime(date_str, "%Y-%m-%d")
    date_next = (date_obj + timedelta(days=1)).strftime("%Y-%m-%d")
    all_matches: List[Dict[str, Any]] = []
    seen_ids: set = set()

    # -- 1. League competitions --------------------------------------------------
    data = _fetch_with_retry(
        f"{FOOTBALL_DATA_BASE}/matches",
        {
            "dateFrom":     date_str,
            "dateTo":       date_next,
            "status":       "FINISHED",
            "competitions": LEAGUE_COMPETITION_IDS,
        },
    )
    if data:
        for m in data.get("matches", []):
            if m["id"] not in seen_ids:
                all_matches.append(m)
                seen_ids.add(m["id"])
        logger.info("League fetch: %d FINISHED matches for %s", len(data.get("matches", [])), date_str)
    else:
        logger.warning("League fetch returned no data for %s", date_str)

    time.sleep(REQUEST_DELAY)

    # -- 2. International competitions (WC, Euro) --------------------------------
    data = _fetch_with_retry(
        f"{FOOTBALL_DATA_BASE}/matches",
        {
            "dateFrom":     date_str,
            "dateTo":       date_next,
            "status":       "FINISHED",
            "competitions": INTL_COMPETITION_IDS,
        },
    )
    if data:
        intl_new = 0
        for m in data.get("matches", []):
            if m["id"] not in seen_ids:
                all_matches.append(m)
                seen_ids.add(m["id"])
                intl_new += 1
        logger.info("International fetch (WC/EC): %d new FINISHED matches", intl_new)
    else:
        logger.warning("International competition fetch returned no data for %s", date_str)

    time.sleep(REQUEST_DELAY)

    # -- 3. International Friendlies via Football-Data (broad call) --------------
    data = _fetch_with_retry(
        f"{FOOTBALL_DATA_BASE}/matches",
        {
            "dateFrom": date_str,
            "dateTo":   date_next,
            "status":   "FINISHED",
        },
    )
    if data:
        friendly_new = 0
        for m in data.get("matches", []):
            if m["id"] in seen_ids:
                continue
            comp = m.get("competition", {})
            is_friendly = (
                comp.get("type") == "FRIENDLY" or
                "friendly" in comp.get("name", "").lower() or
                comp.get("code") == "IF"
            )
            area_name = m.get("area", {}).get("name", "")
            is_intl = (
                area_name in ("World", "International") or
                comp.get("name", "").lower().startswith("international")
            )
            if is_friendly and is_intl:
                all_matches.append(m)
                seen_ids.add(m["id"])
                friendly_new += 1
        logger.info("Football-Data friendly fetch: %d new FINISHED matches", friendly_new)
    else:
        logger.warning("Broad fetch (friendlies) returned no data for %s", date_str)

    # -- 4. BSD International Friendlies (fallback for those not in Football-Data) --
    bsd_matches = fetch_bsd_finished_fixtures_for_date(date_str)
    for m in bsd_matches:
        # BSD uses a custom ID (offset) – we need to use that as unique identifier
        if m["id"] not in seen_ids:
            all_matches.append(m)
            seen_ids.add(m["id"])

    logger.info(
        "Total FINISHED matches for %s: %d (all sources combined)",
        date_str, len(all_matches),
    )
    return all_matches


# ══════════════════════════════════════════════════════════════════════════════
# SLIP STATUS UPDATER (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

def _update_slip_status_for_date(slip_date_str: str) -> None:
    try:
        slip_res = (supabase.table("ten_odds_slips")
                    .select("id, status")
                    .eq("slip_date", slip_date_str)
                    .execute())
        if not slip_res.data:
            return

        for slip in slip_res.data:
            if slip["status"] != "PENDING":
                continue
            slip_id = slip["id"]
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
                continue
            if any(s == "LOSS" for s in statuses):
                new_status = "LOSS"
            elif all(s == "WIN" for s in statuses):
                new_status = "WIN"
            elif all(s == "VOID" for s in statuses):
                new_status = "VOID"
            else:
                new_status = "WIN" if all(s in ("WIN", "VOID", "HALF_WIN") for s in statuses) else "LOSS"

            supabase.table("ten_odds_slips").update({"status": new_status}).eq("id", slip_id).execute()
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
    for pred in predictions:
        match_id = pred["match_id"]
        pred_id  = pred["id"]
        bet_type = pred.get("bet_type", "")

        # Get team names from our DB
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

        # Find result in API response (handles both Football-Data and BSD)
        api_match = _find_api_match(api_matches, home_name, away_name, match_date_str)
        if not api_match:
            logger.info(
                "Match %s vs %s not in FINISHED API results for %s — still PENDING",
                home_name, away_name, match_date_str,
            )
            continue

        result = _normalise_api_match(api_match)
        if not result:
            logger.info(
                "Match %s vs %s not fully reported yet (scores null) — skipping",
                home_name, away_name,
            )
            continue

        # Update match row in DB
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

        # Evaluate and update prediction
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
    logger.info("═══ MK-806 Result Updater v6 (BSD friendlies included) starting ═══")

    # Fetch all PENDING predictions
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

    # Group by UTC date
    by_date: Dict[str, List[Dict[str, Any]]] = {}
    for pred in predictions:
        match_meta = pred.get("matches")
        if not match_meta:
            logger.warning("Prediction %s has no match metadata — skipping", pred["id"])
            continue
        utc_date = match_meta["utc_date"][:10]
        by_date.setdefault(utc_date, []).append(pred)

    unique_dates = sorted(by_date.keys())
    logger.info("Processing %d unique date(s): %s", len(unique_dates), unique_dates)

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
            logger.warning("No FINISHED matches from any API for %s — skipping updates", date_str)

        if idx < len(unique_dates) - 1:
            logger.info("Waiting %.0fs before next date request…", REQUEST_DELAY)
            time.sleep(REQUEST_DELAY)

    logger.info("═══ MK-806 Result Updater v6 complete ═══")


if __name__ == "__main__":
    main()