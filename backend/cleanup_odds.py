import os
import logging
from dotenv import load_dotenv
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

try:
    result = supabase.rpc("delete_old_odds").execute()
    deleted = result.data if result.data else 0
    logger.info(f"Odds cleanup completed. {deleted} rows deleted.")
except Exception as e:
    logger.error(f"Odds cleanup failed: {e}")
    raise