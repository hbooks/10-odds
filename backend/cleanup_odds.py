import os
import logging
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

load_dotenv()
SUPABASE_URL: str         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str = os.environ["SUPABASE_SERVICE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def cleanup_finished_match_odds() -> int:
    """Delete odds rows where the match is FINISHED."""
    try:
        # Get IDs of finished matches that have odds rows
        finished = (
            supabase.table("matches")
            .select("id")
            .eq("status", "FINISHED")
            .execute()
        )
        match_ids = [r["id"] for r in (finished.data or [])]
        if not match_ids:
            logger.info("No finished matches with odds to clean up")
            return 0

        result = (
            supabase.table("odds")
            .delete()
            .in_("match_id", match_ids)
            .execute()
        )
        deleted = len(result.data or [])
        logger.info("Deleted %d odds rows for %d finished matches", deleted, len(match_ids))
        return deleted
    except Exception as e:
        logger.error("Error cleaning finished match odds: %s", e)
        return 0


def cleanup_old_odds(days: int = 3) -> int:
    """Delete odds rows for matches older than `days` days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    try:
        old = (
            supabase.table("matches")
            .select("id")
            .lt("utc_date", cutoff)
            .execute()
        )
        match_ids = [r["id"] for r in (old.data or [])]
        if not match_ids:
            logger.info("No old matches to clean up")
            return 0

        result = (
            supabase.table("odds")
            .delete()
            .in_("match_id", match_ids)
            .execute()
        )
        deleted = len(result.data or [])
        logger.info("Deleted %d odds rows older than %d days", deleted, days)
        return deleted
    except Exception as e:
        logger.error("Error cleaning old odds: %s", e)
        return 0


def main() -> None:
    logger.info("═══ MK-806 Odds Cleanup starting ═══")
    total = 0
    total += cleanup_finished_match_odds()
    total += cleanup_old_odds(days=3)
    logger.info("═══ Odds Cleanup complete — %d rows removed ═══", total)


if __name__ == "__main__":
    main()