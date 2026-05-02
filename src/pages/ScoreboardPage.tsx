import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import { RefreshCw, AlertCircle, Circle, Clock, Trophy, Info } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────────────────────
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

// ─── Clock phases ─────────────────────────────────────────────────────────
type ClockPhase =
  | "firstHalf"
  | "addedTime1"
  | "halfTime"
  | "secondHalf"
  | "addedTime2"
  | "completed";

// ─── Clock state persisted to localStorage ───────────────────────────────
interface PersistedClock {
  // The top-of-the-hour after kickoff when the match was marked LIVE
  liveBoundaryUtc: string;      // ISO string
  // The initial clock offset in seconds (e.g. 27 * 60 = 1620)
  initialOffsetSec: number;
  // Current phase
  phase: ClockPhase;
}

// ─── Helper: get stored clocks object ─────────────────────────────────────
function readStoredClocks(): Record<number, PersistedClock> {
  try {
    const raw = localStorage.getItem("scoreboard_clocks");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStoredClocks(clocks: Record<number, PersistedClock>) {
  localStorage.setItem("scoreboard_clocks", JSON.stringify(clocks));
}

// ─── Compute orchestor‑friendly offset & live boundary ────────────────────
function computeClockParams(kickoffUtc: string): {
  liveBoundaryUtc: string;
  initialOffsetSec: number;
} {
  const kickoff = new Date(kickoffUtc);
  // Kenya time (UTC+3)
  const kenyaKickoff = new Date(kickoff.getTime() + 3 * 3600_000);
  const kickoffMinutes = kenyaKickoff.getHours() * 60 + kenyaKickoff.getMinutes();

  // The orchestrator runs hourly. The last run BEFORE this match was marked LIVE
  // is the hour boundary that is ≤ kickoff time (in Kenya hours).
  const lastOrchHour = new Date(kenyaKickoff);
  lastOrchHour.setMinutes(0, 0, 0);          // top of the hour
  if (lastOrchHour.getTime() > kenyaKickoff.getTime()) {
    lastOrchHour.setHours(lastOrchHour.getHours() - 1);
  }

  const lastOrchMinutes = lastOrchHour.getHours() * 60;
  const diffMinutes = kickoffMinutes - lastOrchMinutes; // e.g. 15

  // initial offset = 45 min * 60 sec - (diffMinutes * 60 + 180)
  const initialOffsetSec = Math.max(
    0,
    45 * 60 - (diffMinutes * 60 + 180)
  );

  // The match will be marked LIVE at the NEXT hour boundary after kickoff
  const liveBoundary = new Date(lastOrchHour);
  liveBoundary.setHours(liveBoundary.getHours() + 1); // 20:00 in the example

  return {
    liveBoundaryUtc: liveBoundary.toISOString(),
    initialOffsetSec,
  };
}

// ─── Given clock params, calculate current display & phase ────────────────
function evaluateClock(params: PersistedClock): {
  displaySec: number;        // total seconds from start (simulated)
  phase: ClockPhase;
} {
  const nowMs = Date.now();
  const boundaryMs = new Date(params.liveBoundaryUtc).getTime();
  const elapsedRealSec = Math.max(0, (nowMs - boundaryMs) / 1000);

  // total simulated seconds = initial offset + real elapsed
  const totalSec = params.initialOffsetSec + elapsedRealSec;

  // Phase transitions based on totalSec
  if (totalSec < 45 * 60) {
    return { displaySec: totalSec, phase: "firstHalf" };
  } else if (totalSec < (45 + 3) * 60) {
    return { displaySec: totalSec, phase: "addedTime1" };
  } else if (totalSec < (45 + 3 + 16) * 60) {
    return { displaySec: totalSec, phase: "halfTime" };
  } else if (totalSec < (45 + 3 + 16 + 45) * 60) {
    // second half – offset so that display starts from 45:00
    const secondHalfSec = totalSec - (45 + 3 + 16) * 60;
    return { displaySec: secondHalfSec + 45 * 60, phase: "secondHalf" };
  } else if (totalSec < (45 + 3 + 16 + 45 + 3.5) * 60) {
    return { displaySec: totalSec, phase: "addedTime2" };
  } else {
    return { displaySec: totalSec, phase: "completed" };
  }
}

// ─── Format seconds as M:SS ───────────────────────────────────────────────
function formatClock(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ─── Live match card with clock ───────────────────────────────────────────
function LiveMatchCard({ match }: { match: Match }) {
  const [clocks, setClocks] = useState<Record<number, PersistedClock>>(readStoredClocks);
  const [, forceRender] = useState(0); // used to force re-render on interval

  // Setup (or reuse) clock for this match
  useEffect(() => {
    const stored = readStoredClocks();
    if (!stored[match.id]) {
      const params = computeClockParams(match.utc_date);
      stored[match.id] = {
        ...params,
        phase: "firstHalf",
      };
      writeStoredClocks(stored);
      setClocks({ ...stored });
    } else {
      setClocks({ ...stored });
    }
  }, [match.id, match.utc_date]);

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      forceRender((n) => n + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const clockParams = clocks[match.id];
  if (!clockParams) return null; // not yet initialised

  const { displaySec, phase } = evaluateClock(clockParams);

  // Clock display text or phase label
  let clockLabel: string;
  if (phase === "firstHalf" || phase === "secondHalf") {
    clockLabel = formatClock(displaySec);
  } else if (phase === "addedTime1") {
    clockLabel = "Playing Added time to halftime";
  } else if (phase === "addedTime2") {
    clockLabel = "Playing Added time to fulltime";
  } else if (phase === "halfTime") {
    clockLabel = "Half‑Time";
  } else {
    clockLabel = "FT";
  }

  // Blur score – only the score span
  const scoreBlurred =
    phase !== "completed" ? (
      <span className="relative inline-flex items-center justify-center rounded-md bg-red-500/20 px-2 py-0.5 backdrop-blur-sm">
        <span className="font-mono font-bold text-xl blur-[3px] select-none">
          {match.home_score ?? 0} – {match.away_score ?? 0}
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-red-400/60 text-xs font-mono">
          LIVE
        </span>
      </span>
    ) : (
      <span className="font-mono font-bold text-xl">
        {match.home_score} – {match.away_score}
      </span>
    );

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      {/* Top row: competition & clock */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Trophy className="h-3 w-3" />
          {match.competition.name}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-red-400">
          <Circle className="h-2 w-2 fill-red-500 animate-pulse" />
          <span className="uppercase tracking-wider">{clockLabel}</span>
        </span>
      </div>

      {/* Teams + blurred score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {match.home_team.crest_url && (
            <img src={match.home_team.crest_url} alt="" className="h-8 w-8 object-contain" />
          )}
          <span className="font-medium">{match.home_team.name}</span>
        </div>
        {scoreBlurred}
        <div className="flex items-center gap-3">
          <span className="font-medium">{match.away_team.name}</span>
          {match.away_team.crest_url && (
            <img src={match.away_team.crest_url} alt="" className="h-8 w-8 object-contain" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
const ScoreboardPage = () => {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      const { data, error } = await supabase
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

      if (error) throw error;

      const matches = data as unknown as Match[];
      setLiveMatches(matches.filter(m => m.status === "IN_PLAY" || m.status === "PAUSED" || m.status === "LIVE"));
      setFinishedMatches(matches.filter(m => m.status === "FINISHED"));
    } catch (e) {
      setError("Failed to load matches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatKickoff = (utc: string) => {
    return new Date(utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">Live Scoreboard</h1>
            <p className="text-muted-foreground">Real‑time match updates from top leagues.</p>
          </div>
          <button
            onClick={fetchMatches}
            className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <button onClick={fetchMatches} className="text-sm text-gold hover:underline">
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Live matches section – only shown when there are live matches */}
            {liveMatches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Circle className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
                  <h2 className="text-xl font-heading font-semibold">Live Now</h2>
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                    {liveMatches.length} {liveMatches.length === 1 ? "match" : "matches"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveMatches.map((match) => (
                    <LiveMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )}

            {/* Info banner – only when there are NO live matches */}
            {liveMatches.length === 0 && (
              <div className="rounded-xl bg-slate-800/90 border border-slate-600/60 p-5 flex items-start gap-4 shadow-lg">
                <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-white mb-1">No live matches right now.</p>
                  <p className="text-slate-300/90">
                    Match statuses are updated periodically by our orchestrator. Some ongoing matches may not appear as live immediately. Refresh to check again — thank you for your patience.
                  </p>
                </div>
              </div>
            )}

            {/* Finished matches section (always shown) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xl font-heading font-semibold">Finished Matches</h2>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  {finishedMatches.length} {finishedMatches.length === 1 ? "match" : "matches"}
                </span>
              </div>

              {finishedMatches.length === 0 ? (
                <div className="rounded-xl border border-border bg-card/30 p-8 text-center text-muted-foreground">
                  <p>No finished matches yet today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {finishedMatches.map((match) => (
                    <div key={match.id} className="rounded-lg border border-border bg-card/50 p-3">
                      <div className="text-xs text-muted-foreground mb-1">{match.competition.name}</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {match.home_team.crest_url && (
                            <img src={match.home_team.crest_url} alt="" className="h-5 w-5 object-contain" />
                          )}
                          <span className="text-sm">{match.home_team.tla || match.home_team.name}</span>
                        </div>
                        <span className="text-sm font-mono font-bold">
                          {match.home_score} – {match.away_score}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{match.away_team.tla || match.away_team.name}</span>
                          {match.away_team.crest_url && (
                            <img src={match.away_team.crest_url} alt="" className="h-5 w-5 object-contain" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ScoreboardPage;