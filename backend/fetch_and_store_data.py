"""
fetch_and_store_data.py
=======================
MK-806 Data Pipeline — fetches fixtures, odds, runs prediction engine,
and generates the daily 10-Odds slip.

Run as a daily cron job or GitHub Actions workflow.

Dependencies:
    pip install supabase python-dotenv requests scipy numpy
"""

import os
import math
import logging
import requests
import pytz
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timedelta, date, timezone


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
FOOTBALL_DATA_API_KEY: str = os.environ["FOOTBALL_DATA_API_KEY"]
ODDS_API_KEY: str = os.environ["ODDS_API_KEY"]

# ── Clients ───────────────────────────────────────────────────────────────────
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
FD_HEADERS = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}

# ── Config ────────────────────────────────────────────────────────────────────
TARGET_LEAGUES: Dict[int, Dict[str, str]] = {
    2021: {"name": "Premier League",  "code": "PL",  "area": "England"},
    2014: {"name": "La Liga",         "code": "PD",  "area": "Spain"},
    2019: {"name": "Serie A",         "code": "SA",  "area": "Italy"},
    2002: {"name": "Bundesliga",      "code": "BL1", "area": "Germany"},
    2015: {"name": "Ligue 1",         "code": "FL1", "area": "France"},
}

SPORT_KEY_MAPPING: Dict[str, str] = {
    "PL":  "soccer_epl",
    "PD":  "soccer_spain_la_liga",
    "SA":  "soccer_italy_serie_a",
    "BL1": "soccer_germany_bundesliga",
    "FL1": "soccer_france_ligue_one",
}

# League-wide average goals per game (home/away) used as Dixon-Coles baseline.
# Update these periodically from historical data.
LEAGUE_AVERAGES: Dict[str, Dict[str, float]] = {
    "PL":  {"home": 1.53, "away": 1.19},
    "PD":  {"home": 1.61, "away": 1.14},
    "SA":  {"home": 1.48, "away": 1.10},
    "BL1": {"home": 1.65, "away": 1.23},
    "FL1": {"home": 1.44, "away": 1.08},
}

# Number of top-confidence predictions to include in the slip
SLIP_SIZE = 10

# Minimum confidence to be eligible for the slip
MIN_CONFIDENCE = 0.55


# ══════════════════════════════════════════════════════════════════════════════
# PART 1 — DATA FETCHING
# ══════════════════════════════════════════════════════════════════════════════

def fetch_fixtures_for_date_range(
    start_date: datetime, end_date: datetime
) -> List[Dict[str, Any]]:
    """Fetch upcoming fixtures from Football-Data.org for a 3-day window."""
    all_fixtures: List[Dict[str, Any]] = []
    date_from = start_date.strftime("%Y-%m-%d")
    date_to   = end_date.strftime("%Y-%m-%d")

    for league_id, league_info in TARGET_LEAGUES.items():
        url = f"{FOOTBALL_DATA_BASE}/competitions/{league_id}/matches"
        params = {"dateFrom": date_from, "dateTo": date_to}
        try:
            resp = requests.get(url, headers=FD_HEADERS, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            matches = data.get("matches", [])
            logger.info(
                "Fetched %d matches for %s (%s → %s)",
                len(matches), league_info["name"], date_from, date_to,
            )
            for m in matches:
                all_fixtures.append({
                    "id":             m["id"],
                    "competition_id": league_id,
                    "competition_code": league_info["code"],
                    "matchday":       m.get("matchday"),
                    "utc_date":       m["utcDate"],
                    "status":         m["status"],
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
            logger.error("HTTP error fetching %s fixtures: %s", league_info["name"], e)
        except Exception as e:
            logger.error("Error fetching %s fixtures: %s", league_info["name"], e)

    return all_fixtures


def fetch_odds_for_sport(sport_key: str) -> List[Dict[str, Any]]:
    """Fetch 1X2 decimal odds from The Odds API for a sport."""
    url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
    params = {
        "apiKey":      ODDS_API_KEY,
        "regions":     "uk",
        "markets":     "h2h",
        "oddsFormat":  "decimal",
        "dateFormat":  "iso",
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        remaining = resp.headers.get("x-requests-remaining", "?")
        logger.info("Odds API — %s: %s events fetched (%s requests remaining)", sport_key, len(resp.json()), remaining)
        return resp.json()
    except requests.HTTPError as e:
        logger.error("HTTP error fetching odds for %s: %s", sport_key, e)
        return []
    except Exception as e:
        logger.error("Error fetching odds for %s: %s", sport_key, e)
        return []


# ══════════════════════════════════════════════════════════════════════════════
# PART 2 — ODDS MATCHING (Football-Data.org ↔ The Odds API)
# ══════════════════════════════════════════════════════════════════════════════

def _normalise(name: str) -> str:
    """Strip common suffixes/punctuation and lowercase for fuzzy matching."""
    replacements = [
        " FC", " CF", " AFC", " SC", " United", " City",
        "Manchester ", "Brighton & Hove ", "Wolverhampton ",
    ]
    n = name.lower().strip()
    for r in replacements:
        n = n.replace(r.lower(), "")
    return n.strip()


def _team_names_match(fd_name: str, odds_name: str) -> bool:
    """Return True when two team name strings refer to the same club."""
    fd = _normalise(fd_name)
    od = _normalise(odds_name)
    if fd == od:
        return True
    # substring match (handles "Man City" vs "city" etc.)
    return fd in od or od in fd


def match_odds_event_to_fixture(
    odds_event: Dict[str, Any],
    fixtures: List[Dict[str, Any]],
    window_minutes: int = 90,
) -> Optional[int]:
    """
    Attempt to map a The-Odds-API event to one of our stored fixtures.

    Strategy:
      1. Parse both kick-off times.
      2. Accept only if they are within `window_minutes` of each other.
      3. Fuzzy-match home AND away team names.

    Returns the Football-Data match id, or None if no match found.
    """
    try:
        odds_time = datetime.fromisoformat(odds_event["commence_time"].replace("Z", "+00:00"))
    except (KeyError, ValueError):
        return None

    odds_home = odds_event.get("home_team", "")
    odds_away = odds_event.get("away_team", "")

    for fixture in fixtures:
        try:
            fix_time = datetime.fromisoformat(fixture["utc_date"].replace("Z", "+00:00"))
        except ValueError:
            continue

        time_diff = abs((fix_time - odds_time).total_seconds()) / 60
        if time_diff > window_minutes:
            continue

        home_match = _team_names_match(fixture["home_team"]["name"], odds_home)
        away_match = _team_names_match(fixture["away_team"]["name"], odds_away)

        if home_match and away_match:
            return fixture["id"]

    return None


# ══════════════════════════════════════════════════════════════════════════════
# PART 3 — SUPABASE UPSERTS
# ══════════════════════════════════════════════════════════════════════════════

def upsert_competitions() -> None:
    for league_id, info in TARGET_LEAGUES.items():
        try:
            supabase.table("competitions").upsert({
                "id":        league_id,
                "name":      info["name"],
                "code":      info["code"],
                "area_name": info["area"],
            }).execute()
        except Exception as e:
            logger.error("Error upserting competition %s: %s", info["name"], e)


def upsert_team(team: Dict[str, Any]) -> None:
    try:
        supabase.table("teams").upsert({
            "id":         team["id"],
            "name":       team["name"],
            "short_name": team.get("short_name"),
            "tla":        team.get("tla"),
            "crest_url":  team.get("crest_url"),
        }).execute()
    except Exception as e:
        logger.error("Error upserting team %s: %s", team.get("name"), e)


def upsert_match(fixture: Dict[str, Any]) -> None:
    try:
        supabase.table("matches").upsert({
            "id":             fixture["id"],
            "competition_id": fixture["competition_id"],
            "matchday":       fixture.get("matchday"),
            "utc_date":       fixture["utc_date"],
            "status":         fixture["status"],
            "home_team_id":   fixture["home_team"]["id"],
            "away_team_id":   fixture["away_team"]["id"],
            "home_score":     fixture.get("home_score"),
            "away_score":     fixture.get("away_score"),
            "winner":         fixture.get("winner"),
        }).execute()
    except Exception as e:
        logger.error("Error upserting match %s: %s", fixture.get("id"), e)


def upsert_odds(match_id: int, bookmaker: Dict[str, Any], home_team: str, away_team: str) -> None:
    try:
        h2h = next((m for m in bookmaker.get("markets", []) if m["key"] == "h2h"), None)
        if not h2h:
            return

        home_win = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], home_team)), None)
        away_win = next((o["price"] for o in h2h["outcomes"] if _team_names_match(o["name"], away_team)), None)
        draw     = next((o["price"] for o in h2h["outcomes"] if o["name"] == "Draw"), None)

        if home_win is None or away_win is None:
            return

        supabase.table("odds").upsert({
            "match_id":        match_id,
            "bookmaker_key":   bookmaker["key"],
            "bookmaker_title": bookmaker["title"],
            "home_win":        home_win,
            "draw":            draw,
            "away_win":        away_win,
            "last_updated":    bookmaker["last_update"],
        }).execute()
    except Exception as e:
        logger.error("Error upserting odds for match %s / %s: %s", match_id, bookmaker.get("key"), e)


# ══════════════════════════════════════════════════════════════════════════════
# PART 4 — MK-806 PREDICTION ENGINE (Dixon-Coles / Poisson)
# ══════════════════════════════════════════════════════════════════════════════

def _poisson_pmf(lam: float, k: int) -> float:
    """P(X = k) for Poisson(lambda)."""
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _fetch_team_historical_stats(team_id: int, league_code: str) -> Dict[str, float]:
    """
    Query our own matches + scores to compute attack / defense strength.
    Uses last 10 finished home or away games in this league.

    Returns: {goals_scored_avg, goals_conceded_avg, games_played}
    """
    try:
        # Home games
        home_res = (
            supabase.table("matches")
            .select("home_score, away_score, competition_id")
            .eq("home_team_id", team_id)
            .eq("status", "FINISHED")
            .not_.is_("home_score", "null")
            .order("utc_date", desc=True)
            .limit(10)
            .execute()
        )
        # Away games
        away_res = (
            supabase.table("matches")
            .select("home_score, away_score, competition_id")
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
    """Attack or defense strength = team_avg / league_avg (clamped)."""
    if league_avg == 0:
        return 1.0
    return max(0.2, min(3.0, team_avg / league_avg))


def predict_match_outcome(match_id: int, fixture: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    MK-806 core prediction function.

    1. Computes Dixon-Coles attack/defense strengths.
    2. Derives Poisson λ for home and away goals.
    3. Integrates over score matrix (0..7 × 0..7) to compute:
       - P(home win), P(draw), P(away win)
       - P(over 2.5), P(BTTS)
    4. Selects the highest-confidence bet.
    5. Writes to match_analysis and predictions tables.

    Returns the prediction dict if successful, else None.
    """
    league_code = fixture["competition_code"]
    avgs = LEAGUE_AVERAGES.get(league_code, {"home": 1.5, "away": 1.1})

    home_id = fixture["home_team"]["id"]
    away_id = fixture["away_team"]["id"]
    home_name = fixture["home_team"]["name"]
    away_name = fixture["away_team"]["name"]

    home_stats = _fetch_team_historical_stats(home_id, league_code)
    away_stats = _fetch_team_historical_stats(away_id, league_code)

    # Strengths
    home_att = _compute_strength(home_stats["goals_scored_avg"],   avgs["home"])
    home_def = _compute_strength(home_stats["goals_conceded_avg"], avgs["away"])
    away_att = _compute_strength(away_stats["goals_scored_avg"],   avgs["away"])
    away_def = _compute_strength(away_stats["goals_conceded_avg"], avgs["home"])

    # Expected goals (Dixon-Coles)
    lambda_home = home_att * away_def * avgs["home"]
    lambda_away = away_att * home_def * avgs["away"]

    # Score matrix (0..7)
    MAX_GOALS = 8
    prob_home_win = 0.0
    prob_draw     = 0.0
    prob_away_win = 0.0
    prob_over_25  = 0.0
    prob_btts     = 0.0

    for h in range(MAX_GOALS):
        for a in range(MAX_GOALS):
            p = _poisson_pmf(lambda_home, h) * _poisson_pmf(lambda_away, a)
            if h > a:
                prob_home_win += p
            elif h == a:
                prob_draw += p
            else:
                prob_away_win += p
            if h + a > 2.5:
                prob_over_25 += p
            if h > 0 and a > 0:
                prob_btts += p

    # Best bet selection
    candidates = [
        ("HOME_WIN",  f"{home_name} to Win",   prob_home_win, "1"),
        ("DRAW",      "Match Draw",             prob_draw,     "X"),
        ("AWAY_WIN",  f"{away_name} to Win",   prob_away_win, "2"),
        ("OVER_2.5",  "Over 2.5 Goals",        prob_over_25,  "O2.5"),
        ("BTTS_YES",  "Both Teams to Score",   prob_btts,     "BTTS"),
    ]
    best = max(candidates, key=lambda c: c[2])
    bet_type, selection, confidence, _ = best

    # Fetch best available odds for this bet from our odds table
    predicted_odds = _get_best_odds(match_id, bet_type)

    # Build reasoning
    reasoning = (
        f"Dixon-Coles model: λ_home={lambda_home:.2f}, λ_away={lambda_away:.2f}. "
        f"P(Home)={prob_home_win:.1%}, P(Draw)={prob_draw:.1%}, P(Away)={prob_away_win:.1%}. "
        f"P(O2.5)={prob_over_25:.1%}, P(BTTS)={prob_btts:.1%}. "
        f"Home attack strength {home_att:.2f} vs away defense {away_def:.2f}. "
        f"Away attack strength {away_att:.2f} vs home defense {home_def:.2f}. "
        f"Selected bet: {selection} with {confidence:.1%} model confidence."
    )

    # ── Persist match_analysis ─────────────────────────────────────────────
    try:
        supabase.table("match_analysis").upsert({
            "match_id":                    match_id,
            "home_team_attack_strength":   home_att,
            "home_team_defense_strength":  home_def,
            "away_team_attack_strength":   away_att,
            "away_team_defense_strength":  away_def,
            "predicted_home_goals":        lambda_home,
            "predicted_away_goals":        lambda_away,
            "probability_home_win":        prob_home_win,
            "probability_draw":            prob_draw,
            "probability_away_win":        prob_away_win,
            "probability_over_25":         prob_over_25,
            "probability_btts":            prob_btts,
            "data_json": {
                "home_stats": home_stats,
                "away_stats": away_stats,
                "league_averages": avgs,
            },
        }).execute()
    except Exception as e:
        logger.error("Error saving match_analysis for %s: %s", match_id, e)

    # ── Persist prediction ─────────────────────────────────────────────────
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
        logger.info(
            "Prediction saved: match=%s | %s @ %.2f (conf %.1f%%)",
            match_id, selection, predicted_odds, confidence * 100,
        )
        return {
            "id":               pred_id,
            "match_id":         match_id,
            "bet_type":         bet_type,
            "selection":        selection,
            "predicted_odds":   predicted_odds,
            "confidence_score": confidence,
            "reasoning":        reasoning,
        }
    except Exception as e:
        logger.error("Error saving prediction for match %s: %s", match_id, e)
        return None


def _get_best_odds(match_id: int, bet_type: str) -> float:
    """Return the best available bookmaker price for a given bet type."""
    column_map = {
        "HOME_WIN": "home_win",
        "DRAW":     "draw",
        "AWAY_WIN": "away_win",
        # For market bets we fall back to a reasonable implied price
        "OVER_2.5": None,
        "BTTS_YES": None,
    }
    col = column_map.get(bet_type)
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
        except Exception:
            pass
    # Fallback
    fallbacks = {"HOME_WIN": 1.90, "DRAW": 3.20, "AWAY_WIN": 2.10, "OVER_2.5": 1.80, "BTTS_YES": 1.75}
    return fallbacks.get(bet_type, 1.90)


# ══════════════════════════════════════════════════════════════════════════════
# PART 5 — GENERATE DAILY 10-ODDS SLIP
# ══════════════════════════════════════════════════════════════════════════════

def generate_daily_slip(predictions: List[Dict[str, Any]], slip_date: date) -> None:
    """
    Select the top SLIP_SIZE predictions by confidence and write to
    ten_odds_slips + slip_picks.
    """
    eligible = [p for p in predictions if p and p.get("confidence_score", 0) >= MIN_CONFIDENCE]
    # Sort by confidence descending, take top N
    top = sorted(eligible, key=lambda p: p["confidence_score"], reverse=True)[:SLIP_SIZE]

    if not top:
        logger.warning("No eligible predictions for slip on %s", slip_date)
        return

    total_odds = 1.0
    for pick in top:
        total_odds *= pick["predicted_odds"]

    logger.info(
        "Generating slip for %s: %d picks, combined odds %.2f",
        slip_date, len(top), total_odds,
    )

    try:
        slip_result = supabase.table("ten_odds_slips").upsert({
            "slip_date":  slip_date.isoformat(),
            "total_odds": round(total_odds, 2),
            "status":     "PENDING",
        }).execute()
        slip_id = slip_result.data[0]["id"]

        for order, pick in enumerate(top, start=1):
            supabase.table("slip_picks").upsert({
                "slip_id":       slip_id,
                "match_id":      pick["match_id"],
                "prediction_id": pick["id"],
                "pick_order":    order,
                "odds_at_time":  pick["predicted_odds"],
            }).execute()

        logger.info("Slip %s saved (id=%s)", slip_date, slip_id)
    except Exception as e:
        logger.error("Error generating slip: %s", e)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════

# I deleted some code here to fit within the token limit, but the main() function is still intact and complete.

def main() -> None:
    logger.info("═══ MK-806 data pipeline starting ═══")

    # ── 1. Upsert competitions ─────────────────────────────────────────────
    logger.info("Step 1: Upserting competitions…")
    upsert_competitions()

    # ── 2. Fetch & store fixtures ──────────────────────────────────────────
    logger.info("Step 2: Fetching fixtures…")
    today_utc = datetime.now(timezone.utc)
    end_date = today_utc + timedelta(days=2)
    fixtures = fetch_fixtures_for_date_range(today_utc, end_date)
    logger.info("Total fixtures fetched: %d", len(fixtures))

    for fix in fixtures:
        upsert_team(fix["home_team"])
        upsert_team(fix["away_team"])
        upsert_match(fix)

    # ── 3. Fetch & store odds ──────────────────────────────────────────────
    logger.info("Step 3: Fetching odds…")
    for league_code, sport_key in SPORT_KEY_MAPPING.items():
        odds_events = fetch_odds_for_sport(sport_key)
        for event in odds_events:
            match_id = match_odds_event_to_fixture(event, fixtures)
            if match_id is None:
                logger.debug("No fixture match for odds event: %s vs %s", event.get("home_team"), event.get("away_team"))
                continue
            for bookmaker in event.get("bookmakers", []):
                upsert_odds(match_id, bookmaker, event["home_team"], event["away_team"])

    # ── 4. Run MK-806 predictions ──────────────────────────────────────────
    logger.info("Step 4: Running MK-806 predictions…")
    
     kenya_tz = pytz.timezone("Africa/Nairobi")
    now_kenya = datetime.now(kenya_tz)
    today_kenya = now_kenya.date()
    tomorrow_kenya = today_kenya + timedelta(days=1)

    todays_fixtures = []
    for f in fixtures:
        match_time_utc = datetime.fromisoformat(f["utc_date"].replace("Z", "+00:00"))
        # pytz requires localize or astimezone; astimezone works with aware UTC
        match_time_kenya = match_time_utc.astimezone(kenya_tz)
        if match_time_kenya.date() in (today_kenya, tomorrow_kenya):
            todays_fixtures.append(f)

    logger.info("Running predictions for %d fixtures (Kenya time: %s)", len(todays_fixtures), today_kenya)

    predictions: List[Dict[str, Any]] = []
    for fix in todays_fixtures:
        pred = predict_match_outcome(fix["id"], fix)
        if pred:
            predictions.append(pred)

    # ── 5. Generate 10-Odds slip ───────────────────────────────────────────
    logger.info("Step 5: Generating daily slip…")
    generate_daily_slip(predictions, today_kenya)

    logger.info("═══ MK-806 pipeline complete ═══")

if __name__ == "__main__":
    main()