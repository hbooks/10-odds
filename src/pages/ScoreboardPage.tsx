import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import { RefreshCw, AlertCircle, Trophy, Info, CheckCircle2, Zap } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ─────────────────────────────────────────────────────────────────

interface Team {
  name: string;
  tla: string | null;
  crest_url?: string | null;
}

interface Match {
  id: number;
  utc_date: string;       // ISO kick-off time in UTC
  status: string;         // IN_PLAY | LIVE | PAUSED | FINISHED …
  minute: number | null;  // game-minute stored by the orchestrator (e.g. 23)
  home_score: number | null;
  away_score: number | null;
  home_team: Team;
  away_team: Team;
  competition: { name: string };
}

// ─── Clock phase ────────────────────────────────────────────────────────────

type ClockPhase =
  | "firstHalf"
  | "addedTime1"
  | "halfTime"
  | "secondHalf"
  | "addedTime2"
  | "completed";

// ─── What we persist in localStorage per match ─────────────────────────────
//
// When the match first appears as LIVE (or each time the DB minute updates)
// we snapshot:
//   anchorGameSec  – the game-second the clock was showing at that moment
//                    (derived from DB `minute` if present, else wall-clock diff)
//   anchorWallMs   – the real wall-clock ms at snapshot time
//
// At any later time:
//   currentGameSec = anchorGameSec + (Date.now() - anchorWallMs) / 1000
//
// This anchoring survives page refreshes and gives an accurate ticking clock.

interface PersistedClock {
  anchorGameSec: number;
  anchorWallMs: number;
}

const LS_KEY = "scoreboard_clocks_v3";

function readStoredClocks(): Record<number, PersistedClock> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<number, PersistedClock>) : {};
  } catch {
    return {};
  }
}

function writeStoredClocks(clocks: Record<number, PersistedClock>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(clocks));
  } catch { /* quota – ignore */ }
}

// ─── Compute the anchor game-second for a match ────────────────────────────
//
// Priority:
//   1. DB `minute` field (most accurate – set by the orchestrator each hour)
//   2. Wall-clock fallback: (now − kickoff), minus 15 min halftime gap if past 45+15 min

const HALFTIME_REAL_SEC = 15 * 60;

function computeAnchorGameSec(match: Match): number {
  if (match.minute != null && match.minute > 0) {
    return match.minute * 60;
  }
  const kickoffMs = new Date(match.utc_date).getTime();
  const realElapsed = Math.max(0, (Date.now() - kickoffMs) / 1000);
  if (realElapsed > 45 * 60 + HALFTIME_REAL_SEC) {
    return realElapsed - HALFTIME_REAL_SEC;
  }
  return realElapsed;
}

// ─── Phase boundaries (in game-seconds) ────────────────────────────────────
//
// We simulate phases using cumulative game-seconds:
//   0       →  2700   First half          0:00 – 45:00
//   2700    →  2880   Added time HT       45:00 – 48:xx  (+3 min)
//   2880    →  3780   Half-time break     clock frozen at 45:xx (15 real min)
//   3780    →  6480   Second half         45:00 – 90:00  (+45 min)
//   6480    →  6690   Added time FT       90:00 – 93:xx  (+3.5 min)
//   ≥ 6690            Full time

const PHASE = {
  FH_END:  45 * 60,                          // 2700
  AT1_END: 48 * 60,                          // 2880
  HT_END:  48 * 60 + HALFTIME_REAL_SEC,      // 3780
  SH_END:  48 * 60 + HALFTIME_REAL_SEC + 45 * 60, // 6480
  AT2_END: 48 * 60 + HALFTIME_REAL_SEC + 45 * 60 + 210, // 6690
} as const;

interface ClockState {
  phase: ClockPhase;
  displaySec: number;
}

function evaluateClock(params: PersistedClock): ClockState {
  const wallElapsed = (Date.now() - params.anchorWallMs) / 1000;
  const g = params.anchorGameSec + wallElapsed; // current game-seconds

  if (g < PHASE.FH_END)  return { phase: "firstHalf",  displaySec: g };
  if (g < PHASE.AT1_END) return { phase: "addedTime1", displaySec: g };
  if (g < PHASE.HT_END)  return { phase: "halfTime",   displaySec: PHASE.AT1_END };
  if (g < PHASE.SH_END)  return { phase: "secondHalf", displaySec: 45 * 60 + (g - PHASE.HT_END) };
  if (g < PHASE.AT2_END) return { phase: "addedTime2", displaySec: 45 * 60 + (g - PHASE.HT_END) };
  return                         { phase: "completed",  displaySec: 90 * 60 };
}

// ─── Clock formatting ──────────────────────────────────────────────────────

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Clock pill display config ─────────────────────────────────────────────

interface ClockDisplay {
  label: string;
  sublabel: string | null;
  pulsing: boolean;
  pillClass: string;
}

function getClockDisplay(state: ClockState): ClockDisplay {
  switch (state.phase) {
    case "firstHalf":
      return { label: formatClock(state.displaySec), sublabel: "1st Half",         pulsing: true,  pillClass: "bg-red-500/15 border-red-500/30 text-red-400" };
    case "addedTime1":
      return { label: formatClock(state.displaySec), sublabel: "Added time · HT",  pulsing: true,  pillClass: "bg-orange-500/15 border-orange-500/30 text-orange-400" };
    case "halfTime":
      return { label: "HT",                          sublabel: "Half-Time",         pulsing: false, pillClass: "bg-sky-500/15 border-sky-500/30 text-sky-400" };
    case "secondHalf":
      return { label: formatClock(state.displaySec), sublabel: "2nd Half",          pulsing: true,  pillClass: "bg-red-500/15 border-red-500/30 text-red-400" };
    case "addedTime2":
      return { label: formatClock(state.displaySec), sublabel: "Added time · FT",  pulsing: true,  pillClass: "bg-orange-500/15 border-orange-500/30 text-orange-400" };
    case "completed":
      return { label: "FT",                          sublabel: "Full Time",         pulsing: false, pillClass: "bg-slate-700/60 border-slate-600/40 text-slate-400" };
  }
}

// ─── Live Match Card ───────────────────────────────────────────────────────

function LiveMatchCard({ match }: { match: Match }) {
  const [tick, setTick] = useState(0);

  // Sync the anchor every time the DB minute field changes (or on first render)
  useEffect(() => {
    const stored = readStoredClocks();
    // Always update when the DB provides a minute (authoritative)
    // Only initialise from wall-clock if no entry exists yet
    if (!stored[match.id] || match.minute != null) {
      stored[match.id] = {
        anchorGameSec: computeAnchorGameSec(match),
        anchorWallMs:  Date.now(),
      };
      writeStoredClocks(stored);
    }
  }, [match.id, match.utc_date, match.minute]);

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  void tick;

  const params = readStoredClocks()[match.id];
  if (!params) return null;

  const state   = evaluateClock(params);
  const display = getClockDisplay(state);
  const isLive  = state.phase !== "completed";

  return (
    <div className="
      group relative rounded-2xl overflow-hidden
      border border-white/10
      bg-white/[0.06] backdrop-blur-md
      shadow-2xl shadow-black/50
      transition-all duration-300
      hover:bg-white/[0.10] hover:border-white/20 hover:-translate-y-0.5
    ">
      {/* Top accent glow */}
      <div className={`absolute inset-x-0 top-0 h-[2px] ${
        state.phase === "halfTime"  ? "bg-gradient-to-r from-transparent via-sky-400 to-transparent"  :
        state.phase === "completed" ? "bg-gradient-to-r from-transparent via-white/20 to-transparent" :
                                      "bg-gradient-to-r from-transparent via-red-500 to-transparent"
      }`} />

      <div className="p-5">
        {/* Competition + clock */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy className="h-3 w-3 text-amber-400/80 shrink-0" />
            <span className="text-xs text-white/50 truncate font-medium tracking-wide uppercase">
              {match.competition.name}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded-full
              text-xs font-mono font-bold tracking-widest whitespace-nowrap
              border ${display.pillClass}
            `}>
              {display.pulsing && (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
              )}
              {display.label}
            </span>
            {display.sublabel && (
              <span className="text-[10px] text-white/30 tracking-wide">
                {display.sublabel}
              </span>
            )}
          </div>
        </div>

        {/* Teams + score */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Home */}
          <div className="flex flex-col items-center gap-2">
            {match.home_team.crest_url ? (
              <img src={match.home_team.crest_url} alt={match.home_team.name}
                className="h-12 w-12 object-contain drop-shadow-lg" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold">
                {(match.home_team.tla || match.home_team.name).slice(0, 3).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-white text-center leading-tight max-w-[90px] line-clamp-2">
              {match.home_team.name}
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1.5">
            {isLive ? (
              <div className="relative">
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span
                    aria-hidden="true"
                    className="font-mono font-black text-2xl text-white tracking-widest blur-[5px] select-none pointer-events-none"
                  >
                    {match.home_score ?? 0}&nbsp;–&nbsp;{match.away_score ?? 0}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-[0.25em] text-red-400/80 uppercase">
                    live
                  </span>
                </div>
                <p className="text-[9px] text-white/25 text-center mt-1 tracking-widest uppercase">
                  Unofficial
                </p>
              </div>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/10">
                <span className="font-mono font-black text-2xl text-white tracking-widest">
                  {match.home_score ?? "–"}&nbsp;–&nbsp;{match.away_score ?? "–"}
                </span>
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-2">
            {match.away_team.crest_url ? (
              <img src={match.away_team.crest_url} alt={match.away_team.name}
                className="h-12 w-12 object-contain drop-shadow-lg" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold">
                {(match.away_team.tla || match.away_team.name).slice(0, 3).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-white text-center leading-tight max-w-[90px] line-clamp-2">
              {match.away_team.name}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div className={`h-px w-full ${
        isLive
          ? "bg-gradient-to-r from-transparent via-red-500/30 to-transparent"
          : "bg-gradient-to-r from-transparent via-white/10 to-transparent"
      }`} />
    </div>
  );
}

// ─── Finished Match Card ───────────────────────────────────────────────────

function FinishedMatchCard({ match }: { match: Match }) {
  return (
    <div className="
      rounded-xl border border-white/[0.07]
      bg-white/[0.04] backdrop-blur-sm
      p-3.5
      hover:bg-white/[0.08] hover:border-white/[0.12]
      transition-all duration-200
    ">
      <div className="flex items-center gap-1.5 mb-2.5">
        <CheckCircle2 className="h-2.5 w-2.5 text-white/30" />
        <span className="text-[10px] text-white/35 font-medium tracking-wide truncate">
          {match.competition.name}
        </span>
        <span className="ml-auto text-[10px] text-white/40 font-mono bg-white/[0.08] px-1.5 py-0.5 rounded">
          FT
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {match.home_team.crest_url && (
            <img src={match.home_team.crest_url} alt="" className="h-5 w-5 object-contain shrink-0" />
          )}
          <span className="text-xs text-white/80 truncate font-medium">
            {match.home_team.tla || match.home_team.name}
          </span>
        </div>
        <span className="font-mono text-sm font-bold text-white shrink-0 px-2">
          {match.home_score} – {match.away_score}
        </span>
        <div className="flex items-center gap-1.5 min-w-0 justify-end">
          <span className="text-xs text-white/80 truncate font-medium">
            {match.away_team.tla || match.away_team.name}
          </span>
          {match.away_team.crest_url && (
            <img src={match.away_team.crest_url} alt="" className="h-5 w-5 object-contain shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

const ScoreboardPage = () => {
  const [liveMatches,     setLiveMatches]     = useState<Match[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<Match[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [lastRefreshed,   setLastRefreshed]   = useState<Date | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today    = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

      const { data, error: supaErr } = await supabase
        .from("matches")
        .select(`
          id,
          utc_date,
          status,
          minute,
          home_score,
          away_score,
          home_team:teams!matches_home_team_id_fkey ( name, tla, crest_url ),
          away_team:teams!matches_away_team_id_fkey ( name, tla, crest_url ),
          competition:competitions ( name )
        `)
        .gte("utc_date", today)
        .lte("utc_date", tomorrow)
        .order("utc_date", { ascending: true });

      if (supaErr) throw supaErr;

      const matches = data as unknown as Match[];
      setLiveMatches(matches.filter(m =>
        m.status === "IN_PLAY" || m.status === "PAUSED" || m.status === "LIVE"
      ));
      setFinishedMatches(matches.filter(m => m.status === "FINISHED"));
      setLastRefreshed(new Date());
    } catch {
      setError("Failed to load matches. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const iv = setInterval(fetchMatches, 60_000);
    return () => clearInterval(iv);
  }, [fetchMatches]);

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <Layout>
      {/*
        Background: Unsplash stadium aerial photo – free, no API key needed.
        A layered dark gradient overlay keeps text readable at all times.
      */}
      <div
        className="relative min-h-screen bg-cover bg-center bg-fixed"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1920&q=80")',
        }}
      >
        {/* Multi-stop dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-black/85 pointer-events-none" />

        {/* Content layer */}
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">

          {/* ── Page header ──────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Zap className="h-6 w-6 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                <h1 className="text-3xl font-heading font-black text-white tracking-tight drop-shadow-lg">
                  Live Scoreboard
                </h1>
              </div>
              <p className="text-sm text-white/45">
                Real-time clocks · synced from live data every minute
              </p>
              {lastRefreshed && (
                <p className="text-[11px] text-white/25 mt-0.5">
                  Last synced {fmtTime(lastRefreshed)}
                </p>
              )}
            </div>

            <button
              onClick={fetchMatches}
              disabled={loading}
              className="
                flex items-center gap-2 px-3.5 py-2 rounded-xl
                border border-white/15 bg-white/10 backdrop-blur-sm
                text-xs text-white/60 font-medium
                hover:bg-white/20 hover:text-white hover:border-white/30
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* ── Body ─────────────────────────────────────────────── */}
          {loading && liveMatches.length === 0 && finishedMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-red-500 animate-spin" />
              <p className="text-sm text-white/40">Loading matches…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <AlertCircle className="h-10 w-10 text-white/30" />
              <p className="text-white/50 text-sm">{error}</p>
              <button
                onClick={fetchMatches}
                className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-10">

              {/* Live section */}
              {liveMatches.length > 0 ? (
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <h2 className="text-lg font-bold text-white tracking-tight">Live Now</h2>
                    <span className="text-xs font-semibold bg-red-500/20 border border-red-500/30 text-red-400 px-2.5 py-0.5 rounded-full">
                      {liveMatches.length} {liveMatches.length === 1 ? "match" : "matches"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveMatches.map(m => <LiveMatchCard key={m.id} match={m} />)}
                  </div>
                </section>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-sm p-5 flex items-start gap-4">
                  <Info className="h-5 w-5 text-sky-400/70 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-white/90 mb-1">No live matches right now</p>
                    <p className="text-white/45 leading-relaxed">
                      Match statuses are updated periodically. An ongoing match may not appear
                      immediately — refresh to check again.
                    </p>
                  </div>
                </div>
              )}

              {/* Finished section */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-white/35" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Finished Today</h2>
                  <span className="text-xs font-medium bg-white/10 border border-white/10 text-white/50 px-2.5 py-0.5 rounded-full">
                    {finishedMatches.length} {finishedMatches.length === 1 ? "match" : "matches"}
                  </span>
                </div>

                {finishedMatches.length === 0 ? (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-8 text-center text-white/30 text-sm">
                    No finished matches yet today.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {finishedMatches.map(m => <FinishedMatchCard key={m.id} match={m} />)}
                  </div>
                )}
              </section>

            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ScoreboardPage;