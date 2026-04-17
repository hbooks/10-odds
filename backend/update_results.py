"""
update_results.py — MK-806 Result Updater
==========================================
This script checks all PENDING predictions, fetches the actual match
results from Football-Data.org, and updates the prediction status to
WIN, LOSS, HALF_WIN, HALF_LOSS, or VOID as appropriate.

Uses a separate API key (FOOTBALL_DATA_API_KEY_H) to avoid conflict
with the main pipeline's API key.

Run manually or via a daily scheduled job (e.g., GitHub Actions).
"""

import os
import logging
import requests
from datetime import datetime
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
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str = os.environ["SUPABASE_SERVICE_KEY"]
FOOTBALL_DATA_API_KEY_H: str = os.environ["FOOTBALL_DATA_API_KEY"] # add _H to avoid conflict with main pipeline's key

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
FD_HEADERS = {"X-Auth-Token": FOOTBALL_DATA_API_KEY} # add _H to avoid conflict with main pipeline's key

# ── Helper Functions ──────────────────────────────────────────────────────────

def determine_result(prediction: Dict[str, Any], match: Dict[str, Any]) -> str:
    """
    Determine if the prediction was a WIN, LOSS, HALF_WIN, HALF_LOSS, or VOID.
    """
    # If match isn't finished or scores are missing, leave as PENDING
    if match.get("status") != "FINISHED" or match.get("home_score") is None or match.get("away_score") is None:
        return "PENDING"

    home_score = match["home_score"]
    away_score = match["away_score"]
    bet_type = prediction["bet_type"]
    actual_winner = match.get("winner")

    # 1X2 outcomes
    if bet_type == "HOME_WIN":
        return "WIN" if actual_winner == "HOME_TEAM" else "LOSS"
    elif bet_type == "AWAY_WIN":
        return "WIN" if actual_winner == "AWAY_TEAM" else "LOSS"
    elif bet_type == "DRAW":
        return "WIN" if actual_winner == "DRAW" else "LOSS"

    # Totals (Over/Under lines)
    # Format: OVER_2.5 or UNDER_1.5
    if bet_type.startswith("OVER_"):
        try:
            line = float(bet_type.replace("OVER_", ""))
            total = home_score + away_score
            if total > line:
                return "WIN"
            elif total == line:
                return "VOID"   # Push on exact line
            else:
                return "LOSS"
        except ValueError:
            logger.warning(f"Could not parse totals line from {bet_type}")
            return "PENDING"

    if bet_type.startswith("UNDER_"):
        try:
            line = float(bet_type.replace("UNDER_", ""))
            total = home_score + away_score
            if total < line:
                return "WIN"
            elif total == line:
                return "VOID"
            else:
                return "LOSS"
        except ValueError:
            logger.warning(f"Could not parse totals line from {bet_type}")
            return "PENDING"

    # BTTS
    if bet_type == "BTTS_YES":
        return "WIN" if (home_score > 0 and away_score > 0) else "LOSS"
    if bet_type == "BTTS_NO":
        return "WIN" if (home_score == 0 or away_score == 0) else "LOSS"

    # Exact total goals (e.g., "TOTAL_GOALS_3")
    if bet_type.startswith("TOTAL_GOALS_"):
        try:
            target = int(bet_type.replace("TOTAL_GOALS_", ""))
            total = home_score + away_score
            return "WIN" if total == target else "LOSS"
        except ValueError:
            return "PENDING"

    # Correct score (e.g., "CORRECT_SCORE_2_1")
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


def update_pending_predictions() -> None:
    """
    Fetch PENDING predictions, get match results, and update statuses.
    """
    logger.info("Fetching PENDING predictions...")

    # 1. Get all PENDING predictions
    pred_response = supabase.table("predictions").select("*").eq("status", "PENDING").execute()
    predictions = pred_response.data

    if not predictions:
        logger.info("No PENDING predictions found.")
        return

    logger.info(f"Found {len(predictions)} PENDING predictions.")

    for pred in predictions:
        match_id = pred["match_id"]
        pred_id = pred["id"]

        # 2. Get match details from our own database first (to avoid API calls if already FINISHED)
        match_response = supabase.table("matches").select("*").eq("id", match_id).execute()
        match = match_response.data[0] if match_response.data else None

        if not match:
            logger.warning(f"Match {match_id} not found in database.")
            continue

        # If match is already FINISHED in our DB, use that data
        if match.get("status") == "FINISHED" and match.get("home_score") is not None:
            new_status = determine_result(pred, match)
        else:
            # 3. Fetch fresh data from Football-Data.org
            logger.info(f"Fetching fresh data for match {match_id}...")
            api_url = f"{FOOTBALL_DATA_BASE}/matches/{match_id}"
            try:
                api_response = requests.get(api_url, headers=FD_HEADERS, timeout=10)
                if api_response.status_code != 200:
                    logger.error(f"API error for match {match_id}: {api_response.status_code}")
                    continue
                api_match = api_response.json()
                new_status = determine_result(pred, api_match)

                # Optionally update the match in our DB with the result
                if api_match.get("status") == "FINISHED":
                    supabase.table("matches").update({
                        "status": api_match["status"],
                        "home_score": api_match["score"]["fullTime"]["home"],
                        "away_score": api_match["score"]["fullTime"]["away"],
                        "winner": api_match["score"]["winner"]
                    }).eq("id", match_id).execute()
                    logger.info(f"Updated match {match_id} with final result.")
            except Exception as e:
                logger.error(f"Failed to fetch/update match {match_id}: {e}")
                continue

        # 4. Update the prediction if the status changed
        if new_status != "PENDING":
            logger.info(f"Updating prediction {pred_id} from PENDING to {new_status}")
            supabase.table("predictions").update({"status": new_status}).eq("id", pred_id).execute()
        else:
            logger.info(f"Prediction {pred_id} still PENDING (match not finished or scores missing).")


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    logger.info("═══ MK-806 Result Updater starting ═══")
    update_pending_predictions()
    logger.info("═══ MK-806 Result Updater complete ═══")


if __name__ == "__main__":
    main()