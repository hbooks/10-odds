"""
fetch_and_store_data.py  —  MK-806 Data Pipeline  (v2)
=======================================================
Changes vs v1
─────────────
• fetch_odds_for_sport  — requests h2h + totals + btts in one call
• upsert_odds           — stores all O/U levels (0.5–5.5) + BTTS Yes/No
• _get_best_odds        — full column map for every bet type
• predict_match_outcome — expanded Poisson matrix covering all O/U + BTTS_NO
• _god_of_time_select   — replaces naive max(); EV-ranked, tiered selector
• generate_daily_slip   — big-team filter, MIN_CONFIDENCE lowered to 0.40
• fetch_fixtures range  — end_date = today + 3 days (inclusive day after tomorrow)
• Kenya timezone        — slip date determined in Africa/Nairobi

Dependencies:
    pip install supabase python-dotenv requests pytz
"""

import os
import math
import logging
import requests
import pytz
from datetime import datetime, timedelta, date, timezone
from typing import List, Dict, Any, Optional, Tuple
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
SUPABASE_URL: str         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str = os.environ["SUPABASE_SERVICE_KEY"]
FOOTBALL_DATA_API_KEY: str = os.environ["FOOTBALL_DATA_API_KEY"]
ODDS_API_KEY: str         = os.environ["ODDS_API_KEY"]

# ── Supabase client ───────────────────────────────────────────────────────────
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
SPORT_KEY_MAPPING: Dict[str, str] = {
    "PL":  "soccer_epl",
    "PD":  "soccer_spain_la_liga",
    "SA":  "soccer_italy_serie_a",
    "BL1": "soccer_germany_bundesliga",
    "FL1": "soccer_france_ligue_one",
}

# Dixon-Coles baseline: league-wide avg goals (home / away)
LEAGUE_AVERAGES: Dict[str, Dict[str, float]] = {
    "PL":  {"home": 1.53, "away": 1.19},
    "PD":  {"home": 1.61, "away": 1.14},
    "SA":  {"home": 1.48, "away": 1.10},
    "BL1": {"home": 1.65, "away": 1.23},
    "FL1": {"home": 1.44, "away": 1.08},
}

# Slip settings
SLIP_SIZE      = 10
MIN_CONFIDENCE = 0.40    # lowered from 0.55 to ensure a slip is always generated
MAX_GOALS      = 9       # score matrix covers 0..8

# God-of-Time EV thresholds
EV_BOUND_THRESHOLD = 0.05
BOUND_MODEL_PROB   = 0.75
BOUND_IMPLIED_MAX  = 0.60
MAY_HAPPEN_LOW     = 0.45

TOTALS_LINES = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]

KENYA_TZ = pytz.timezone("Africa/Nairobi")

# Bet-type → odds table column
ODDS_COLUMN_MAP: Dict[str, str] = {
    "HOME_WIN":  "home_win",
    "DRAW":      "draw",
    "AWAY_WIN":  "away_win",
    "OVER_0.5":  "over_05",
    "OVER_1.5":  "over_15",
    "OVER_2.5":  "over_25",
    "OVER_3.5":  "over_35",
    "OVER_4.5":  "over_45",
    "OVER_5.5":  "over_55",
    "UNDER_0.5": "under_05",
    "UNDER_1.5": "under_15",
    "UNDER_2.5": "under_25",
    "UNDER_3.5": "under_35",
    "UNDER_4.5": "under_45",
    "UNDER_5.5": "under_55",
    "BTTS_YES":  "btts_yes",
    "BTTS_NO":   "btts_no",
}

DEFAULT_ODDS: Dict[str, float] = {
    "HOME_WIN":  1.90, "DRAW":     3.20, "AWAY_WIN":  2.10,
    "OVER_0.5":  1.15, "OVER_1.5": 1.35, "OVER_2.5":  1.80,
    "OVER_3.5":  2.50, "OVER_4.5": 3.50, "OVER_5.5":  5.50,
    "UNDER_0.5": 7.00, "UNDER_1.5": 3.50, "UNDER_2.5": 1.90,
    "UNDER_3.5": 1.35, "UNDER_4.5": 1.15, "UNDER_5.5": 1.08,
    "BTTS_YES":  1.75, "BTTS_NO":  1.90,
}


# ══════════════════════════════════════════════════════════════════════════════
# PART 1 — FIXTURE FETCHING
# ══════════════════════════════════════════════════════════════════════════════

def fetch_fixtures_for_date_range(
    start_date: datetime, end_date: datetime,
) -> List[Dict[str, Any]]:
    """
    Fetch fixtures from Football-Data.org.
    dateFrom and dateTo are both inclusive, so passing today and today+3
    correctly covers today / tomorrow / day-after-tomorrow.
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
            logger.info(
                "Fetched %d matches for %s (%s → %s)",
                len(matches), info["name"], date_from, date_to,
            )
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
            logger.error("HTTP error fetching %s fixtures: %s", info["name"], e)
        except Exception as e:
            logger.error("Error fetching %s fixtures: %s", info["name"], e)

    return all_fixtures


# ══════════════════════════════════════════════════════════════════════════════
# PART 2 — ODDS FETCHING  (h2h + totals + btts in ONE API call)
# ══════════════════════════════════════════════════════════════════════════════

def fetch_odds_for_sport(sport_key: str) -> List[Dict[str, Any]]:
    """
    Single Odds API call requesting h2h, totals, AND btts.
    Combining markets saves quota vs three separate requests.
    """
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
        events    = resp.json()
        remaining = resp.headers.get("x-requests-remaining", "?")
        logger.info(
            "Odds API — %s: %d events, %s requests remaining",
            sport_key, len(events), remaining,
        )
        return events
    except requests.HTTPError as e:
        logger.error("HTTP error fetching odds for %s: %s", sport_key, e)
        return []
    except Exception as e:
        logger.error("Error fetching odds for %s: %s", sport_key, e)
        return []


# ══════════════════════════════════════════════════════════════════════════════
# PART 3 — ODDS MATCHING  (Football-Data.org event ↔ The Odds API event)
# ══════════════════════════════════════════════════════════════════════════════

def _normalise(name: str) -> str:
    strip = [
        " fc", " cf", " afc", " sc", " united", " city",
        "manchester ", "brighton & hove ", "wolverhampton ",
    ]
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
    """Map a Odds-API event to our Football-Data fixture by kick-off time + team names."""
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
# PART 4 — SUPABASE UPSERTS
# ══════════════════════════════════════════════════════════════════════════════

def upsert_competitions() -> None:
    for lid, info in TARGET_LEAGUES.items():
        try:
            supabase.table("competitions").upsert({
                "id": lid, "name": info["name"],
                "code": info["code"], "area_name": info["area"],
            }).execute()
        except Exception as e:
            logger.error("Error upserting competition %s: %s", info["name"], e)


def upsert_team(team: Dict[str, Any]) -> None:
    """
    Upsert team without touching is_big_team — manual SQL overrides are preserved.
    Uses on_conflict=id so the column is only set on INSERT, not clobbered on UPDATE.
    """
    try:
        supabase.table("teams").upsert(
            {
                "id":         team["id"],
                "name":       team["name"],
                "short_name": team.get("short_name"),
                "tla":        team.get("tla"),
                "crest_url":  team.get("crest_url"),
            },
            ignore_duplicates=False,
            on_conflict="id",
        ).execute()
    except Exception as e:
        logger.error("Error upserting team %s: %s", team.get("name"), e)


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
        logger.error("Error upserting match %s: %s", fix.get("id"), e)


def upsert_odds(
    match_id: int,
    bookmaker: Dict[str, Any],
    home_team: str,
    away_team: str,
) -> None:
    """
    Parse all available markets from a bookmaker object and write ONE row.

    Markets handled:
      h2h    → home_win, draw, away_win
      totals → over_05 … over_55, under_05 … under_55
      btts   → btts_yes, btts_no

    Columns with no data remain NULL (not overwritten with zeros).
    """
    markets = bookmaker.get("markets", [])
    row: Dict[str, Any] = {
        "match_id":        match_id,
        "bookmaker_key":   bookmaker["key"],
        "bookmaker_title": bookmaker["title"],
        "last_updated":    bookmaker["last_update"],
    }

    # ── 1X2 ───────────────────────────────────────────────────────────────
    h2h = next((m for m in markets if m["key"] == "h2h"), None)
    if h2h:
        hw = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], home_team)), None)
        aw = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], away_team)), None)
        dr = next((o["price"] for o in h2h["outcomes"] if o["name"] == "Draw"), None)
        if hw is not None and aw is not None:
            row["home_win"] = hw
            row["away_win"] = aw
            row["draw"]     = dr

    # ── Totals ─────────────────────────────────────────────────────────────
    # The Odds API returns separate outcome objects per line e.g.:
    #   {"name": "Over", "point": 2.5, "price": 1.82}
    #   {"name": "Under", "point": 2.5, "price": 2.00}
    col_map_over  = {0.5: "over_05",  1.5: "over_15",  2.5: "over_25",
                     3.5: "over_35",  4.5: "over_45",  5.5: "over_55"}
    col_map_under = {0.5: "under_05", 1.5: "under_15", 2.5: "under_25",
                     3.5: "under_35", 4.5: "under_45", 5.5: "under_55"}

    totals = next((m for m in markets if m["key"] == "totals"), None)
    if totals:
        for outcome in totals.get("outcomes", []):
            try:
                point = float(outcome.get("point", -1))
                direction = outcome.get("name", "").lower()
                price = outcome.get("price")
                if price is None:
                    continue
                if direction == "over":
                    col = col_map_over.get(point)
                elif direction == "under":
                    col = col_map_under.get(point)
                else:
                    continue
                if col:
                    # Keep best (highest) price across bookmakers
                    if col not in row or price > row[col]:
                        row[col] = price
            except (TypeError, ValueError):
                continue

    # ── BTTS ───────────────────────────────────────────────────────────────
    btts = next((m for m in markets if m["key"] == "btts"), None)
    if btts:
        for outcome in btts.get("outcomes", []):
            name  = outcome.get("name", "").lower()
            price = outcome.get("price")
            if not price:
                continue
            if name == "yes":
                row["btts_yes"] = price
            elif name == "no":
                row["btts_no"]  = price

    # Skip if nothing beyond identifiers was populated
    meta_cols = {"match_id", "bookmaker_key", "bookmaker_title", "last_updated"}
    if set(row.keys()) == meta_cols:
        logger.debug("No usable markets for match=%s bookmaker=%s", match_id, bookmaker["key"])
        return

    try:
        supabase.table("odds").upsert(row).execute()
    except Exception as e:
        logger.error("Error upserting odds match=%s bookmaker=%s: %s", match_id, bookmaker.get("key"), e)


def _get_best_odds(match_id: int, bet_type: str) -> float:
    """
    Return the highest bookmaker price for a bet type from the odds table.
    Falls back to DEFAULT_ODDS when no data exists.
    """
    col = ODDS_COLUMN_MAP.get(bet_type)
    if col:
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
            logger.debug("Could not read odds col %s for match %s: %s", col, match_id, e)

    return DEFAULT_ODDS.get(bet_type, 1.90)


# ══════════════════════════════════════════════════════════════════════════════
# PART 5 — MK-806 POISSON ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def _poisson_pmf(lam: float, k: int) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _fetch_team_historical_stats(team_id: int) -> Dict[str, float]:
    """Last 10 home + 10 away finished games to derive goal averages."""
    try:
        home_res = (
            supabase.table("matches")
            .select("home_score, away_score")
            .eq("home_team_id", team_id)
            .eq("status", "FINISHED")
            .not_.is_("home_score", "null")
            .order("utc_date", desc=True)
            .limit(10)
            .execute()
        )
        away_res = (
            supabase.table("matches")
            .select("home_score, away_score")
            .eq("away_team_id", team_id)
            .eq("status", "FINISHED")
            .not_.is_("away_score", "null")
            .order("utc_date", desc=True)
            .limit(10)
            .execute()
        )
        home_games = home_res.data or []
        away_games = away_res.data or []

        if not home_games and not away_games:
            return {"goals_scored_avg": 1.2, "goals_conceded_avg": 1.2, "games_played": 0}

        scored   = [g["home_score"] for g in home_games] + [g["away_score"] for g in away_games]
        conceded = [g["away_score"] for g in home_games] + [g["home_score"] for g in away_games]
        n = len(scored)
        return {
            "goals_scored_avg":   sum(scored)   / n,
            "goals_conceded_avg": sum(conceded) / n,
            "games_played": n,
        }
    except Exception as e:
        logger.warning("Could not fetch historical stats for team %s: %s", team_id, e)
        return {"goals_scored_avg": 1.2, "goals_conceded_avg": 1.2, "games_played": 0}


def _compute_strength(team_avg: float, league_avg: float) -> float:
    if league_avg == 0:
        return 1.0
    return max(0.2, min(3.0, team_avg / league_avg))


def _compute_all_probabilities(lh: float, la: float) -> Dict[str, float]:
    """
    Integrate a MAX_GOALS × MAX_GOALS Poisson score matrix to derive
    model probabilities for every supported bet type.
    """
    probs: Dict[str, float] = {k: 0.0 for k in ODDS_COLUMN_MAP}

    for h in range(MAX_GOALS):
        for a in range(MAX_GOALS):
            p     = _poisson_pmf(lh, h) * _poisson_pmf(la, a)
            total = h + a

            # 1X2
            if h > a:    probs["HOME_WIN"] += p
            elif h == a: probs["DRAW"]     += p
            else:        probs["AWAY_WIN"] += p

            # All totals lines
            for line in TOTALS_LINES:
                over_key  = f"OVER_{line}"
                under_key = f"UNDER_{line}"
                if total > line:
                    probs[over_key]  += p
                else:
                    probs[under_key] += p

            # BTTS
            if h > 0 and a > 0:
                probs["BTTS_YES"] += p
            else:
                probs["BTTS_NO"]  += p

    return probs


# ── God-of-Time selector ──────────────────────────────────────────────────────

BET_LABELS: Dict[str, str] = {
    "HOME_WIN":  "{home} to Win",
    "DRAW":      "Match Draw",
    "AWAY_WIN":  "{away} to Win",
    "OVER_0.5":  "Over 0.5 Goals",  "UNDER_0.5": "Under 0.5 Goals",
    "OVER_1.5":  "Over 1.5 Goals",  "UNDER_1.5": "Under 1.5 Goals",
    "OVER_2.5":  "Over 2.5 Goals",  "UNDER_2.5": "Under 2.5 Goals",
    "OVER_3.5":  "Over 3.5 Goals",  "UNDER_3.5": "Under 3.5 Goals",
    "OVER_4.5":  "Over 4.5 Goals",  "UNDER_4.5": "Under 4.5 Goals",
    "OVER_5.5":  "Over 5.5 Goals",  "UNDER_5.5": "Under 5.5 Goals",
    "BTTS_YES":  "Both Teams to Score",
    "BTTS_NO":   "Both Teams NOT to Score",
}


def _god_of_time_select(
    match_id: int,
    home_name: str,
    away_name: str,
    probs: Dict[str, float],
    lh: float,
    la: float,
) -> Tuple[str, str, float, float, float, str]:
    """
    Tiered Expected-Value bet selector — the 'God of Time' algorithm.

    For each bet type:
      decimal_odds  = best available bookmaker price (or default)
      implied_prob  = 1 / decimal_odds
      EV            = (model_prob × decimal_odds) − 1

    Tier classification:
      BOUND      model_prob > 0.75  AND  implied_prob < 0.60  AND  EV > 0.05
      MAY_HAPPEN 0.45 ≤ model_prob ≤ 0.75
      UNLIKELY   model_prob < 0.45  (fallback only)

    Selection priority:
      1. Highest-EV BOUND bet (if any)
      2. Highest-EV MAY_HAPPEN bet (if any BOUND bets fail threshold)
      3. Highest-EV overall bet (absolute fallback)

    Returns:
      (bet_type, label, model_prob, decimal_odds, ev, reasoning_string)
    """
    all_bets:        List[Dict[str, Any]] = []
    bound_bets:      List[Dict[str, Any]] = []
    may_happen_bets: List[Dict[str, Any]] = []

    for bet_type, model_prob in probs.items():
        decimal_odds = _get_best_odds(match_id, bet_type)
        implied_prob = 1.0 / decimal_odds if decimal_odds > 0 else 1.0
        ev           = round(model_prob * decimal_odds - 1.0, 5)

        # Resolve label placeholders
        raw_label = BET_LABELS.get(bet_type, bet_type)
        label     = raw_label.replace("{home}", home_name).replace("{away}", away_name)

        entry = {
            "bet_type":     bet_type,
            "label":        label,
            "model_prob":   model_prob,
            "decimal_odds": decimal_odds,
            "implied_prob": implied_prob,
            "ev":           ev,
        }
        all_bets.append(entry)

        if (model_prob > BOUND_MODEL_PROB
                and implied_prob < BOUND_IMPLIED_MAX
                and ev > EV_BOUND_THRESHOLD):
            bound_bets.append(entry)
        elif MAY_HAPPEN_LOW <= model_prob <= BOUND_MODEL_PROB:
            may_happen_bets.append(entry)

    # ── Tier selection ────────────────────────────────────────────────────
    if bound_bets:
        best = max(bound_bets, key=lambda x: x["ev"])
        tier = "BOUND"
    elif may_happen_bets:
        best = max(may_happen_bets, key=lambda x: x["ev"])
        tier = "MAY_HAPPEN"
    else:
        best = max(all_bets, key=lambda x: x["ev"])
        tier = "FALLBACK"

    if best["ev"] < 0:
        logger.warning(
            "Match %s: best bet '%s' has negative EV=%.4f — no positive edge found",
            match_id, best["bet_type"], best["ev"],
        )

    # ── Reasoning ─────────────────────────────────────────────────────────
    top3 = sorted(all_bets, key=lambda x: x["ev"], reverse=True)[:3]
    top3_str = ", ".join(
        f"{b['label']} (EV={b['ev']:+.3f}, model={b['model_prob']:.1%})"
        for b in top3
    )
    reasoning = (
        f"MK-806 God-of-Time v2 | λ_home={lh:.2f} λ_away={la:.2f}. "
        f"Selected [{tier}]: {best['label']}. "
        f"Model prob={best['model_prob']:.1%}, "
        f"implied prob={best['implied_prob']:.1%}, "
        f"odds={best['decimal_odds']:.2f}, "
        f"EV={best['ev']:+.4f}. "
        f"Top-3 by EV → {top3_str}."
    )

    logger.info(
        "Match %s | %s vs %s → [%s] '%s' @ %.2f "
        "(model=%.1f%% implied=%.1f%% EV=%+.3f)",
        match_id, home_name, away_name, tier,
        best["label"], best["decimal_odds"],
        best["model_prob"] * 100, best["implied_prob"] * 100, best["ev"],
    )

    return (
        best["bet_type"], best["label"],
        best["model_prob"], best["decimal_odds"], best["ev"],
        reasoning,
    )


# ══════════════════════════════════════════════════════════════════════════════
# PART 6 — PREDICT MATCH OUTCOME
# ══════════════════════════════════════════════════════════════════════════════

def predict_match_outcome(
    match_id: int,
    fixture: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Orchestrates the full MK-806 pipeline for one match:
      1. Fetch historical team stats.
      2. Compute Dixon-Coles strengths + expected goals.
      3. Build full probability distribution.
      4. Run God-of-Time selector.
      5. Persist match_analysis + predictions rows.
      6. Return prediction dict (includes team IDs for slip filtering).
    """
    league_code = fixture["competition_code"]
    avgs        = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})
    home_id     = fixture["home_team"]["id"]
    away_id     = fixture["away_team"]["id"]
    home_name   = fixture["home_team"]["name"]
    away_name   = fixture["away_team"]["name"]

    home_stats = _fetch_team_historical_stats(home_id)
    away_stats = _fetch_team_historical_stats(away_id)

    home_att = _compute_strength(home_stats["goals_scored_avg"],   avgs["home"])
    home_def = _compute_strength(home_stats["goals_conceded_avg"], avgs["away"])
    away_att = _compute_strength(away_stats["goals_scored_avg"],   avgs["away"])
    away_def = _compute_strength(away_stats["goals_conceded_avg"], avgs["home"])

    lh = home_att * away_def * avgs["home"]
    la = away_att * home_def * avgs["away"]

    probs = _compute_all_probabilities(lh, la)

    bet_type, selection, confidence, predicted_odds, ev, reasoning = \
        _god_of_time_select(match_id, home_name, away_name, probs, lh, la)

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
            "probability_over_25":        probs["OVER_2.5"],
            "probability_btts":           probs["BTTS_YES"],
            "data_json": {
                "home_stats":      home_stats,
                "away_stats":      away_stats,
                "league_averages": avgs,
                "all_probs":       {k: round(v, 5) for k, v in probs.items()},
            },
        }).execute()
    except Exception as e:
        logger.error("Error saving match_analysis for match %s: %s", match_id, e)

    # ── Persist prediction ────────────────────────────────────────────────
    try:
        result = supabase.table("predictions").upsert({
            "match_id":         match_id,
            "bet_type":         bet_type,
            "selection":        selection,
            "predicted_odds":   predicted_odds,
            "confidence_score": round(confidence, 4),
            "reasoning":        reasoning,
            "status":           "PENDING",
        }).execute()
        pred_id = result.data[0]["id"] if result.data else None
        return {
            "id":             pred_id,
            "match_id":       match_id,
            "bet_type":       bet_type,
            "selection":      selection,
            "predicted_odds": predicted_odds,
            "confidence_score": confidence,
            "ev":             ev,
            "reasoning":      reasoning,
            # Carry team IDs so the slip generator can apply the big-team filter
            "home_team_id":   home_id,
            "away_team_id":   away_id,
        }
    except Exception as e:
        logger.error("Error saving prediction for match %s: %s", match_id, e)
        return None


# ══════════════════════════════════════════════════════════════════════════════
# PART 7 — DAILY 10-ODDS SLIP
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_big_team_ids() -> set:
    """Return IDs of all teams flagged is_big_team = true."""
    try:
        res = supabase.table("teams").select("id").eq("is_big_team", True).execute()
        return {row["id"] for row in (res.data or [])}
    except Exception as e:
        logger.error("Error fetching big team IDs: %s", e)
        return set()


def generate_daily_slip(
    predictions: List[Dict[str, Any]],
    slip_date: date,
) -> None:
    """
    Assemble the daily 10-Odds slip:

    1. Drop None entries and those below MIN_CONFIDENCE (0.40).
    2. Split into big-team-eligible vs other predictions.
    3. Fill SLIP_SIZE slots with big-team picks first; backfill from others.
    4. Sort final selection by confidence descending.
    5. Multiply odds and write ten_odds_slips + slip_picks.
    """
    valid = [
        p for p in predictions
        if p and p.get("confidence_score", 0) >= MIN_CONFIDENCE
    ]
    if not valid:
        logger.warning(
            "No predictions at MIN_CONFIDENCE=%.2f for %s — skipping slip",
            MIN_CONFIDENCE, slip_date,
        )
        return

    big_ids = _fetch_big_team_ids()
    logger.info("Big-team IDs loaded: %d", len(big_ids))

    big_preds   = sorted(
        [p for p in valid if p.get("home_team_id") in big_ids or p.get("away_team_id") in big_ids],
        key=lambda p: p["confidence_score"], reverse=True,
    )
    other_preds = sorted(
        [p for p in valid if p not in big_preds],
        key=lambda p: p["confidence_score"], reverse=True,
    )

    top = big_preds[:SLIP_SIZE]
    if len(top) < SLIP_SIZE:
        gap = SLIP_SIZE - len(top)
        top += other_preds[:gap]
        logger.info(
            "Big-team picks: %d — backfilled %d from non-big-team predictions",
            len(big_preds), len(top) - len(big_preds),
        )

    top.sort(key=lambda p: p["confidence_score"], reverse=True)

    total_odds = 1.0
    for pick in top:
        total_odds *= pick["predicted_odds"]

    logger.info(
        "Slip %s: %d picks, combined odds %.2f",
        slip_date, len(top), total_odds,
    )

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
                "odds_at_time":  pick["predicted_odds"],
            }).execute()

        logger.info("Slip saved — date=%s id=%s total_odds=%.2f", slip_date, slip_id, total_odds)
    except Exception as e:
        logger.error("Error writing slip: %s", e)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    logger.info("═══ MK-806 pipeline v2 starting ═══")

    # 1 — competitions
    logger.info("Step 1: Upserting competitions…")
    upsert_competitions()

    # 2 — fixtures (today → day-after-tomorrow, inclusive)
    logger.info("Step 2: Fetching fixtures…")
    now_utc  = datetime.now(timezone.utc)
    end_date = now_utc + timedelta(days=3)   # +3 so dateTo covers day-after-tomorrow
    fixtures = fetch_fixtures_for_date_range(now_utc, end_date)
    logger.info("Total fixtures fetched: %d", len(fixtures))

    for fix in fixtures:
        upsert_team(fix["home_team"])
        upsert_team(fix["away_team"])
        upsert_match(fix)

    # 3 — odds (h2h + totals + btts)
    logger.info("Step 3: Fetching & storing odds…")
    for league_code, sport_key in SPORT_KEY_MAPPING.items():
        events = fetch_odds_for_sport(sport_key)
        for event in events:
            match_id = match_odds_event_to_fixture(event, fixtures)
            if match_id is None:
                logger.debug(
                    "Unmatched odds event: %s vs %s",
                    event.get("home_team"), event.get("away_team"),
                )
                continue
            for bookmaker in event.get("bookmakers", []):
                upsert_odds(match_id, bookmaker, event["home_team"], event["away_team"])

    # 4 — predictions (Kenya today + tomorrow)
    logger.info("Step 4: Running MK-806 predictions…")
    now_kenya      = datetime.now(KENYA_TZ)
    today_kenya    = now_kenya.date()
    tomorrow_kenya = today_kenya + timedelta(days=1)

    target = []
    for f in fixtures:
        match_utc   = datetime.fromisoformat(f["utc_date"].replace("Z", "+00:00"))
        match_kenya = match_utc.astimezone(KENYA_TZ)
        if match_kenya.date() in (today_kenya, tomorrow_kenya):
            target.append(f)

    logger.info(
        "Predicting %d fixtures (Kenya: today=%s tomorrow=%s)",
        len(target), today_kenya, tomorrow_kenya,
    )

    predictions: List[Dict[str, Any]] = []
    for fix in target:
        pred = predict_match_outcome(fix["id"], fix)
        if pred:
            predictions.append(pred)

    # 5 — daily slip
    logger.info("Step 5: Generating daily slip…")
    generate_daily_slip(predictions, today_kenya)

    logger.info("═══ MK-806 pipeline v2 complete ═══")


if __name__ == "__main__":
    main()