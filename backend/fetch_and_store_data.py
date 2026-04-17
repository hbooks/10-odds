"""
fetch_and_store_data.py  —  MK-806  "God of Time" (gOT) v3
===========================================================

What's new in v3
────────────────
• fetch_team_elo_ratings()  — ClubElo ratings via soccerdata;
                               updates teams.elo_rating + auto-sets is_big_team
• fetch_match_xg_stats()    — Understat xG via soccerdata;
                               updates matches.home_xg / away_xg
• Rule 3A                   — skip any match where Elo is missing for either team
• _blend_lambdas()          — merges Poisson, xG, Elo into a single λ pair
• _god_of_time_select()     — future-first algorithm (5-step)
• generate_daily_slip()     — _extract_primary_odds() handles dual-output strings

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
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from supabase import create_client, Client

try:
    import soccerdata as sd
    SOCCERDATA_AVAILABLE = True
except ImportError:
    SOCCERDATA_AVAILABLE = False

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
if not SOCCERDATA_AVAILABLE:
    logger.warning("soccerdata not installed — Elo/xG disabled.  pip install soccerdata")

# ── Environment ───────────────────────────────────────────────────────────────
load_dotenv()
SUPABASE_URL: str          = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str  = os.environ["SUPABASE_SERVICE_KEY"]
FOOTBALL_DATA_API_KEY: str = os.environ["FOOTBALL_DATA_API_KEY"]
ODDS_API_KEY: str          = os.environ["ODDS_API_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
FD_HEADERS = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}

# ── League config ─────────────────────────────────────────────────────────────
TARGET_LEAGUES: Dict[int, Dict[str, str]] = {
    2021: {"name": "Premier League", "code": "PL",  "area": "England"},
    2014: {"name": "La Liga",        "code": "PD",  "area": "Spain"},
    2019: {"name": "Serie A",        "code": "SA",  "area": "Italy"},
    2002: {"name": "Bundesliga",     "code": "BL1", "area": "Germany"},
    2015: {"name": "Ligue 1",        "code": "FL1", "area": "France"},
}

# soccerdata league keys for Understat + ClubElo
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
    "PL":  {"home": 1.53, "away": 1.19},
    "PD":  {"home": 1.61, "away": 1.14},
    "SA":  {"home": 1.48, "away": 1.10},
    "BL1": {"home": 1.65, "away": 1.23},
    "FL1": {"home": 1.44, "away": 1.08},
}

# ── Constants ─────────────────────────────────────────────────────────────────
SLIP_SIZE              = 10
MIN_CONFIDENCE         = 0.40
MAX_GOALS              = 9
ELO_BIG_TEAM_THRESHOLD = 1800
ELO_DRAW_BAND          = 0.05    # |P(home)−P(away)| < this → declare DRAW future
DUAL_CONFIDENCE_MIN    = 0.80
TOTALS_LINES           = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]
KENYA_TZ               = pytz.timezone("Africa/Nairobi")

ODDS_COLUMN_MAP: Dict[str, str] = {
    "HOME_WIN": "home_win",  "DRAW": "draw",       "AWAY_WIN": "away_win",
    "OVER_0.5": "over_05",   "UNDER_0.5": "under_05",
    "OVER_1.5": "over_15",   "UNDER_1.5": "under_15",
    "OVER_2.5": "over_25",   "UNDER_2.5": "under_25",
    "OVER_3.5": "over_35",   "UNDER_3.5": "under_35",
    "OVER_4.5": "over_45",   "UNDER_4.5": "under_45",
    "OVER_5.5": "over_55",   "UNDER_5.5": "under_55",
    "BTTS_YES": "btts_yes",  "BTTS_NO":   "btts_no",
}

DEFAULT_ODDS: Dict[str, float] = {
    "HOME_WIN": 1.90, "DRAW":     3.20,  "AWAY_WIN":  2.10,
    "OVER_0.5": 1.15, "OVER_1.5": 1.35,  "OVER_2.5":  1.80,
    "OVER_3.5": 2.50, "OVER_4.5": 3.50,  "OVER_5.5":  5.50,
    "UNDER_0.5":7.00, "UNDER_1.5":3.50,  "UNDER_2.5": 1.90,
    "UNDER_3.5":1.35, "UNDER_4.5":1.15,  "UNDER_5.5": 1.08,
    "BTTS_YES": 1.75, "BTTS_NO":  1.90,
}

BET_LABELS: Dict[str, str] = {
    "HOME_WIN": "{home} to Win",       "DRAW":     "Match Draw",
    "AWAY_WIN": "{away} to Win",
    "OVER_0.5": "Over 0.5 Goals",      "UNDER_0.5":"Under 0.5 Goals",
    "OVER_1.5": "Over 1.5 Goals",      "UNDER_1.5":"Under 1.5 Goals",
    "OVER_2.5": "Over 2.5 Goals",      "UNDER_2.5":"Under 2.5 Goals",
    "OVER_3.5": "Over 3.5 Goals",      "UNDER_3.5":"Under 3.5 Goals",
    "OVER_4.5": "Over 4.5 Goals",      "UNDER_4.5":"Under 4.5 Goals",
    "OVER_5.5": "Over 5.5 Goals",      "UNDER_5.5":"Under 5.5 Goals",
    "BTTS_YES": "Both Teams to Score", "BTTS_NO":  "Both Teams NOT to Score",
}

# Base alignment per future — expanded dynamically in _aligned_bets()
FUTURE_ALIGNMENT: Dict[str, List[str]] = {
    "HOME_WIN": ["HOME_WIN", "OVER_1.5", "OVER_2.5", "BTTS_YES"],
    "AWAY_WIN": ["AWAY_WIN", "OVER_1.5", "OVER_2.5", "BTTS_YES"],
    "DRAW":     ["DRAW",     "UNDER_2.5", "UNDER_3.5", "BTTS_NO"],
}


# ══════════════════════════════════════════════════════════════════════════════
# PART 1 — ELO RATINGS  (ClubElo via soccerdata)
# ══════════════════════════════════════════════════════════════════════════════

def fetch_team_elo_ratings() -> Dict[str, int]:
    """
    Pull today's ClubElo ratings for all tracked clubs.
    Updates teams.elo_rating and auto-sets is_big_team (elo > 1800).
    Returns normalised_name → elo dict for in-memory use.
    """
    if not SOCCERDATA_AVAILABLE:
        logger.warning("soccerdata not available — Elo skipped")
        return {}

    elo_map: Dict[str, int] = {}
    try:
        reader = sd.ClubElo()
        df     = reader.read_by_date()          # DataFrame indexed by team name
        for row in df.itertuples():
            name = str(row.Index).lower().strip()
            elo  = int(getattr(row, "elo", 0))
            elo_map[name] = elo
        logger.info("ClubElo: loaded %d ratings", len(elo_map))
    except Exception as e:
        logger.error("ClubElo fetch failed: %s", e)
        return {}

    # Persist to teams table
    try:
        teams = supabase.table("teams").select("id, name").execute().data or []
        for team in teams:
            norm = team["name"].lower().strip()
            elo  = elo_map.get(norm)
            if elo is None:
                # substring fallback
                for k, v in elo_map.items():
                    if k in norm or norm in k:
                        elo = v
                        break
            if elo is not None:
                supabase.table("teams").update({
                    "elo_rating": elo,
                    "is_big_team": elo > ELO_BIG_TEAM_THRESHOLD,
                }).eq("id", team["id"]).execute()
    except Exception as e:
        logger.error("Error persisting Elo ratings: %s", e)

    return elo_map


# ══════════════════════════════════════════════════════════════════════════════
# PART 2 — xG DATA  (Understat via soccerdata)
# ══════════════════════════════════════════════════════════════════════════════

def fetch_match_xg_stats(
    fixtures: List[Dict[str, Any]],
) -> Dict[int, Dict[str, float]]:
    """
    Pull Understat xG for the current season.
    Matches rows to our fixture list by team names + date proximity.
    Updates matches.home_xg / away_xg in Supabase.
    Returns match_id → {home_xg, away_xg}.
    """
    if not SOCCERDATA_AVAILABLE:
        logger.warning("soccerdata not available — xG skipped")
        return {}

    xg_map: Dict[int, Dict[str, float]] = {}
    season = datetime.now(timezone.utc).year

    for league_code, sd_league in SD_LEAGUE_MAP.items():
        try:
            us   = sd.Understat(leagues=[sd_league], seasons=[season])
            df   = us.read_schedule()

            for row in df.itertuples():
                h_xg = getattr(row, "xg_home", None)
                a_xg = getattr(row, "xg_away", None)
                if h_xg is None or a_xg is None:
                    continue

                row_home = str(getattr(row, "home_team", "")).strip()
                row_away = str(getattr(row, "away_team", "")).strip()
                row_date = getattr(row, "date", None)
                if hasattr(row_date, "to_pydatetime"):
                    row_date = row_date.to_pydatetime().replace(tzinfo=timezone.utc)

                for fix in fixtures:
                    if fix["competition_code"] != league_code:
                        continue
                    if not (_team_names_match(fix["home_team"]["name"], row_home)
                            and _team_names_match(fix["away_team"]["name"], row_away)):
                        continue
                    if row_date:
                        fix_dt = datetime.fromisoformat(fix["utc_date"].replace("Z", "+00:00"))
                        if abs((fix_dt - row_date).days) > 2:
                            continue
                    xg_map[fix["id"]] = {"home_xg": float(h_xg), "away_xg": float(a_xg)}
                    break

        except Exception as e:
            logger.error("Understat fetch failed for %s: %s", league_code, e)
            continue

    logger.info("xG matched to %d/%d fixtures", len(xg_map), len(fixtures))

    for mid, xg in xg_map.items():
        try:
            supabase.table("matches").update({
                "home_xg": xg["home_xg"], "away_xg": xg["away_xg"],
            }).eq("id", mid).execute()
        except Exception as e:
            logger.error("Error persisting xG for match %s: %s", mid, e)

    return xg_map


# ══════════════════════════════════════════════════════════════════════════════
# PART 3 — FIXTURE FETCHING
# ══════════════════════════════════════════════════════════════════════════════

def fetch_fixtures_for_date_range(
    start_date: datetime, end_date: datetime,
) -> List[Dict[str, Any]]:
    """dateFrom + dateTo inclusive; +3 days covers today / tomorrow / day-after."""
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
            logger.info("Fetched %d matches — %s", len(matches), info["name"])
            for m in matches:
                all_fixtures.append({
                    "id":               m["id"],
                    "competition_id":   league_id,
                    "competition_code": info["code"],
                    "matchday":         m.get("matchday"),
                    "utc_date":         m["utcDate"],
                    "status":           m["status"],
                    "home_team": {
                        "id":        m["homeTeam"]["id"],
                        "name":      m["homeTeam"]["name"],
                        "short_name":m["homeTeam"].get("shortName"),
                        "tla":       m["homeTeam"].get("tla"),
                        "crest_url": m["homeTeam"].get("crest"),
                    },
                    "away_team": {
                        "id":        m["awayTeam"]["id"],
                        "name":      m["awayTeam"]["name"],
                        "short_name":m["awayTeam"].get("shortName"),
                        "tla":       m["awayTeam"].get("tla"),
                        "crest_url": m["awayTeam"].get("crest"),
                    },
                    "home_score": m["score"]["fullTime"].get("home"),
                    "away_score": m["score"]["fullTime"].get("away"),
                    "winner":     m["score"].get("winner"),
                })
        except requests.HTTPError as e:
            logger.error("HTTP %s fixtures: %s", info["name"], e)
        except Exception as e:
            logger.error("Error %s fixtures: %s", info["name"], e)

    return all_fixtures


# ══════════════════════════════════════════════════════════════════════════════
# PART 4 — ODDS FETCHING  (h2h + totals + btts, single call)
# ══════════════════════════════════════════════════════════════════════════════

def fetch_odds_for_sport(sport_key: str) -> List[Dict[str, Any]]:
    url    = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
    params = {
        "apiKey":     ODDS_API_KEY,
        "regions":    "uk",
        "markets":    "h2h,totals,btts",
        "oddsFormat": "decimal",
        "dateFormat": "iso",
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        events = resp.json()
        logger.info("Odds API — %s: %d events (%s remaining)",
                    sport_key, len(events),
                    resp.headers.get("x-requests-remaining", "?"))
        return events
    except Exception as e:
        logger.error("Odds fetch error %s: %s", sport_key, e)
        return []


# ══════════════════════════════════════════════════════════════════════════════
# PART 5 — TEAM-NAME MATCHING
# ══════════════════════════════════════════════════════════════════════════════

def _normalise(name: str) -> str:
    strip = [" fc"," cf"," afc"," sc"," united"," city",
             "manchester ","brighton & hove ","wolverhampton "]
    n = name.lower().strip()
    for s in strip:
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
    try:
        odds_time = datetime.fromisoformat(event["commence_time"].replace("Z", "+00:00"))
    except (KeyError, ValueError):
        return None
    odds_home, odds_away = event.get("home_team",""), event.get("away_team","")
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
    """Does NOT touch elo_rating or is_big_team — set by fetch_team_elo_ratings()."""
    try:
        supabase.table("teams").upsert({
            "id": team["id"], "name": team["name"],
            "short_name": team.get("short_name"),
            "tla": team.get("tla"), "crest_url": team.get("crest_url"),
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
    match_id: int, bookmaker: Dict[str, Any], home_team: str, away_team: str,
) -> None:
    markets = bookmaker.get("markets", [])
    row: Dict[str, Any] = {
        "match_id":        match_id,
        "bookmaker_key":   bookmaker["key"],
        "bookmaker_title": bookmaker["title"],
        "last_updated":    bookmaker["last_update"],
    }
    # h2h
    h2h = next((m for m in markets if m["key"] == "h2h"), None)
    if h2h:
        hw = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], home_team)), None)
        aw = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], away_team)), None)
        dr = next((o["price"] for o in h2h["outcomes"] if o["name"] == "Draw"), None)
        if hw and aw:
            row.update({"home_win": hw, "away_win": aw, "draw": dr})
    # totals
    col_o = {0.5:"over_05",1.5:"over_15",2.5:"over_25",3.5:"over_35",4.5:"over_45",5.5:"over_55"}
    col_u = {0.5:"under_05",1.5:"under_15",2.5:"under_25",3.5:"under_35",4.5:"under_45",5.5:"under_55"}
    totals = next((m for m in markets if m["key"] == "totals"), None)
    if totals:
        for o in totals.get("outcomes", []):
            try:
                pt = float(o.get("point", -1))
                d  = o.get("name","").lower()
                px = o.get("price")
                if not px: continue
                col = (col_o if d=="over" else col_u if d=="under" else {}).get(pt)
                if col and (col not in row or px > row[col]):
                    row[col] = px
            except (TypeError, ValueError):
                continue
    # btts
    btts = next((m for m in markets if m["key"] == "btts"), None)
    if btts:
        for o in btts.get("outcomes", []):
            nm = o.get("name","").lower(); px = o.get("price")
            if px:
                if nm == "yes": row["btts_yes"] = px
                elif nm == "no": row["btts_no"] = px
    meta = {"match_id","bookmaker_key","bookmaker_title","last_updated"}
    if set(row.keys()) == meta:
        return
    try:
        supabase.table("odds").upsert(row).execute()
    except Exception as e:
        logger.error("Odds upsert match=%s bookie=%s: %s", match_id, bookmaker.get("key"), e)


def _get_best_odds(match_id: int, bet_type: str) -> float:
    col = ODDS_COLUMN_MAP.get(bet_type)
    if col:
        try:
            res = (supabase.table("odds")
                   .select(col)
                   .eq("match_id", match_id)
                   .not_.is_(col, "null")
                   .order(col, desc=True)
                   .limit(1)
                   .execute())
            if res.data:
                return float(res.data[0][col])
        except Exception:
            pass
    return DEFAULT_ODDS.get(bet_type, 1.90)


# ══════════════════════════════════════════════════════════════════════════════
# PART 7 — POISSON / ELO / xG ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def _poisson_pmf(lam: float, k: int) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _fetch_team_db_stats(team_id: int) -> Dict[str, Any]:
    result = {"goals_scored_avg":1.2,"goals_conceded_avg":1.2,
              "games_played":0,"elo_rating":None}
    try:
        t = (supabase.table("teams").select("elo_rating")
             .eq("id", team_id).single().execute())
        if t.data:
            result["elo_rating"] = t.data.get("elo_rating")

        hg = (supabase.table("matches").select("home_score,away_score")
              .eq("home_team_id", team_id).eq("status","FINISHED")
              .not_.is_("home_score","null")
              .order("utc_date", desc=True).limit(10).execute()).data or []
        ag = (supabase.table("matches").select("home_score,away_score")
              .eq("away_team_id", team_id).eq("status","FINISHED")
              .not_.is_("away_score","null")
              .order("utc_date", desc=True).limit(10).execute()).data or []

        if hg or ag:
            scored   = [g["home_score"] for g in hg] + [g["away_score"] for g in ag]
            conceded = [g["away_score"] for g in hg] + [g["home_score"] for g in ag]
            n = len(scored)
            result.update({"goals_scored_avg": sum(scored)/n,
                           "goals_conceded_avg": sum(conceded)/n,
                           "games_played": n})
    except Exception as e:
        logger.warning("DB stats team %s: %s", team_id, e)
    return result


def _compute_strength(avg: float, league_avg: float) -> float:
    return max(0.2, min(3.0, avg / league_avg)) if league_avg else 1.0


def _compute_all_probabilities(lh: float, la: float) -> Dict[str, float]:
    probs: Dict[str, float] = {k: 0.0 for k in ODDS_COLUMN_MAP}
    for h in range(MAX_GOALS):
        for a in range(MAX_GOALS):
            p = _poisson_pmf(lh, h) * _poisson_pmf(la, a)
            total = h + a
            if h > a:    probs["HOME_WIN"] += p
            elif h == a: probs["DRAW"]     += p
            else:        probs["AWAY_WIN"] += p
            for line in TOTALS_LINES:
                if total > line: probs[f"OVER_{line}"]  += p
                else:            probs[f"UNDER_{line}"] += p
            if h > 0 and a > 0: probs["BTTS_YES"] += p
            else:                probs["BTTS_NO"]  += p
    return probs


def _elo_win_prob(
    elo_home: int, elo_away: int, home_adv: int = 100,
) -> Tuple[float, float, float]:
    """
    Standard Elo formula returning (p_home, p_draw, p_away).
    Draw probability is approximated as a bell curve peaking at equality.
    """
    diff   = (elo_home + home_adv) - elo_away
    p_home = 1.0 / (1.0 + 10 ** (-diff / 400.0))
    p_away = 1.0 - p_home
    draw_f = max(0.05, min(0.35, 0.25 * (1.0 - abs(p_home - 0.5) * 2)))
    total  = p_home + draw_f + p_away
    return p_home / total, draw_f / total, p_away / total


def _blend_lambdas(
    p_lh: float, p_la: float,
    home_xg: Optional[float], away_xg: Optional[float],
    elo_home: Optional[int],  elo_away: Optional[int],
) -> Tuple[float, float]:
    """
    Weighted blend:
      • If xG available:   lh = 0.40×Poisson + 0.60×xG
      • Elo adjustment:    scale λ by capped ratio (±15 %)
    """
    lh, la = p_lh, p_la

    if home_xg is not None and away_xg is not None:
        lh = 0.40 * p_lh + 0.60 * home_xg
        la = 0.40 * p_la + 0.60 * away_xg

    if elo_home is not None and elo_away is not None:
        ratio = max(0.85, min(1.15, (elo_home + 100) / max(elo_away, 1)))
        lh *= ratio
        la /= ratio

    return max(0.1, lh), max(0.1, la)


# ══════════════════════════════════════════════════════════════════════════════
# PART 8 — GOD OF TIME SELECTOR  (future-first, 5-step)
# ══════════════════════════════════════════════════════════════════════════════

def _aligned_bets(
    future: str, lh: float, la: float,
) -> List[str]:
    """
    Start from the static FUTURE_ALIGNMENT list and extend it dynamically.
    HOME_WIN / AWAY_WIN → add every Over line below expected total.
    DRAW              → add every Under line above expected total.
    """
    base  = list(FUTURE_ALIGNMENT.get(future, []))
    total = lh + la

    if future in ("HOME_WIN", "AWAY_WIN"):
        for line in TOTALS_LINES:
            key = f"OVER_{line}"
            if total > line + 0.3 and key not in base:
                base.append(key)
        if lh > 0.9 and la > 0.7 and "BTTS_YES" not in base:
            base.append("BTTS_YES")
    elif future == "DRAW":
        for line in TOTALS_LINES:
            key = f"UNDER_{line}"
            if total < line - 0.3 and key not in base:
                base.append(key)
        if lh < 1.0 and la < 1.0 and "BTTS_NO" not in base:
            base.append("BTTS_NO")

    return base


def _god_of_time_select(
    match_id: int,
    home_name: str, away_name: str,
    probs: Dict[str, float],
    lh: float, la: float,
    elo_home: Optional[int], elo_away: Optional[int],
    home_xg: Optional[float], away_xg: Optional[float],
) -> Tuple[str, str, float, float, float, str]:
    """
    God of Time — future-first bet selection.

    Step 1  Determine the future
    ────────────────────────────
    Blend Poisson probs (60%) with Elo probs (40%) when Elo is available.
    If the top two futures are within ELO_DRAW_BAND of each other → DRAW.

    Step 2  Filter aligned bets
    ───────────────────────────
    Only bets conceptually aligned with the predicted future are considered.

    Step 3  Value assessment — EV = (model_prob × odds) − 1
    ─────────────────────────────────────────────────────────
    Bets with EV < 0 are discarded.  If nothing passes, fall back to
    best-EV across ALL bet types (with a logged warning).

    Step 4  Dual output (confidence > 0.80 AND ≥ 2 positive-EV bets)
    ─────────────────────────────────────────────────────────────────
    selection = "1. BetA @ oddsA (EV=+X.XX) | 2. BetB @ oddsB (EV=+Y.YY)"
    Otherwise single-bet format.

    Step 5  Reasoning string
    ────────────────────────

    Returns: (bet_type, selection_str, confidence, primary_odds, primary_ev, reasoning)
    """

    # ── Step 1: future ────────────────────────────────────────────────────
    ph, pd, pa = probs["HOME_WIN"], probs["DRAW"], probs["AWAY_WIN"]

    if elo_home is not None and elo_away is not None:
        eph, epd, epa = _elo_win_prob(elo_home, elo_away)
        ph = 0.60 * ph + 0.40 * eph
        pd = 0.60 * pd + 0.40 * epd
        pa = 0.60 * pa + 0.40 * epa

    ranked = sorted([("HOME_WIN",ph),("DRAW",pd),("AWAY_WIN",pa)],
                    key=lambda x: x[1], reverse=True)
    future, confidence = ranked[0]
    if abs(ranked[0][1] - ranked[1][1]) < ELO_DRAW_BAND:
        future, confidence = "DRAW", pd

    # ── Step 2: aligned bets ─────────────────────────────────────────────
    aligned = _aligned_bets(future, lh, la)

    # ── Step 3: EV filter ─────────────────────────────────────────────────
    pos_ev_bets: List[Dict[str, Any]] = []
    all_aligned: List[Dict[str, Any]] = []

    for bt in aligned:
        mp   = probs.get(bt, 0.0)
        odds = _get_best_odds(match_id, bt)
        imp  = 1.0 / odds if odds > 0 else 1.0
        ev   = round(mp * odds - 1.0, 5)
        lbl  = BET_LABELS.get(bt, bt).replace("{home}", home_name).replace("{away}", away_name)
        entry = {"bet_type": bt, "label": lbl, "model_prob": mp,
                 "decimal_odds": odds, "implied_prob": imp, "ev": ev}
        all_aligned.append(entry)
        if ev >= 0:
            pos_ev_bets.append(entry)

    if not all_aligned:
        # Hard fallback to all bet types
        for bt, mp in probs.items():
            odds = _get_best_odds(match_id, bt)
            ev   = round(mp * odds - 1.0, 5)
            lbl  = BET_LABELS.get(bt, bt).replace("{home}", home_name).replace("{away}", away_name)
            all_aligned.append({"bet_type":bt,"label":lbl,"model_prob":mp,
                                 "decimal_odds":odds,"implied_prob":1/odds if odds>0 else 1,"ev":ev})

    pool   = sorted(pos_ev_bets if pos_ev_bets else all_aligned,
                    key=lambda x: x["ev"], reverse=True)

    if not pos_ev_bets:
        logger.warning("Match %s: no positive-EV aligned bets (future=%s) — fallback", match_id, future)

    # ── Step 4: dual output ───────────────────────────────────────────────
    b1 = pool[0]
    if confidence > DUAL_CONFIDENCE_MIN and len(pos_ev_bets) >= 2:
        b2 = pool[1]
        selection    = (f"1. {b1['label']} @ {b1['decimal_odds']:.2f} (EV={b1['ev']:+.3f})"
                        f" | "
                        f"2. {b2['label']} @ {b2['decimal_odds']:.2f} (EV={b2['ev']:+.3f})")
    else:
        selection = b1["label"]

    primary_odds = b1["decimal_odds"]
    primary_ev   = b1["ev"]
    bet_type_out = b1["bet_type"]

    # ── Step 5: reasoning ─────────────────────────────────────────────────
    elo_str = (f"Elo: {home_name}={elo_home} {away_name}={elo_away}"
               if elo_home and elo_away else "Elo: n/a")
    xg_str  = (f"xG: {home_name}={home_xg:.2f} {away_name}={away_xg:.2f}"
               if home_xg is not None and away_xg is not None else "xG: n/a")
    top3    = " | ".join(f"{b['label']} (EV={b['ev']:+.3f}, p={b['model_prob']:.1%})"
                         for b in pool[:3])
    reasoning = (
        f"God of Time gOT-v3 | "
        f"Future: {future} (conf={confidence:.1%}). "
        f"{elo_str}. {xg_str}. "
        f"λ_home={lh:.2f} λ_away={la:.2f}. "
        f"P(H)={ph:.1%} P(D)={pd:.1%} P(A)={pa:.1%}. "
        f"Aligned bets EV≥0: {len(pos_ev_bets)}/{len(aligned)}. "
        f"Top-3: {top3}. "
        f"Selected: {selection}."
    )

    logger.info(
        "Match %s | %s vs %s | Future=%s conf=%.1f%% | %s @ %.2f EV=%+.3f",
        match_id, home_name, away_name, future,
        confidence*100, b1["label"], primary_odds, primary_ev,
    )

    return bet_type_out, selection, confidence, primary_odds, primary_ev, reasoning


# ══════════════════════════════════════════════════════════════════════════════
# PART 9 — PREDICT MATCH OUTCOME  (Rule 3A: skip if Elo missing)
# ══════════════════════════════════════════════════════════════════════════════

def predict_match_outcome(
    match_id: int,
    fixture: Dict[str, Any],
    xg_map: Dict[int, Dict[str, float]],
) -> Optional[Dict[str, Any]]:
    league_code = fixture["competition_code"]
    avgs        = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})
    home_id     = fixture["home_team"]["id"]
    away_id     = fixture["away_team"]["id"]
    home_name   = fixture["home_team"]["name"]
    away_name   = fixture["away_team"]["name"]

    home_stats = _fetch_team_db_stats(home_id)
    away_stats = _fetch_team_db_stats(away_id)

    # ── Rule 3A ───────────────────────────────────────────────────────────
    elo_home = home_stats.get("elo_rating")
    elo_away = away_stats.get("elo_rating")
    if elo_home is None or elo_away is None:
        logger.warning(
            "Skipping match %s (%s vs %s) — Elo unavailable (home=%s away=%s)",
            match_id, home_name, away_name, elo_home, elo_away,
        )
        return None

    # xG (optional)
    xg_data = xg_map.get(match_id)
    home_xg = xg_data["home_xg"] if xg_data else None
    away_xg = xg_data["away_xg"] if xg_data else None
    if not xg_data:
        logger.info("Match %s: xG not available — Poisson+Elo only", match_id)

    # Dixon-Coles strengths
    home_att = _compute_strength(home_stats["goals_scored_avg"],   avgs["home"])
    home_def = _compute_strength(home_stats["goals_conceded_avg"], avgs["away"])
    away_att = _compute_strength(away_stats["goals_scored_avg"],   avgs["away"])
    away_def = _compute_strength(away_stats["goals_conceded_avg"], avgs["home"])
    p_lh = home_att * away_def * avgs["home"]
    p_la = away_att * home_def * avgs["away"]

    # Blend Poisson + xG + Elo
    lh, la = _blend_lambdas(p_lh, p_la, home_xg, away_xg, elo_home, elo_away)

    probs = _compute_all_probabilities(lh, la)

    bet_type, selection, confidence, predicted_odds, ev, reasoning = \
        _god_of_time_select(
            match_id, home_name, away_name, probs,
            lh, la, elo_home, elo_away, home_xg, away_xg,
        )

    # Persist match_analysis
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
            "probability_over_25":        probs["OVER_2.5"],
            "probability_btts":           probs["BTTS_YES"],
            "data_json": {
                "home_stats": home_stats, "away_stats": away_stats,
                "league_avgs": avgs,
                "elo": {"home": elo_home, "away": elo_away},
                "xg":  {"home": home_xg,  "away": away_xg},
                "blended_lambda": {"home": lh, "away": la},
                "all_probs": {k: round(v, 5) for k, v in probs.items()},
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
        return {
            "id": pred_id, "match_id": match_id,
            "bet_type": bet_type, "selection": selection,
            "predicted_odds": predicted_odds,
            "confidence_score": confidence,
            "ev": ev, "reasoning": reasoning,
            "home_team_id": home_id, "away_team_id": away_id,
        }
    except Exception as e:
        logger.error("prediction save %s: %s", match_id, e)
        return None


# ══════════════════════════════════════════════════════════════════════════════
# PART 10 — DAILY SLIP  (dual-output compatible)
# ══════════════════════════════════════════════════════════════════════════════

def _extract_primary_odds(pick: Dict[str, Any]) -> float:
    """
    For dual-output strings ("1. Bet @ 1.85 (EV=+0.XX) | 2. ..."),
    parse the first odds value.  Falls back to stored predicted_odds.
    """
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
        logger.error("big_team_ids fetch: %s", e)
        return set()


def generate_daily_slip(
    predictions: List[Dict[str, Any]], slip_date: date,
) -> None:
    valid = [p for p in predictions
             if p and p.get("confidence_score", 0) >= MIN_CONFIDENCE]
    if not valid:
        logger.warning("No predictions at MIN_CONFIDENCE for %s", slip_date)
        return

    big_ids   = _fetch_big_team_ids()
    big_preds = sorted(
        [p for p in valid if p.get("home_team_id") in big_ids or p.get("away_team_id") in big_ids],
        key=lambda p: p["confidence_score"], reverse=True)
    other     = sorted([p for p in valid if p not in big_preds],
                       key=lambda p: p["confidence_score"], reverse=True)

    top = big_preds[:SLIP_SIZE]
    if len(top) < SLIP_SIZE:
        top += other[:SLIP_SIZE - len(top)]
    top.sort(key=lambda p: p["confidence_score"], reverse=True)

    total_odds = 1.0
    for p in top:
        total_odds *= _extract_primary_odds(p)

    logger.info("Slip %s: %d picks, combined odds %.2f", slip_date, len(top), total_odds)

    try:
        slip = supabase.table("ten_odds_slips").upsert({
            "slip_date": slip_date.isoformat(),
            "total_odds": round(total_odds, 2),
            "status": "PENDING",
        }).execute()
        slip_id = slip.data[0]["id"]

        for order, pick in enumerate(top, 1):
            supabase.table("slip_picks").upsert({
                "slip_id":       slip_id,
                "match_id":      pick["match_id"],
                "prediction_id": pick["id"],
                "pick_order":    order,
                "odds_at_time":  _extract_primary_odds(pick),
            }).execute()

        logger.info("Slip saved id=%s total_odds=%.2f", slip_id, total_odds)
    except Exception as e:
        logger.error("Slip write error: %s", e)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    logger.info("═══ MK-806 god Of Time v3 starting ═══")

    # 1 — competitions
    upsert_competitions()

    # 2 — fixtures  (today → day-after-tomorrow, inclusive)
    now_utc  = datetime.now(timezone.utc)
    end_date = now_utc + timedelta(days=3)
    fixtures = fetch_fixtures_for_date_range(now_utc, end_date)
    logger.info("Fixtures: %d", len(fixtures))
    for fix in fixtures:
        upsert_team(fix["home_team"])
        upsert_team(fix["away_team"])
        upsert_match(fix)

    # 3 — Elo ratings  (sets teams.elo_rating + is_big_team)
    logger.info("Step 3: Elo ratings…")
    fetch_team_elo_ratings()

    # 4 — xG  (sets matches.home_xg / away_xg)
    logger.info("Step 4: xG stats…")
    xg_map = fetch_match_xg_stats(fixtures)

    # 5 — odds
    logger.info("Step 5: Odds…")
    for league_code, sport_key in SPORT_KEY_MAPPING.items():
        for event in fetch_odds_for_sport(sport_key):
            mid = match_odds_event_to_fixture(event, fixtures)
            if mid is None:
                continue
            for bookie in event.get("bookmakers", []):
                upsert_odds(mid, bookie, event["home_team"], event["away_team"])

    # 6 — predictions  (Kenya today + tomorrow, skip if Elo missing)
    logger.info("Step 6: gOT predictions…")
    now_ke  = datetime.now(KENYA_TZ)
    today_ke  = now_ke.date()
    tmrw_ke   = today_ke + timedelta(days=1)
    target = [
        f for f in fixtures
        if datetime.fromisoformat(f["utc_date"].replace("Z", "+00:00"))
               .astimezone(KENYA_TZ).date() in (today_ke, tmrw_ke)
    ]
    logger.info("Predicting %d fixtures (KE today=%s tomorrow=%s)",
                len(target), today_ke, tmrw_ke)

    preds: List[Dict[str, Any]] = []
    for fix in target:
        p = predict_match_outcome(fix["id"], fix, xg_map)
        if p:
            preds.append(p)

    # 7 — slip
    logger.info("Step 7: Daily slip…")
    generate_daily_slip(preds, today_ke)

    logger.info("═══ MK-806 god Of Time v3 complete ═══")


if __name__ == "__main__":
    main()