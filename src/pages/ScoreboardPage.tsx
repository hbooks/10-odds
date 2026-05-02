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

// ─── Clock state persisted to localStorage ─────────────────────────────────

interface PersistedClock {
  /** ISO string – the top-of-the-hour after kick-off when the match was marked LIVE */
  liveBoundaryUtc: string;
  /** Initial clock offset in seconds (e.g. 27 * 60 = 1620) */
  initialOffsetSec: number;
}

// ─── localStorage helpers ──────────────────────────────────────────────────

const LS_KEY = "scoreboard_clocks_v2";

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
  } catch {
    // quota exceeded – silently ignore
  }
}

// ─── Compute orchestrator-friendly offset & live boundary ─────────────────
//
//  The orchestrator runs every full hour (Kenya time, UTC+3).
//  It marks a match LIVE at the NEXT full hour after kick-off.
//  e.g. kick-off 19:15 KE → live at 20:00 KE.
//
//  Initial clock offset = 45 min − (minutes past last orch hour + 3 min delay)
//  e.g. 19:15 → last orch hour 19:00 → diff = 15 → offset = 45−18 = 27 min.

function computeClockParams(kickoffUtc: string): PersistedClock {
  const kickoff = new Date(kickoffUtc);

  // Convert to Kenya time (UTC+3) purely for minute arithmetic
  const kenyaMs = kickoff.getTime() + 3 * 3_600_000;
  const kenyaKickoff = new Date(kenyaMs);

  // Last orchestrator hour ≤ Kenya kick-off time
  const lastOrchKenyaMs =
    Math.floor(kenyaMs / 3_600_000) * 3_600_000; // floor to hour
  const diffMinutes = (kenyaMs - lastOrchKenyaMs) / 60_000; // e.g. 15

  // initial offset (clamped to 0 – can't be negative at start)
  const initialOffsetSec = Math.max(0, (45 - diffMinutes - 3) * 60);

  // Live boundary = last orch hour + 1 hour, converted back to UTC
  const liveBoundaryKenyaMs = lastOrchKenyaMs + 3_600_000;
  const liveBoundaryUtcMs = liveBoundaryKenyaMs - 3 * 3_600_000;
  const liveBoundaryUtc = new Date(liveBoundaryUtcMs).toISOString();

  void kenyaKickoff; // used implicitly above

  return { liveBoundaryUtc, initialOffsetSec };
}

// ─── Derive current clock state from persisted params ─────────────────────
//
// Phase timeline (cumulative simulated seconds from start):
//   0            → 45*60        : first half
//   45*60        → 48*60        : added time to halftime  (+3 min)
//   48*60        → 64*60        : half-time break         (+16 min)
//   64*60        → 109*60       : second half             (+45 min, display from 45:00)
//   109*60       → 112.5*60     : added time to fulltime  (+3.5 min)
//   ≥ 112.5*60                  : full time / completed

const PHASE_BOUNDARIES = {
  firstHalfEnd:   45 * 60,
  addedTime1End:  48 * 60,       // 45 + 3
  halfTimeEnd:    64 * 60,       // 48 + 16
  secondHalfEnd:  109 * 60,      // 64 + 45
  addedTime2End:  112.5 * 60,    // 109 + 3.5
} as const;

interface ClockState {
  phase: ClockPhase;
  /** Seconds to display (game-time, not wall-clock) */
  displaySec: number;
}

function evaluateClock(params: PersistedClock): ClockState {
  const nowMs = Date.now();
  const boundaryMs = new Date(params.liveBoundaryUtc).getTime();
  const elapsedRealSec = Math.max(0, (nowMs - boundaryMs) / 1000);
  const totalSec = params.initialOffsetSec + elapsedRealSec;

  if (totalSec < PHASE_BOUNDARIES.firstHalfEnd) {
    return { phase: "firstHalf", displaySec: totalSec };
  }
  if (totalSec < PHASE_BOUNDARIES.addedTime1End) {
    return { phase: "addedTime1", displaySec: totalSec };
  }
  if (totalSec < PHASE_BOUNDARIES.halfTimeEnd) {
    return { phase: "halfTime", displaySec: totalSec };
  }
  if (totalSec < PHASE_BOUNDARIES.secondHalfEnd) {
    // Display resumes from 45:00 for second half
    const secondHalfElapsed = totalSec - PHASE_BOUNDARIES.halfTimeEnd;
    return { phase: "secondHalf", displaySec: 45 * 60 + secondHalfElapsed };
  }
  if (totalSec < PHASE_BOUNDARIES.addedTime2End) {
    return { phase: "addedTime2", displaySec: totalSec };
  }
  return { phase: "completed", displaySec: PHASE_BOUNDARIES.addedTime2End };
}

// ─── Format seconds → "M:SS" ───────────────────────────────────────────────

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Clock pill label + styling ───────────────────────────────────────────

interface ClockDisplay {
  label: string;
  /** Whether to show the animated dot */
  pulsing: boolean;
  /** CSS class for pill background */
  pillClass: string;
}

function getClockDisplay(state: ClockState): ClockDisplay {
  switch (state.phase) {
    case "firstHalf":
    case "secondHalf":
      return {
        label: formatClock(state.displaySec),
        pulsing: true,
        pillClass:
          "bg-red-500/15 border border-red-500/30 text-red-400",
      };
    case "addedTime1":
      return {
        label: "Added time",
        pulsing: true,
        pillClass:
          "bg-orange-500/15 border border-orange-500/30 text-orange-400",
      };
    case "addedTime2":
      return {
        label: "Added time",
        pulsing: true,
        pillClass:
          "bg-orange-500/15 border border-orange-500/30 text-orange-400",
      };
    case "halfTime":
      return {
        label: "Half-Time",
        pulsing: false,
        pillClass:
          "bg-sky-500/15 border border-sky-500/30 text-sky-400",
      };
    case "completed":
      return {
        label: "FT",
        pulsing: false,
        pillClass:
          "bg-slate-700/60 border border-slate-600/40 text-slate-400",
      };
  }
}

// ─── Phase subtitle shown below the pill ──────────────────────────────────

function getPhaseSubtitle(phase: ClockPhase): string | null {
  if (phase === "addedTime1") return "Playing added time to halftime";
  if (phase === "addedTime2") return "Playing added time to fulltime";
  if (phase === "halfTime") return "15-minute interval";
  return null;
}

// ─── Live Match Card ──────────────────────────────────────────────────────

function LiveMatchCard({ match }: { match: Match }) {
  const [tick, setTick] = useState(0);

  // Initialise / reuse clock in localStorage
  useEffect(() => {
    const stored = readStoredClocks();
    if (!stored[match.id]) {
      stored[match.id] = computeClockParams(match.utc_date);
      writeStoredClocks(stored);
    }
  }, [match.id, match.utc_date]);

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  void tick; // consumed to trigger re-render

  const stored = readStoredClocks();
  const params = stored[match.id];
  if (!params) return null;

  const clockState = evaluateClock(params);
  const display = getClockDisplay(clockState);
  const subtitle = getPhaseSubtitle(clockState.phase);
  const isLive = clockState.phase !== "completed";
  const isHalfTime = clockState.phase === "halfTime";

  return (
    <div
      className="
        group relative rounded-2xl overflow-hidden
        border border-white/[0.06]
        bg-gradient-to-b from-[#1a1f2e] to-[#13161f]
        shadow-xl shadow-black/40
        transition-all duration-300
        hover:border-white/[0.12] hover:shadow-2xl hover:shadow-black/60
        hover:-translate-y-0.5
      "
    >
      {/* Subtle glow strip at top */}
      {isLive && !isHalfTime && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
      )}
      {isHalfTime && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/60 to-transparent" />
      )}

      <div className="p-5">
        {/* Header: competition + clock pill */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy className="h-3 w-3 text-amber-500/70 shrink-0" />
            <span className="text-xs text-slate-400 truncate font-medium tracking-wide">
              {match.competition.name}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* Clock pill */}
            <span
              className={`
                inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold
                tracking-wider whitespace-nowrap
                ${display.pillClass}
              `}
            >
              {display.pulsing && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
              )}
              {display.label}
            </span>
            {/* Phase subtitle */}
            {subtitle && (
              <span className="text-[10px] text-slate-500 tracking-wide text-right leading-none">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Match layout: home — score — away */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Home team */}
          <div className="flex flex-col items-center gap-2">
            {match.home_team.crest_url ? (
              <img
                src={match.home_team.crest_url}
                alt={match.home_team.name}
                className="h-12 w-12 object-contain drop-shadow-md"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-slate-700/60 flex items-center justify-center text-slate-400 text-xs font-bold">
                {(match.home_team.tla || match.home_team.name).slice(0, 3)}
              </div>
            )}
            <span className="text-sm font-semibold text-white/90 text-center leading-tight max-w-[90px] line-clamp-2">
              {match.home_team.name}
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            {isLive ? (
              /* Blurred score with red glow */
              <div className="relative">
                <div
                  className="
                    relative px-4 py-2 rounded-xl
                    bg-red-900/20 border border-red-500/20
                    shadow-lg shadow-red-900/20
                  "
                >
                  {/* Blurred digits */}
                  <span
                    className="
                      font-mono font-black text-2xl text-white tracking-widest
                      blur-[5px] select-none pointer-events-none
                    "
                    aria-hidden="true"
                  >
                    {match.home_score ?? 0}&nbsp;–&nbsp;{match.away_score ?? 0}
                  </span>
                  {/* Overlay label */}
                  <span
                    className="
                      absolute inset-0 flex items-center justify-center
                      text-[10px] font-bold tracking-[0.2em] text-red-400/80
                      uppercase
                    "
                  >
                    live
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 text-center mt-1 tracking-wide">
                  Unofficial
                </p>
              </div>
            ) : (
              /* Unblurred FT score */
              <div className="px-4 py-2 rounded-xl bg-slate-700/30 border border-slate-600/20">
                <span className="font-mono font-black text-2xl text-white tracking-widest">
                  {match.home_score ?? "–"}&nbsp;–&nbsp;{match.away_score ?? "–"}
                </span>
              </div>
            )}
            <span className="text-[10px] text-slate-500 tracking-widest uppercase">
              {clockState.phase === "halfTime" ? "HT" : clockState.phase === "completed" ? "FT" : "vs"}
            </span>
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-2">
            {match.away_team.crest_url ? (
              <img
                src={match.away_team.crest_url}
                alt={match.away_team.name}
                className="h-12 w-12 object-contain drop-shadow-md"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-slate-700/60 flex items-center justify-center text-slate-400 text-xs font-bold">
                {(match.away_team.tla || match.away_team.name).slice(0, 3)}
              </div>
            )}
            <span className="text-sm font-semibold text-white/90 text-center leading-tight max-w-[90px] line-clamp-2">
              {match.away_team.name}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div
        className={`
          h-0.5 w-full
          ${isLive && !isHalfTime
            ? "bg-gradient-to-r from-transparent via-red-500/40 to-transparent"
            : isHalfTime
            ? "bg-gradient-to-r from-transparent via-sky-500/30 to-transparent"
            : "bg-gradient-to-r from-transparent via-slate-600/20 to-transparent"
          }
        `}
      />
    </div>
  );
}

// ─── Finished Match Card ───────────────────────────────────────────────────

function FinishedMatchCard({ match }: { match: Match }) {
  return (
    <div
      className="
        rounded-xl border border-white/[0.05] bg-[#13161f]/80
        p-3.5 hover:bg-[#1a1f2e]/80 hover:border-white/[0.09]
        transition-all duration-200
      "
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <CheckCircle2 className="h-2.5 w-2.5 text-slate-600" />
        <span className="text-[10px] text-slate-500 font-medium tracking-wide truncate">
          {match.competition.name}
        </span>
        <span className="ml-auto text-[10px] text-slate-600 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded">
          FT
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {/* Home */}
        <div className="flex items-center gap-1.5 min-w-0">
          {match.home_team.crest_url && (
            <img
              src={match.home_team.crest_url}
              alt=""
              className="h-5 w-5 object-contain shrink-0"
            />
          )}
          <span className="text-xs text-slate-300 truncate font-medium">
            {match.home_team.tla || match.home_team.name}
          </span>
        </div>
        {/* Score */}
        <span className="font-mono text-sm font-bold text-white shrink-0 px-2">
          {match.home_score} – {match.away_score}
        </span>
        {/* Away */}
        <div className="flex items-center gap-1.5 min-w-0 justify-end">
          <span className="text-xs text-slate-300 truncate font-medium">
            {match.away_team.tla || match.away_team.name}
          </span>
          {match.away_team.crest_url && (
            <img
              src={match.away_team.crest_url}
              alt=""
              className="h-5 w-5 object-contain shrink-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

const ScoreboardPage = () => {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
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
      setLiveMatches(
        matches.filter(
          (m) => m.status === "IN_PLAY" || m.status === "PAUSED" || m.status === "LIVE"
        )
      );
      setFinishedMatches(matches.filter((m) => m.status === "FINISHED"));
      setLastRefreshed(new Date());
    } catch {
      setError("Failed to load matches. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 60_000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <Layout>
      <div className="min-h-screen bg-[#0d1017]">
        <div className="container mx-auto px-4 py-8 max-w-5xl">

          {/* ── Page header ─────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5 text-amber-400" />
                <h1 className="text-3xl font-heading font-black text-white tracking-tight">
                  Live Scoreboard
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                Real-time match updates · clocks reset-proof across refreshes
              </p>
              {lastRefreshed && (
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Last synced {formatTime(lastRefreshed)}
                </p>
              )}
            </div>
            <button
              onClick={fetchMatches}
              disabled={loading}
              className="
                flex items-center gap-2 px-3 py-2 rounded-xl
                border border-white/10 bg-white/5
                text-xs text-slate-400 font-medium
                hover:bg-white/10 hover:text-slate-200 hover:border-white/20
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200
              "
              title="Refresh matches"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* ── States ──────────────────────────────────────────── */}
          {loading && liveMatches.length === 0 && finishedMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-2 border-slate-700 border-t-red-500 animate-spin" />
              </div>
              <p className="text-sm text-slate-500">Loading matches…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <AlertCircle className="h-10 w-10 text-slate-600" />
              <p className="text-slate-400 text-sm">{error}</p>
              <button
                onClick={fetchMatches}
                className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-10">

              {/* ── LIVE matches ──────────────────────────────────── */}
              {liveMatches.length > 0 ? (
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Live Now
                    </h2>
                    <span className="text-xs font-semibold bg-red-500/15 border border-red-500/25 text-red-400 px-2.5 py-0.5 rounded-full">
                      {liveMatches.length}{" "}
                      {liveMatches.length === 1 ? "match" : "matches"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveMatches.map((match) => (
                      <LiveMatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </section>
              ) : (
                /* No live matches banner */
                <div
                  className="
                    rounded-2xl border border-slate-700/50 bg-[#1a1f2e]/80
                    p-5 flex items-start gap-4
                  "
                >
                  <Info className="h-5 w-5 text-sky-400/70 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-white/90 mb-1">
                      No live matches right now
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      Match statuses are updated hourly by our orchestrator. An
                      ongoing match may not appear as live immediately — refresh
                      to check again. Thank you for your patience.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Finished matches ──────────────────────────────── */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-slate-500" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Finished Today
                  </h2>
                  <span className="text-xs font-medium bg-slate-800 border border-slate-700/60 text-slate-400 px-2.5 py-0.5 rounded-full">
                    {finishedMatches.length}{" "}
                    {finishedMatches.length === 1 ? "match" : "matches"}
                  </span>
                </div>

                {finishedMatches.length === 0 ? (
                  <div
                    className="
                      rounded-xl border border-white/[0.05] bg-[#13161f]/60
                      p-8 text-center text-slate-600 text-sm
                    "
                  >
                    No finished matches yet today.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {finishedMatches.map((match) => (
                      <FinishedMatchCard key={match.id} match={match} />
                    ))}
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