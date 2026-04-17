"""
update_results.py — MK-806 Result Updater (v6 — Fallback to ID fetch)
========================================================================
- Groups PENDING predictions by date (UTC).
- Fetches FINISHED matches via bulk date query (efficient).
- If a match isn't found, falls back to fetching by match ID (guaranteed).
- Updates prediction statuses: WIN / LOSS / HALF_WIN / HALF_LOSS / VOID.
"""

import os
import logging
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
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
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str = os.environ["SUPABASE_SERVICE_KEY"]
FOOTBALL_DATA_API_KEY_H: str = os.environ["FOOTBALL_DATA_API_KEY_H"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
FD_HEADERS = {"X-Auth-Token": FOOTBALL_DATA_API_KEY_H}

# Competition IDs for the 5 leagues we track
COMPETITION_IDS = "2021,2014,2019,2002,2015"

# Rate limiting: 10 requests per minute max → wait 7 seconds between calls
REQUEST_DELAY = 7.0


# ──────────────────────────────────────────────────────────────────────────────
# Team‑name matching
# ──────────────────────────────────────────────────────────────────────────────

def _normalise(name: str) -> str:
    replacements = [
        " fc", " cf", " afc", " sc", " united", " city",
        "manchester ", "brighton & hove ", "wolverhampton ",
    ]
    n = name.lower().strip()
    for r in replacements:
        n = n.replace(r, "")
    return n.strip()


def _team_names_match(a: str, b: str) -> bool:
    na, nb = _normalise(a), _normalise(b)
    return na == nb or na in nb or nb in na


def find_match_by_teams(
    api_matches: List[Dict[str, Any]],
    home_team_name: str,
    away_team_name: str,
    match_date_str: str,
) -> Optional[Dict[str, Any]]:
    match_date = datetime.strptime(match_date_str, "%Y-%m-%d").date()
    for m in api_matches:
        api_home = m.get("homeTeam", {}).get("name", "")
        api_away = m.get("awayTeam", {}).get("name", "")
        api_date_str = m.get("utcDate", "")[:10]
        try:
            api_date = datetime.strptime(api_date_str, "%Y-%m-%d").date()
        except ValueError:
            continue
        if abs((api_date - match_date).days) > 1:
            continue
        if _team_names_match(home_team_name, api_home) and _team_names_match(away_team_name, api_away):
            return m
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Result determination
# ──────────────────────────────────────────────────────────────────────────────

def determine_result(prediction: Dict[str, Any], match: Dict[str, Any]) -> str:
    if match.get("status") != "FINISHED":
        return "PENDING"

    home_score = match.get("home_score")
    away_score = match.get("away_score")
    if home_score is None or away_score is None:
        return "PENDING"

    bet_type = prediction["bet_type"]
    actual_winner = match.get("winner")
    total_goals = home_score + away_score

    if bet_type == "HOME_WIN":
        return "WIN" if actual_winner == "HOME_TEAM" else "LOSS"
    elif bet_type == "AWAY_WIN":
        return "WIN" if actual_winner == "AWAY_TEAM" else "LOSS"
    elif bet_type == "DRAW":
        return "WIN" if actual_winner == "DRAW" else "LOSS"

    if bet_type.startswith("OVER_"):
        try:
            line = float(bet_type.replace("OVER_", ""))
            if total_goals > line: return "WIN"
            elif total_goals == line: return "VOID"
            else: return "LOSS"
        except ValueError:
            return "PENDING"

    if bet_type.startswith("UNDER_"):
        try:
            line = float(bet_type.replace("UNDER_", ""))
            if total_goals < line: return "WIN"
            elif total_goals == line: return "VOID"
            else: return "LOSS"
        except ValueError:
            return "PENDING"

    if bet_type == "BTTS_YES":
        return "WIN" if (home_score > 0 and away_score > 0) else "LOSS"
    if bet_type == "BTTS_NO":
        return "WIN" if (home_score == 0 or away_score == 0) else "LOSS"

    if bet_type.startswith("TOTAL_GOALS_"):
        try:
            target = int(bet_type.replace("TOTAL_GOALS_", ""))
            return "WIN" if total_goals == target else "LOSS"
        except ValueError:
            return "PENDING"

    if bet_type.startswith("CORRECT_SCORE_"):
        parts = bet_type.split("_")
        if len(parts) == 4:
            try:
                pred_home = int(parts[2])
                pred_away = int(parts[3])
                return "WIN" if (home_score == pred_home and away_score == pred_away) else "LOSS"
            except ValueError:
                return "PENDING"

    logger.warning(f"Unknown bet_type '{bet_type}' for prediction {prediction['id']}")
    return "PENDING"


# ──────────────────────────────────────────────────────────────────────────────
# API fetching
# ──────────────────────────────────────────────────────────────────────────────

def fetch_finished_matches_by_date(date_str: str) -> List[Dict[str, Any]]:
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    date_next = (date_obj + timedelta(days=1)).strftime("%Y-%m-%d")
    url = f"{FOOTBALL_DATA_BASE}/matches"
    params = {
        "dateFrom": date_str,
        "dateTo": date_next,
        "status": "FINISHED",
        "competitions": COMPETITION_IDS,
    }
    try:
        resp = requests.get(url, headers=FD_HEADERS, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        matches = data.get("matches", [])
        logger.info(f"Bulk fetch: {len(matches)} FINISHED matches for {date_str} → {date_next}")
        return matches
    except Exception as e:
        logger.error(f"Bulk fetch failed for {date_str}: {e}")
        return []


def fetch_match_by_id(match_id: int) -> Optional[Dict[str, Any]]:
    """Fallback: fetch a single match by its ID."""
    url = f"{FOOTBALL_DATA_BASE}/matches/{match_id}"
    try:
        resp = requests.get(url, headers=FD_HEADERS, timeout=10)
        resp.raise_for_status()
        match = resp.json()
        logger.info(f"ID fetch: match {match_id} status={match.get('status')}")
        return match
    except Exception as e:
        logger.error(f"ID fetch failed for match {match_id}: {e}")
        return None


def update_single_prediction(pred: Dict[str, Any], bulk_matches: List[Dict[str, Any]], match_date_str: str) -> None:
    match_id = pred["match_id"]
    pred_id = pred["id"]

    # Get stored match details from DB
    match_response = supabase.table("matches").select(
        "*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)"
    ).eq("id", match_id).execute()
    stored_match = match_response.data[0] if match_response.data else None
    if not stored_match:
        logger.warning(f"Match {match_id} not found in DB. Skipping prediction {pred_id}.")
        return

    home_name = stored_match["home_team"]["name"]
    away_name = stored_match["away_team"]["name"]

    # 1. Try bulk matches first
    api_match = find_match_by_teams(bulk_matches, home_name, away_name, match_date_str)

    # 2. Fallback to ID fetch if not found
    if not api_match:
        logger.info(f"Match {home_name} vs {away_name} not in bulk fetch. Trying ID fetch for {match_id}...")
        api_match = fetch_match_by_id(match_id)
        # Small delay to respect rate limits
        time.sleep(1)

    if not api_match:
        logger.info(f"Match {home_name} vs {away_name} could not be found in API. Skipping.")
        return

    # Check if finished
    if api_match.get("status") != "FINISHED":
        logger.info(f"Match {match_id} status is {api_match.get('status')}, not FINISHED yet.")
        return

    # Update match in DB
    supabase.table("matches").update({
        "status": api_match["status"],
        "home_score": api_match["score"]["fullTime"]["home"],
        "away_score": api_match["score"]["fullTime"]["away"],
        "winner": api_match["score"]["winner"]
    }).eq("id", match_id).execute()
    logger.info(f"Updated match {match_id} ({home_name} vs {away_name}) with final result.")

    new_status = determine_result(pred, api_match)
    if new_status != "PENDING":
        logger.info(f"Updating prediction {pred_id} from PENDING to {new_status}")
        supabase.table("predictions").update({"status": new_status}).eq("id", pred_id).execute()
    else:
        logger.info(f"Prediction {pred_id} still PENDING.")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    logger.info("═══ MK-806 Result Updater v6 (Bulk + ID fallback) starting ═══")

    # Fetch all PENDING predictions with match date
    pred_response = supabase.table("predictions").select("*, matches(utc_date)").eq("status", "PENDING").execute()
    predictions = pred_response.data
    if not predictions:
        logger.info("No PENDING predictions found.")
        return
    logger.info(f"Found {len(predictions)} PENDING predictions.")

    # Group by date
    predictions_by_date: Dict[str, List[Dict[str, Any]]] = {}
    for pred in predictions:
        match = pred.get("matches")
        if not match:
            continue
        utc_date_str = match["utc_date"][:10]
        predictions_by_date.setdefault(utc_date_str, []).append(pred)

    unique_dates = sorted(predictions_by_date.keys())
    logger.info(f"Processing {len(unique_dates)} unique dates: {unique_dates}")

    for idx, date_str in enumerate(unique_dates):
        logger.info(f"Processing date {date_str} ({idx+1}/{len(unique_dates)})")
        bulk_matches = fetch_finished_matches_by_date(date_str)

        for pred in predictions_by_date[date_str]:
            update_single_prediction(pred, bulk_matches, date_str)

        if idx < len(unique_dates) - 1:
            logger.info(f"Waiting {REQUEST_DELAY} seconds before next date...")
            time.sleep(REQUEST_DELAY)

    logger.info("═══ MK-806 Result Updater v6 complete ═══")


if __name__ == "__main__":
    main()