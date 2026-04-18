import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import { RefreshCw, AlertCircle, Circle, Clock, Trophy } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

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
    // Auto-refresh every 60 seconds for live matches
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatKickoff = (utc: string) => {
    return new Date(utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
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
            {/* Live matches section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Circle className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
                <h2 className="text-xl font-heading font-semibold">Live Now</h2>
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                  {liveMatches.length} {liveMatches.length === 1 ? "match" : "matches"}
                </span>
              </div>

              {liveMatches.length === 0 ? (
                <div className="rounded-xl border border-border bg-card/30 p-8 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No live matches at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveMatches.map((match) => (
                    <div key={match.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {match.competition.name}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                          <Circle className="h-2 w-2 fill-red-500 animate-pulse" />
                          LIVE {match.home_score !== null && match.away_score !== null ? `${match.home_score}'` : ""}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {match.home_team.crest_url && (
                            <img src={match.home_team.crest_url} alt="" className="h-8 w-8 object-contain" />
                          )}
                          <span className="font-medium">{match.home_team.name}</span>
                        </div>
                        <span className="text-xl font-mono font-bold">
                          {match.home_score ?? 0} – {match.away_score ?? 0}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{match.away_team.name}</span>
                          {match.away_team.crest_url && (
                            <img src={match.away_team.crest_url} alt="" className="h-8 w-8 object-contain" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Finished matches section */}
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