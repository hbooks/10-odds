import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import { Calendar, Clock, AlertCircle, RefreshCw } from "lucide-react";

// Supabase client (public anon key)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// Types
interface Team {
  id: number;
  name: string;
  tla: string | null;
  crest_url: string | null;
}

interface Competition {
  id: number;
  name: string;
  code: string;
}

interface Match {
  id: number;
  utc_date: string;
  status: string;
  matchday: number | null;
  home_team: Team;
  away_team: Team;
  competition: Competition;
  odds?: {
    home_win: number;
    draw: number | null;
    away_win: number;
  };
}

type DateTab = "today" | "tomorrow" | "dayafter";

const tabs: { key: DateTab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "dayafter", label: "Day After" },
];

// Helper: Format kick-off time (Kenya time)
function formatKickOff(utcDate: string): string {
  const date = new Date(utcDate);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
}

// Helper: Get date for a given tab
function getDateForTab(tab: DateTab): string {
  const now = new Date();
  const kenyaOffset = 3 * 60; // EAT is UTC+3
  const localDate = new Date(now.getTime() + kenyaOffset * 60 * 1000);
  
  if (tab === "tomorrow") {
    localDate.setDate(localDate.getDate() + 1);
  } else if (tab === "dayafter") {
    localDate.setDate(localDate.getDate() + 2);
  }
  return localDate.toISOString().split("T")[0];
}

// Fetch matches for a specific date (based on Kenya time)
async function fetchMatchesForDate(dateStr: string): Promise<Match[]> {
  // We need to query matches where the UTC date falls within the Kenya day.
  // Since matches are stored in UTC, we'll fetch a wider range and filter client‑side.
  const startOfDayUTC = new Date(dateStr + "T00:00:00+03:00").toISOString();
  const endOfDayUTC = new Date(dateStr + "T23:59:59+03:00").toISOString();

  const { data: matches, error } = await supabase
    .from("matches")
    .select(`
      id,
      utc_date,
      status,
      matchday,
      home_team:teams!matches_home_team_id_fkey ( id, name, tla, crest_url ),
      away_team:teams!matches_away_team_id_fkey ( id, name, tla, crest_url ),
      competition:competitions ( id, name, code )
    `)
    .gte("utc_date", startOfDayUTC)
    .lte("utc_date", endOfDayUTC)
    .order("utc_date", { ascending: true });

  if (error) {
    console.error("Error fetching matches:", error);
    return [];
  }

  // Fetch odds for these matches
  const matchIds = matches.map((m: any) => m.id);
  if (matchIds.length === 0) return [];

  const { data: oddsData, error: oddsError } = await supabase
    .from("odds")
    .select("match_id, home_win, draw, away_win")
    .in("match_id", matchIds)
    .order("last_updated", { ascending: false });

  // Group odds by match_id (use the most recent one per match)
  const oddsMap: Record<number, any> = {};
  if (!oddsError && oddsData) {
    oddsData.forEach((o: any) => {
      if (!oddsMap[o.match_id]) {
        oddsMap[o.match_id] = {
          home_win: o.home_win,
          draw: o.draw,
          away_win: o.away_win,
        };
      }
    });
  }

  // Attach odds to matches
  return matches.map((m: any) => ({
    ...m,
    odds: oddsMap[m.id] || null,
  }));
}

// Fixture Card Component
const FixtureCard = ({ match }: { match: Match }) => {
  const kickoff = formatKickOff(match.utc_date);
  const hasOdds = match.odds !== null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      {/* Competition & Time */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          <span>{match.competition.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{kickoff}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {match.home_team.crest_url && (
            <img src={match.home_team.crest_url} alt="" className="h-8 w-8 object-contain" />
          )}
          <span className="font-heading font-semibold">
            {match.home_team.tla || match.home_team.name}
          </span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">VS</span>
        <div className="flex items-center gap-3">
          <span className="font-heading font-semibold">
            {match.away_team.tla || match.away_team.name}
          </span>
          {match.away_team.crest_url && (
            <img src={match.away_team.crest_url} alt="" className="h-8 w-8 object-contain" />
          )}
        </div>
      </div>

      {/* Odds */}
      {hasOdds ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/30 rounded-md py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">1</p>
            <p className="text-sm font-semibold text-foreground">{match.odds!.home_win.toFixed(2)}</p>
          </div>
          <div className="bg-muted/30 rounded-md py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">X</p>
            <p className="text-sm font-semibold text-foreground">
              {match.odds!.draw?.toFixed(2) ?? "—"}
            </p>
          </div>
          <div className="bg-muted/30 rounded-md py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">2</p>
            <p className="text-sm font-semibold text-foreground">{match.odds!.away_win.toFixed(2)}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-center text-xs text-muted-foreground italic">
          Odds not available
        </div>
      )}
    </div>
  );
};

// Main Page Component
const GamesPage = () => {
  const [activeTab, setActiveTab] = useState<DateTab>("today");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = getDateForTab(activeTab);
      const data = await fetchMatchesForDate(dateStr);
      setMatches(data);
      setLastRefreshed(new Date());
    } catch (e) {
      setError("Failed to load fixtures. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [activeTab]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-heading font-bold">Football Games</h1>
          <button
            onClick={loadMatches}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <p className="text-muted-foreground mb-6">Browse fixtures across the top 5 European leagues.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "gradient-gold text-accent-foreground shadow-gold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <button onClick={loadMatches} className="text-sm text-gold hover:underline">
              Try again
            </button>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No fixtures scheduled for {activeTab}.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match) => (
                <FixtureCard key={match.id} match={match} />
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground/50">
              Last updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </>
        )}
      </div>
    </Layout>
  );
};

export default GamesPage;