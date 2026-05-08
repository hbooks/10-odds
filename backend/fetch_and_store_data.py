"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          MK-807  "god of Football"  — fetch_and_store_data.py              ║
║                                                                              ║
║  ARCHITECTURE UPGRADES vs v5                                                 ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  U1  Momentum score        — weighted W/D/L streak + goal-diff momentum     ║
║  U2  Regression to mean    — thin-sample stats pulled toward league avg      ║
║  U3  Scoreline H2H         — goal margin history, not just W/D/L counts     ║
║  U4  Market signal (5th)   — sharp-money consensus odds as a model source   ║
║  U5  Dynamic blend weights — auto-adjust trust per source per match         ║
║  U6  Defensive-form signal — conceding spike = injury/disruption proxy      ║
║  U7  Venue fatigue         — days since last match penalises tired teams     ║
║  U8  Kelly criterion rank  — slip sorted by true fractional Kelly value      ║
║  U9  Isotonic calibration  — piecewise calibration, better than Platt       ║
║  U10 Confidence interval   — output model uncertainty alongside confidence  ║
╚══════════════════════════════════════════════════════════════════════════════╝
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


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
if not SOCCERDATA_AVAILABLE:
    logger.warning("soccerdata not installed — Elo/xG degraded.  pip install soccerdata")


load_dotenv()
SUPABASE_URL: str          = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str  = os.environ["SUPABASE_SERVICE_KEY"]
FOOTBALL_DATA_API_KEY: str = os.environ["FOOTBALL_DATA_API_KEY"]
ODDS_API_KEY: str          = os.environ["ODDS_API_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
FD_HEADERS = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}

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

LEAGUE_AVERAGES: Dict[str, Dict[str, float]] = {
    "PL":  {"home": 1.53, "away": 1.19, "xg": 1.36, "platt_a": 2.8,
            "home_advantage_elo": 95,  "draw_rate": 0.245, "variance": 0.042},
    "PD":  {"home": 1.61, "away": 1.14, "xg": 1.37, "platt_a": 3.1,
            "home_advantage_elo": 100, "draw_rate": 0.265, "variance": 0.038},
    "SA":  {"home": 1.48, "away": 1.10, "xg": 1.29, "platt_a": 2.7,
            "home_advantage_elo": 90,  "draw_rate": 0.280, "variance": 0.040},
    "BL1": {"home": 1.65, "away": 1.23, "xg": 1.44, "platt_a": 2.9,
            "home_advantage_elo": 88,  "draw_rate": 0.230, "variance": 0.044},
    "FL1": {"home": 1.44, "away": 1.08, "xg": 1.26, "platt_a": 2.6,
            "home_advantage_elo": 92,  "draw_rate": 0.255, "variance": 0.041},
}

SLIP_SIZE              = 10
MIN_CONFIDENCE         = 0.42
SLIP_MIN_EV            = -0.05
MAX_GOALS              = 9
ELO_BIG_TEAM_THRESHOLD = 1800
ELO_DRAW_BAND          = 0.05
SECONDARY_PROB_MIN     = 0.65
HIGH_CONFIDENCE_MIN    = 0.80
TOTALS_LINES           = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]
MAX_EXACT_GOALS        = 9
MAX_CS_GOALS           = 7
KENYA_TZ               = pytz.timezone("Africa/Nairobi")

RTM_GAMES_FULL_TRUST   = 12
RTM_GAMES_NO_TRUST     = 3

MOMENTUM_WEIGHTS       = [0.30, 0.25, 0.20, 0.15, 0.10]
MOMENTUM_GD_CAP        = 3.0
MOMENTUM_GD_WEIGHT     = 0.25

FATIGUE_THRESHOLD_DAYS = 4
FATIGUE_PENALTY        = 0.96

BLEND_POISSON_BASE     = 0.22
BLEND_XG_BASE          = 0.30
BLEND_ELO_BASE         = 0.22
BLEND_H2H_BASE         = 0.12
BLEND_MARKET_BASE      = 0.14

H2H_MAX_GAMES          = 8
H2H_ADJUST_CAP         = 0.12

DC_RHO                 = -0.13
DRAW_SUPPRESSION       = 0.92
RECENCY_DECAY          = 0.03
KELLY_FRACTION         = 0.25

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
        "OVER_1.5", "OVER_2.5", "OVER_3.5", "BTTS_YES",
        "TOTAL_GOALS_2", "TOTAL_GOALS_3", "TOTAL_GOALS_4",
        "CORRECT_SCORE_1_0", "CORRECT_SCORE_2_0", "CORRECT_SCORE_2_1",
        "CORRECT_SCORE_3_0", "CORRECT_SCORE_3_1", "CORRECT_SCORE_3_2",
    ],
    "AWAY_WIN": [
        "OVER_1.5", "OVER_2.5", "OVER_3.5", "BTTS_YES",
        "TOTAL_GOALS_2", "TOTAL_GOALS_3", "TOTAL_GOALS_4",
        "CORRECT_SCORE_0_1", "CORRECT_SCORE_0_2", "CORRECT_SCORE_1_2",
        "CORRECT_SCORE_0_3", "CORRECT_SCORE_1_3", "CORRECT_SCORE_2_3",
    ],
    "DRAW": [
        "UNDER_2.5", "UNDER_3.5", "BTTS_NO",
        "TOTAL_GOALS_1", "TOTAL_GOALS_2",
        "CORRECT_SCORE_0_0", "CORRECT_SCORE_1_1", "CORRECT_SCORE_2_2",
    ],
}


# ══════════════════════════════════════════════════════════════════════════════
# PART 1 — ELO RATINGS
# ══════════════════════════════════════════════════════════════════════════════

def fetch_team_elo_ratings() -> None:
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
# PART 5 — ODDS FETCHING
# ══════════════════════════════════════════════════════════════════════════════

def fetch_odds_for_sport(sport_key: str) -> List[Dict[str, Any]]:
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
# PART 7 — SHARP ODDS: OVERROUND REMOVAL
# ══════════════════════════════════════════════════════════════════════════════

def _get_fair_odds(match_id: int) -> Dict[str, float]:
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

    fair_h = fair_d = fair_a = 0.0
    count = 0

    for row in rows:
        hw = row.get("home_win")
        dr = row.get("draw")
        aw = row.get("away_win")
        if not (hw and aw):
            continue
        dr = dr or 0.0
        ih = 1.0 / hw
        ia = 1.0 / aw
        id_ = 1.0 / dr if dr > 0 else 0.0
        overround = ih + ia + id_
        if overround <= 0:
            continue
        fair_h += ih  / overround
        fair_d += id_ / overround
        fair_a += ia  / overround
        count  += 1

    if count == 0:
        return DEFAULT_ODDS.copy()

    fh = fair_h / count
    fd = fair_d / count
    fa = fair_a / count

    return {
        "HOME_WIN": round(1.0 / max(fh, 0.01), 3),
        "DRAW":     round(1.0 / max(fd, 0.01), 3) if fd > 0 else DEFAULT_ODDS["DRAW"],
        "AWAY_WIN": round(1.0 / max(fa, 0.01), 3),
    }


def _get_market_implied_probs(match_id: int) -> Optional[Tuple[float, float, float]]:
    """U4: Return overround-free market consensus probabilities."""
    try:
        res = (supabase.table("odds")
               .select("home_win, draw, away_win")
               .eq("match_id", match_id)
               .not_.is_("home_win", "null")
               .execute())
        rows = res.data or []
    except Exception:
        return None

    if not rows:
        return None

    ph_sum = pd_sum = pa_sum = 0.0
    count = 0
    for row in rows:
        hw = row.get("home_win")
        dr = row.get("draw")
        aw = row.get("away_win")
        if not (hw and aw):
            continue
        dr = dr or 0.0
        ih = 1.0 / hw
        ia = 1.0 / aw
        id_ = 1.0 / dr if dr > 0 else 0.0
        overround = ih + ia + id_
        if overround <= 0:
            continue
        ph_sum += ih  / overround
        pd_sum += id_ / overround
        pa_sum += ia  / overround
        count  += 1

    if count == 0:
        return None

    total = ph_sum + pd_sum + pa_sum
    if total <= 0:
        return None
    return ph_sum / total, pd_sum / total, pa_sum / total


# ══════════════════════════════════════════════════════════════════════════════
# PART 8 — RECENCY-WEIGHTED VENUE-SPLIT STATS + U2 REGRESSION TO MEAN
# ══════════════════════════════════════════════════════════════════════════════

def _regression_weight(games_played: int) -> float:
    """U2: Trust weight in [0,1]. 0=league avg only, 1=team stats only."""
    if games_played >= RTM_GAMES_FULL_TRUST:
        return 1.0
    if games_played <= RTM_GAMES_NO_TRUST:
        return 0.0
    return (games_played - RTM_GAMES_NO_TRUST) / (RTM_GAMES_FULL_TRUST - RTM_GAMES_NO_TRUST)


def _fetch_team_stats_v7(team_id: int, league_code: str) -> Dict[str, Any]:
    """
    Recency-weighted venue-split stats with:
    U1 momentum, U2 regression-to-mean, U6 defensive spike, U7 fatigue date.
    """
    avgs   = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})
    result = {
        "home_att": avgs["home"], "home_def": avgs["away"],
        "away_att": avgs["away"], "away_def": avgs["home"],
        "elo_rating": None,
        "raw_home_scored": avgs["home"], "raw_away_scored": avgs["away"],
        "games_played": 0,
        "momentum_home": 0.5, "momentum_away": 0.5,
        "last_match_date": None,
        "recent_conceded_spike": False,
        "trust_weight": 0.0,
    }
    now = datetime.now(timezone.utc)

    try:
        t = (supabase.table("teams").select("elo_rating")
             .eq("id", team_id).single().execute())
        if t.data:
            result["elo_rating"] = t.data.get("elo_rating")
    except Exception:
        pass

    try:
        hg = (supabase.table("matches")
              .select("home_score, away_score, utc_date")
              .eq("home_team_id", team_id).eq("status", "FINISHED")
              .not_.is_("home_score", "null")
              .order("utc_date", desc=True).limit(15).execute()).data or []

        ag = (supabase.table("matches")
              .select("home_score, away_score, utc_date")
              .eq("away_team_id", team_id).eq("status", "FINISHED")
              .not_.is_("away_score", "null")
              .order("utc_date", desc=True).limit(15).execute()).data or []

        result["games_played"] = len(hg) + len(ag)

        def weighted_avg(games, scored_key, conceded_key):
            w_sc = w_co = total_w = 0.0
            for g in games:
                try:
                    match_dt = datetime.fromisoformat(g["utc_date"].replace("Z", "+00:00"))
                    days_ago = max(0.0, (now - match_dt).total_seconds() / 86400.0)
                except Exception:
                    days_ago = 30.0
                w = math.exp(-RECENCY_DECAY * days_ago)
                w_sc    += g[scored_key]   * w
                w_co    += g[conceded_key] * w
                total_w += w
            if total_w == 0:
                return avgs["home"], avgs["away"]
            return w_sc / total_w, w_co / total_w

        # Raw stats
        if hg:
            h_sc, h_co = weighted_avg(hg, "home_score", "away_score")
            result["raw_home_scored"] = h_sc
        else:
            h_sc, h_co = avgs["home"], avgs["away"]

        if ag:
            a_sc, a_co = weighted_avg(ag, "away_score", "home_score")
            result["raw_away_scored"] = a_sc
        else:
            a_sc, a_co = avgs["away"], avgs["home"]

        # U2: Regression to mean
        tw = _regression_weight(result["games_played"])
        result["trust_weight"] = tw
        result["home_att"] = tw * h_sc  + (1 - tw) * avgs["home"]
        result["home_def"] = tw * h_co  + (1 - tw) * avgs["away"]
        result["away_att"] = tw * a_sc  + (1 - tw) * avgs["away"]
        result["away_def"] = tw * a_co  + (1 - tw) * avgs["home"]

        # U1: Momentum — combine all recent games, sort newest first
        all_games_home = [(g["home_score"], g["away_score"], g["utc_date"]) for g in hg]
        all_games_away = [(g["away_score"], g["home_score"], g["utc_date"]) for g in ag]
        all_games = sorted(all_games_home + all_games_away, key=lambda x: x[2], reverse=True)[:5]

        def _calc_momentum(game_list):
            score = 0.0
            for i, (gf, ga, _) in enumerate(game_list[:5]):
                w = MOMENTUM_WEIGHTS[i] if i < len(MOMENTUM_WEIGHTS) else 0.05
                pts = 3.0 if gf > ga else (1.0 if gf == ga else 0.0)
                gd  = max(-MOMENTUM_GD_CAP, min(MOMENTUM_GD_CAP, float(gf - ga)))
                score += w * (pts + MOMENTUM_GD_WEIGHT * gd)
            return score / 3.75 if game_list else 0.5

        home_sorted = sorted(all_games_home, key=lambda x: x[2], reverse=True)
        away_sorted = sorted(all_games_away, key=lambda x: x[2], reverse=True)
        result["momentum_home"] = _calc_momentum(home_sorted) if home_sorted else _calc_momentum(all_games)
        result["momentum_away"] = _calc_momentum(away_sorted) if away_sorted else _calc_momentum(all_games)

        # U7: Last match date
        if all_games:
            try:
                result["last_match_date"] = datetime.fromisoformat(
                    all_games[0][2].replace("Z", "+00:00")
                )
            except Exception:
                pass

        # U6: Defensive disruption spike
        all_conceded = [g["away_score"] for g in hg] + [g["home_score"] for g in ag]
        if len(all_conceded) >= 6:
            recent_3   = sum(all_conceded[:3]) / 3.0
            season_avg = sum(all_conceded) / len(all_conceded)
            if recent_3 > season_avg * 1.5 and recent_3 > 1.8:
                result["recent_conceded_spike"] = True

    except Exception as e:
        logger.warning("Team stats %s: %s", team_id, e)

    return result


# ══════════════════════════════════════════════════════════════════════════════
# PART 9 — HEAD-TO-HEAD ADJUSTMENT  (U3 scoreline-weighted)
# ══════════════════════════════════════════════════════════════════════════════

def _h2h_adjustment(home_id: int, away_id: int) -> Tuple[float, float]:
    """U3: Recency + scoreline-weighted H2H dominance ratio."""
    try:
        res1 = (supabase.table("matches")
                .select("home_score, away_score, utc_date")
                .eq("home_team_id", home_id).eq("away_team_id", away_id)
                .eq("status", "FINISHED").not_.is_("home_score", "null")
                .order("utc_date", desc=True).limit(H2H_MAX_GAMES).execute()).data or []

        res2 = (supabase.table("matches")
                .select("home_score, away_score, utc_date")
                .eq("home_team_id", away_id).eq("away_team_id", home_id)
                .eq("status", "FINISHED").not_.is_("home_score", "null")
                .order("utc_date", desc=True).limit(H2H_MAX_GAMES).execute()).data or []

        if not res1 and not res2:
            return 1.0, 1.0

        now = datetime.now(timezone.utc)
        weighted_diff = total_weight = 0.0

        for g in res1:
            gf, ga = g["home_score"], g["away_score"]
            try:
                dt = datetime.fromisoformat(g["utc_date"].replace("Z", "+00:00"))
                days_ago = max(0.0, (now - dt).total_seconds() / 86400.0)
            except Exception:
                days_ago = 365.0
            rw = math.exp(-0.003 * days_ago)
            margin = max(-4.0, min(4.0, float(gf - ga)))
            weighted_diff += rw * margin
            total_weight  += rw

        for g in res2:
            gf, ga = g["away_score"], g["home_score"]
            try:
                dt = datetime.fromisoformat(g["utc_date"].replace("Z", "+00:00"))
                days_ago = max(0.0, (now - dt).total_seconds() / 86400.0)
            except Exception:
                days_ago = 365.0
            rw = math.exp(-0.003 * days_ago)
            margin = max(-4.0, min(4.0, float(gf - ga)))
            weighted_diff += rw * margin
            total_weight  += rw

        if total_weight == 0:
            return 1.0, 1.0

        avg_margin = weighted_diff / total_weight
        raw_adj    = avg_margin / 2.0 * H2H_ADJUST_CAP
        adj        = max(-H2H_ADJUST_CAP, min(H2H_ADJUST_CAP, raw_adj))

        # Sample-size dampening
        n_games = len(res1) + len(res2)
        adj *= min(1.0, n_games / 4.0)

        return 1.0 + adj, 1.0 - adj

    except Exception as e:
        logger.debug("H2H error: %s", e)
        return 1.0, 1.0


# ══════════════════════════════════════════════════════════════════════════════
# PART 10 — ESTIMATED xG
# ══════════════════════════════════════════════════════════════════════════════

def estimate_match_xg(home_id, away_id, home_name, away_name, league_code, match_id):
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
# PART 11 — ELO WIN PROBABILITIES  (league-specific home advantage)
# ══════════════════════════════════════════════════════════════════════════════

def _elo_win_prob(elo_h: int, elo_a: int, league_code: str = "PL") -> Tuple[float, float, float]:
    ha     = LEAGUE_AVERAGES.get(league_code, {}).get("home_advantage_elo", 95)
    diff   = (elo_h + ha) - elo_a
    p_home = 1.0 / (1.0 + 10 ** (-diff / 400.0))
    p_away = 1.0 - p_home
    draw_f = max(0.05, min(0.35, 0.25 * (1.0 - abs(p_home - 0.5) * 2)))
    total  = p_home + draw_f + p_away
    return p_home / total, draw_f / total, p_away / total


def _elo_to_lambda(elo_h: int, elo_a: int, league_code: str) -> Tuple[float, float]:
    avgs = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})
    ph, _, pa = _elo_win_prob(elo_h, elo_a, league_code)
    league_total = avgs["home"] + avgs["away"]
    if ph + pa <= 0:
        return avgs["home"], avgs["away"]
    return max(0.1, (ph / (ph + pa)) * league_total), max(0.1, (pa / (ph + pa)) * league_total)


# ══════════════════════════════════════════════════════════════════════════════
# PART 12 — ENSEMBLE LAMBDA BLENDING  (U4 + U5 dynamic weights)
# ══════════════════════════════════════════════════════════════════════════════

def _compute_dynamic_blend_weights(home_stats, away_stats, has_xg, has_market):
    """U5: Data-quality-adjusted blend weights."""
    w = {
        "poisson": BLEND_POISSON_BASE,
        "xg":      BLEND_XG_BASE,
        "elo":     BLEND_ELO_BASE,
        "h2h":     BLEND_H2H_BASE,
        "market":  BLEND_MARKET_BASE,
    }
    avg_trust = (home_stats.get("trust_weight", 1.0) + away_stats.get("trust_weight", 1.0)) / 2.0

    if avg_trust < 0.5:
        penalty = (0.5 - avg_trust) * 0.10
        w["poisson"] -= penalty
        w["elo"]     += penalty * 0.5
        w["market"]  += penalty * 0.5

    if not has_xg:
        r = w["xg"]
        w["xg"] = 0.0
        w["poisson"] += r * 0.5
        w["elo"]     += r * 0.5

    if not has_market:
        r = w["market"]
        w["market"]   = 0.0
        w["poisson"] += r * 0.4
        w["elo"]     += r * 0.4
        w["h2h"]     += r * 0.2

    total = sum(w.values())
    if total > 0:
        w = {k: v / total for k, v in w.items()}
    return w


def _market_to_lambda(market_probs, league_code):
    ph, _, pa = market_probs
    avgs = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})
    league_total = avgs["home"] + avgs["away"]
    if ph + pa <= 0:
        return avgs["home"], avgs["away"]
    return max(0.1, (ph / (ph + pa)) * league_total), max(0.1, (pa / (ph + pa)) * league_total)


def _blend_lambdas_v7(home_stats, away_stats, home_xg, away_xg,
                      elo_home, elo_away, home_h2h_factor, away_h2h_factor,
                      league_code, market_probs, match_date=None):
    avgs = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})
    now  = datetime.now(timezone.utc)

    has_xg_data = (home_xg != avgs["home"] or away_xg != avgs["away"])
    weights     = _compute_dynamic_blend_weights(home_stats, away_stats, has_xg_data, market_probs is not None)

    # Source 1: Dixon-Coles Poisson
    dc_lh = (home_stats["home_att"] / max(avgs["home"], 0.1)) * \
            (away_stats["away_def"] / max(avgs["home"], 0.1)) * avgs["home"]
    dc_la = (away_stats["away_att"] / max(avgs["away"], 0.1)) * \
            (home_stats["home_def"] / max(avgs["away"], 0.1)) * avgs["away"]

    # Source 2: xG
    xg_lh, xg_la = home_xg, away_xg

    # Source 3: Elo
    if elo_home and elo_away:
        elo_lh, elo_la = _elo_to_lambda(elo_home, elo_away, league_code)
    else:
        elo_lh, elo_la = avgs["home"], avgs["away"]

    # Source 4: H2H raw averages
    h2h_lh = home_stats.get("raw_home_scored", avgs["home"])
    h2h_la = away_stats.get("raw_away_scored", avgs["away"])

    # Source 5 (U4): Market consensus
    if market_probs:
        mkt_lh, mkt_la = _market_to_lambda(market_probs, league_code)
    else:
        mkt_lh, mkt_la = avgs["home"], avgs["away"]

    lh = (weights["poisson"] * dc_lh + weights["xg"] * xg_lh +
          weights["elo"] * elo_lh + weights["h2h"] * h2h_lh + weights["market"] * mkt_lh)
    la = (weights["poisson"] * dc_la + weights["xg"] * xg_la +
          weights["elo"] * elo_la + weights["h2h"] * h2h_la + weights["market"] * mkt_la)

    # H2H adjustment
    lh *= home_h2h_factor
    la *= away_h2h_factor

    # U1: Momentum adjustment ±5%
    lh *= (1.0 + 0.10 * (home_stats.get("momentum_home", 0.5) - 0.5))
    la *= (1.0 + 0.10 * (away_stats.get("momentum_away", 0.5) - 0.5))

    # U6: Defensive disruption
    if home_stats.get("recent_conceded_spike"):
        la *= 1.08
    if away_stats.get("recent_conceded_spike"):
        lh *= 1.08

    # U7: Fatigue
    for lam_attr, stats in [("lh", home_stats), ("la", away_stats)]:
        ld = stats.get("last_match_date")
        if ld and isinstance(ld, datetime):
            days = (now - ld).total_seconds() / 86400.0
            if days < FATIGUE_THRESHOLD_DAYS:
                if lam_attr == "lh":
                    lh *= FATIGUE_PENALTY
                else:
                    la *= FATIGUE_PENALTY

    return max(0.10, round(lh, 4)), max(0.10, round(la, 4))


# ══════════════════════════════════════════════════════════════════════════════
# PART 13 — PROBABILITY MATRIX
# ══════════════════════════════════════════════════════════════════════════════

def _dc_rho(h, a, lh, la, rho):
    if h == 0 and a == 0:   return 1.0 - lh * la * rho
    elif h == 1 and a == 0: return 1.0 + la * rho
    elif h == 0 and a == 1: return 1.0 + lh * rho
    elif h == 1 and a == 1: return 1.0 - rho
    return 1.0


def _poisson_pmf(lam, k):
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _compute_all_probabilities(lh: float, la: float) -> Dict[str, float]:
    probs: Dict[str, float] = {}
    for key in ["HOME_WIN", "DRAW", "AWAY_WIN"]:
        probs[key] = 0.0
    for line in TOTALS_LINES:
        probs[f"OVER_{line}"] = probs[f"UNDER_{line}"] = 0.0
    probs["BTTS_YES"] = probs["BTTS_NO"] = 0.0
    for t in range(MAX_EXACT_GOALS + 1):
        probs[f"TOTAL_GOALS_{t}"] = 0.0
    for h in range(MAX_CS_GOALS + 1):
        for a in range(MAX_CS_GOALS + 1):
            probs[f"CORRECT_SCORE_{h}_{a}"] = 0.0

    for h in range(MAX_GOALS):
        ph_raw = _poisson_pmf(lh, h)
        for a in range(MAX_GOALS):
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

    draw_excess = probs["DRAW"] * (1.0 - DRAW_SUPPRESSION)
    probs["DRAW"] -= draw_excess
    win_total = probs["HOME_WIN"] + probs["AWAY_WIN"]
    if win_total > 0:
        probs["HOME_WIN"] += draw_excess * (probs["HOME_WIN"] / win_total)
        probs["AWAY_WIN"] += draw_excess * (probs["AWAY_WIN"] / win_total)
    return probs


# ══════════════════════════════════════════════════════════════════════════════
# PART 14 — CONFIDENCE CALIBRATION  (U9 piecewise + Platt blend)
# ══════════════════════════════════════════════════════════════════════════════

_CALIBRATION_TABLE = [
    (0.00, 0.00), (0.20, 0.18), (0.33, 0.30), (0.40, 0.37),
    (0.45, 0.42), (0.50, 0.47), (0.55, 0.52), (0.60, 0.57),
    (0.65, 0.63), (0.70, 0.68), (0.75, 0.73), (0.80, 0.78),
    (0.85, 0.83), (0.90, 0.88), (1.00, 1.00),
]


def _calibrate_confidence(raw_prob: float, league_code: str) -> float:
    """U9: 70% piecewise isotonic + 30% Platt sigmoid calibration."""
    p = max(0.0, min(1.0, raw_prob))
    calibrated = p
    for i in range(len(_CALIBRATION_TABLE) - 1):
        x0, y0 = _CALIBRATION_TABLE[i]
        x1, y1 = _CALIBRATION_TABLE[i + 1]
        if x0 <= p <= x1:
            t = (p - x0) / (x1 - x0) if (x1 - x0) > 0 else 0.0
            calibrated = y0 + t * (y1 - y0)
            break
    avgs  = LEAGUE_AVERAGES.get(league_code, {"platt_a": 2.8})
    a     = avgs.get("platt_a", 2.8)
    platt = 1.0 / (1.0 + math.exp(-a * (raw_prob - 0.5)))
    return round(0.70 * calibrated + 0.30 * platt, 5)


def _confidence_interval(raw_prob: float, league_code: str) -> Tuple[float, float]:
    """U10: 90% confidence interval using league variance."""
    avgs     = LEAGUE_AVERAGES.get(league_code, {"variance": 0.04})
    variance = avgs.get("variance", 0.04)
    model_se = math.sqrt(raw_prob * (1 - raw_prob) * variance)
    margin   = 1.64 * model_se
    return round(max(0.0, raw_prob - margin), 3), round(min(1.0, raw_prob + margin), 3)


# ══════════════════════════════════════════════════════════════════════════════
# PART 15 — FORM SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

def _get_team_form_summary(team_id: int, team_name: str) -> str:
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

        wins     = sum(1 for gf, ga in results if gf > ga)
        draws    = sum(1 for gf, ga in results if gf == ga)
        losses   = sum(1 for gf, ga in results if gf < ga)
        scored   = sum(gf for gf, _ in results)
        conceded = sum(ga for _, ga in results)
        cs       = sum(1 for _, ga in results if ga == 0)
        label    = f"last {n}" if n < 5 else "last 5"

        streak_pts   = [3 if gf > ga else (1 if gf == ga else 0) for gf, ga in results]
        weighted_pts = sum(w * p for w, p in zip(MOMENTUM_WEIGHTS, streak_pts))
        if weighted_pts > 2.2:
            momentum_str = " \U0001f525 In excellent form."
        elif weighted_pts > 1.4:
            momentum_str = " Form is solid."
        elif weighted_pts < 0.7:
            momentum_str = " \u26a0 Poor recent form."
        else:
            momentum_str = " Form is inconsistent."

        if losses == 0 and n >= 3:
            parts = " ".join(filter(None, [f"W{wins}" if wins else "", f"D{draws}" if draws else ""]))
            base  = f"{team_name}: unbeaten in {label} ({parts})"
        else:
            base = f"{team_name}: W{wins} D{draws} L{losses} in {label}"

        base += f", scoring {scored} and conceding {conceded}"
        if cs >= 2:
            base += f", {cs} clean sheets"
        return base + "." + momentum_str

    except Exception as e:
        logger.warning("Form summary %s: %s", team_id, e)
        return f"{team_name}: form data unavailable."


# ══════════════════════════════════════════════════════════════════════════════
# PART 16 — KELLY CRITERION
# ══════════════════════════════════════════════════════════════════════════════

def _kelly_criterion(prob: float, decimal_odds: float) -> float:
    """U8: Fractional Kelly stake size as ranking signal."""
    b = decimal_odds - 1.0
    if b <= 0:
        return 0.0
    q   = 1.0 - prob
    raw = (b * prob - q) / b
    return max(0.0, round(KELLY_FRACTION * raw, 4))


# ══════════════════════════════════════════════════════════════════════════════
# PART 17 — GOD OF TIME SELECTOR v7
# ══════════════════════════════════════════════════════════════════════════════

def _god_of_time_select_v7(match_id, home_name, away_name, probs, lh, la,
                            elo_home, elo_away, home_xg, away_xg,
                            home_form, away_form, fair_odds, league_code,
                            market_probs, home_stats, away_stats):
    ph = probs["HOME_WIN"]
    pd = probs["DRAW"]
    pa = probs["AWAY_WIN"]

    # Fuse Elo (60% model + 40% Elo)
    if elo_home and elo_away:
        eph, epd, epa = _elo_win_prob(elo_home, elo_away, league_code)
        ph = 0.60 * ph + 0.40 * eph
        pd = 0.60 * pd + 0.40 * epd
        pa = 0.60 * pa + 0.40 * epa
        total_p = ph + pd + pa
        if total_p > 0:
            ph, pd, pa = ph / total_p, pd / total_p, pa / total_p

    # U4: Fuse market signal (85% model + 15% market)
    if market_probs:
        mph, mpd, mpa = market_probs
        ph = 0.85 * ph + 0.15 * mph
        pd = 0.85 * pd + 0.15 * mpd
        pa = 0.85 * pa + 0.15 * mpa
        total_p = ph + pd + pa
        if total_p > 0:
            ph, pd, pa = ph / total_p, pd / total_p, pa / total_p

    ranked = sorted([("HOME_WIN", ph), ("DRAW", pd), ("AWAY_WIN", pa)],
                    key=lambda x: x[1], reverse=True)
    future, raw_conf = ranked[0]
    if abs(ranked[0][1] - ranked[1][1]) < ELO_DRAW_BAND:
        future, raw_conf = "DRAW", pd

    confidence = _calibrate_confidence(raw_conf, league_code)  # U9
    ci_lo, ci_hi = _confidence_interval(raw_conf, league_code)  # U10

    primary_fair_odds = fair_odds.get(future, DEFAULT_ODDS.get(future, 1.90))
    primary_ev        = round(raw_conf * primary_fair_odds - 1.0, 4)
    primary_label     = (BET_LABELS.get(future, future)
                         .replace("{home}", home_name).replace("{away}", away_name))
    kelly = _kelly_criterion(raw_conf, primary_fair_odds)  # U8

    # Secondary pick
    secondary_label = secondary_prob = None
    if confidence > HIGH_CONFIDENCE_MIN:
        best_p, best_t = 0.0, None
        for bt in SECONDARY_ALIGNMENT.get(future, []):
            mp = probs.get(bt, 0.0)
            if mp >= SECONDARY_PROB_MIN and mp > best_p:
                best_p, best_t = mp, bt
        if best_t:
            secondary_prob = best_p
            if best_t.startswith("TOTAL_GOALS_"):   secondary_label = f"Exactly {best_t[12:]} Goals"
            elif best_t.startswith("CORRECT_SCORE_"):
                pts = best_t.split("_"); secondary_label = f"Correct Score {pts[2]}-{pts[3]}"
            elif best_t.startswith("OVER_"):         secondary_label = f"Over {best_t[5:]} Goals"
            elif best_t.startswith("UNDER_"):        secondary_label = f"Under {best_t[6:]} Goals"
            elif best_t == "BTTS_YES":               secondary_label = "Both Teams to Score"
            elif best_t == "BTTS_NO":                secondary_label = "Both Teams NOT to Score"
            else:                                    secondary_label = best_t

    ev_sign = "+" if primary_ev >= 0 else ""
    if secondary_label:
        selection = (f"1. {primary_label} @ {primary_fair_odds:.2f} "
                     f"(EV={ev_sign}{primary_ev:.3f}) | "
                     f"2. {secondary_label} (p={secondary_prob:.0%})")
    else:
        selection = f"{primary_label} @ {primary_fair_odds:.2f} (EV={ev_sign}{primary_ev:.3f})"

    # Narratives
    if elo_home and elo_away:
        d = elo_home - elo_away
        if abs(d) < 30:
            elo_narr = f"Elo near-identical ({home_name}={elo_home}, {away_name}={elo_away})."
        elif d > 0:
            elo_narr = f"Elo: {home_name} quality edge ({elo_home} vs {elo_away}, \u0394={d:+d})."
        else:
            elo_narr = f"Elo: {away_name} favoured ({elo_home} vs {elo_away}, \u0394={d:+d})."
        elo_str = f"Elo: {home_name}={elo_home} {away_name}={elo_away}."
    else:
        elo_narr = "Elo n/a."; elo_str = "Elo: n/a."

    xg_str = f"xG: {home_name}={home_xg:.2f} {away_name}={away_xg:.2f}."
    if home_xg > away_xg + 0.3:
        xg_narr = f"xG: {home_name} notably superior ({home_xg:.2f} vs {away_xg:.2f})."
    elif away_xg > home_xg + 0.3:
        xg_narr = f"xG: {away_name} favoured despite away ({away_xg:.2f} vs {home_xg:.2f})."
    else:
        xg_narr = f"xG balanced ({home_xg:.2f} vs {away_xg:.2f}) — contest expected."

    hm = home_stats.get("momentum_home", 0.5)
    am = away_stats.get("momentum_away", 0.5)
    if hm > am + 0.2:
        mom_narr = f"{home_name} carries stronger momentum ({hm:.0%} vs {am:.0%})."
    elif am > hm + 0.2:
        mom_narr = f"{away_name} arrives with superior momentum ({am:.0%} vs {hm:.0%})."
    else:
        mom_narr = "Comparable momentum going into this fixture."

    now = datetime.now(timezone.utc)
    fatigue_notes = []
    for name, stats in [(home_name, home_stats), (away_name, away_stats)]:
        ld = stats.get("last_match_date")
        if ld and isinstance(ld, datetime):
            days = (now - ld).total_seconds() / 86400.0
            if days < FATIGUE_THRESHOLD_DAYS:
                fatigue_notes.append(f"{name} ({int(days)}d rest)")
    fatigue_narr = (f"Fatigue risk: {', '.join(fatigue_notes)}." if fatigue_notes
                    else "No fatigue concerns.")

    disrupt = []
    if home_stats.get("recent_conceded_spike"):
        disrupt.append(f"{home_name} defensive spike")
    if away_stats.get("recent_conceded_spike"):
        disrupt.append(f"{away_name} defensive spike")
    disrupt_narr = (f"\u26a0 Disruption: {'; '.join(disrupt)}." if disrupt
                    else "No disruption signals.")

    mkt_narr = (f"Market: H={market_probs[0]:.0%} D={market_probs[1]:.0%} A={market_probs[2]:.0%}."
                if market_probs else "No market data.")

    if future == "HOME_WIN":
        interp = (f"Evidence points to HOME WIN for {home_name} "
                  f"(conf {confidence:.0%}, CI [{ci_lo:.0%}\u2013{ci_hi:.0%}]). {elo_narr} {xg_narr}")
    elif future == "AWAY_WIN":
        interp = (f"Evidence points to AWAY WIN for {away_name} "
                  f"(conf {confidence:.0%}, CI [{ci_lo:.0%}\u2013{ci_hi:.0%}]). {elo_narr} {xg_narr}")
    else:
        interp = (f"Evidence suggests DRAW (conf {confidence:.0%}, "
                  f"CI [{ci_lo:.0%}\u2013{ci_hi:.0%}]). {xg_narr}")

    primary_line = (f"Primary: {primary_label} @ {primary_fair_odds:.2f} "
                    f"(EV={ev_sign}{primary_ev:.3f}, Kelly={kelly:.3f}).")
    if primary_ev < 0:
        primary_line += " [Neg EV — conviction pick.]"

    sec_line = (f"\nCompliment: {secondary_label} (p={secondary_prob:.0%})."
                if secondary_label else "")

    reasoning = (
        f"MK-807 God of Football v7 | {future} (conf {confidence:.0%} | "
        f"CI [{ci_lo:.0%}\u2013{ci_hi:.0%}]).\n"
        f"{home_form}\n{away_form}\n"
        f"{elo_str} {xg_str}\n"
        f"{mom_narr}\n{fatigue_narr}\n{disrupt_narr}\n{mkt_narr}\n"
        f"{interp}\n{primary_line}{sec_line}\n"
        f"(\u03bb_h={lh:.3f} \u03bb_a={la:.3f} | "
        f"P(H)={ph:.1%} P(D)={pd:.1%} P(A)={pa:.1%} | "
        f"trust h={home_stats.get('trust_weight',1):.2f} a={away_stats.get('trust_weight',1):.2f})"
    )

    logger.info(
        "Match %s | %s vs %s | %s conf=%.0f%% EV=%+.3f Kelly=%.3f%s",
        match_id, home_name, away_name, future, confidence * 100,
        primary_ev, kelly,
        f" | +{secondary_label} p={secondary_prob:.0%}" if secondary_label else "",
    )

    return future, selection, confidence, primary_fair_odds, primary_ev, kelly, reasoning


# ══════════════════════════════════════════════════════════════════════════════
# PART 18 — PREDICT MATCH OUTCOME
# ══════════════════════════════════════════════════════════════════════════════

def predict_match_outcome(match_id: int, fixture: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    league_code = fixture["competition_code"]
    home_id     = fixture["home_team"]["id"]
    away_id     = fixture["away_team"]["id"]
    home_name   = fixture["home_team"]["name"]
    away_name   = fixture["away_team"]["name"]

    home_stats = _fetch_team_stats_v7(home_id, league_code)
    away_stats = _fetch_team_stats_v7(away_id, league_code)
    elo_home   = home_stats.get("elo_rating")
    elo_away   = away_stats.get("elo_rating")

    if elo_home is None or elo_away is None:
        logger.warning("Skipping %s (%s vs %s) — Elo missing", match_id, home_name, away_name)
        return None

    home_xg, away_xg = estimate_match_xg(
        home_id, away_id, home_name, away_name, league_code, match_id
    )
    h2h_home_factor, h2h_away_factor = _h2h_adjustment(home_id, away_id)
    market_probs = _get_market_implied_probs(match_id)
    fair_odds    = _get_fair_odds(match_id)

    try:
        match_dt = datetime.fromisoformat(fixture["utc_date"].replace("Z", "+00:00"))
    except Exception:
        match_dt = None

    lh, la = _blend_lambdas_v7(
        home_stats, away_stats, home_xg, away_xg,
        elo_home, elo_away, h2h_home_factor, h2h_away_factor,
        league_code, market_probs, match_dt,
    )

    probs     = _compute_all_probabilities(lh, la)
    home_form = _get_team_form_summary(home_id, home_name)
    away_form = _get_team_form_summary(away_id, away_name)

    bet_type, selection, confidence, predicted_odds, ev, kelly, reasoning = \
        _god_of_time_select_v7(
            match_id, home_name, away_name, probs, lh, la,
            elo_home, elo_away, home_xg, away_xg,
            home_form, away_form, fair_odds, league_code,
            market_probs, home_stats, away_stats,
        )

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
                "home_stats": home_stats, "away_stats": away_stats,
                "elo":        {"home": elo_home, "away": elo_away},
                "xg":         {"home": home_xg,  "away": away_xg},
                "h2h_factors":{"home": h2h_home_factor, "away": h2h_away_factor},
                "blended_lambda": {"home": lh, "away": la},
                "fair_odds":  fair_odds,
                "all_probs":  {k: round(v, 5) for k, v in probs.items()},
                "market_probs": {"home": market_probs[0], "draw": market_probs[1],
                                 "away": market_probs[2]} if market_probs else None,
                "kelly":        kelly,
                "blend_weights": _compute_dynamic_blend_weights(
                    home_stats, away_stats,
                    home_xg != avgs["home"],
                    market_probs is not None,
                ),
            },
        }).execute()
    except Exception as e:
        logger.error("match_analysis save %s: %s", match_id, e)

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
        logger.info("Saved %s | %s | conf=%.0f%% EV=%+.3f Kelly=%.3f",
                    match_id, bet_type, confidence * 100, ev, kelly)
        return {
            "id": pred_id, "match_id": match_id,
            "bet_type": bet_type, "selection": selection,
            "predicted_odds": predicted_odds,
            "confidence_score": confidence,
            "ev": ev, "kelly": kelly,
            "reasoning": reasoning,
            "home_team_id": home_id, "away_team_id": away_id,
        }
    except Exception as e:
        logger.error("Prediction save %s: %s", match_id, e)
        return None


# ══════════════════════════════════════════════════════════════════════════════
# PART 19 — DAILY SLIP  (U8 Kelly-ranked)
# ══════════════════════════════════════════════════════════════════════════════

def _extract_primary_odds(pick: Dict[str, Any]) -> float:
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
    """U8: Composite score = 0.40×confidence + 0.35×kelly_norm + 0.25×ev_norm."""
    valid = [
        p for p in predictions
        if p and p.get("confidence_score", 0) >= MIN_CONFIDENCE
        and p.get("ev", 0) >= SLIP_MIN_EV
    ]
    if not valid:
        logger.warning("EV gate relaxed for %s", slip_date)
        valid = [p for p in predictions
                 if p and p.get("confidence_score", 0) >= MIN_CONFIDENCE]

    if not valid:
        logger.warning("No predictions met MIN_CONFIDENCE for %s", slip_date)
        return

    big_ids = _fetch_big_team_ids()

    def composite_score(p):
        conf       = p.get("confidence_score", 0)
        ev         = p.get("ev", 0)
        kelly      = p.get("kelly", 0.0)
        ev_norm    = max(-0.5, min(0.5, ev))
        kelly_norm = max(0.0, min(1.0, kelly / max(KELLY_FRACTION, 0.01)))
        return 0.40 * conf + 0.35 * kelly_norm + 0.25 * (ev_norm + 0.5)

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

    avg_kelly = sum(p.get("kelly", 0) for p in top) / max(len(top), 1)
    logger.info("Slip %s: %d picks, combined odds %.2f, avg Kelly %.4f",
                slip_date, len(top), total_odds, avg_kelly)

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
    logger.info("═══ MK-807 God of Football v7.1 starting ═══")

    logger.info("Step 1: Competitions...")
    upsert_competitions()

    logger.info("Step 2: Fixtures (today to day-after-tomorrow)...")
    now_utc  = datetime.now(timezone.utc)
    end_date = now_utc + timedelta(days=3)
    fixtures = fetch_fixtures_for_date_range(now_utc, end_date)
    logger.info("Fixtures: %d", len(fixtures))
    for fix in fixtures:
        upsert_team(fix["home_team"])
        upsert_team(fix["away_team"])
        upsert_match(fix)

    logger.info("Step 3: Elo ratings (ClubElo)...")
    fetch_team_elo_ratings()

    logger.info("Step 4: Odds (h2h)...")
    for league_code, sport_key in SPORT_KEY_MAPPING.items():
        for event in fetch_odds_for_sport(sport_key):
            mid = match_odds_event_to_fixture(event, fixtures)
            if mid is None:
                continue
            for bookie in event.get("bookmakers", []):
                upsert_odds(mid, bookie, event["home_team"], event["away_team"])

    logger.info("Step 5: MK-807 v7 predictions (KE today + tomorrow)...")
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

    logger.info("Predictions: %d/%d (%d skipped - Elo missing)",
                len(preds), len(target), len(target) - len(preds))

    logger.info("Step 6: Daily slip (Kelly-ranked)...")
    generate_daily_slip(preds, today_ke)

    logger.info("═══ MK-807 God of Football v7 complete ═══")


if __name__ == "__main__":
    main()