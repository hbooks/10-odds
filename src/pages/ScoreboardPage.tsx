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
  utc_date: string;           // ISO UTC kick-off time, e.g. "2024-05-02T16:15:00Z"
  status: string;             // IN_PLAY | LIVE | PAUSED | FINISHED | TIMED | …
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
  anchorGameSec: number;
  anchorWallMs: number;
}

const LS_KEY = "scoreboard_clocks_v4";

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
  } catch { /* storage quota – ignore */ }
}


const HT_DURATION_SEC = 15 * 60; // 900 s

function computeAnchorGameSec(kickoffUtcStr: string): number {
  const kickoffMs       = new Date(kickoffUtcStr).getTime();
  const realElapsedSec  = Math.max(0, (Date.now() - kickoffMs) / 1000);
  const firstHalfEndSec = 45 * 60; // 2700 s

  if (realElapsedSec <= firstHalfEndSec) {
    // Still in first half (or very beginning)
    return realElapsedSec;
  }

  const halfTimeEndReal = firstHalfEndSec + HT_DURATION_SEC; // 3600 s real
  if (realElapsedSec <= halfTimeEndReal) {
    // We are inside the half-time window; game clock is frozen at 45:xx
    return firstHalfEndSec; // will render as HT, frozen
  }

  // Second half — subtract the paused half-time window
  return realElapsedSec - HT_DURATION_SEC;
}


const B = {
  FH_END:  45 * 60,           // 2700 — end of first half game-seconds
  AT1_END: 48 * 60,           // 2880 — end of added time 1
  SH_END:  48 * 60 + 45 * 60, // 5580 — end of second half (48+45)
  AT2_END: 48 * 60 + 45 * 60 + 210, // 5790 — end of added time 2 (210 s = 3.5 min)
} as const;

interface ClockState {
  phase: ClockPhase;
  /** The game-clock value to display in seconds */
  displaySec: number;
  /** True when the game-clock is currently paused (half-time break) */
  frozen: boolean;
}

function evaluateClock(params: PersistedClock): ClockState {
  // How many wall-clock seconds have passed since we took the anchor snapshot?
  const wallElapsedSec  = (Date.now() - params.anchorWallMs) / 1000;
  // Current game-clock value
  const gameSec         = params.anchorGameSec + wallElapsedSec;

  // ── First half ────────────────────────────────────────────────────────────
  if (gameSec < B.FH_END) {
    return { phase: "firstHalf", displaySec: gameSec, frozen: false };
  }

  // ── Added time – halftime ─────────────────────────────────────────────────
  if (gameSec < B.AT1_END) {
    return { phase: "addedTime1", displaySec: gameSec, frozen: false };
  }

  // ── Half-time: detect via real elapsed since kick-off ─────────────────────
  // We check real wall time (kickoff is not stored in PersistedClock, but we
  // can infer: anchorGameSec ≈ realElapsed at snapshot, so real kickoff was
  // approximately anchorWallMs − anchorGameSec * 1000)
  const inferredKickoffMs = params.anchorWallMs - params.anchorGameSec * 1000;
  const realElapsedSec    = (Date.now() - inferredKickoffMs) / 1000;
  const htWindowEnd       = 45 * 60 + HT_DURATION_SEC; // 3600 s real

  if (realElapsedSec <= htWindowEnd) {
    // Still in the real half-time window — freeze the clock at AT1_END
    return { phase: "halfTime", displaySec: B.AT1_END, frozen: true };
  }

  // ── Second half ───────────────────────────────────────────────────────────
  // Game-clock resumes from where added time left off (48:00), display from 45:00
  if (gameSec < B.SH_END) {
    // Remap: second half game-secs start from AT1_END (2880), display from 45:00 (2700)
    const shOffset = gameSec - B.AT1_END;           // seconds into 2nd half
    return { phase: "secondHalf", displaySec: 45 * 60 + shOffset, frozen: false };
  }

  // ── Added time – fulltime ─────────────────────────────────────────────────
  if (gameSec < B.AT2_END) {
    const shOffset = gameSec - B.AT1_END;
    return { phase: "addedTime2", displaySec: 45 * 60 + shOffset, frozen: false };
  }

  // ── Full time ─────────────────────────────────────────────────────────────
  return { phase: "completed", displaySec: 90 * 60, frozen: false };
}

// ─── Formatting helpers ────────────────────────────────────────────────────

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
      return {
        label:     formatClock(state.displaySec),
        sublabel:  "1st Half",
        pulsing:   true,
        pillClass: "bg-red-500/15 border-red-500/30 text-red-400",
      };
    case "addedTime1":
      return {
        label:     formatClock(state.displaySec),
        sublabel:  "Added time · HT",
        pulsing:   true,
        pillClass: "bg-orange-500/15 border-orange-500/30 text-orange-400",
      };
    case "halfTime":
      return {
        label:     "HT",
        sublabel:  "Half-Time",
        pulsing:   false,
        pillClass: "bg-sky-500/15 border-sky-500/30 text-sky-400",
      };
    case "secondHalf":
      return {
        label:     formatClock(state.displaySec),
        sublabel:  "2nd Half",
        pulsing:   true,
        pillClass: "bg-red-500/15 border-red-500/30 text-red-400",
      };
    case "addedTime2":
      return {
        label:     formatClock(state.displaySec),
        sublabel:  "Added time · FT",
        pulsing:   true,
        pillClass: "bg-orange-500/15 border-orange-500/30 text-orange-400",
      };
    case "completed":
      return {
        label:     "FT",
        sublabel:  "Full Time",
        pulsing:   false,
        pillClass: "bg-slate-700/60 border-slate-600/40 text-slate-400",
      };
  }
}

// ─── Live Match Card ───────────────────────────────────────────────────────

function LiveMatchCard({ match }: { match: Match }) {
  const [tick, setTick] = useState(0);

  // On every DB fetch that delivers this match, re-anchor the clock.
  // We always re-compute from utc_date so the clock stays accurate.
  useEffect(() => {
    const stored       = readStoredClocks();
    const anchorGameSec = computeAnchorGameSec(match.utc_date);
    stored[match.id]   = { anchorGameSec, anchorWallMs: Date.now() };
    writeStoredClocks(stored);
  }, [match.id, match.utc_date]);

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
      {/* Top accent glow line */}
      <div className={`absolute inset-x-0 top-0 h-[2px] ${
        state.phase === "halfTime"  ? "bg-gradient-to-r from-transparent via-sky-400 to-transparent"   :
        state.phase === "completed" ? "bg-gradient-to-r from-transparent via-white/20 to-transparent"  :
                                      "bg-gradient-to-r from-transparent via-red-500 to-transparent"
      }`} />

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
            {/* Clock pill */}
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

        {/* Row 2: home — score — away */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

          {/* Home team */}
          <div className="flex flex-col items-center gap-2">
            {match.home_team.crest_url ? (
              <img
                src={match.home_team.crest_url}
                alt={match.home_team.name}
                className="h-12 w-12 object-contain drop-shadow-lg"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold">
                {(match.home_team.tla || match.home_team.name).slice(0, 3).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-white text-center leading-tight max-w-[90px] line-clamp-2">
              {match.home_team.name}
            </span>
          </div>

          {/* Score — blurred while live */}
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
            {match.away_team.crest_url ? (
              <img
                src={match.away_team.crest_url}
                alt={match.away_team.name}
                className="h-12 w-12 object-contain drop-shadow-lg"
              />
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

      {/* Bottom accent line */}
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

      // NOTE: no `minute` column — removed to fix the 400 error
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
      {/*
        Background: Unsplash stadium aerial photo (free, no auth key needed).
        A layered gradient overlay ensures all text is readable.
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
                Real-time clocks · anchored to kick-off time
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