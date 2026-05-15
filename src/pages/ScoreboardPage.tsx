import { useState, useEffect, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import { RefreshCw, AlertCircle, Trophy, Info, CheckCircle2, Zap } from "lucide-react";
import CrestImage from "@/components/CrestImage";

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
  utc_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team: Team;
  away_team: Team;
  competition: { name: string };
}

// ─── Clock phases ──────────────────────────────────────────────────────────

type ClockPhase =
  | "firstHalf"
  | "addedTime1"
  | "halfTime"
  | "secondHalf"
  | "addedTime2"
  | "completed";


interface PersistedClock {
  kickoffMs: number;
}

const LS_KEY = "scoreboard_clocks_v6";

function readClocks(): Record<number, PersistedClock> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<number, PersistedClock>) : {};
  } catch {
    return {};
  }
}

function writeClock(id: number, clock: PersistedClock): void {
  try {
    const all = readClocks();
    all[id] = clock;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* quota – ignore */ }
}

// ─── Real-time phase boundaries ────────────────────────────────────────────
// All values are in REAL elapsed seconds since kick-off.
// HT is treated as a fixed 15-minute real-world pause after 3 min of AT1.

const RT = {
  // 1st half ends at real 45:00
  FH_END_SEC:   45 * 60,          // 2700

  // Added time 1 lasts up to 3 real minutes (45:00 → 48:00)
  // Display is capped: we show up to 45+3 = 48:xx but freeze there
  AT1_END_SEC:  48 * 60,          // 2880  ← HT whistle assumed here

  // Half-time break: 15 real minutes (48:00 → 63:00)
  HT_DUR_SEC:   15 * 60,          // 900
  HT_END_SEC:   48 * 60 + 15 * 60, // 3780  ← 2nd half kick-off

  // 2nd half display starts at 45:00 and runs for 45 real minutes
  SH_DUR_SEC:   45 * 60,          // 2700
  SH_END_SEC:   48 * 60 + 15 * 60 + 45 * 60, // 6480

  // Added time 2 lasts up to 3 real minutes
  AT2_END_SEC:  48 * 60 + 15 * 60 + 48 * 60, // 6660
} as const;

interface ClockState {
  phase:      ClockPhase;
  displaySec: number;   // what the clock face shows (game-clock seconds)
  frozen:     boolean;  // true = clock not ticking (HT break)
}

/**
 * Pure function. Given only kickoffMs and the current wall time, returns
 * exactly which phase we're in and what the clock face should display.
 * No DB status involved. No stored game-seconds. Refresh-proof by design.
 */
function evaluateClock(c: PersistedClock): ClockState {
  const realSec = (Date.now() - c.kickoffMs) / 1000; // real seconds since KO

  // ── 1st half (0:00 → 45:00) ──────────────────────────────────────────────
  if (realSec < RT.FH_END_SEC) {
    return { phase: "firstHalf", displaySec: realSec, frozen: false };
  }

  // ── Added time 1 (45:00 → 48:00 real) ────────────────────────────────────
  // Display counts up from 45:00 but we cap the face at 45+3 = 48:xx
  if (realSec < RT.AT1_END_SEC) {
    return { phase: "addedTime1", displaySec: realSec, frozen: false };
  }

  // ── Half-time break (48:00 → 63:00 real) ─────────────────────────────────
  // Clock face is frozen at 45:00, shows "HT"
  if (realSec < RT.HT_END_SEC) {
    return { phase: "halfTime", displaySec: RT.FH_END_SEC, frozen: true };
  }

  // ── 2nd half (63:00 → 108:00 real) ───────────────────────────────────────
  // Display resumes from 45:00 and counts the real seconds since HT ended
  const shElapsed    = realSec - RT.HT_END_SEC;        // seconds into 2nd half
  const shDisplaySec = RT.FH_END_SEC + shElapsed;      // 45:00 + elapsed

  if (realSec < RT.SH_END_SEC) {
    return { phase: "secondHalf", displaySec: shDisplaySec, frozen: false };
  }

  // ── Added time 2 (108:00 → 111:00 real) ──────────────────────────────────
  if (realSec < RT.AT2_END_SEC) {
    const at2DisplaySec = RT.FH_END_SEC + (realSec - RT.HT_END_SEC); // continues from 90:xx
    return { phase: "addedTime2", displaySec: at2DisplaySec, frozen: false };
  }

  // ── Full time ─────────────────────────────────────────────────────────────
  return { phase: "completed", displaySec: 90 * 60, frozen: false };
}

// ─── Formatting ────────────────────────────────────────────────────────────

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Clock display config ─────────────────────────────────────────────────

interface ClockDisplay {
  label:     string;
  sublabel:  string | null;
  pulsing:   boolean;
  pillClass: string;
  accent:    string;  // for the glow line
}

function getClockDisplay(state: ClockState): ClockDisplay {
  switch (state.phase) {
    case "firstHalf":
      return {
        label:     formatClock(state.displaySec),
        sublabel:  "1st Half",
        pulsing:   true,
        pillClass: "bg-red-500/15 border-red-500/30 text-red-400",
        accent:    "via-red-500",
      };
    case "addedTime1":
      return {
        label:     `${formatClock(state.displaySec)} +`,
        sublabel:  "Added time",
        pulsing:   true,
        pillClass: "bg-orange-500/15 border-orange-500/30 text-orange-400",
        accent:    "via-orange-500",
      };
    case "halfTime":
      return {
        label:     "HT",
        sublabel:  "Half-Time",
        pulsing:   false,
        pillClass: "bg-sky-500/15 border-sky-500/30 text-sky-400",
        accent:    "via-sky-400",
      };
    case "secondHalf":
      return {
        label:     formatClock(state.displaySec),
        sublabel:  "2nd Half",
        pulsing:   true,
        pillClass: "bg-red-500/15 border-red-500/30 text-red-400",
        accent:    "via-red-500",
      };
    case "addedTime2":
      return {
        label:     `${formatClock(state.displaySec)} +`,
        sublabel:  "Added time",
        pulsing:   true,
        pillClass: "bg-orange-500/15 border-orange-500/30 text-orange-400",
        accent:    "via-orange-500",
      };
    case "completed":
      return {
        label:     "FT",
        sublabel:  "Full Time",
        pulsing:   false,
        pillClass: "bg-slate-700/60 border-slate-600/40 text-slate-400",
        accent:    "via-white/20",
      };
  }
}

// ─── Transition overlay ────────────────────────────────────────────────────
// Shown for ~3 seconds on phase changes for a dramatic effect.

interface TransitionOverlayProps {
  phase: ClockPhase;
  visible: boolean;
}

function TransitionOverlay({ phase, visible }: TransitionOverlayProps) {
  if (!visible) return null;

  const config =
    phase === "halfTime"  ? { label: "HALF TIME",  color: "from-sky-500/90 to-sky-700/90",   emoji: "🔔" } :
    phase === "secondHalf"? { label: "2ND HALF",   color: "from-red-600/90 to-red-900/90",   emoji: "⚽" } :
    phase === "completed" ? { label: "FULL TIME",  color: "from-slate-600/90 to-slate-900/90", emoji: "🏁" } :
    phase === "addedTime1"? { label: "ADDED TIME", color: "from-orange-500/90 to-orange-800/90", emoji: "⏱️" } :
    phase === "addedTime2"? { label: "ADDED TIME", color: "from-orange-500/90 to-orange-800/90", emoji: "⏱️" } :
    null;

  if (!config) return null;

  return (
    <div
      className={`
        absolute inset-0 z-20 flex flex-col items-center justify-center gap-2
        bg-gradient-to-br ${config.color} backdrop-blur-sm
        rounded-2xl
        animate-[fadeInOut_2.8s_ease-in-out_forwards]
      `}
      style={{
        animation: "scoreboardFadeInOut 2.8s ease-in-out forwards",
      }}
    >
      <span className="text-3xl" role="img" aria-label={config.label}>{config.emoji}</span>
      <span className="text-white font-black text-xl tracking-[0.3em] uppercase drop-shadow-lg">
        {config.label}
      </span>
    </div>
  );
}

// ─── Live Match Card ───────────────────────────────────────────────────────

function LiveMatchCard({ match }: { match: Match }) {
  // ── Persist kick-off timestamp (the ONLY persisted value) ────────────────
  // DB status is intentionally ignored for timing — the edge function runs
  // hourly and cannot reliably catch HT. All phases are derived purely from
  // kickoffMs + Date.now() inside evaluateClock().
  useEffect(() => {
    const kickoffMs = new Date(match.utc_date).getTime();
    const existing  = readClocks()[match.id];
    // Only write if missing or kick-off changed (rescheduled match)
    if (!existing || existing.kickoffMs !== kickoffMs) {
      writeClock(match.id, { kickoffMs });
    }
  }, [match.id, match.utc_date]);

  // ── Tick every second ─────────────────────────────────────────────────────
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Phase transition detection ─────────────────────────────────────────────
  const prevPhaseRef   = useRef<ClockPhase | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<ClockPhase>("firstHalf");

  const clock = readClocks()[match.id];
  if (!clock) return null;

  const state   = evaluateClock(clock);
  const display = getClockDisplay(state);
  const isLive  = state.phase !== "completed";

  // Detect phase change and trigger overlay
  if (prevPhaseRef.current !== null && prevPhaseRef.current !== state.phase) {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    // Only animate meaningful transitions (not e.g. firstHalf → firstHalf)
    const animatable: ClockPhase[] = ["halfTime", "secondHalf", "completed", "addedTime1", "addedTime2"];
    if (animatable.includes(curr) && prev !== curr) {
      // Use a timeout check to avoid React batching issues
      setTimeout(() => {
        setTransitionPhase(curr);
        setShowTransition(true);
        setTimeout(() => setShowTransition(false), 2900);
      }, 0);
    }
  }
  prevPhaseRef.current = state.phase;

  // ── Card accent color ──────────────────────────────────────────────────────
  const accentTop =
    state.phase === "halfTime"  ? "from-transparent via-sky-400 to-transparent"   :
    state.phase === "completed" ? "from-transparent via-white/20 to-transparent"  :
                                  `from-transparent ${display.accent} to-transparent`;

  return (
    <div className="
      group relative rounded-2xl overflow-hidden
      border border-white/10
      bg-white/[0.06] backdrop-blur-md
      shadow-2xl shadow-black/50
      transition-all duration-300
      hover:bg-white/[0.10] hover:border-white/20 hover:-translate-y-0.5
    ">
      {/* Inject animation keyframes once */}
      <style>{`
        @keyframes scoreboardFadeInOut {
          0%   { opacity: 0; transform: scale(0.92); }
          15%  { opacity: 1; transform: scale(1); }
          75%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }
        @keyframes scoreboardPillPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          70%  { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        .pill-pop { animation: scoreboardPillPop 0.4s ease-out; }
      `}</style>

      {/* Phase transition overlay */}
      <TransitionOverlay phase={transitionPhase} visible={showTransition} />

      {/* Top accent glow line */}
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${accentTop} transition-all duration-700`} />

      <div className="p-5">
        {/* Row 1: competition name + clock pill */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy className="h-3 w-3 text-amber-400/80 shrink-0" />
            <span className="text-xs text-white/50 truncate font-medium tracking-wide uppercase">
              {match.competition.name}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* Clock pill — key forces remount (and pill-pop CSS) on phase change */}
            <span
              key={state.phase}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                text-xs font-mono font-bold tracking-widest whitespace-nowrap
                border ${display.pillClass}
                pill-pop
              `}
            >
              {display.pulsing && (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
              )}
              {display.label}
            </span>
            {display.sublabel && (
              <span className="text-[10px] text-white/30 tracking-wide transition-all duration-500">
                {display.sublabel}
              </span>
            )}
          </div>
        </div>

               {/* Row 2: home — score — away */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

          {/* Home team */}
          <div className="flex flex-col items-center gap-2">
            <CrestImage
              url={match.home_team.crest_url}
              alt={match.home_team.name}
              size="xl"
              className="drop-shadow-lg"
            />
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

          {/* Away team */}
          <div className="flex flex-col items-center gap-2">
            <CrestImage
              url={match.away_team.crest_url}
              alt={match.away_team.name}
              size="xl"
              className="drop-shadow-lg"
            />
            <span className="text-sm font-semibold text-white text-center leading-tight max-w-[90px] line-clamp-2">
              {match.away_team.name}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className={`h-px w-full ${
        isLive
          ? "bg-gradient-to-r from-transparent via-red-500/30 to-transparent"
          : "bg-gradient-to-r from-transparent via-white/10 to-transparent"
      } transition-all duration-700`} />
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
          <CrestImage url={match.home_team.crest_url} alt="" size="sm" />
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
          <CrestImage url={match.away_team.crest_url} alt="" size="sm" />
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
    } catch (e) {
      console.error("Supabase fetch error:", e);
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
      <div
        className="relative min-h-screen bg-cover bg-center bg-fixed"
        style={{
          backgroundImage:
            'url("https://images.pexels.com/photos/34201721/pexels-photo-34201721.jpeg?auto=format&fit=crop&w=1920&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-black/85 pointer-events-none" />

        <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">

          {/* ── Page header ──────────────────────────────────── */}
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Zap className="h-6 w-6 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                <h1 className="text-3xl font-heading font-black text-white tracking-tight drop-shadow-lg">
                  Live Scoreboard
                </h1>
              </div>
              <p className="text-sm text-white/45">
                Live updates. Ongoing matches are marked "live" and may show unofficial scores until confirmed.
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

          {/* ── Body ─────────────────────────────────────────── */}
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

              {/* ── Live section ─────────────────────────────── */}
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

              {/* ── Finished section ─────────────────────────── */}
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