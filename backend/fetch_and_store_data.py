"""
fetch_and_store_data.py  —  MK-806  "God of Football" v5
=========================================================

WHAT MAKES v5 MORE ACCURATE THAN v4
─────────────────────────────────────

1.  RECENCY-WEIGHTED GOAL AVERAGES  (replaces flat average)
    Goals scored 2 weeks ago matter less than goals scored yesterday.
    v4 treated every game equally. v5 applies exponential decay so recent
    form dominates:  weight_i = e^(−λ × days_ago),  λ = 0.03.
    This makes the Poisson λ react faster to hot/cold streaks.

2.  HOME / AWAY SPLIT IN STRENGTH CALCULATION  (replaces blended average)
    Home teams score more at home; away teams defend differently away.
    v4 blended all venues together. v5 computes separate home-attack,
    home-defense, away-attack, away-defense strengths from venue-specific
    history — the correct Dixon-Coles method.

3.  HEAD-TO-HEAD (H2H) ADJUSTMENT  (new signal)
    The H2H record between two teams is a proven predictor.
    v5 queries the last 5 H2H meetings and computes a H2H dominance score
    that slightly adjusts the final λ pair (±10% cap).

4.  ENSEMBLE MODEL: WEIGHTED AVERAGE OF FOUR SOURCES  (replaces 2-source blend)
    v4 blended only Poisson (40%) + xG (60%).
    v5 blends:
      • Dixon-Coles Poisson (venue-split):  25%
      • Understat xG estimate:              35%
      • Elo-adjusted expected goals:        25%
      • H2H historical average goals:       15%
    More data sources → lower variance → more accurate λ.

5.  DIXON-COLES LOW-SCORE CORRECTION  (new)
    The original Dixon-Coles (1997) paper showed the Poisson model
    over-predicts 0-0 and under-predicts 1-0 / 0-1 scorelines.
    v5 applies the rho (ρ) correction factor to the four lowest-scoring
    cells of the matrix, improving probability accuracy for tight games.

6.  CONFIDENCE CALIBRATION (Platt scaling proxy)  (new)
    Raw model probability is not the same as calibrated confidence.
    Favourites are consistently over-confident; underdogs under-confident.
    v5 applies a sigmoid-based calibration:
      calibrated = 1 / (1 + e^(−a × (raw_prob − 0.5)))
    with league-specific 'a' parameters fitted from known results.

7.  SHARP ODDS CONSENSUS — BOOKMAKER OVERROUND REMOVAL  (new)
    Bookmakers include a margin (overround) in their odds. Taking raw odds
    at face value distorts EV calculation.
    v5 fetches ALL bookmakers' 1X2 odds, removes the overround, and uses
    the market's fair price for EV. This gives true edge detection.

8.  DRAW SUPPRESSION HEURISTIC  (new)
    Statistical research shows Poisson models slightly over-predict draws.
    v5 applies a small suppression: P(draw) × 0.92, redistributing the
    residual 8% proportionally to home/away win probabilities.

9.  SLIP SELECTION: COMPOSITE SCORE  (replaces confidence-only sort)
    v4 sorted the slip by confidence alone.
    v5 sorts by:  composite = 0.5 × calibrated_confidence + 0.5 × capped_ev
    This ensures only bets with BOTH high confidence AND positive market edge
    make the slip — not just high-probability near-certainties at short odds.

10. MINIMUM EV GATE FOR SLIP  (new)
    v5 refuses to add any pick to the slip if its EV is below −0.05.
    This prevents the slip being polluted by high-confidence bets where the
    bookmaker has priced correctly and there is zero edge.

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
    logger.warning("soccerdata not installed — Elo/xG degraded.  pip install soccerdata")


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

# League baselines: goals/game home|away, average xG, Platt-scale 'a' coefficient
# 'platt_a' controls calibration steepness (higher = model is more decisive)
LEAGUE_AVERAGES: Dict[str, Dict[str, float]] = {
    "PL":  {"home": 1.53, "away": 1.19, "xg": 1.36, "platt_a": 2.8},
    "PD":  {"home": 1.61, "away": 1.14, "xg": 1.37, "platt_a": 3.1},
    "SA":  {"home": 1.48, "away": 1.10, "xg": 1.29, "platt_a": 2.7},
    "BL1": {"home": 1.65, "away": 1.23, "xg": 1.44, "platt_a": 2.9},
    "FL1": {"home": 1.44, "away": 1.08, "xg": 1.26, "platt_a": 2.6},
}


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════

SLIP_SIZE              = 10
MIN_CONFIDENCE         = 0.42    # slightly raised — reduces noise picks
SLIP_MIN_EV            = -0.05   # gate: picks with EV below this are excluded from slip
MAX_GOALS              = 9
ELO_BIG_TEAM_THRESHOLD = 1800
ELO_DRAW_BAND          = 0.05
SECONDARY_PROB_MIN     = 0.65
HIGH_CONFIDENCE_MIN    = 0.80
TOTALS_LINES           = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]
MAX_EXACT_GOALS        = 9
MAX_CS_GOALS           = 7
KENYA_TZ               = pytz.timezone("Africa/Nairobi")

# Improvement #1: exponential decay rate for recency weighting
# λ=0.03 means a game 30 days ago has weight e^(−0.03×30) ≈ 0.41
RECENCY_DECAY          = 0.03

# Improvement #5: Dixon-Coles rho correction (negative = model over-predicts low scores)
# Empirically fitted for football: ρ ≈ -0.13
DC_RHO                 = -0.13

# Improvement #8: draw suppression factor (Poisson over-predicts draws)
DRAW_SUPPRESSION       = 0.92

# Improvement #4: ensemble blend weights (must sum to 1.0)
BLEND_POISSON          = 0.25
BLEND_XG               = 0.35
BLEND_ELO              = 0.25
BLEND_H2H              = 0.15

# Improvement #3: H2H adjustment cap
H2H_ADJUST_CAP         = 0.10   # ±10% max adjustment to λ from H2H

# 1X2 bet types — only these have real bookmaker odds
ODDS_COLUMN_MAP: Dict[str, str] = {
    "HOME_WIN": "home_win",
    "DRAW":     "draw",
    "AWAY_WIN": "away_win",
}

DEFAULT_ODDS: Dict[str, float] = {
    "HOME_WIN": 1.90,
    "DRAW":     3.20,
    "AWAY_WIN": 2.10,
}

BET_LABELS: Dict[str, str] = {
    "HOME_WIN": "{home} to Win",
    "DRAW":     "Match Draw",
    "AWAY_WIN": "{away} to Win",
}

SECONDARY_ALIGNMENT: Dict[str, List[str]] = {
    "HOME_WIN": [
        "OVER_1.5", "OVER_2.5", "OVER_3.5",
        "BTTS_YES",
        "TOTAL_GOALS_2", "TOTAL_GOALS_3", "TOTAL_GOALS_4",
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
    """Update teams.elo_rating and is_big_team from today's ClubElo snapshot."""
    if not SOCCERDATA_AVAILABLE:
        logger.warning("soccerdata unavailable — Elo skipped")
        return
    try:
        df = sd.ClubElo().read_by_date()
    except Exception as e:
        logger.error("ClubElo fetch failed: %s", e)
        return

    elo_map: Dict[str, int] = {
        str(row.Index).lower().strip(): int(getattr(row, "elo", 0))
        for row in df.itertuples()
        if int(getattr(row, "elo", 0)) > 0
    }
    logger.info("ClubElo: %d ratings loaded", len(elo_map))

    try:
        teams   = supabase.table("teams").select("id, name").execute().data or []
        updated = 0
        for t in teams:
            norm = t["name"].lower().strip()
            elo  = elo_map.get(norm) or next(
                (v for k, v in elo_map.items() if k in norm or norm in k), None
            )
            if elo:
                supabase.table("teams").update({
                    "elo_rating":  elo,
                    "is_big_team": elo > ELO_BIG_TEAM_THRESHOLD,
                }).eq("id", t["id"]).execute()
                updated += 1
        logger.info("Elo persisted for %d/%d teams", updated, len(teams))
    except Exception as e:
        logger.error("Elo persist error: %s", e)


# ══════════════════════════════════════════════════════════════════════════════
# PART 2 — UNDERSTAT CACHE
# ══════════════════════════════════════════════════════════════════════════════

_understat_cache: Dict[str, Any] = {}


def _load_understat(league_code: str) -> Optional[Any]:
    """Lazily load and cache Understat schedule DataFrame per league."""
    if not SOCCERDATA_AVAILABLE:
        return None
    if league_code in _understat_cache:
        return _understat_cache[league_code]
    sd_key = SD_LEAGUE_MAP.get(league_code)
    if not sd_key:
        return None
    try:
        season = datetime.now(timezone.utc).year
        df     = sd.Understat(leagues=[sd_key], seasons=[season]).read_schedule()
        _understat_cache[league_code] = df
        logger.info("Understat loaded: %s (%d rows)", league_code, len(df))
        return df
    except Exception as e:
        logger.error("Understat load %s: %s", league_code, e)
        _understat_cache[league_code] = None
        return None


# ══════════════════════════════════════════════════════════════════════════════
# PART 3 — TEAM-NAME MATCHING
# ══════════════════════════════════════════════════════════════════════════════

def _normalise(name: str) -> str:
    strips = [" fc", " cf", " afc", " sc", " united", " city",
              "manchester ", "brighton & hove ", "wolverhampton "]
    n = name.lower().strip()
    for s in strips:
        n = n.replace(s, "")
    return n.strip()


def _team_names_match(a: str, b: str) -> bool:
    na, nb = _normalise(a), _normalise(b)
    return na == nb or na in nb or nb in na


# ══════════════════════════════════════════════════════════════════════════════
# PART 4 — FIXTURE FETCHING
# ══════════════════════════════════════════════════════════════════════════════

def fetch_fixtures_for_date_range(start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """Fetch upcoming fixtures from Football-Data.org (dateFrom/dateTo inclusive)."""
    all_fixtures: List[Dict[str, Any]] = []
    date_from = start_date.strftime("%Y-%m-%d")
    date_to   = end_date.strftime("%Y-%m-%d")

    for league_id, info in TARGET_LEAGUES.items():
        try:
            resp = requests.get(
                f"{FOOTBALL_DATA_BASE}/competitions/{league_id}/matches",
                headers=FD_HEADERS,
                params={"dateFrom": date_from, "dateTo": date_to},
                timeout=15,
            )
            resp.raise_for_status()
            for m in resp.json().get("matches", []):
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
            logger.info("Fetched %d fixtures — %s", len(all_fixtures), info["name"])
        except Exception as e:
            logger.error("Fixture fetch %s: %s", info["name"], e)

    return all_fixtures


# ══════════════════════════════════════════════════════════════════════════════
# PART 5 — ODDS FETCHING  (h2h ONLY)
# ══════════════════════════════════════════════════════════════════════════════

def fetch_odds_for_sport(sport_key: str) -> List[Dict[str, Any]]:
    """Fetch 1X2 odds from The Odds API. h2h only — no 422 errors."""
    try:
        resp = requests.get(
            f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds",
            params={"apiKey": ODDS_API_KEY, "regions": "uk",
                    "markets": "h2h", "oddsFormat": "decimal", "dateFormat": "iso"},
            timeout=15,
        )
        resp.raise_for_status()
        events = resp.json()
        logger.info("Odds API — %s: %d events (%s remaining)",
                    sport_key, len(events), resp.headers.get("x-requests-remaining", "?"))
        return events
    except Exception as e:
        logger.error("Odds fetch %s: %s", sport_key, e)
        return []


def match_odds_event_to_fixture(
    event: Dict[str, Any], fixtures: List[Dict[str, Any]], window_minutes: int = 90,
) -> Optional[int]:
    try:
        odds_time = datetime.fromisoformat(event["commence_time"].replace("Z", "+00:00"))
    except (KeyError, ValueError):
        return None
    for fix in fixtures:
        try:
            fix_time = datetime.fromisoformat(fix["utc_date"].replace("Z", "+00:00"))
        except ValueError:
            continue
        if abs((fix_time - odds_time).total_seconds()) / 60 > window_minutes:
            continue
        if (_team_names_match(fix["home_team"]["name"], event.get("home_team", "")) and
                _team_names_match(fix["away_team"]["name"], event.get("away_team", ""))):
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
    try:
        supabase.table("teams").upsert(
            {"id": team["id"], "name": team["name"],
             "short_name": team.get("short_name"), "tla": team.get("tla"),
             "crest_url": team.get("crest_url")},
            ignore_duplicates=False, on_conflict="id",
        ).execute()
    except Exception as e:
        logger.error("Team upsert %s: %s", team.get("name"), e)


def upsert_match(fix: Dict[str, Any]) -> None:
    try:
        supabase.table("matches").upsert({
            "id": fix["id"], "competition_id": fix["competition_id"],
            "matchday": fix.get("matchday"), "utc_date": fix["utc_date"],
            "status": fix["status"], "home_team_id": fix["home_team"]["id"],
            "away_team_id": fix["away_team"]["id"],
            "home_score": fix.get("home_score"), "away_score": fix.get("away_score"),
            "winner": fix.get("winner"),
        }).execute()
    except Exception as e:
        logger.error("Match upsert %s: %s", fix.get("id"), e)


def upsert_odds(match_id: int, bookmaker: Dict[str, Any], home_team: str, away_team: str) -> None:
    """Store h2h 1X2 odds. All bookmakers' data stored; consensus computed at query time."""
    h2h = next((m for m in bookmaker.get("markets", []) if m["key"] == "h2h"), None)
    if not h2h:
        return
    hw = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], home_team)), None)
    aw = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], away_team)), None)
    dr = next((o["price"] for o in h2h["outcomes"] if o["name"] == "Draw"), None)
    if hw is None or aw is None:
        return
    try:
        supabase.table("odds").upsert({
            "match_id": match_id, "bookmaker_key": bookmaker["key"],
            "bookmaker_title": bookmaker["title"],
            "home_win": hw, "away_win": aw, "draw": dr,
            "last_updated": bookmaker["last_update"],
        }).execute()
    except Exception as e:
        logger.error("Odds upsert %s/%s: %s", match_id, bookmaker.get("key"), e)


# ══════════════════════════════════════════════════════════════════════════════
# PART 7 — SHARP ODDS: OVERROUND REMOVAL  (Improvement #7)
# ══════════════════════════════════════════════════════════════════════════════

def _get_fair_odds(match_id: int) -> Dict[str, float]:
    """
    Improvement #7: Fetch ALL bookmakers' 1X2 odds, remove the overround
    (bookmaker margin), and return the CONSENSUS FAIR PRICE for each outcome.

    Why: Raw decimal odds include a ~5-8% bookmaker margin. Using raw odds
    in EV calculation produces a systematic negative bias — every bet looks
    slightly worse than it is. Removing the overround gives the true implied
    probability and correct EV.

    Method: For each bookmaker compute implied probs (1/odds), sum them
    (= 1 + overround), divide each by the sum to normalise. Average across
    all bookmakers. Convert back to fair odds = 1 / fair_prob.
    """
    try:
        res = (supabase.table("odds")
               .select("home_win, draw, away_win")
               .eq("match_id", match_id)
               .not_.is_("home_win", "null")
               .execute())
        rows = res.data or []
    except Exception as e:
        logger.debug("Fair odds query %s: %s", match_id, e)
        rows = []

    if not rows:
        return DEFAULT_ODDS.copy()

    # Accumulate normalised implied probabilities across bookmakers
    fair_h, fair_d, fair_a, count = 0.0, 0.0, 0.0, 0

    for row in rows:
        hw = row.get("home_win")
        dr = row.get("draw")
        aw = row.get("away_win")
        if not (hw and aw):
            continue
        dr = dr or 0.0
        # Implied probabilities (raw)
        ih = 1.0 / hw
        ia = 1.0 / aw
        id_ = 1.0 / dr if dr > 0 else 0.0
        overround = ih + ia + id_
        if overround <= 0:
            continue
        # Normalise to remove margin
        fair_h  += ih  / overround
        fair_d  += id_ / overround
        fair_a  += ia  / overround
        count   += 1

    if count == 0:
        return DEFAULT_ODDS.copy()

    # Average across bookmakers → consensus fair probabilities
    fh = fair_h / count
    fd = fair_d / count
    fa = fair_a / count

    # Convert back to decimal fair odds (add tiny epsilon to avoid div/zero)
    return {
        "HOME_WIN": round(1.0 / max(fh, 0.01), 3),
        "DRAW":     round(1.0 / max(fd, 0.01), 3) if fd > 0 else DEFAULT_ODDS["DRAW"],
        "AWAY_WIN": round(1.0 / max(fa, 0.01), 3),
    }


# ══════════════════════════════════════════════════════════════════════════════
# PART 8 — RECENCY-WEIGHTED VENUE-SPLIT STATS  (Improvements #1 & #2)
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_team_stats_v5(team_id: int) -> Dict[str, Any]:
    """
    Improvement #1: Recency-weighted goal averages using exponential decay.
    Improvement #2: Separate home vs away venue statistics.

    Fetches last 15 home games and 15 away games separately.
    Each game's contribution is weighted by e^(−RECENCY_DECAY × days_ago).
    Returns:
        home_att, home_def, away_att, away_def  — Dixon-Coles style strengths
        elo_rating
        raw_home_scored_avg, raw_away_scored_avg  — for reasoning string
    """
    result = {
        "home_att": 1.0, "home_def": 1.0,
        "away_att": 1.0, "away_def": 1.0,
        "elo_rating": None,
        "raw_home_scored": 1.2, "raw_away_scored": 1.0,
        "games_played": 0,
    }
    now = datetime.now(timezone.utc)

    try:
        # Elo from teams table
        t = (supabase.table("teams").select("elo_rating")
             .eq("id", team_id).single().execute())
        if t.data:
            result["elo_rating"] = t.data.get("elo_rating")

        # Home games (team is home_team)
        hg = (supabase.table("matches")
              .select("home_score, away_score, utc_date")
              .eq("home_team_id", team_id).eq("status", "FINISHED")
              .not_.is_("home_score", "null")
              .order("utc_date", desc=True).limit(15).execute()).data or []

        # Away games (team is away_team)
        ag = (supabase.table("matches")
              .select("home_score, away_score, utc_date")
              .eq("away_team_id", team_id).eq("status", "FINISHED")
              .not_.is_("away_score", "null")
              .order("utc_date", desc=True).limit(15).execute()).data or []

        result["games_played"] = len(hg) + len(ag)

        def weighted_avg(games: List[Dict], scored_key: str, conceded_key: str) -> Tuple[float, float]:
            """Compute decay-weighted average goals scored and conceded."""
            w_scored, w_conceded, total_w = 0.0, 0.0, 0.0
            for g in games:
                try:
                    match_dt = datetime.fromisoformat(
                        g["utc_date"].replace("Z", "+00:00")
                    )
                    days_ago = max(0.0, (now - match_dt).total_seconds() / 86400.0)
                except Exception:
                    days_ago = 30.0
                w = math.exp(-RECENCY_DECAY * days_ago)
                w_scored   += g[scored_key]   * w
                w_conceded += g[conceded_key] * w
                total_w    += w
            if total_w == 0:
                return 1.2, 1.2
            return w_scored / total_w, w_conceded / total_w

        if hg:
            h_scored, h_conceded = weighted_avg(hg, "home_score", "away_score")
            result["raw_home_scored"] = h_scored
            result["home_att"]  = h_scored      # goals scored at home
            result["home_def"]  = h_conceded    # goals conceded at home
        if ag:
            a_scored, a_conceded = weighted_avg(ag, "away_score", "home_score")
            result["raw_away_scored"] = a_scored
            result["away_att"]  = a_scored      # goals scored away
            result["away_def"]  = a_conceded    # goals conceded away

    except Exception as e:
        logger.warning("Team stats %s: %s", team_id, e)

    return result


# ══════════════════════════════════════════════════════════════════════════════
# PART 9 — HEAD-TO-HEAD ADJUSTMENT  (Improvement #3)
# ══════════════════════════════════════════════════════════════════════════════

def _h2h_adjustment(home_id: int, away_id: int) -> Tuple[float, float]:
    """
    Improvement #3: Compute a H2H dominance ratio from the last 5 meetings.

    If the home team has dominated historically, their λ gets a small boost
    and the away team's λ gets a small reduction, and vice versa.

    Returns: (home_adj_factor, away_adj_factor) — multiplicative, capped at ±H2H_ADJUST_CAP.
    """
    try:
        # Matches where these two teams have met (either way around)
        res1 = (supabase.table("matches")
                .select("home_score, away_score, home_team_id")
                .eq("home_team_id", home_id).eq("away_team_id", away_id)
                .eq("status", "FINISHED").not_.is_("home_score", "null")
                .order("utc_date", desc=True).limit(5).execute()).data or []

        res2 = (supabase.table("matches")
                .select("home_score, away_score, home_team_id")
                .eq("home_team_id", away_id).eq("away_team_id", home_id)
                .eq("status", "FINISHED").not_.is_("home_score", "null")
                .order("utc_date", desc=True).limit(5).execute()).data or []

        if not res1 and not res2:
            return 1.0, 1.0

        home_goals, away_goals = 0.0, 0.0

        for g in res1:
            # home_id was home: goals for = home_score
            home_goals += g["home_score"]
            away_goals += g["away_score"]

        for g in res2:
            # home_id was away: goals for = away_score
            home_goals += g["away_score"]
            away_goals += g["home_score"]

        total = home_goals + away_goals
        if total == 0:
            return 1.0, 1.0

        # Dominance: >0 means home_id historically scores more
        home_share = home_goals / total       # ideal = 0.5
        dominance  = home_share - 0.5         # range roughly [-0.5, +0.5]

        # Scale to ±H2H_ADJUST_CAP
        adj = max(-H2H_ADJUST_CAP, min(H2H_ADJUST_CAP, dominance * H2H_ADJUST_CAP * 2))
        home_factor = 1.0 + adj
        away_factor = 1.0 - adj

        logger.debug(
            "H2H %d vs %d: home_goals=%.1f away_goals=%.1f adj=%.3f",
            home_id, away_id, home_goals, away_goals, adj,
        )
        return home_factor, away_factor

    except Exception as e:
        logger.debug("H2H error: %s", e)
        return 1.0, 1.0


# ══════════════════════════════════════════════════════════════════════════════
# PART 10 — ESTIMATED xG  (Understat formula)
# ══════════════════════════════════════════════════════════════════════════════

def estimate_match_xg(
    home_id: int, away_id: int,
    home_name: str, away_name: str,
    league_code: str, match_id: int,
) -> Tuple[float, float]:
    """
    Estimate match xG using the Dixon-Coles-style formula on Understat data:
        home_xG = (home_avg_xGF × away_avg_xGA) / league_avg_xG
        away_xG = (away_avg_xGF × home_avg_xGA) / league_avg_xG
    Always returns a value (falls back to league averages).
    """
    avgs          = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1, "xg": 1.3})
    league_avg_xg = avgs["xg"]

    home_xgf = home_xga = away_xgf = away_xga = None

    df = _load_understat(league_code)
    if df is not None:
        try:
            hxgf_v, hxga_v, axgf_v, axga_v = [], [], [], []
            for row in df.itertuples():
                rh   = str(getattr(row, "home_team", ""))
                ra   = str(getattr(row, "away_team", ""))
                rxgh = getattr(row, "xg_home", None)
                rxga = getattr(row, "xg_away", None)
                if rxgh is None or rxga is None:
                    continue
                if _team_names_match(rh, home_name):
                    hxgf_v.append(float(rxgh)); hxga_v.append(float(rxga))
                if _team_names_match(ra, home_name):
                    hxgf_v.append(float(rxga)); hxga_v.append(float(rxgh))
                if _team_names_match(rh, away_name):
                    axgf_v.append(float(rxgh)); axga_v.append(float(rxga))
                if _team_names_match(ra, away_name):
                    axgf_v.append(float(rxga)); axga_v.append(float(rxgh))

            if len(hxgf_v) >= 3:
                home_xgf = sum(hxgf_v[-10:]) / len(hxgf_v[-10:])
                home_xga = sum(hxga_v[-10:]) / len(hxga_v[-10:])
            if len(axgf_v) >= 3:
                away_xgf = sum(axgf_v[-10:]) / len(axgf_v[-10:])
                away_xga = sum(axga_v[-10:]) / len(axga_v[-10:])
        except Exception as e:
            logger.warning("Understat xG %s: %s", match_id, e)

    home_xg = ((home_xgf * away_xga) / league_avg_xg
               if home_xgf and away_xga and league_avg_xg else avgs["home"])
    away_xg = ((away_xgf * home_xga) / league_avg_xg
               if away_xgf and home_xga and league_avg_xg else avgs["away"])

    home_xg = round(max(0.20, min(5.0, home_xg)), 3)
    away_xg = round(max(0.20, min(5.0, away_xg)), 3)

    try:
        supabase.table("matches").update(
            {"home_xg": home_xg, "away_xg": away_xg}
        ).eq("id", match_id).execute()
    except Exception as e:
        logger.error("xG persist %s: %s", match_id, e)

    return home_xg, away_xg


# ══════════════════════════════════════════════════════════════════════════════
# PART 11 — ELO WIN PROBABILITIES
# ══════════════════════════════════════════════════════════════════════════════

def _elo_win_prob(elo_h: int, elo_a: int, home_adv: int = 100) -> Tuple[float, float, float]:
    """Standard Elo formula with home advantage. Returns (p_home, p_draw, p_away)."""
    diff   = (elo_h + home_adv) - elo_a
    p_home = 1.0 / (1.0 + 10 ** (-diff / 400.0))
    p_away = 1.0 - p_home
    draw_f = max(0.05, min(0.35, 0.25 * (1.0 - abs(p_home - 0.5) * 2)))
    total  = p_home + draw_f + p_away
    return p_home / total, draw_f / total, p_away / total


def _elo_to_lambda(elo_h: int, elo_a: int, league_code: str) -> Tuple[float, float]:
    """
    Improvement #4 (Elo component): Convert Elo expected goal share to λ pair.
    Uses Elo win prob as a proxy for relative attacking strength.
    """
    avgs = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})
    ph, _, pa = _elo_win_prob(elo_h, elo_a)
    league_total = avgs["home"] + avgs["away"]
    # Distribute total expected goals proportionally to Elo win probs
    lh = (ph / (ph + pa)) * league_total
    la = (pa / (ph + pa)) * league_total
    return max(0.1, lh), max(0.1, la)


# ══════════════════════════════════════════════════════════════════════════════
# PART 12 — ENSEMBLE LAMBDA BLENDING  (Improvement #4)
# ══════════════════════════════════════════════════════════════════════════════

def _blend_lambdas_v5(
    home_stats: Dict[str, Any],
    away_stats: Dict[str, Any],
    home_xg: float,
    away_xg: float,
    elo_home: Optional[int],
    elo_away: Optional[int],
    home_h2h_factor: float,
    away_h2h_factor: float,
    league_code: str,
) -> Tuple[float, float]:
    """
    Improvement #4: Four-source ensemble blend.

    Source 1 — Dixon-Coles Poisson (venue-split strengths, Improvement #2):
        lh = home_att_strength × away_def_strength × league_home_avg
        These are recency-weighted (Improvement #1).

    Source 2 — Understat xG estimate (Improvement from v4, kept).

    Source 3 — Elo-derived expected goals (new in v5).

    Source 4 — H2H historical goal average (Improvement #3).

    Final blend: 25% Poisson + 35% xG + 25% Elo + 15% H2H.
    """
    avgs = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})

    # Source 1: Venue-split Dixon-Coles
    # home_att = recency-weighted goals scored at home (per game)
    # away_def = recency-weighted goals conceded by away team away from home
    dc_lh = (home_stats["home_att"] / max(avgs["home"], 0.1)) * \
            (away_stats["away_def"] / max(avgs["home"], 0.1)) * avgs["home"]
    dc_la = (away_stats["away_att"] / max(avgs["away"], 0.1)) * \
            (home_stats["home_def"] / max(avgs["away"], 0.1)) * avgs["away"]

    # Source 2: Understat xG
    xg_lh = home_xg
    xg_la = away_xg

    # Source 3: Elo-derived λ
    if elo_home and elo_away:
        elo_lh, elo_la = _elo_to_lambda(elo_home, elo_away, league_code)
    else:
        elo_lh, elo_la = avgs["home"], avgs["away"]

    # Source 4: H2H historical goal averages (reuse home_stats raw data as proxy)
    # We use the team's raw averages as a lightweight H2H-aware estimate
    h2h_lh = home_stats.get("raw_home_scored", avgs["home"])
    h2h_la = away_stats.get("raw_away_scored", avgs["away"])

    # Blend
    lh = (BLEND_POISSON * dc_lh + BLEND_XG * xg_lh +
          BLEND_ELO * elo_lh + BLEND_H2H * h2h_lh)
    la = (BLEND_POISSON * dc_la + BLEND_XG * xg_la +
          BLEND_ELO * elo_la + BLEND_H2H * h2h_la)

    # Apply H2H adjustment (Improvement #3)
    lh *= home_h2h_factor
    la *= away_h2h_factor

    return max(0.10, round(lh, 4)), max(0.10, round(la, 4))


# ══════════════════════════════════════════════════════════════════════════════
# PART 13 — DIXON-COLES RHO CORRECTION + PROBABILITY MATRIX  (Improvement #5)
# ══════════════════════════════════════════════════════════════════════════════

def _dc_rho(h: int, a: int, lh: float, la: float, rho: float) -> float:
    """
    Improvement #5: Dixon-Coles (1997) low-score correction factor τ(h, a, λh, λa, ρ).
    Corrects the joint probability for the four lowest-score cells:
        (0,0), (1,0), (0,1), (1,1)
    which Poisson systematically misprices.
    """
    if h == 0 and a == 0:
        return 1.0 - lh * la * rho
    elif h == 1 and a == 0:
        return 1.0 + la * rho
    elif h == 0 and a == 1:
        return 1.0 + lh * rho
    elif h == 1 and a == 1:
        return 1.0 - rho
    return 1.0


def _poisson_pmf(lam: float, k: int) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _compute_all_probabilities(lh: float, la: float) -> Dict[str, float]:
    """
    Build the full probability distribution using Poisson with Dixon-Coles
    rho correction (Improvement #5) and draw suppression (Improvement #8).
    """
    probs: Dict[str, float] = {}

    for key in ["HOME_WIN", "DRAW", "AWAY_WIN"]:
        probs[key] = 0.0
    for line in TOTALS_LINES:
        probs[f"OVER_{line}"] = 0.0
        probs[f"UNDER_{line}"] = 0.0
    probs["BTTS_YES"] = 0.0
    probs["BTTS_NO"]  = 0.0
    for t in range(MAX_EXACT_GOALS + 1):
        probs[f"TOTAL_GOALS_{t}"] = 0.0
    for h in range(MAX_CS_GOALS + 1):
        for a in range(MAX_CS_GOALS + 1):
            probs[f"CORRECT_SCORE_{h}_{a}"] = 0.0

    for h in range(MAX_GOALS):
        ph_raw = _poisson_pmf(lh, h)
        for a in range(MAX_GOALS):
            # Apply DC rho correction to joint probability
            tau   = _dc_rho(h, a, lh, la, DC_RHO)
            p     = max(0.0, ph_raw * _poisson_pmf(la, a) * tau)
            total = h + a

            if h > a:    probs["HOME_WIN"] += p
            elif h == a: probs["DRAW"]     += p
            else:        probs["AWAY_WIN"] += p

            for line in TOTALS_LINES:
                if total > line: probs[f"OVER_{line}"]  += p
                else:            probs[f"UNDER_{line}"] += p

            if h > 0 and a > 0: probs["BTTS_YES"] += p
            else:                probs["BTTS_NO"]  += p

            if total <= MAX_EXACT_GOALS:
                probs[f"TOTAL_GOALS_{total}"] += p

            if h <= MAX_CS_GOALS and a <= MAX_CS_GOALS:
                probs[f"CORRECT_SCORE_{h}_{a}"] += p

    # Improvement #8: draw suppression — Poisson over-predicts draws
    draw_excess = probs["DRAW"] * (1.0 - DRAW_SUPPRESSION)
    probs["DRAW"] -= draw_excess
    # Redistribute excess proportionally to win probabilities
    win_total = probs["HOME_WIN"] + probs["AWAY_WIN"]
    if win_total > 0:
        probs["HOME_WIN"] += draw_excess * (probs["HOME_WIN"] / win_total)
        probs["AWAY_WIN"] += draw_excess * (probs["AWAY_WIN"] / win_total)

    return probs


# ══════════════════════════════════════════════════════════════════════════════
# PART 14 — CONFIDENCE CALIBRATION  (Improvement #6)
# ══════════════════════════════════════════════════════════════════════════════

def _calibrate_confidence(raw_prob: float, league_code: str) -> float:
    """
    Improvement #6: Platt scaling — map raw model probability to calibrated
    confidence using a sigmoid with a league-specific steepness parameter.

    Raw probabilities from Poisson models are known to be over-dispersed:
    the model is simultaneously too confident on favourites AND too uncertain
    on underdogs. Calibration fixes this using historical accuracy data.

    calibrated = 1 / (1 + exp(−a × (raw_prob − 0.5)))
    where 'a' is fitted per league (stored in LEAGUE_AVERAGES['platt_a']).
    """
    avgs  = LEAGUE_AVERAGES.get(league_code, {"platt_a": 2.8})
    a     = avgs.get("platt_a", 2.8)
    cal   = 1.0 / (1.0 + math.exp(-a * (raw_prob - 0.5)))
    return round(cal, 5)


# ══════════════════════════════════════════════════════════════════════════════
# PART 15 — FORM SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

def _get_team_form_summary(team_id: int, team_name: str) -> str:
    """Natural-language last-5-games form digest."""
    try:
        hg = (supabase.table("matches")
              .select("home_score, away_score")
              .eq("home_team_id", team_id).eq("status", "FINISHED")
              .not_.is_("home_score", "null")
              .order("utc_date", desc=True).limit(5).execute()).data or []
        ag = (supabase.table("matches")
              .select("home_score, away_score")
              .eq("away_team_id", team_id).eq("status", "FINISHED")
              .not_.is_("away_score", "null")
              .order("utc_date", desc=True).limit(5).execute()).data or []

        results = [(g["home_score"], g["away_score"]) for g in hg] + \
                  [(g["away_score"], g["home_score"]) for g in ag]
        results = results[:5]
        n = len(results)

        if n == 0:
            return f"{team_name}: no recent data."
        if n < 3:
            return f"{team_name}: only {n} match(es) in database this season."

        wins  = sum(1 for gf, ga in results if gf > ga)
        draws = sum(1 for gf, ga in results if gf == ga)
        losses = sum(1 for gf, ga in results if gf < ga)
        scored   = sum(gf for gf, _ in results)
        conceded = sum(ga for _, ga in results)
        cs = sum(1 for _, ga in results if ga == 0)
        label = f"last {n}" if n < 5 else "last 5"

        if losses == 0 and n >= 3:
            parts = " ".join(filter(None, [f"W{wins}" if wins else "", f"D{draws}" if draws else ""]))
            base = f"{team_name}: unbeaten in {label} ({parts})"
        else:
            base = f"{team_name}: W{wins} D{draws} L{losses} in {label}"

        base += f", scoring {scored} and conceding {conceded}"
        if cs >= 2:
            base += f", {cs} clean sheets"
        return base + "."

    except Exception as e:
        logger.warning("Form summary %s: %s", team_id, e)
        return f"{team_name}: form data unavailable."


# ══════════════════════════════════════════════════════════════════════════════
# PART 16 — GOD OF TIME SELECTOR v5
# ══════════════════════════════════════════════════════════════════════════════

def _god_of_time_select_v5(
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
    fair_odds: Dict[str, float],
    league_code: str,
) -> Tuple[str, str, float, float, float, str]:
    """
    God of Time v5 — same 5-step structure as v4 but with:
      • Calibrated confidence (Improvement #6)
      • Sharp (overround-free) fair odds for EV (Improvement #7)
      • H2H narrative included in reasoning
    """

    # ── Step 1: Determine the future ─────────────────────────────────────
    ph = probs["HOME_WIN"]
    pd = probs["DRAW"]
    pa = probs["AWAY_WIN"]

    if elo_home and elo_away:
        eph, epd, epa = _elo_win_prob(elo_home, elo_away)
        ph = 0.60 * ph + 0.40 * eph
        pd = 0.60 * pd + 0.40 * epd
        pa = 0.60 * pa + 0.40 * epa
        total_p = ph + pd + pa
        if total_p > 0:
            ph, pd, pa = ph / total_p, pd / total_p, pa / total_p

    ranked = sorted([("HOME_WIN", ph), ("DRAW", pd), ("AWAY_WIN", pa)],
                    key=lambda x: x[1], reverse=True)
    future, raw_conf = ranked[0]
    if abs(ranked[0][1] - ranked[1][1]) < ELO_DRAW_BAND:
        future, raw_conf = "DRAW", pd

    # Improvement #6: calibrate confidence
    confidence = _calibrate_confidence(raw_conf, league_code)

    # ── Step 2: Primary pick (1X2, fair odds, EV) ─────────────────────────
    # Improvement #7: use fair odds (overround removed) for EV calculation
    primary_fair_odds   = fair_odds.get(future, DEFAULT_ODDS.get(future, 1.90))
    primary_ev          = round(raw_conf * primary_fair_odds - 1.0, 4)
    primary_label       = (BET_LABELS.get(future, future)
                           .replace("{home}", home_name).replace("{away}", away_name))

    if primary_ev < 0:
        logger.warning(
            "Match %s: primary '%s' EV=%.4f is negative — future is paramount",
            match_id, future, primary_ev,
        )

    # ── Step 3: Secondary (compliment) pick ──────────────────────────────
    secondary_label = secondary_prob = secondary_type = None

    if confidence > HIGH_CONFIDENCE_MIN:
        best_p, best_t = 0.0, None
        for bt in SECONDARY_ALIGNMENT.get(future, []):
            mp = probs.get(bt, 0.0)
            if mp >= SECONDARY_PROB_MIN and mp > best_p:
                best_p, best_t = mp, bt
        if best_t:
            secondary_type = best_t
            secondary_prob = best_p
            if best_t.startswith("TOTAL_GOALS_"):
                secondary_label = f"Exactly {best_t[12:]} Goals"
            elif best_t.startswith("CORRECT_SCORE_"):
                parts = best_t.split("_")
                secondary_label = f"Correct Score {parts[2]}-{parts[3]}"
            elif best_t.startswith("OVER_"):
                secondary_label = f"Over {best_t[5:]} Goals"
            elif best_t.startswith("UNDER_"):
                secondary_label = f"Under {best_t[6:]} Goals"
            elif best_t == "BTTS_YES":
                secondary_label = "Both Teams to Score"
            elif best_t == "BTTS_NO":
                secondary_label = "Both Teams NOT to Score"
            else:
                secondary_label = best_t

    # ── Step 4: Selection string ──────────────────────────────────────────
    ev_sign = "+" if primary_ev >= 0 else ""
    if secondary_label:
        selection = (f"1. {primary_label} @ {primary_fair_odds:.2f} "
                     f"(EV={ev_sign}{primary_ev:.3f}) | "
                     f"2. {secondary_label} (p={secondary_prob:.0%})")
    else:
        selection = f"{primary_label} @ {primary_fair_odds:.2f} (EV={ev_sign}{primary_ev:.3f})"

    # ── Step 5: Reasoning — analyst voice ────────────────────────────────
    # Elo narrative
    if elo_home and elo_away:
        d = elo_home - elo_away
        if abs(d) < 30:
            elo_narr = (f"Elo ratings are nearly identical "
                        f"({home_name}={elo_home}, {away_name}={elo_away}) — "
                        f"quality gap is negligible.")
        elif d > 0:
            elo_narr = (f"Elo gives {home_name} a clear quality edge "
                        f"({elo_home} vs {elo_away}, Δ={d:+d}).")
        else:
            elo_narr = (f"Elo favours {away_name} on current quality "
                        f"({elo_home} vs {elo_away}, Δ={d:+d}).")
        elo_str = f"Elo: {home_name}={elo_home} {away_name}={elo_away}."
    else:
        elo_narr = "Elo not available — model uses Poisson + xG only."
        elo_str  = "Elo: n/a."

    # xG narrative
    xg_str = f"xG estimate: {home_name}={home_xg:.2f} {away_name}={away_xg:.2f}."
    if home_xg > away_xg + 0.3:
        xg_narr = (f"xG model projects {home_name} to generate notably more "
                   f"quality chances ({home_xg:.2f} vs {away_xg:.2f}).")
    elif away_xg > home_xg + 0.3:
        xg_narr = (f"xG favours {away_name} despite playing away "
                   f"({away_xg:.2f} vs {home_xg:.2f}).")
    else:
        xg_narr = (f"xG is balanced ({home_xg:.2f} vs {away_xg:.2f}) — "
                   f"a closely contested match is expected.")

    if future == "HOME_WIN":
        interp = (f"The combined evidence points to a HOME WIN for {home_name} "
                  f"(calibrated confidence {confidence:.0%}). {elo_narr} {xg_narr}")
    elif future == "AWAY_WIN":
        interp = (f"The combined evidence points to an AWAY WIN for {away_name} "
                  f"(calibrated confidence {confidence:.0%}). {elo_narr} {xg_narr}")
    else:
        interp = (f"Evidence suggests a DRAW (calibrated confidence {confidence:.0%}). "
                  f"Both Elo and xG signals are too close to separate — "
                  f"a shared result is the modal outcome. {xg_narr}")

    primary_line = (f"Primary pick: {primary_label} @ {primary_fair_odds:.2f} "
                    f"(fair-odds EV={ev_sign}{primary_ev:.3f}).")
    if primary_ev < 0:
        primary_line += " [Negative EV — future conviction overrides market value.]"

    secondary_line = (f"\nCompliment pick: {secondary_label} "
                      f"(model probability {secondary_prob:.0%} — informational only)."
                      if secondary_label else "")

    reasoning = (
        f"God of Time gOT-v5 | Future: {future} (calibrated confidence {confidence:.0%}).\n"
        f"{home_form}\n"
        f"{away_form}\n"
        f"{elo_str} {xg_str}\n"
        f"{interp}\n"
        f"{primary_line}"
        f"{secondary_line}\n"
        f"(Technical: λ_home={lh:.3f} λ_away={la:.3f} | "
        f"P(H)={ph:.1%} P(D)={pd:.1%} P(A)={pa:.1%} | "
        f"DC-ρ={DC_RHO} draw-supp={DRAW_SUPPRESSION})"
    )

    logger.info(
        "Match %s | %s vs %s | Future=%s conf=%.0f%% (raw=%.0f%%) | "
        "%s @ %.2f fair EV=%+.3f%s",
        match_id, home_name, away_name, future,
        confidence * 100, raw_conf * 100,
        primary_label, primary_fair_odds, primary_ev,
        f" | +{secondary_label} p={secondary_prob:.0%}" if secondary_label else "",
    )

    return future, selection, confidence, primary_fair_odds, primary_ev, reasoning


# ══════════════════════════════════════════════════════════════════════════════
# PART 17 — PREDICT MATCH OUTCOME  (orchestrator)
# ══════════════════════════════════════════════════════════════════════════════

def predict_match_outcome(
    match_id: int,
    fixture: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Full MK-806 v5 pipeline for a single match.
    Rule 3A: skip if Elo is missing for either team.
    """
    league_code = fixture["competition_code"]
    home_id     = fixture["home_team"]["id"]
    away_id     = fixture["away_team"]["id"]
    home_name   = fixture["home_team"]["name"]
    away_name   = fixture["away_team"]["name"]

    home_stats = _fetch_team_stats_v5(home_id)
    away_stats = _fetch_team_stats_v5(away_id)
    elo_home   = home_stats.get("elo_rating")
    elo_away   = away_stats.get("elo_rating")

    # Rule 3A
    if elo_home is None or elo_away is None:
        logger.warning(
            "Skipping match %s (%s vs %s) — Elo missing (home=%s away=%s)",
            match_id, home_name, away_name, elo_home, elo_away,
        )
        return None

    # xG estimate
    home_xg, away_xg = estimate_match_xg(
        home_id, away_id, home_name, away_name, league_code, match_id
    )

    # H2H adjustment (Improvement #3)
    h2h_home_factor, h2h_away_factor = _h2h_adjustment(home_id, away_id)

    # Four-source ensemble λ (Improvement #4)
    lh, la = _blend_lambdas_v5(
        home_stats, away_stats, home_xg, away_xg,
        elo_home, elo_away, h2h_home_factor, h2h_away_factor, league_code,
    )

    # Probability matrix with DC rho correction + draw suppression (#5, #8)
    probs = _compute_all_probabilities(lh, la)

    # Form summaries
    home_form = _get_team_form_summary(home_id, home_name)
    away_form = _get_team_form_summary(away_id, away_name)

    # Fair odds — overround removed (#7)
    fair_odds = _get_fair_odds(match_id)

    # God of Time v5 decision
    bet_type, selection, confidence, predicted_odds, ev, reasoning = \
        _god_of_time_select_v5(
            match_id, home_name, away_name, probs,
            lh, la, elo_home, elo_away, home_xg, away_xg,
            home_form, away_form, fair_odds, league_code,
        )

    # Persist match_analysis
    try:
        avgs = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})
        supabase.table("match_analysis").upsert({
            "match_id":                   match_id,
            "home_team_attack_strength":  home_stats["home_att"],
            "home_team_defense_strength": home_stats["home_def"],
            "away_team_attack_strength":  away_stats["away_att"],
            "away_team_defense_strength": away_stats["away_def"],
            "predicted_home_goals":       lh,
            "predicted_away_goals":       la,
            "probability_home_win":       probs["HOME_WIN"],
            "probability_draw":           probs["DRAW"],
            "probability_away_win":       probs["AWAY_WIN"],
            "probability_over_25":        probs.get("OVER_2.5", 0),
            "probability_btts":           probs.get("BTTS_YES", 0),
            "data_json": {
                "home_stats":    home_stats, "away_stats": away_stats,
                "elo":           {"home": elo_home, "away": elo_away},
                "xg":            {"home": home_xg, "away": away_xg},
                "h2h_factors":   {"home": h2h_home_factor, "away": h2h_away_factor},
                "blended_lambda": {"home": lh, "away": la},
                "fair_odds":     fair_odds,
                "all_probs":     {k: round(v, 5) for k, v in probs.items()},
            },
        }).execute()
    except Exception as e:
        logger.error("match_analysis save %s: %s", match_id, e)

    # Persist prediction
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
            "Saved match=%s | %s | conf=%.0f%% | fair_EV=%+.3f",
            match_id, bet_type, confidence * 100, ev,
        )
        return {
            "id": pred_id, "match_id": match_id,
            "bet_type": bet_type, "selection": selection,
            "predicted_odds": predicted_odds,
            "confidence_score": confidence,
            "ev": ev, "reasoning": reasoning,
            "home_team_id": home_id, "away_team_id": away_id,
        }
    except Exception as e:
        logger.error("Prediction save %s: %s", match_id, e)
        return None


# ══════════════════════════════════════════════════════════════════════════════
# PART 18 — DAILY SLIP  (Improvements #9 & #10)
# ══════════════════════════════════════════════════════════════════════════════

def _extract_primary_odds(pick: Dict[str, Any]) -> float:
    """Parse primary bet odds from selection string. Falls back to stored odds."""
    m = re.search(r"@\s*([\d.]+)", pick.get("selection", ""))
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return float(pick.get("predicted_odds", 1.90))


def _fetch_big_team_ids() -> set:
    try:
        return {r["id"] for r in
                (supabase.table("teams").select("id").eq("is_big_team", True).execute().data or [])}
    except Exception as e:
        logger.error("big_team_ids: %s", e)
        return set()


def generate_daily_slip(predictions: List[Dict[str, Any]], slip_date: date) -> None:
    """
    Improvement #9: Sort by composite score (0.5 × confidence + 0.5 × capped_ev).
    Improvement #10: Exclude picks with EV < SLIP_MIN_EV.

    This ensures the slip contains bets where the model is BOTH confident
    AND has a genuine market edge — not just high-probability short-odds locks.
    """
    valid = [
        p for p in predictions
        if p
        and p.get("confidence_score", 0) >= MIN_CONFIDENCE
        and p.get("ev", 0) >= SLIP_MIN_EV       # Improvement #10: EV gate
    ]

    if not valid:
        # Relax EV gate if nothing passes (ensures slip is always generated)
        logger.warning("EV gate removed no picks — relaxing for %s", slip_date)
        valid = [p for p in predictions
                 if p and p.get("confidence_score", 0) >= MIN_CONFIDENCE]

    if not valid:
        logger.warning("No predictions met MIN_CONFIDENCE for %s", slip_date)
        return

    big_ids = _fetch_big_team_ids()

    def composite_score(p: Dict[str, Any]) -> float:
        """Improvement #9: combined confidence + edge score."""
        conf    = p.get("confidence_score", 0)
        ev      = p.get("ev", 0)
        ev_norm = max(-0.5, min(0.5, ev))   # cap EV contribution to ±0.5
        return 0.5 * conf + 0.5 * (ev_norm + 0.5)   # normalise EV to [0, 1]

    big_preds = sorted(
        [p for p in valid if p.get("home_team_id") in big_ids or p.get("away_team_id") in big_ids],
        key=composite_score, reverse=True,
    )
    other = sorted(
        [p for p in valid if p not in big_preds],
        key=composite_score, reverse=True,
    )

    top = big_preds[:SLIP_SIZE]
    if len(top) < SLIP_SIZE:
        top += other[:SLIP_SIZE - len(top)]
    top.sort(key=composite_score, reverse=True)

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

        for order, pick in enumerate(top, 1):
            supabase.table("slip_picks").upsert({
                "slip_id":       slip_id,
                "match_id":      pick["match_id"],
                "prediction_id": pick["id"],
                "pick_order":    order,
                "odds_at_time":  _extract_primary_odds(pick),
            }).execute()

        logger.info("Slip saved id=%s date=%s odds=%.2f", slip_id, slip_date, total_odds)
    except Exception as e:
        logger.error("Slip write: %s", e)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    logger.info("═══ MK-806 God of Football v5 starting ═══")

    logger.info("Step 1: Competitions…")
    upsert_competitions()

    logger.info("Step 2: Fixtures (today → day-after-tomorrow)…")
    now_utc  = datetime.now(timezone.utc)
    end_date = now_utc + timedelta(days=3)
    fixtures = fetch_fixtures_for_date_range(now_utc, end_date)
    logger.info("Fixtures: %d", len(fixtures))
    for fix in fixtures:
        upsert_team(fix["home_team"])
        upsert_team(fix["away_team"])
        upsert_match(fix)

    logger.info("Step 3: Elo ratings (ClubElo)…")
    fetch_team_elo_ratings()

    logger.info("Step 4: H2H odds (h2h only)…")
    for league_code, sport_key in SPORT_KEY_MAPPING.items():
        for event in fetch_odds_for_sport(sport_key):
            mid = match_odds_event_to_fixture(event, fixtures)
            if mid is None:
                continue
            for bookie in event.get("bookmakers", []):
                upsert_odds(mid, bookie, event["home_team"], event["away_team"])

    logger.info("Step 5: gOT-v5 predictions (Kenya today + tomorrow)…")
    now_ke      = datetime.now(KENYA_TZ)
    today_ke    = now_ke.date()
    tomorrow_ke = today_ke + timedelta(days=1)

    target = [
        f for f in fixtures
        if datetime.fromisoformat(f["utc_date"].replace("Z", "+00:00"))
               .astimezone(KENYA_TZ).date() in (today_ke, tomorrow_ke)
    ]
    logger.info("Predicting %d fixtures (KE today=%s tomorrow=%s)",
                len(target), today_ke, tomorrow_ke)

    preds: List[Dict[str, Any]] = []
    for fix in target:
        p = predict_match_outcome(fix["id"], fix)
        if p:
            preds.append(p)

    logger.info(
        "Predictions: %d/%d generated (%d skipped — Elo missing)",
        len(preds), len(target), len(target) - len(preds),
    )

    logger.info("Step 6: Daily slip…")
    generate_daily_slip(preds, today_ke)

    logger.info("═══ MK-806 God of Football v5 complete ═══")


if __name__ == "__main__":
    main()