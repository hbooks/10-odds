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
  tla:  string | null;
  crest_url?: string | null;
}

/** Original shape from the matches table (football-data.org) */
interface Match {
  id:           number;
  utc_date:     string;
  status:       string;
  home_score:   number | null;
  away_score:   number | null;
  home_team:    Team;
  away_team:    Team;
  competition:  { name: string };
}

/** Raw row from live_stats table (BSD) */
interface LiveStatRow {
  bsd_match_id:     number;
  match_name:       string;
  competition_name: string;
  kickoff_utc:      string;
  home_team:        string;
  away_team:        string;
  home_score:       number;
  away_score:       number;
  current_minute:   number;
  period:           string;  // "1T" | "2T" | "HT" | "FT" | "ET1" | "ET2" | "AET"
}

/**
 * Unified match shape used by all card components.
 * Both the BSD path and the fallback path produce this.
 */
interface NormalisedMatch {
  id:              number;
  utc_date:        string;          // ISO — used for clock seed
  status:          string;          // "IN_PLAY" | "PAUSED" | "FINISHED" etc.
  home_score:      number | null;
  away_score:      number | null;
  home_team:       Team;
  away_team:       Team;
  competition:     { name: string };
  // BSD-specific extras (undefined when falling back to football-data.org)
  bsd_period?:     string;          // raw BSD period string
  bsd_minute?:     number;          // raw BSD current_minute
  source:          "bsd" | "fallback";
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

const RT = {
  FH_END_SEC:  45 * 60,
  AT1_END_SEC: 48 * 60,
  HT_DUR_SEC:  15 * 60,
  HT_END_SEC:  48 * 60 + 15 * 60,
  SH_DUR_SEC:  45 * 60,
  SH_END_SEC:  48 * 60 + 15 * 60 + 45 * 60,
  AT2_END_SEC: 48 * 60 + 15 * 60 + 48 * 60,
} as const;

interface ClockState {
  phase:      ClockPhase;
  displaySec: number;
  frozen:     boolean;
}

/**
 * ORIGINAL fallback clock evaluator — pure time-math from kickoffMs.
 * Unchanged from the original file. Used when BSD data is unavailable.
 */
function evaluateClock(c: PersistedClock): ClockState {
  const realSec = (Date.now() - c.kickoffMs) / 1000;

  if (realSec < RT.FH_END_SEC) {
    return { phase: "firstHalf", displaySec: realSec, frozen: false };
  }
  if (realSec < RT.AT1_END_SEC) {
    return { phase: "addedTime1", displaySec: realSec, frozen: false };
  }
  if (realSec < RT.HT_END_SEC) {
    return { phase: "halfTime", displaySec: RT.FH_END_SEC, frozen: true };
  }
  const shElapsed    = realSec - RT.HT_END_SEC;
  const shDisplaySec = RT.FH_END_SEC + shElapsed;
  if (realSec < RT.SH_END_SEC) {
    return { phase: "secondHalf", displaySec: shDisplaySec, frozen: false };
  }
  if (realSec < RT.AT2_END_SEC) {
    const at2DisplaySec = RT.FH_END_SEC + (realSec - RT.HT_END_SEC);
    return { phase: "addedTime2", displaySec: at2DisplaySec, frozen: false };
  }
  return { phase: "completed", displaySec: 90 * 60, frozen: false };
}

/**
 * BSD-aware clock evaluator.
 * Uses BSD's period string and current_minute as the authoritative source.
 * The BSD period normalisation mirrors the pipeline's normalisePeriod() logic.
 *
 * period mapping:
 *   1T / 1H / FIRST_HALF        → firstHalf  (or addedTime1 if min > 45)
 *   HT / HALF_TIME               → halfTime
 *   2T / 2H / SECOND_HALF       → secondHalf (or addedTime2 if min > 90)
 *   ET1 / ET2 / ET / EXTRA_TIME → secondHalf (extra time treated as continuation)
 *   FT / AET / FINISHED / FINAL → completed
 */
function evaluateClockFromBSD(period: string, minute: number): ClockState {
  const p = (period ?? "").trim().toUpperCase();

  // ── Full Time ────────────────────────────────────────────────────────────
  const ftPeriods = ["FT", "AET", "PEN", "FINISHED", "ENDED", "FINAL", "POST", "FT_ET", "PEN_FT"];
  if (ftPeriods.includes(p) || p.startsWith("FT") || p.startsWith("FINAL") || p.startsWith("FINISH")) {
    return { phase: "completed", displaySec: 90 * 60, frozen: false };
  }

  // ── Half Time ────────────────────────────────────────────────────────────
  if (["HT", "HALF_TIME", "HALFTIME"].includes(p)) {
    return { phase: "halfTime", displaySec: RT.FH_END_SEC, frozen: true };
  }

  // ── Extra Time ───────────────────────────────────────────────────────────
  if (p === "ET1" || p === "ET2" || p === "ET" || p === "AET" || p.includes("EXTRA")) {
    const displaySec = Math.max(90, minute) * 60;
    return { phase: "secondHalf", displaySec, frozen: false };
  }

  // ── First Half / Added Time 1 ────────────────────────────────────────────
  if (["1T", "1H", "FIRST_HALF", "FIRST HALF"].includes(p)) {
    if (minute > 45) {
      // In added time at end of first half
      return { phase: "addedTime1", displaySec: minute * 60, frozen: false };
    }
    return { phase: "firstHalf", displaySec: minute * 60, frozen: false };
  }

  // ── Second Half / Added Time 2 ───────────────────────────────────────────
  if (["2T", "2H", "SECOND_HALF", "SECOND HALF"].includes(p)) {
    if (minute > 90) {
      return { phase: "addedTime2", displaySec: minute * 60, frozen: false };
    }
    return { phase: "secondHalf", displaySec: minute * 60, frozen: false };
  }

  // ── Unknown period — fall back to minute-based guess ────────────────────
  if (minute <= 45)  return { phase: "firstHalf",  displaySec: minute * 60, frozen: false };
  if (minute <= 90)  return { phase: "secondHalf", displaySec: minute * 60, frozen: false };
  return { phase: "addedTime2", displaySec: minute * 60, frozen: false };
}

// ─── Formatting ────────────────────────────────────────────────────────────

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Clock display config ──────────────────────────────────────────────────

interface ClockDisplay {
  label:     string;
  sublabel:  string | null;
  pulsing:   boolean;
  pillClass: string;
  accent:    string;
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

interface TransitionOverlayProps {
  phase:   ClockPhase;
  visible: boolean;
}

function TransitionOverlay({ phase, visible }: TransitionOverlayProps) {
  if (!visible) return null;

  const config =
    phase === "halfTime"   ? { label: "HALF TIME",  color: "from-sky-500/90 to-sky-700/90",      emoji: "🔔" } :
    phase === "secondHalf" ? { label: "2ND HALF",   color: "from-red-600/90 to-red-900/90",      emoji: "⚽" } :
    phase === "completed"  ? { label: "FULL TIME",  color: "from-slate-600/90 to-slate-900/90",  emoji: "🏁" } :
    phase === "addedTime1" ? { label: "ADDED TIME", color: "from-orange-500/90 to-orange-800/90",emoji: "⏱️" } :
    phase === "addedTime2" ? { label: "ADDED TIME", color: "from-orange-500/90 to-orange-800/90",emoji: "⏱️" } :
    null;

  if (!config) return null;

  return (
    <div
      className={`
        absolute inset-0 z-20 flex flex-col items-center justify-center gap-2
        bg-gradient-to-br ${config.color} backdrop-blur-sm
        rounded-2xl
      `}
      style={{ animation: "scoreboardFadeInOut 2.8s ease-in-out forwards" }}
    >
      <span className="text-3xl" role="img" aria-label={config.label}>{config.emoji}</span>
      <span className="text-white font-black text-xl tracking-[0.3em] uppercase drop-shadow-lg">
        {config.label}
      </span>
    </div>
  );
}

// ─── Live Match Card ───────────────────────────────────────────────────────

function LiveMatchCard({ match }: { match: NormalisedMatch }) {
  // ── Persist kick-off timestamp ────────────────────────────────────────────
  useEffect(() => {
    const kickoffMs = new Date(match.utc_date).getTime();
    const existing  = readClocks()[match.id];
    if (!existing || existing.kickoffMs !== kickoffMs) {
      writeClock(match.id, { kickoffMs });
    }
  }, [match.id, match.utc_date]);

  // ── Tick every second ─────────────────────────────────────────────────────
  // For BSD: we record when the snapshot arrived and add elapsed seconds to
  // bsd_minute so the clock animates forward between data refreshes.
  const [tick, setTick] = useState(0);
  const bsdSnapshotRef = useRef<{ minute: number; period: string; arrivedAt: number } | null>(null);

  // Capture a new BSD snapshot whenever the match data changes
  useEffect(() => {
    if (match.source === "bsd" && match.bsd_period !== undefined && match.bsd_minute !== undefined) {
      bsdSnapshotRef.current = {
        minute:     match.bsd_minute,
        period:     match.bsd_period,
        arrivedAt:  Date.now(),
      };
    }
  }, [match.source, match.bsd_period, match.bsd_minute]);

  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Phase transition detection ─────────────────────────────────────────────
  const prevPhaseRef    = useRef<ClockPhase | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<ClockPhase>("firstHalf");

  // ── Clock state ────────────────────────────────────────────────────────────
  // If we have BSD data, use the authoritative BSD clock animated forward.
  // Otherwise fall back to the original time-math evaluator.
  let state: ClockState;
  if (match.source === "bsd" && match.bsd_period !== undefined && match.bsd_minute !== undefined) {
    // BSD path: animate the minute forward by the seconds elapsed since the
    // last data snapshot so the clock ticks smoothly between fetches.
    void tick; // ensure re-render every second
    const snap = bsdSnapshotRef.current;
    const elapsedSec = snap ? (Date.now() - snap.arrivedAt) / 1000 : 0;
    const period     = snap?.period ?? match.bsd_period;
    const animatedMin = (snap?.minute ?? match.bsd_minute) + elapsedSec / 60;
    state = evaluateClockFromBSD(period, animatedMin);
  } else {
    // Fallback path: pure wall-clock math (original logic, unchanged)
    const clock = readClocks()[match.id];
    if (!clock) return null;
    // suppress unused warning — tick triggers re-render so clock is fresh
    void tick;
    state = evaluateClock(clock);
  }

  const display = getClockDisplay(state);
  const isLive  = state.phase !== "completed";

  // Detect phase change and trigger overlay
  if (prevPhaseRef.current !== null && prevPhaseRef.current !== state.phase) {
    const curr = state.phase;
    const animatable: ClockPhase[] = ["halfTime", "secondHalf", "completed", "addedTime1", "addedTime2"];
    if (animatable.includes(curr)) {
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
    state.phase === "halfTime"  ? "from-transparent via-sky-400 to-transparent"  :
    state.phase === "completed" ? "from-transparent via-white/20 to-transparent" :
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
            {isLive && match.source !== "bsd" ? (
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
              <div className={`px-4 py-2.5 rounded-xl ${isLive ? "bg-red-500/10 border border-red-500/20" : "bg-white/10 border border-white/10"}`}>
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
// Unchanged — FinishedMatchCard still uses the original Match type directly.

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

// ─── Crest resolver ────────────────────────────────────────────────────────
// Fetches team crests from the `teams` table by matching team names.
// BSD team names may differ slightly from football-data.org names, so we try:
//   1. Exact match (case-insensitive via ilike)
//   2. Substring match (first word of BSD name)
// Returns a map of team-name → { crest_url, tla } for quick lookup.

interface TeamCrestRow {
  name:      string;
  tla:       string | null;
  crest_url: string | null;
}

async function resolveCrestsForTeams(teamNames: string[]): Promise<Map<string, TeamCrestRow>> {
  if (teamNames.length === 0) return new Map();

  const map = new Map<string, TeamCrestRow>();

  try {
    // Single query — fetch all teams that fuzzy-match any of our names.
    // We use `or` with ilike patterns. Supabase doesn't support IN on ilike
    // so we do a broad fetch and match client-side.
    const { data, error } = await supabase
      .from("teams")
      .select("name, tla, crest_url")
      .limit(500); // generous limit — teams table is small

    if (error || !data) return map;

    const rows = data as TeamCrestRow[];

    // For each BSD team name, find the best matching teams row
    for (const bsdName of teamNames) {
      const lower = bsdName.toLowerCase().trim();

      // 1. Exact match
      let match = rows.find(r => r.name.toLowerCase().trim() === lower);

      // 2. One contains the other (handles "Man City" vs "Manchester City")
      if (!match) {
        match = rows.find(r => {
          const rl = r.name.toLowerCase().trim();
          return rl.includes(lower) || lower.includes(rl);
        });
      }

      // 3. First significant word match (≥ 4 chars) as last resort
      if (!match) {
        const firstWord = lower.split(/\s+/).find(w => w.length >= 4) ?? lower;
        match = rows.find(r => r.name.toLowerCase().includes(firstWord));
      }

      if (match) {
        map.set(bsdName, match);
      }
    }
  } catch {
    // Silently ignore — crests just won't show for unmatched teams
  }

  return map;
}

// ─── Data fetching ─────────────────────────────────────────────────────────

/**
 * PRIMARY path — fetches from live_stats (BSD real-time data).
 * Resolves crests by matching team names against the teams table.
 * Returns null on any hard error so the fallback can take over.
 */
async function fetchLiveFromBSD(): Promise<{
  live:     NormalisedMatch[];
  finished: NormalisedMatch[];
} | null> {
  try {
    // Fetch all currently active (non-FT) and recently finished BSD matches
    const { data: liveRows, error: liveErr } = await supabase
      .from("live_stats")
      .select(
        "bsd_match_id, match_name, competition_name, kickoff_utc, " +
        "home_team, away_team, home_score, away_score, current_minute, period"
      )
      .order("kickoff_utc", { ascending: true });

    if (liveErr) throw liveErr;
    if (!liveRows || liveRows.length === 0) return { live: [], finished: [] };

    // Supabase's returned `data` can have a broad inferred type; cast via `unknown`
    // first to satisfy TypeScript when asserting to our specific row shape.
    const rows = (liveRows as unknown) as LiveStatRow[];

    // Collect all unique team names for crest resolution
    const allNames = [...new Set(rows.flatMap(r => [r.home_team, r.away_team]))];
    const crestMap = await resolveCrestsForTeams(allNames);

    const toNormalised = (r: LiveStatRow, status: string): NormalisedMatch => {
      const homeInfo = crestMap.get(r.home_team);
      const awayInfo = crestMap.get(r.away_team);

      return {
        id:          r.bsd_match_id,
        utc_date:    r.kickoff_utc,
        status,
        home_score:  r.home_score,
        away_score:  r.away_score,
        home_team: {
          name:      r.home_team,
          tla:       homeInfo?.tla  ?? null,
          crest_url: homeInfo?.crest_url ?? null,
        },
        away_team: {
          name:      r.away_team,
          tla:       awayInfo?.tla  ?? null,
          crest_url: awayInfo?.crest_url ?? null,
        },
        competition: { name: r.competition_name },
        bsd_period:  r.period,
        bsd_minute:  r.current_minute,
        source:      "bsd",
      };
    };

    // Split into live vs finished based on BSD period
    const ftPeriods = new Set(["FT", "AET", "PEN", "FINISHED", "ENDED", "FINAL"]);
    const isOver = (p: string) => {
      const u = p.toUpperCase();
      return ftPeriods.has(u) || u.startsWith("FT") || u.startsWith("FINAL") || u.startsWith("FINISH");
    };

    const live     = rows.filter(r => !isOver(r.period)).map(r => toNormalised(r, "IN_PLAY"));
    const finished = rows.filter(r =>  isOver(r.period)).map(r => toNormalised(r, "FINISHED"));

    return { live, finished };
  } catch (err) {
    console.error("[ScoreboardPage] BSD fetch failed — will use fallback:", err);
    return null; // signals caller to use fallback
  }
}

/**
 * FALLBACK path — original matches table query, completely unchanged.
 * Used when fetchLiveFromBSD() returns null (hard error).
 */
async function fetchMatchesFallback(): Promise<{
  live:     NormalisedMatch[];
  finished: NormalisedMatch[];
}> {
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

  // Convert to NormalisedMatch so the same card component works for both paths
  const toNorm = (m: Match): NormalisedMatch => ({
    id:          m.id,
    utc_date:    m.utc_date,
    status:      m.status,
    home_score:  m.home_score,
    away_score:  m.away_score,
    home_team:   m.home_team,
    away_team:   m.away_team,
    competition: m.competition,
    source:      "fallback",
  });

  return {
    live:     matches.filter(m => ["IN_PLAY","PAUSED","LIVE"].includes(m.status)).map(toNorm),
    finished: matches.filter(m => m.status === "FINISHED").map(toNorm),
  };
}

// ─── Main Page ─────────────────────────────────────────────────────────────

const ScoreboardPage = () => {
  const [liveMatches,     setLiveMatches]     = useState<NormalisedMatch[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<NormalisedMatch[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [lastRefreshed,   setLastRefreshed]   = useState<Date | null>(null);
  const [dataSource,      setDataSource]      = useState<"bsd" | "fallback" | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try BSD (live_stats) first
      const bsdResult = await fetchLiveFromBSD();

      if (bsdResult !== null) {
        // BSD path succeeded
        setLiveMatches(bsdResult.live);
        setFinishedMatches(bsdResult.finished);
        setDataSource("bsd");
      } else {
        // BSD hard error — fall back to matches table (original logic)
        console.warn("[ScoreboardPage] Using fallback Old data source.");
        const fallback = await fetchMatchesFallback();
        setLiveMatches(fallback.live);
        setFinishedMatches(fallback.finished);
        setDataSource("fallback");
      }

      setLastRefreshed(new Date());
    } catch (e) {
      console.error("Fetch error:", e);
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
            'url("https://images.pexels.com/photos/13830794/pexels-photo-13830794.jpeg?auto=format&fit=crop&w=1920&q=80")',
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
              <p className="text-sm text-white/45 leading-relaxed max-w-md">
                Live updates. 
                </p>
                <p className="text-sm text-white/45 mt-1">
                Live matches might have a few seconds of delay, which may affect the live scoreboard.
              </p>
              {lastRefreshed && (
                <p className="text-[11px] text-white/25 mt-0.5">
                  Last synced {fmtTime(lastRefreshed)}
                  {dataSource === "fallback" && (
                    <span className="ml-1.5 text-amber-500/50">(static fallback)</span>
                  )}
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
                      Live Matches are fetched from our trusted source. Right now there are no ongoing 
                      matches being sent to our database. An ongoing match may not appear
                      immediately. Check back later to see if any matches have started.
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
                    {finishedMatches.map(m => (
                      // FinishedMatchCard still works with NormalisedMatch since
                      // it only uses the fields that exist in both shapes
                      <FinishedMatchCard key={m.id} match={m as unknown as Match} />
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