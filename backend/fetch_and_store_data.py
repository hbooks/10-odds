"""
fetch_and_store_data.py  —  MK-806  "God of Football, Time, and Future" v4
===========================================================================

Philosophy
──────────
MK-806 thinks like a master analyst: it does not guess, it calculates.
It weighs every data signal available — Elo ratings, estimated xG, Dixon-Coles
attack/defense strengths, historical form — then determines the single most
likely future of a match and finds the best bet aligned with that future.

Architecture overview
─────────────────────
1.  fetch_team_elo_ratings()       — ClubElo via soccerdata → teams.elo_rating
2.  estimate_match_xg()            — xG formula from per-team Understat averages
                                     → matches.home_xg / away_xg for EVERY fixture
3.  fetch_fixtures_for_date_range()— Football-Data.org REST
4.  fetch_odds_for_sport()         — The Odds API, h2h ONLY (no 422 errors)
5.  _compute_all_probabilities()   — Poisson matrix: 1X2, O/U, BTTS,
                                     Exact Total Goals, Correct Score
6.  _get_team_form_summary()       — natural-language form digest (last 5 games)
7.  _god_of_time_select()          — future-first decision algorithm
8.  predict_match_outcome()        — orchestrates everything, writes DB
9.  generate_daily_slip()          — assembles the daily 10-Odds accumulator

Changes in v4 vs v3
────────────────────
• Odds API: h2h ONLY — totals/btts removed → zero 422 errors
• ODDS_COLUMN_MAP: only HOME_WIN / DRAW / AWAY_WIN are real columns
• estimate_match_xg(): per-team Understat xG average formula, runs for every match
• predict_match_outcome(): no longer takes xg_map param — estimates inline
• _compute_all_probabilities(): adds Exact Total Goals 0-9 + Correct Score 0-0→7-7
• _get_team_form_summary(): human-readable "W3 D1 L1 in last 5…" string
• _god_of_time_select(): v4 algorithm — primary must be 1X2, secondary is
  catalogue-wide compliment bet (probability ≥ 0.65, aligned, high confidence only)
• Reasoning string: analyst voice (natural language first, numbers second)

Dependencies:
    pip install supabase python-dotenv requests pytz soccerdata
"""

import os
import math
import logging
import re
import requests
import pytz

from datetime import datetime, timedelta, date, timezone
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv
from supabase import create_client, Client

try:
    import soccerdata as sd
    SOCCERDATA_AVAILABLE = True
except ImportError:
    SOCCERDATA_AVAILABLE = False


# ══════════════════════════════════════════════════════════════════════════════
# LOGGING
# ══════════════════════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
if not SOCCERDATA_AVAILABLE:
    logger.warning("soccerdata not installed — Elo/xG estimation degraded.  pip install soccerdata")


# ══════════════════════════════════════════════════════════════════════════════
# ENVIRONMENT & CLIENTS
# ══════════════════════════════════════════════════════════════════════════════

load_dotenv()
SUPABASE_URL: str          = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str  = os.environ["SUPABASE_SERVICE_KEY"]
FOOTBALL_DATA_API_KEY: str = os.environ["FOOTBALL_DATA_API_KEY"]
ODDS_API_KEY: str          = os.environ["ODDS_API_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
FD_HEADERS = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}


# ══════════════════════════════════════════════════════════════════════════════
# LEAGUE CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

TARGET_LEAGUES: Dict[int, Dict[str, str]] = {
    2021: {"name": "Premier League", "code": "PL",  "area": "England"},
    2014: {"name": "La Liga",        "code": "PD",  "area": "Spain"},
    2019: {"name": "Serie A",        "code": "SA",  "area": "Italy"},
    2002: {"name": "Bundesliga",     "code": "BL1", "area": "Germany"},
    2015: {"name": "Ligue 1",        "code": "FL1", "area": "France"},
}

# soccerdata / Understat league keys
SD_LEAGUE_MAP: Dict[str, str] = {
    "PL":  "ENG-Premier League",
    "PD":  "ESP-La Liga",
    "SA":  "ITA-Serie A",
    "BL1": "GER-Bundesliga",
    "FL1": "FRA-Ligue 1",
}

SPORT_KEY_MAPPING: Dict[str, str] = {
    "PL":  "soccer_epl",
    "PD":  "soccer_spain_la_liga",
    "SA":  "soccer_italy_serie_a",
    "BL1": "soccer_germany_bundesliga",
    "FL1": "soccer_france_ligue_one",
}

# Dixon-Coles baseline: empirical league averages (goals per game, home / away)
LEAGUE_AVERAGES: Dict[str, Dict[str, float]] = {
    "PL":  {"home": 1.53, "away": 1.19, "xg": 1.36},
    "PD":  {"home": 1.61, "away": 1.14, "xg": 1.37},
    "SA":  {"home": 1.48, "away": 1.10, "xg": 1.29},
    "BL1": {"home": 1.65, "away": 1.23, "xg": 1.44},
    "FL1": {"home": 1.44, "away": 1.08, "xg": 1.26},
}


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS & LOOKUP TABLES
# ══════════════════════════════════════════════════════════════════════════════

SLIP_SIZE              = 10
MIN_CONFIDENCE         = 0.40
MAX_GOALS              = 9       # score matrix covers 0–8 goals per team
ELO_BIG_TEAM_THRESHOLD = 1800
ELO_DRAW_BAND          = 0.05   # if |P(home) – P(away)| < this → DRAW future
SECONDARY_PROB_MIN     = 0.65   # minimum model probability for a compliment pick
HIGH_CONFIDENCE_MIN    = 0.80   # confidence threshold to even attempt a secondary pick
TOTALS_LINES           = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]
MAX_EXACT_GOALS        = 9      # exact total goals 0–9
MAX_CS_GOALS           = 7      # correct score each side 0–7
KENYA_TZ               = pytz.timezone("Africa/Nairobi")

# ── Odds: ONLY 1X2 columns are real (fetched from bookmakers) ──────────────
# All other bet types derive their "odds" from model probability alone.
ODDS_COLUMN_MAP: Dict[str, str] = {
    "HOME_WIN": "home_win",
    "DRAW":     "draw",
    "AWAY_WIN": "away_win",
}

# Fallback decimal odds used only when no bookmaker data exists in the DB.
DEFAULT_ODDS: Dict[str, float] = {
    "HOME_WIN": 1.90,
    "DRAW":     3.20,
    "AWAY_WIN": 2.10,
}

# Human-readable labels (placeholders {home}/{away} resolved at runtime)
BET_LABELS: Dict[str, str] = {
    "HOME_WIN": "{home} to Win",
    "DRAW":     "Match Draw",
    "AWAY_WIN": "{away} to Win",
}

# Which secondary bet types are conceptually aligned with each 1X2 future
# (used during compliment-pick search — excludes 1X2 bets themselves)
SECONDARY_ALIGNMENT: Dict[str, List[str]] = {
    "HOME_WIN": [
        "OVER_1.5", "OVER_2.5", "OVER_3.5",
        "BTTS_YES",
        # Exact total goals (likely outcomes in a home-win scenario)
        "TOTAL_GOALS_2", "TOTAL_GOALS_3", "TOTAL_GOALS_4",
        # Correct scores (home wins)
        "CORRECT_SCORE_1_0", "CORRECT_SCORE_2_0", "CORRECT_SCORE_2_1",
        "CORRECT_SCORE_3_0", "CORRECT_SCORE_3_1", "CORRECT_SCORE_3_2",
    ],
    "AWAY_WIN": [
        "OVER_1.5", "OVER_2.5", "OVER_3.5",
        "BTTS_YES",
        "TOTAL_GOALS_2", "TOTAL_GOALS_3", "TOTAL_GOALS_4",
        "CORRECT_SCORE_0_1", "CORRECT_SCORE_0_2", "CORRECT_SCORE_1_2",
        "CORRECT_SCORE_0_3", "CORRECT_SCORE_1_3", "CORRECT_SCORE_2_3",
    ],
    "DRAW": [
        "UNDER_2.5", "UNDER_3.5",
        "BTTS_NO",
        "TOTAL_GOALS_1", "TOTAL_GOALS_2",
        "CORRECT_SCORE_0_0", "CORRECT_SCORE_1_1",
        "CORRECT_SCORE_2_2",
    ],
}


# ══════════════════════════════════════════════════════════════════════════════
# PART 1 — ELO RATINGS  (ClubElo via soccerdata)
# ══════════════════════════════════════════════════════════════════════════════

def fetch_team_elo_ratings() -> None:
    """
    Pull today's ClubElo ratings for all five leagues.
    Writes teams.elo_rating to Supabase.
    Auto-sets is_big_team = TRUE for clubs with elo > ELO_BIG_TEAM_THRESHOLD.

    ClubElo uses its own club name spellings — we fuzzy-match against our DB.
    """
    if not SOCCERDATA_AVAILABLE:
        logger.warning("soccerdata unavailable — Elo ratings skipped")
        return

    try:
        reader = sd.ClubElo()
        df     = reader.read_by_date()   # DataFrame indexed by club name, column "elo"
    except Exception as e:
        logger.error("ClubElo fetch failed: %s", e)
        return

    # Build a normalised name → elo lookup
    elo_map: Dict[str, int] = {}
    for row in df.itertuples():
        name = str(row.Index).lower().strip()
        elo  = int(getattr(row, "elo", 0))
        if elo > 0:
            elo_map[name] = elo

    logger.info("ClubElo: %d ratings loaded", len(elo_map))

    # Match and persist
    try:
        teams = supabase.table("teams").select("id, name").execute().data or []
        updated = 0
        for team in teams:
            norm = team["name"].lower().strip()
            elo  = elo_map.get(norm)
            if elo is None:
                for k, v in elo_map.items():
                    if k in norm or norm in k:
                        elo = v
                        break
            if elo is not None:
                supabase.table("teams").update({
                    "elo_rating":  elo,
                    "is_big_team": elo > ELO_BIG_TEAM_THRESHOLD,
                }).eq("id", team["id"]).execute()
                updated += 1
        logger.info("Elo ratings persisted for %d/%d teams", updated, len(teams))
    except Exception as e:
        logger.error("Error persisting Elo ratings: %s", e)


# ══════════════════════════════════════════════════════════════════════════════
# PART 2 — ESTIMATED xG  (per-team Understat averages → Dixon-Coles style)
# ══════════════════════════════════════════════════════════════════════════════

# Module-level cache: league_code → DataFrame of Understat schedule
# Populated once per run to avoid re-fetching for every match
_understat_cache: Dict[str, Any] = {}


def _load_understat_for_league(league_code: str) -> Optional[Any]:
    """Lazily fetch and cache the Understat schedule DataFrame for a league."""
    if not SOCCERDATA_AVAILABLE:
        return None
    if league_code in _understat_cache:
        return _understat_cache[league_code]
    sd_key = SD_LEAGUE_MAP.get(league_code)
    if not sd_key:
        return None
    try:
        season = datetime.now(timezone.utc).year
        us     = sd.Understat(leagues=[sd_key], seasons=[season])
        df     = us.read_schedule()
        _understat_cache[league_code] = df
        logger.info("Understat cache loaded for %s (%d rows)", league_code, len(df))
        return df
    except Exception as e:
        logger.error("Understat load failed for %s: %s", league_code, e)
        _understat_cache[league_code] = None
        return None


def estimate_match_xg(
    home_team_id: int,
    away_team_id: int,
    home_team_name: str,
    away_team_name: str,
    league_code: str,
    match_id: int,
) -> Tuple[float, float]:
    """
    Estimate expected goals for a single match using the Dixon-Coles xG formula:

        home_xG = (home_avg_xGF × away_avg_xGA) / league_avg_xG
        away_xG = (away_avg_xGF × home_avg_xGA) / league_avg_xG

    Data source priority:
      1. Understat per-team xG averages (from last 10 matches in schedule)
      2. Fall back to Poisson-baseline if Understat data is unavailable

    Side-effect: updates matches.home_xg / away_xg in Supabase.
    Returns (home_xg_est, away_xg_est).
    """
    avgs   = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1, "xg": 1.3})
    league_avg_xg = avgs["xg"]

    home_xgf, home_xga = None, None
    away_xgf, away_xga = None, None

    df = _load_understat_for_league(league_code)
    if df is not None:
        try:
            # Understat columns: home_team, away_team, xg_home, xg_away
            home_xgf_vals, home_xga_vals = [], []
            away_xgf_vals, away_xga_vals = [], []

            for row in df.itertuples():
                rh = str(getattr(row, "home_team", ""))
                ra = str(getattr(row, "away_team", ""))
                rxgh = getattr(row, "xg_home", None)
                rxga = getattr(row, "xg_away", None)
                if rxgh is None or rxga is None:
                    continue
                # When team played at home: xGF = xg_home, xGA = xg_away
                if _team_names_match(rh, home_team_name):
                    home_xgf_vals.append(float(rxgh))
                    home_xga_vals.append(float(rxga))
                # When team played away: xGF = xg_away, xGA = xg_home
                if _team_names_match(ra, home_team_name):
                    home_xgf_vals.append(float(rxga))
                    home_xga_vals.append(float(rxgh))
                if _team_names_match(rh, away_team_name):
                    away_xgf_vals.append(float(rxgh))
                    away_xga_vals.append(float(rxga))
                if _team_names_match(ra, away_team_name):
                    away_xgf_vals.append(float(rxga))
                    away_xga_vals.append(float(rxgh))

            # Use last 10 matches per team
            if len(home_xgf_vals) >= 3:
                home_xgf = sum(home_xgf_vals[-10:]) / len(home_xgf_vals[-10:])
                home_xga = sum(home_xga_vals[-10:]) / len(home_xga_vals[-10:])
            if len(away_xgf_vals) >= 3:
                away_xgf = sum(away_xgf_vals[-10:]) / len(away_xgf_vals[-10:])
                away_xga = sum(away_xga_vals[-10:]) / len(away_xga_vals[-10:])

        except Exception as e:
            logger.warning("Understat xG computation error for match %s: %s", match_id, e)

    # Apply formula; fall back to league average if data is missing
    if home_xgf and away_xga and league_avg_xg:
        home_xg_est = (home_xgf * away_xga) / league_avg_xg
    else:
        home_xg_est = avgs["home"]

    if away_xgf and home_xga and league_avg_xg:
        away_xg_est = (away_xgf * home_xga) / league_avg_xg
    else:
        away_xg_est = avgs["away"]

    home_xg_est = round(max(0.20, min(5.0, home_xg_est)), 3)
    away_xg_est = round(max(0.20, min(5.0, away_xg_est)), 3)

    # Persist to matches table
    try:
        supabase.table("matches").update({
            "home_xg": home_xg_est,
            "away_xg": away_xg_est,
        }).eq("id", match_id).execute()
    except Exception as e:
        logger.error("xG persist for match %s: %s", match_id, e)

    logger.debug(
        "xG estimate match %s: home=%s=%.3f  away=%s=%.3f",
        match_id, home_team_name, home_xg_est, away_team_name, away_xg_est,
    )
    return home_xg_est, away_xg_est


# ══════════════════════════════════════════════════════════════════════════════
# PART 3 — FIXTURE FETCHING  (Football-Data.org)
# ══════════════════════════════════════════════════════════════════════════════

def fetch_fixtures_for_date_range(
    start_date: datetime,
    end_date: datetime,
) -> List[Dict[str, Any]]:
    """
    Fetch upcoming fixtures from Football-Data.org.
    dateFrom/dateTo are inclusive; passing today + 3 days covers today,
    tomorrow, and the day-after-tomorrow correctly.
    """
    all_fixtures: List[Dict[str, Any]] = []
    date_from = start_date.strftime("%Y-%m-%d")
    date_to   = end_date.strftime("%Y-%m-%d")

    for league_id, info in TARGET_LEAGUES.items():
        url    = f"{FOOTBALL_DATA_BASE}/competitions/{league_id}/matches"
        params = {"dateFrom": date_from, "dateTo": date_to}
        try:
            resp = requests.get(url, headers=FD_HEADERS, params=params, timeout=15)
            resp.raise_for_status()
            matches = resp.json().get("matches", [])
            logger.info("Fetched %d fixtures — %s", len(matches), info["name"])
            for m in matches:
                all_fixtures.append({
                    "id":               m["id"],
                    "competition_id":   league_id,
                    "competition_code": info["code"],
                    "matchday":         m.get("matchday"),
                    "utc_date":         m["utcDate"],
                    "status":           m["status"],
                    "home_team": {
                        "id":         m["homeTeam"]["id"],
                        "name":       m["homeTeam"]["name"],
                        "short_name": m["homeTeam"].get("shortName"),
                        "tla":        m["homeTeam"].get("tla"),
                        "crest_url":  m["homeTeam"].get("crest"),
                    },
                    "away_team": {
                        "id":         m["awayTeam"]["id"],
                        "name":       m["awayTeam"]["name"],
                        "short_name": m["awayTeam"].get("shortName"),
                        "tla":        m["awayTeam"].get("tla"),
                        "crest_url":  m["awayTeam"].get("crest"),
                    },
                    "home_score": m["score"]["fullTime"].get("home"),
                    "away_score": m["score"]["fullTime"].get("away"),
                    "winner":     m["score"].get("winner"),
                })
        except requests.HTTPError as e:
            logger.error("HTTP error %s fixtures: %s", info["name"], e)
        except Exception as e:
            logger.error("Error %s fixtures: %s", info["name"], e)

    return all_fixtures


# ══════════════════════════════════════════════════════════════════════════════
# PART 4 — ODDS FETCHING  (h2h ONLY — eliminates all 422 errors)
# ══════════════════════════════════════════════════════════════════════════════

def fetch_odds_for_sport(sport_key: str) -> List[Dict[str, Any]]:
    """
    Fetch 1X2 (h2h) odds from The Odds API.

    We request ONLY markets=h2h.  The previous totals/btts markets caused
    HTTP 422 errors because not all bookmakers support them for every league.
    Over/Under and BTTS probabilities are now computed entirely from the model.
    """
    url    = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
    params = {
        "apiKey":     ODDS_API_KEY,
        "regions":    "uk",
        "markets":    "h2h",      # ← h2h ONLY
        "oddsFormat": "decimal",
        "dateFormat": "iso",
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        events = resp.json()
        logger.info(
            "Odds API — %s: %d events (%s requests remaining)",
            sport_key, len(events),
            resp.headers.get("x-requests-remaining", "?"),
        )
        return events
    except requests.HTTPError as e:
        logger.error("HTTP error odds %s: %s", sport_key, e)
        return []
    except Exception as e:
        logger.error("Odds fetch error %s: %s", sport_key, e)
        return []


# ══════════════════════════════════════════════════════════════════════════════
# PART 5 — TEAM-NAME FUZZY MATCHING
# ══════════════════════════════════════════════════════════════════════════════

def _normalise(name: str) -> str:
    """Strip common suffixes/articles and lowercase for fuzzy matching."""
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


def match_odds_event_to_fixture(
    event: Dict[str, Any],
    fixtures: List[Dict[str, Any]],
    window_minutes: int = 90,
) -> Optional[int]:
    """Map a The-Odds-API event to our Football-Data fixture by time + team names."""
    try:
        odds_time = datetime.fromisoformat(event["commence_time"].replace("Z", "+00:00"))
    except (KeyError, ValueError):
        return None
    odds_home = event.get("home_team", "")
    odds_away = event.get("away_team", "")
    for fix in fixtures:
        try:
            fix_time = datetime.fromisoformat(fix["utc_date"].replace("Z", "+00:00"))
        except ValueError:
            continue
        if abs((fix_time - odds_time).total_seconds()) / 60 > window_minutes:
            continue
        if (_team_names_match(fix["home_team"]["name"], odds_home) and
                _team_names_match(fix["away_team"]["name"], odds_away)):
            return fix["id"]
    return None


# ══════════════════════════════════════════════════════════════════════════════
# PART 6 — SUPABASE UPSERTS
# ══════════════════════════════════════════════════════════════════════════════

def upsert_competitions() -> None:
    for lid, info in TARGET_LEAGUES.items():
        try:
            supabase.table("competitions").upsert({
                "id": lid, "name": info["name"],
                "code": info["code"], "area_name": info["area"],
            }).execute()
        except Exception as e:
            logger.error("Competition upsert %s: %s", info["name"], e)


def upsert_team(team: Dict[str, Any]) -> None:
    """
    Basic team upsert.  Does NOT overwrite elo_rating or is_big_team —
    those are managed exclusively by fetch_team_elo_ratings().
    """
    try:
        supabase.table("teams").upsert({
            "id":         team["id"],
            "name":       team["name"],
            "short_name": team.get("short_name"),
            "tla":        team.get("tla"),
            "crest_url":  team.get("crest_url"),
        }, ignore_duplicates=False, on_conflict="id").execute()
    except Exception as e:
        logger.error("Team upsert %s: %s", team.get("name"), e)


def upsert_match(fix: Dict[str, Any]) -> None:
    try:
        supabase.table("matches").upsert({
            "id":             fix["id"],
            "competition_id": fix["competition_id"],
            "matchday":       fix.get("matchday"),
            "utc_date":       fix["utc_date"],
            "status":         fix["status"],
            "home_team_id":   fix["home_team"]["id"],
            "away_team_id":   fix["away_team"]["id"],
            "home_score":     fix.get("home_score"),
            "away_score":     fix.get("away_score"),
            "winner":         fix.get("winner"),
        }).execute()
    except Exception as e:
        logger.error("Match upsert %s: %s", fix.get("id"), e)


def upsert_odds(
    match_id: int,
    bookmaker: Dict[str, Any],
    home_team: str,
    away_team: str,
) -> None:
    """
    Store h2h (1X2) odds only.
    Over/Under and BTTS odds are NOT stored — model probabilities are used instead.
    """
    markets = bookmaker.get("markets", [])
    h2h = next((m for m in markets if m["key"] == "h2h"), None)
    if not h2h:
        return

    hw = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], home_team)), None)
    aw = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], away_team)), None)
    dr = next((o["price"] for o in h2h["outcomes"] if o["name"] == "Draw"), None)

    if hw is None or aw is None:
        return

    try:
        supabase.table("odds").upsert({
            "match_id":        match_id,
            "bookmaker_key":   bookmaker["key"],
            "bookmaker_title": bookmaker["title"],
            "home_win":        hw,
            "away_win":        aw,
            "draw":            dr,
            "last_updated":    bookmaker["last_update"],
        }).execute()
    except Exception as e:
        logger.error("Odds upsert match=%s bookie=%s: %s", match_id, bookmaker.get("key"), e)


def _get_best_odds(match_id: int, bet_type: str) -> float:
    """
    Return the best available bookmaker price for a 1X2 bet type.
    For non-1X2 bet types, there are no real odds — returns 0.0 to signal
    that this is a model-probability-only bet.
    """
    col = ODDS_COLUMN_MAP.get(bet_type)
    if not col:
        return 0.0   # Not a real-odds bet type

    try:
        res = (
            supabase.table("odds")
            .select(col)
            .eq("match_id", match_id)
            .not_.is_(col, "null")
            .order(col, desc=True)
            .limit(1)
            .execute()
        )
        if res.data:
            return float(res.data[0][col])
    except Exception as e:
        logger.debug("Odds lookup col=%s match=%s: %s", col, match_id, e)

    return DEFAULT_ODDS.get(bet_type, 1.90)


# ══════════════════════════════════════════════════════════════════════════════
# PART 7 — POISSON ENGINE + EXPANDED PROBABILITY CATALOG
# ══════════════════════════════════════════════════════════════════════════════

def _poisson_pmf(lam: float, k: int) -> float:
    """P(X = k) for a Poisson random variable with rate λ."""
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _fetch_team_db_stats(team_id: int) -> Dict[str, Any]:
    """
    Fetch from our own match history:
      • goals_scored_avg / goals_conceded_avg (last 20 finished matches)
      • elo_rating (from teams table)
    Returns sensible defaults if insufficient data exists.
    """
    result: Dict[str, Any] = {
        "goals_scored_avg":   1.2,
        "goals_conceded_avg": 1.2,
        "games_played":       0,
        "elo_rating":         None,
    }
    try:
        t_res = (supabase.table("teams")
                 .select("elo_rating")
                 .eq("id", team_id)
                 .single()
                 .execute())
        if t_res.data:
            result["elo_rating"] = t_res.data.get("elo_rating")

        hg = (supabase.table("matches")
              .select("home_score, away_score")
              .eq("home_team_id", team_id)
              .eq("status", "FINISHED")
              .not_.is_("home_score", "null")
              .order("utc_date", desc=True)
              .limit(10)
              .execute()).data or []

        ag = (supabase.table("matches")
              .select("home_score, away_score")
              .eq("away_team_id", team_id)
              .eq("status", "FINISHED")
              .not_.is_("away_score", "null")
              .order("utc_date", desc=True)
              .limit(10)
              .execute()).data or []

        if hg or ag:
            scored   = [g["home_score"] for g in hg] + [g["away_score"] for g in ag]
            conceded = [g["away_score"] for g in hg] + [g["home_score"] for g in ag]
            n = len(scored)
            result.update({
                "goals_scored_avg":   sum(scored)   / n,
                "goals_conceded_avg": sum(conceded) / n,
                "games_played": n,
            })
    except Exception as e:
        logger.warning("DB stats team %s: %s", team_id, e)

    return result


def _compute_strength(avg: float, league_avg: float) -> float:
    """Attack / defense strength ratio, clamped to [0.2, 3.0]."""
    return max(0.2, min(3.0, avg / league_avg)) if league_avg else 1.0


def _elo_win_prob(
    elo_home: int, elo_away: int, home_adv: int = 100
) -> Tuple[float, float, float]:
    """
    Standard Elo expected score formula (with home-field advantage offset).
    Draw probability is approximated as a bell curve peaking at equal strength.
    Returns (p_home, p_draw, p_away), normalised to sum to 1.
    """
    diff   = (elo_home + home_adv) - elo_away
    p_home = 1.0 / (1.0 + 10 ** (-diff / 400.0))
    p_away = 1.0 - p_home
    # Draw peaks at ~0.25 when teams are equal, falls as difference grows
    draw_f = max(0.05, min(0.35, 0.25 * (1.0 - abs(p_home - 0.5) * 2)))
    total  = p_home + draw_f + p_away
    return p_home / total, draw_f / total, p_away / total


def _blend_lambdas(
    p_lh: float,
    p_la: float,
    home_xg: float,
    away_xg: float,
    elo_home: Optional[int],
    elo_away: Optional[int],
) -> Tuple[float, float]:
    """
    Blend three signals into the final expected-goals pair (λ_home, λ_away):

      • Poisson/Dixon-Coles:  40% weight
      • Understat xG estimate: 60% weight
      • Elo strength ratio:   ±15% scaling cap on top

    xG estimates are always available (estimate_match_xg() guarantees a value),
    so the blend always runs at full strength.
    """
    # Step 1: blend Poisson with xG
    lh = 0.40 * p_lh + 0.60 * home_xg
    la = 0.40 * p_la + 0.60 * away_xg

    # Step 2: Elo scaling (if available)
    if elo_home is not None and elo_away is not None:
        ratio = max(0.85, min(1.15, (elo_home + 100) / max(elo_away, 1)))
        lh   *= ratio
        la   /= ratio

    return max(0.10, lh), max(0.10, la)


def _compute_all_probabilities(lh: float, la: float) -> Dict[str, float]:
    """
    Build the complete probability distribution over the match using a
    MAX_GOALS × MAX_GOALS Poisson score matrix.

    Computes probabilities for:
      • 1X2 (HOME_WIN, DRAW, AWAY_WIN)
      • Over / Under goals (lines 0.5–5.5)
      • BTTS Yes / No
      • Exact Total Goals 0–9
      • Correct Score 0-0 through 7-7
    """
    probs: Dict[str, float] = {}

    # Initialise all keys to zero
    for side in ("HOME_WIN", "DRAW", "AWAY_WIN"):
        probs[side] = 0.0
    for line in TOTALS_LINES:
        probs[f"OVER_{line}"]  = 0.0
        probs[f"UNDER_{line}"] = 0.0
    probs["BTTS_YES"] = 0.0
    probs["BTTS_NO"]  = 0.0
    for t in range(MAX_EXACT_GOALS + 1):
        probs[f"TOTAL_GOALS_{t}"] = 0.0
    for h in range(MAX_CS_GOALS + 1):
        for a in range(MAX_CS_GOALS + 1):
            probs[f"CORRECT_SCORE_{h}_{a}"] = 0.0

    # Fill via score matrix
    for h in range(MAX_GOALS):
        ph = _poisson_pmf(lh, h)
        for a in range(MAX_GOALS):
            p     = ph * _poisson_pmf(la, a)
            total = h + a

            # 1X2
            if h > a:    probs["HOME_WIN"] += p
            elif h == a: probs["DRAW"]     += p
            else:        probs["AWAY_WIN"] += p

            # Over / Under
            for line in TOTALS_LINES:
                if total > line: probs[f"OVER_{line}"]  += p
                else:            probs[f"UNDER_{line}"] += p

            # BTTS
            if h > 0 and a > 0: probs["BTTS_YES"] += p
            else:                probs["BTTS_NO"]  += p

            # Exact total goals (0–9)
            if total <= MAX_EXACT_GOALS:
                probs[f"TOTAL_GOALS_{total}"] += p

            # Correct score (0–7 each side)
            if h <= MAX_CS_GOALS and a <= MAX_CS_GOALS:
                probs[f"CORRECT_SCORE_{h}_{a}"] += p

    return probs


# ══════════════════════════════════════════════════════════════════════════════
# PART 8 — FORM ANALYSIS  (natural-language digest)
# ══════════════════════════════════════════════════════════════════════════════

def _get_team_form_summary(team_id: int, team_name: str) -> str:
    """
    Query the last 5 finished matches for a team (home or away combined) and
    return a concise human-readable form string like:

        "Arsenal FC: W4 D0 L1 in last 5, scoring 9 and conceding 3."
        "Brighton & Hove Albion FC: unbeaten in last 4 (W3 D1), kept 2 clean sheets."
        "Burnley FC: only 2 matches in database this season."

    This string is embedded directly into the analyst reasoning paragraph.
    """
    try:
        hg = (supabase.table("matches")
              .select("home_score, away_score, home_team_id")
              .eq("home_team_id", team_id)
              .eq("status", "FINISHED")
              .not_.is_("home_score", "null")
              .order("utc_date", desc=True)
              .limit(5)
              .execute()).data or []

        ag = (supabase.table("matches")
              .select("home_score, away_score, away_team_id")
              .eq("away_team_id", team_id)
              .eq("status", "FINISHED")
              .not_.is_("away_score", "null")
              .order("utc_date", desc=True)
              .limit(5)
              .execute()).data or []

        # Merge into unified result set: (goals_for, goals_against)
        results = []
        for g in hg:
            results.append((g["home_score"], g["away_score"]))
        for g in ag:
            results.append((g["away_score"], g["home_score"]))

        # Sort by recency is implicitly done above; take the 5 most recent combined
        results = results[:5]
        n = len(results)

        if n == 0:
            return f"{team_name}: no recent match data available."
        if n < 3:
            return f"{team_name}: only {n} match{'es' if n>1 else ''} in database this season."

        wins   = sum(1 for gf, ga in results if gf > ga)
        draws  = sum(1 for gf, ga in results if gf == ga)
        losses = sum(1 for gf, ga in results if gf < ga)
        scored    = sum(gf for gf, ga in results)
        conceded  = sum(ga for gf, ga in results)
        clean_sheets = sum(1 for _, ga in results if ga == 0)

        label = f"last {n}" if n < 5 else "last 5"

        # Special phrasing for unbeaten runs
        if losses == 0 and n >= 3:
            parts = []
            if wins > 0:  parts.append(f"W{wins}")
            if draws > 0: parts.append(f"D{draws}")
            form_str = " ".join(parts)
            base = f"{team_name}: unbeaten in {label} ({form_str})"
        else:
            base = f"{team_name}: W{wins} D{draws} L{losses} in {label}"

        base += f", scoring {scored} and conceding {conceded}"
        if clean_sheets >= 2:
            base += f", {clean_sheets} clean sheets"
        base += "."
        return base

    except Exception as e:
        logger.warning("Form summary error team %s: %s", team_id, e)
        return f"{team_name}: form data unavailable."


# ══════════════════════════════════════════════════════════════════════════════
# PART 9 — GOD OF TIME SELECTOR  (v4 — future-first, analyst voice)
# ══════════════════════════════════════════════════════════════════════════════

def _god_of_time_select(
    match_id: int,
    home_name: str,
    away_name: str,
    probs: Dict[str, float],
    lh: float,
    la: float,
    elo_home: Optional[int],
    elo_away: Optional[int],
    home_xg: float,
    away_xg: float,
    home_form: str,
    away_form: str,
) -> Tuple[str, str, float, float, float, str]:
    """
    God of Time v4 — five-step future-first prediction algorithm.

    ─────────────────────────────────────────────────────────────────────────
    Step 1 — Determine the Future
        Blend Poisson probs (60%) with Elo-derived probs (40%).
        If the top two outcomes are within ELO_DRAW_BAND of each other,
        declare DRAW. Otherwise: HOME_WIN or AWAY_WIN.
        Confidence = probability of the chosen future.

    Step 2 — Primary Pick (1X2 ONLY — mandatory)
        The primary bet MUST be HOME_WIN, DRAW, or AWAY_WIN matching the
        future exactly.  Real bookmaker odds are fetched from the DB.
        EV is calculated; if negative we still proceed (future is paramount)
        but log a warning.

    Step 3 — Secondary (Compliment) Pick — strictly conditional
        Only attempted when confidence > HIGH_CONFIDENCE_MIN (0.80).
        Scans the SECONDARY_ALIGNMENT[future] list across the full
        probability catalog (Over/Under, BTTS, Exact Goals, Correct Score).
        Requirement: model_prob ≥ SECONDARY_PROB_MIN (0.65).
        Picks the single highest-probability aligned bet.
        If nothing qualifies, no secondary pick is added.

    Step 4 — Output Format
        With secondary:  "1. [Primary] @ odds (EV=+X.XX) | 2. [Secondary] (p=XX%)"
        Without:         "[Primary] @ odds (EV=+X.XX)"

    Step 5 — Reasoning String (analyst voice)
        Natural language first, numbers second.
        Format:
            God of Time gOT-v4 | Future: X (confidence Y%).
            [Home form].
            [Away form].
            Elo: home=X away=Y. xG estimate: home=X.XX away=Y.YY.
            [Interpretation paragraph explaining why the future makes sense.]
            Primary pick: [bet] @ [odds] (EV=+/-X.XX).
            [Compliment pick: [bet] (model probability X%).] ← only if present
            (Technical: λ_home=X.XX λ_away=X.XX | P(H)=X% P(D)=X% P(A)=X%)

    Returns:
        (bet_type, selection_str, confidence, primary_odds, ev, reasoning)
    ─────────────────────────────────────────────────────────────────────────
    """

    # ── Step 1: Determine the future ─────────────────────────────────────

    ph = probs["HOME_WIN"]
    pd = probs["DRAW"]
    pa = probs["AWAY_WIN"]

    # Blend Poisson probs with Elo probs
    if elo_home is not None and elo_away is not None:
        eph, epd, epa = _elo_win_prob(elo_home, elo_away)
        ph = 0.60 * ph + 0.40 * eph
        pd = 0.60 * pd + 0.40 * epd
        pa = 0.60 * pa + 0.40 * epa

    # Renormalise after blending
    total_p = ph + pd + pa
    if total_p > 0:
        ph, pd, pa = ph / total_p, pd / total_p, pa / total_p

    ranked = sorted(
        [("HOME_WIN", ph), ("DRAW", pd), ("AWAY_WIN", pa)],
        key=lambda x: x[1], reverse=True,
    )
    future, raw_conf = ranked[0]

    # If two leading outcomes are very close, call it a draw
    if abs(ranked[0][1] - ranked[1][1]) < ELO_DRAW_BAND:
        future   = "DRAW"
        raw_conf = pd

    confidence = raw_conf

    # ── Step 2: Primary pick (1X2 must match future exactly) ─────────────

    primary_odds = _get_best_odds(match_id, future)
    primary_ev   = round(confidence * primary_odds - 1.0, 4)

    if primary_ev < 0:
        logger.warning(
            "Match %s: primary pick '%s' has negative EV=%.4f — future is paramount, proceeding",
            match_id, future, primary_ev,
        )

    primary_label = (
        BET_LABELS.get(future, future)
        .replace("{home}", home_name)
        .replace("{away}", away_name)
    )

    # ── Step 3: Secondary (compliment) pick ──────────────────────────────

    secondary_label: Optional[str]  = None
    secondary_prob:  float           = 0.0
    secondary_type:  Optional[str]   = None

    if confidence > HIGH_CONFIDENCE_MIN:
        aligned_types = SECONDARY_ALIGNMENT.get(future, [])
        best_prob     = 0.0
        best_type     = None

        for bt in aligned_types:
            mp = probs.get(bt, 0.0)
            if mp >= SECONDARY_PROB_MIN and mp > best_prob:
                best_prob = mp
                best_type = bt

        if best_type is not None:
            secondary_type  = best_type
            secondary_prob  = best_prob
            # Build human-readable label for non-standard bet types
            if best_type.startswith("TOTAL_GOALS_"):
                g = best_type.replace("TOTAL_GOALS_", "")
                secondary_label = f"Exactly {g} Goals in Match"
            elif best_type.startswith("CORRECT_SCORE_"):
                parts = best_type.split("_")
                secondary_label = f"Correct Score {parts[2]}-{parts[3]}"
            elif best_type.startswith("OVER_"):
                secondary_label = f"Over {best_type.replace('OVER_', '')} Goals"
            elif best_type.startswith("UNDER_"):
                secondary_label = f"Under {best_type.replace('UNDER_', '')} Goals"
            elif best_type == "BTTS_YES":
                secondary_label = "Both Teams to Score"
            elif best_type == "BTTS_NO":
                secondary_label = "Both Teams NOT to Score"
            else:
                secondary_label = best_type

    # ── Step 4: selection string ──────────────────────────────────────────

    ev_sign = "+" if primary_ev >= 0 else ""
    if secondary_label is not None:
        selection = (
            f"1. {primary_label} @ {primary_odds:.2f} (EV={ev_sign}{primary_ev:.3f})"
            f" | "
            f"2. {secondary_label} (p={secondary_prob:.0%})"
        )
    else:
        selection = f"{primary_label} @ {primary_odds:.2f} (EV={ev_sign}{primary_ev:.3f})"

    # ── Step 5: Reasoning — analyst voice ────────────────────────────────

    # Elo descriptor
    if elo_home and elo_away:
        elo_diff = elo_home - elo_away
        if abs(elo_diff) < 30:
            elo_narrative = (
                f"Elo ratings indicate a very evenly matched contest "
                f"({home_name}={elo_home}, {away_name}={elo_away})."
            )
        elif elo_diff > 0:
            elo_narrative = (
                f"Elo ratings give {home_name} a clear edge "
                f"({elo_home} vs {elo_away}, Δ={elo_diff:+d})."
            )
        else:
            elo_narrative = (
                f"Elo ratings favour {away_name} on quality "
                f"({elo_home} vs {elo_away}, Δ={elo_diff:+d})."
            )
        elo_str = f"Elo: {home_name}={elo_home} {away_name}={elo_away}."
    else:
        elo_narrative = "Elo data was not available; model relies on Poisson + xG."
        elo_str = "Elo: n/a."

    # xG descriptor
    xg_str = f"xG estimate: {home_name}={home_xg:.2f} {away_name}={away_xg:.2f}."
    if home_xg > away_xg + 0.3:
        xg_narrative = (
            f"The xG model projects {home_name} to create significantly more "
            f"chances (xG {home_xg:.2f} vs {away_xg:.2f}), reinforcing the home threat."
        )
    elif away_xg > home_xg + 0.3:
        xg_narrative = (
            f"Expected goals favour {away_name} despite home advantage "
            f"({away_xg:.2f} vs {home_xg:.2f}), underlining their attacking superiority."
        )
    else:
        xg_narrative = (
            f"Expected goals are balanced ({home_xg:.2f} vs {away_xg:.2f}), "
            f"pointing toward a competitive, close contest."
        )

    # Future interpretation paragraph
    if future == "HOME_WIN":
        interpretation = (
            f"The model's future is a HOME WIN for {home_name} with {confidence:.0%} confidence. "
            f"{elo_narrative} {xg_narrative}"
        )
    elif future == "AWAY_WIN":
        interpretation = (
            f"The model's future is an AWAY WIN for {away_name} with {confidence:.0%} confidence. "
            f"{elo_narrative} {xg_narrative}"
        )
    else:
        interpretation = (
            f"The model's future is a DRAW with {confidence:.0%} confidence. "
            f"Both Elo and xG signals are too close to separate these sides — "
            f"the most likely result is a share of the points. {xg_narrative}"
        )

    # Primary pick line
    primary_line = (
        f"Primary pick: {primary_label} @ {primary_odds:.2f} "
        f"(EV={ev_sign}{primary_ev:.3f})."
    )
    if primary_ev < 0:
        primary_line += " [Note: negative EV — future conviction overrides market value.]"

    # Secondary pick line (only if present)
    secondary_line = ""
    if secondary_label:
        secondary_line = (
            f"\nCompliment pick: {secondary_label} "
            f"(model probability {secondary_prob:.0%}, strictly informational)."
        )

    reasoning = (
        f"God of Time gOT-v4 | Future: {future} (confidence {confidence:.0%}).\n"
        f"{home_form}\n"
        f"{away_form}\n"
        f"{elo_str} {xg_str}\n"
        f"{interpretation}\n"
        f"{primary_line}"
        f"{secondary_line}\n"
        f"(Technical: λ_home={lh:.2f} λ_away={la:.2f} | "
        f"P(H)={ph:.0%} P(D)={pd:.0%} P(A)={pa:.0%})"
    )

    logger.info(
        "Match %s | %s vs %s | Future=%s conf=%.0f%% | %s @ %.2f EV=%+.3f%s",
        match_id, home_name, away_name, future,
        confidence * 100, primary_label, primary_odds, primary_ev,
        f" | +compliment: {secondary_label} (p={secondary_prob:.0%})" if secondary_label else "",
    )

    return future, selection, confidence, primary_odds, primary_ev, reasoning


# ══════════════════════════════════════════════════════════════════════════════
# PART 10 — PREDICT MATCH OUTCOME
# ══════════════════════════════════════════════════════════════════════════════

def predict_match_outcome(
    match_id: int,
    fixture: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Full MK-806 v4 pipeline for a single match.

    Rule 3A: if Elo data is missing for either team, skip the match entirely
    (return None). Logging provides the reason.

    xG is always estimated via estimate_match_xg() — no match ever lacks it.
    """
    league_code = fixture["competition_code"]
    avgs        = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1, "xg": 1.3})
    home_id     = fixture["home_team"]["id"]
    away_id     = fixture["away_team"]["id"]
    home_name   = fixture["home_team"]["name"]
    away_name   = fixture["away_team"]["name"]

    # Fetch DB stats + Elo
    home_stats = _fetch_team_db_stats(home_id)
    away_stats = _fetch_team_db_stats(away_id)
    elo_home   = home_stats.get("elo_rating")
    elo_away   = away_stats.get("elo_rating")

    # ── Rule 3A: Elo gate ─────────────────────────────────────────────────
    if elo_home is None or elo_away is None:
        logger.warning(
            "Skipping match %s (%s vs %s) — Elo missing: home=%s away=%s",
            match_id, home_name, away_name, elo_home, elo_away,
        )
        return None

    # ── Estimate xG (guaranteed — falls back to league averages) ─────────
    home_xg, away_xg = estimate_match_xg(
        home_id, away_id, home_name, away_name, league_code, match_id
    )

    # ── Dixon-Coles attack/defense strengths ─────────────────────────────
    home_att = _compute_strength(home_stats["goals_scored_avg"],   avgs["home"])
    home_def = _compute_strength(home_stats["goals_conceded_avg"], avgs["away"])
    away_att = _compute_strength(away_stats["goals_scored_avg"],   avgs["away"])
    away_def = _compute_strength(away_stats["goals_conceded_avg"], avgs["home"])
    p_lh = home_att * away_def * avgs["home"]
    p_la = away_att * home_def * avgs["away"]

    # ── Blend Poisson + xG + Elo into final λ ────────────────────────────
    lh, la = _blend_lambdas(p_lh, p_la, home_xg, away_xg, elo_home, elo_away)

    # ── Compute full probability catalog ─────────────────────────────────
    probs = _compute_all_probabilities(lh, la)

    # ── Form summaries for reasoning ──────────────────────────────────────
    home_form = _get_team_form_summary(home_id, home_name)
    away_form = _get_team_form_summary(away_id, away_name)

    # ── God of Time decision ──────────────────────────────────────────────
    bet_type, selection, confidence, predicted_odds, ev, reasoning = \
        _god_of_time_select(
            match_id, home_name, away_name, probs,
            lh, la, elo_home, elo_away, home_xg, away_xg,
            home_form, away_form,
        )

    # ── Persist match_analysis ────────────────────────────────────────────
    try:
        supabase.table("match_analysis").upsert({
            "match_id":                   match_id,
            "home_team_attack_strength":  home_att,
            "home_team_defense_strength": home_def,
            "away_team_attack_strength":  away_att,
            "away_team_defense_strength": away_def,
            "predicted_home_goals":       lh,
            "predicted_away_goals":       la,
            "probability_home_win":       probs["HOME_WIN"],
            "probability_draw":           probs["DRAW"],
            "probability_away_win":       probs["AWAY_WIN"],
            "probability_over_25":        probs.get("OVER_2.5", 0),
            "probability_btts":           probs.get("BTTS_YES", 0),
            "data_json": {
                "home_stats":      home_stats,
                "away_stats":      away_stats,
                "league_avgs":     avgs,
                "elo":             {"home": elo_home, "away": elo_away},
                "xg":              {"home": home_xg,  "away": away_xg},
                "blended_lambda":  {"home": lh, "away": la},
                "all_probs":       {k: round(v, 5) for k, v in probs.items()},
            },
        }).execute()
    except Exception as e:
        logger.error("match_analysis save %s: %s", match_id, e)

    # ── Persist prediction ────────────────────────────────────────────────
    try:
        res = supabase.table("predictions").upsert({
            "match_id":         match_id,
            "bet_type":         bet_type,
            "selection":        selection,
            "predicted_odds":   predicted_odds,
            "confidence_score": round(confidence, 4),
            "reasoning":        reasoning,
            "status":           "PENDING",
        }).execute()
        pred_id = res.data[0]["id"] if res.data else None
        logger.info(
            "Prediction saved — match=%s | bet=%s | conf=%.0f%%",
            match_id, bet_type, confidence * 100,
        )
        return {
            "id":               pred_id,
            "match_id":         match_id,
            "bet_type":         bet_type,
            "selection":        selection,
            "predicted_odds":   predicted_odds,
            "confidence_score": confidence,
            "ev":               ev,
            "reasoning":        reasoning,
            "home_team_id":     home_id,
            "away_team_id":     away_id,
        }
    except Exception as e:
        logger.error("Prediction save %s: %s", match_id, e)
        return None


# ══════════════════════════════════════════════════════════════════════════════
# PART 11 — DAILY 10-ODDS SLIP
# ══════════════════════════════════════════════════════════════════════════════

def _extract_primary_odds(pick: Dict[str, Any]) -> float:
    """
    Extract the primary (1X2) bet's decimal odds from the selection string.

    Format: "1. Arsenal to Win @ 1.90 (EV=+0.015) | 2. Over 2.5 Goals (p=72%)"
    or:     "Arsenal to Win @ 1.90 (EV=+0.015)"

    The regex finds the first occurrence of "@ X.XX" and returns that float.
    Falls back to stored predicted_odds.
    """
    m = re.search(r"@\s*([\d.]+)", pick.get("selection", ""))
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return float(pick.get("predicted_odds", 1.90))


def _fetch_big_team_ids() -> set:
    """Return IDs of teams flagged is_big_team = true (kept in sync by Elo update)."""
    try:
        res = supabase.table("teams").select("id").eq("is_big_team", True).execute()
        return {r["id"] for r in (res.data or [])}
    except Exception as e:
        logger.error("big_team_ids fetch: %s", e)
        return set()


def generate_daily_slip(
    predictions: List[Dict[str, Any]],
    slip_date: date,
) -> None:
    """
    Assemble the daily 10-Odds accumulator slip.

    Rules:
      1. Exclude None entries and any below MIN_CONFIDENCE.
      2. Prefer matches involving at least one big team.
      3. Backfill to SLIP_SIZE with non-big-team picks if needed.
      4. Sort by confidence descending.
      5. Combined odds = product of primary-bet odds only.
         Secondary (compliment) picks are purely informational and do not
         affect the accumulator calculation.
    """
    valid = [p for p in predictions
             if p and p.get("confidence_score", 0) >= MIN_CONFIDENCE]

    if not valid:
        logger.warning("No predictions met MIN_CONFIDENCE=%.2f for %s", MIN_CONFIDENCE, slip_date)
        return

    big_ids   = _fetch_big_team_ids()
    big_preds = sorted(
        [p for p in valid
         if p.get("home_team_id") in big_ids or p.get("away_team_id") in big_ids],
        key=lambda p: p["confidence_score"], reverse=True,
    )
    other     = sorted(
        [p for p in valid if p not in big_preds],
        key=lambda p: p["confidence_score"], reverse=True,
    )

    top = big_preds[:SLIP_SIZE]
    if len(top) < SLIP_SIZE:
        gap = SLIP_SIZE - len(top)
        top += other[:gap]
        if gap > 0:
            logger.info(
                "Backfilled %d non-big-team predictions (big_team count=%d)",
                min(gap, len(other)), len(big_preds),
            )

    top.sort(key=lambda p: p["confidence_score"], reverse=True)

    # Combined odds uses PRIMARY bet's real odds only
    total_odds = 1.0
    for p in top:
        total_odds *= _extract_primary_odds(p)

    logger.info("Slip %s: %d picks, combined odds %.2f", slip_date, len(top), total_odds)

    try:
        slip_res = supabase.table("ten_odds_slips").upsert({
            "slip_date":  slip_date.isoformat(),
            "total_odds": round(total_odds, 2),
            "status":     "PENDING",
        }).execute()
        slip_id = slip_res.data[0]["id"]

        for order, pick in enumerate(top, start=1):
            supabase.table("slip_picks").upsert({
                "slip_id":       slip_id,
                "match_id":      pick["match_id"],
                "prediction_id": pick["id"],
                "pick_order":    order,
                "odds_at_time":  _extract_primary_odds(pick),
            }).execute()

        logger.info("Slip saved — id=%s date=%s total_odds=%.2f", slip_id, slip_date, total_odds)
    except Exception as e:
        logger.error("Slip write error: %s", e)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    logger.info("═══ MK-806 God of Football v4 starting ═══")

    # ── Step 1: Competitions ──────────────────────────────────────────────
    logger.info("Step 1: Upserting competitions…")
    upsert_competitions()

    # ── Step 2: Fixtures (today → day-after-tomorrow, inclusive) ─────────
    logger.info("Step 2: Fetching fixtures…")
    now_utc  = datetime.now(timezone.utc)
    end_date = now_utc + timedelta(days=3)   # +3 makes dateTo = day-after-tomorrow
    fixtures = fetch_fixtures_for_date_range(now_utc, end_date)
    logger.info("Fixtures fetched: %d total", len(fixtures))

    for fix in fixtures:
        upsert_team(fix["home_team"])
        upsert_team(fix["away_team"])
        upsert_match(fix)

    # ── Step 3: Elo ratings ───────────────────────────────────────────────
    logger.info("Step 3: Fetching Elo ratings (ClubElo)…")
    fetch_team_elo_ratings()

    # ── Step 4: Odds (h2h ONLY) ───────────────────────────────────────────
    logger.info("Step 4: Fetching h2h odds…")
    for league_code, sport_key in SPORT_KEY_MAPPING.items():
        for event in fetch_odds_for_sport(sport_key):
            mid = match_odds_event_to_fixture(event, fixtures)
            if mid is None:
                logger.debug(
                    "No fixture match for: %s vs %s",
                    event.get("home_team"), event.get("away_team"),
                )
                continue
            for bookie in event.get("bookmakers", []):
                upsert_odds(mid, bookie, event["home_team"], event["away_team"])

    # ── Step 5: Predictions (Kenya today + tomorrow, Elo gate enforced) ──
    logger.info("Step 5: Running gOT-v4 predictions…")
    now_ke       = datetime.now(KENYA_TZ)
    today_ke     = now_ke.date()
    tomorrow_ke  = today_ke + timedelta(days=1)

    target = [
        f for f in fixtures
        if datetime.fromisoformat(f["utc_date"].replace("Z", "+00:00"))
               .astimezone(KENYA_TZ).date()
           in (today_ke, tomorrow_ke)
    ]
    logger.info(
        "Predicting %d fixtures (KE today=%s tomorrow=%s)",
        len(target), today_ke, tomorrow_ke,
    )

    preds: List[Dict[str, Any]] = []
    for fix in target:
        p = predict_match_outcome(fix["id"], fix)
        if p:
            preds.append(p)

    logger.info(
        "Predictions generated: %d/%d (skipped %d — Elo missing)",
        len(preds), len(target), len(target) - len(preds),
    )

    # ── Step 6: Daily slip ────────────────────────────────────────────────
    logger.info("Step 6: Generating daily slip…")
    generate_daily_slip(preds, today_ke)

    logger.info("═══ MK-806 God of Football v4 complete ═══")


if __name__ == "__main__":
    main()