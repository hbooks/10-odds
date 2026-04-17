"""
update_results.py — MK-806 Result Updater (v2)
================================================
- Checks PENDING predictions.
- Fetches final scores from Football-Data.org.
- Updates prediction status to WIN/LOSS/HALF_WIN/HALF_LOSS/VOID.
- Includes delay to respect API rate limits.
"""

import os
import logging
import time
import requests
from datetime import datetime
from typing import Dict, Any
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

# Rate limiting: free tier allows 10 requests per minute → 1 request every 6 seconds
REQUEST_DELAY = 6.5  # seconds


def determine_result(prediction: Dict[str, Any], match: Dict[str, Any]) -> str:
    """
    Determine the prediction outcome based on the actual match result.
    Returns: WIN, LOSS, HALF_WIN, HALF_LOSS, VOID, or PENDING (if match not finished).
    """
    if match.get("status") != "FINISHED":
        return "PENDING"

    home_score = match.get("home_score")
    away_score = match.get("away_score")
    if home_score is None or away_score is None:
        return "PENDING"

    bet_type = prediction["bet_type"]
    actual_winner = match.get("winner")
    total_goals = home_score + away_score

    # ── 1X2 ───────────────────────────────────────────────────────────────
    if bet_type == "HOME_WIN":
        return "WIN" if actual_winner == "HOME_TEAM" else "LOSS"
    elif bet_type == "AWAY_WIN":
        return "WIN" if actual_winner == "AWAY_TEAM" else "LOSS"
    elif bet_type == "DRAW":
        return "WIN" if actual_winner == "DRAW" else "LOSS"

    # ── Over/Under ────────────────────────────────────────────────────────
    if bet_type.startswith("OVER_"):
        try:
            line = float(bet_type.replace("OVER_", ""))
            if total_goals > line:
                return "WIN"
            elif total_goals == line:
                return "VOID"
            else:
                return "LOSS"
        except ValueError:
            logger.warning(f"Could not parse line from {bet_type}")
            return "PENDING"

    if bet_type.startswith("UNDER_"):
        try:
            line = float(bet_type.replace("UNDER_", ""))
            if total_goals < line:
                return "WIN"
            elif total_goals == line:
                return "VOID"
            else:
                return "LOSS"
        except ValueError:
            logger.warning(f"Could not parse line from {bet_type}")
            return "PENDING"

    # ── BTTS ──────────────────────────────────────────────────────────────
    if bet_type == "BTTS_YES":
        return "WIN" if (home_score > 0 and away_score > 0) else "LOSS"
    if bet_type == "BTTS_NO":
        return "WIN" if (home_score == 0 or away_score == 0) else "LOSS"

    # ── Exact Total Goals ─────────────────────────────────────────────────
    if bet_type.startswith("TOTAL_GOALS_"):
        try:
            target = int(bet_type.replace("TOTAL_GOALS_", ""))
            return "WIN" if total_goals == target else "LOSS"
        except ValueError:
            return "PENDING"

    # ── Correct Score ─────────────────────────────────────────────────────
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


def fetch_match_from_api(match_id: int) -> Dict[str, Any]:
    """Fetch match data from Football-Data.org."""
    url = f"{FOOTBALL_DATA_BASE}/matches/{match_id}"
    resp = requests.get(url, headers=FD_HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()


def update_pending_predictions() -> None:
    logger.info("Fetching PENDING predictions...")
    pred_response = supabase.table("predictions").select("*").eq("status", "PENDING").execute()
    predictions = pred_response.data

    if not predictions:
        logger.info("No PENDING predictions found.")
        return

    logger.info(f"Found {len(predictions)} PENDING predictions.")

    for idx, pred in enumerate(predictions):
        match_id = pred["match_id"]
        pred_id = pred["id"]

        # Get match from our DB first
        match_response = supabase.table("matches").select("*").eq("id", match_id).execute()
        match = match_response.data[0] if match_response.data else None

        if not match:
            logger.warning(f"Match {match_id} not found in DB, skipping.")
            continue

        # If match is already FINISHED in DB, use that
        if match.get("status") == "FINISHED" and match.get("home_score") is not None:
            new_status = determine_result(pred, match)
        else:
            # Fetch fresh data from API
            logger.info(f"Fetching fresh data for match {match_id}...")
            try:
                api_match = fetch_match_from_api(match_id)

                # Update the match in our DB
                if api_match.get("status") == "FINISHED":
                    supabase.table("matches").update({
                        "status": api_match["status"],
                        "home_score": api_match["score"]["fullTime"]["home"],
                        "away_score": api_match["score"]["fullTime"]["away"],
                        "winner": api_match["score"]["winner"]
                    }).eq("id", match_id).execute()
                    logger.info(f"Updated match {match_id} with final result.")
                    match = api_match  # use this data for result determination
                else:
                    # Match not finished yet
                    logger.info(f"Match {match_id} is not yet FINISHED (status={api_match.get('status')})")
                    new_status = "PENDING"
            except requests.HTTPError as e:
                if e.response.status_code == 429:
                    logger.warning("Rate limit hit. Waiting 60 seconds...")
                    time.sleep(60)
                    continue
                else:
                    logger.error(f"API error for match {match_id}: {e.response.status_code}")
                    new_status = "PENDING"
            except Exception as e:
                logger.error(f"Error processing match {match_id}: {e}")
                new_status = "PENDING"

        # Determine result if we have finished match data
        if match and match.get("status") == "FINISHED":
            new_status = determine_result(pred, match)

        if new_status != "PENDING":
            logger.info(f"Updating prediction {pred_id} from PENDING to {new_status}")
            supabase.table("predictions").update({"status": new_status}).eq("id", pred_id).execute()
        else:
            logger.info(f"Prediction {pred_id} still PENDING (match not finished).")

        # Delay to avoid rate limiting (skip delay after last item)
        if idx < len(predictions) - 1:
            time.sleep(REQUEST_DELAY)


def main() -> None:
    logger.info("═══ MK-806 Result Updater v2 starting ═══")
    update_pending_predictions()
    logger.info("═══ MK-806 Result Updater complete ═══")


if __name__ == "__main__":
    main()