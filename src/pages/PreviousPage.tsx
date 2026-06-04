import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import { RefreshCw, AlertCircle, X, Calendar, Trophy, Target, CheckCircle, XCircle, ChevronDown, ChevronRight, BadgeCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimalByLabel } from "@/lib/patternAnimals";
import AnimalIcon from "@/components/AnimalIcon";
import CrestImage from "@/components/CrestImage";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

const FUNCTIONS_BASE =
  (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string) ??
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

type PredictionResult = "PENDING" | "WIN" | "LOSS" | "HALF_WIN" | "HALF_LOSS" | "VOID";

interface Team {
  name: string;
  tla: string | null;
  crest_url?: string | null;
}

interface Competition {
  id: number;
  name: string;
  code: string;
  area_name: string;
}

interface Match {
  utc_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team: Team;
  away_team: Team;
  competition: Competition;
}

interface Prediction {
  id: number;
  match_id: number;
  bet_type: string;
  selection: string;
  predicted_odds: number;
  confidence_score: number;
  reasoning: string;
  status: PredictionResult;
  created_at: string;
  matches: Match;
}

const STATUS_STYLES: Record<PredictionResult, { label: string; className: string; icon: any }> = {
  PENDING:   { label: "Pending",   className: "bg-yellow-500/20 text-yellow-200 border border-yellow-400/30", icon: null },
  WIN:       { label: "Won",       className: "bg-green-500/20 text-green-400", icon: CheckCircle },
  LOSS:      { label: "Lost",      className: "bg-red-500/20 text-red-400", icon: XCircle },
  HALF_WIN:  { label: "½ Win",     className: "bg-green-400/20 text-green-300", icon: CheckCircle },
  HALF_LOSS: { label: "½ Loss",    className: "bg-orange-500/20 text-orange-300", icon: XCircle },
  VOID:      { label: "Void",      className: "bg-muted/40 text-muted-foreground", icon: null },
};

const StatusBadge = ({ status }: { status: PredictionResult }) => {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 ${style.className}`}>
      {style.icon && <style.icon className="h-3 w-3" />}
      {style.label}
    </span>
  );
};

const INTL_GLOBE_EMBLEM = "https://www.freelogovectors.net/wp-content/uploads/2018/04/globe-earth07.png";

const CL_EMBLEM = "https://www.freelogovectors.net/wp-content/uploads/2018/04/uefa_champions_league_logo-385x375.png";

const getLeagueEmblem = (code: string): string => {
  const emblems: Record<string, string> = {
    CL:  CL_EMBLEM,
    PL:  "https://cdn.freelogovectors.net/wp-content/uploads/2020/08/epl-premierleague-logo.png",
    PD:  "https://www.freelogovectors.net/wp-content/uploads/2023/07/laliga-logo-02-freelogovectors.net_.png",
    SA:  "https://www.freelogovectors.net/wp-content/uploads/2021/08/serie-a-logo-freelogovectors.net_.png",
    BL1: "https://www.freelogovectors.net/wp-content/uploads/2020/08/bundesliga_logo.png",
    FL1: "https://www.freelogovectors.net/wp-content/uploads/2020/08/ligue1logo.png",
    // ── International ──────────────────────────────────────────────────────
    WC:  "https://www.freelogovectors.net/wp-content/uploads/2025/07/fifa-world-cup-2026-freelogovectors.net_-478x480.png",
    EC:  "https://www.freelogovectors.net/wp-content/uploads/2020/01/uefa-logo.png",   // UEFA Euro
    CA:  INTL_GLOBE_EMBLEM,   // Copa América
    IF:  INTL_GLOBE_EMBLEM,   // International Friendly
  };
  return emblems[code] || INTL_GLOBE_EMBLEM;
};

// League sort order — CL always first, rest alphabetical
const LEAGUE_SORT_ORDER: Record<string, number> = {
  "UEFA Champions League": 0,
};
const sortLeagues = (entries: [string, Prediction[]][]): [string, Prediction[]][] =>
  entries.sort(([a], [b]) => {
    const oa = LEAGUE_SORT_ORDER[a] ?? 999;
    const ob = LEAGUE_SORT_ORDER[b] ?? 999;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
  });

// ─── Previous Advisor Bar Component ──────────────────────────────────────────
function PreviousAdvisorBar({
  confidenceScore,
  selection,
}: {
  confidenceScore: number;
  selection: string;
}) {
  const [advice, setAdvice] = useState<{
    pattern_label: string;
    animal: string | null;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchAdvice = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${FUNCTIONS_BASE}/get-pattern-message-previous`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confidence_score: confidenceScore, selection }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setAdvice(data);
      } catch {
        if (!cancelled) setAdvice(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAdvice();
    return () => { cancelled = true; };
  }, [confidenceScore, selection]);

  if (loading) {
    return (
      <div className="mt-4 rounded-xl bg-black/30 border border-white/10 p-3.5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 bg-white/10 rounded w-1/4" />
            <div className="h-2 bg-white/10 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!advice) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-4 rounded-xl bg-black/40 border border-white/10 overflow-hidden"
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold select-none shrink-0">
          <span>806</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-semibold text-white/90">_806</span>
            <BadgeCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            {advice.animal ? (
              <span className="flex items-center gap-1 text-xs font-bold text-gold ml-auto">
                <AnimalIcon animal={advice.animal} size={14} className="text-gold" />
                {advice.animal}
              </span>
            ) : (
              <span className="text-[10px] text-white/40 ml-auto font-mono">{advice.pattern_label}</span>
            )}
          </div>
          <p className="text-xs text-white/75 leading-relaxed">{advice.message}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Modal Component (unchanged except for pattern animal integration) ─────
// (The modal itself doesn't display pattern labels directly, so no further changes needed.)

interface PredictionModalProps {
  prediction: Prediction | null;
  onClose: () => void;
}

const PredictionModal = ({ prediction, onClose }: PredictionModalProps) => {
  if (!prediction) return null;

  const match = prediction.matches;
  const isWin = prediction.status === "WIN" || prediction.status === "HALF_WIN";
  const isLoss = prediction.status === "LOSS" || prediction.status === "HALF_LOSS";

  const backgroundStyle = {
    backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 100%), url('https://images.unsplash.com/photo-1575361204480-aadea25e6e68?q=80&w=2071&auto=format&fit=crop')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
          style={backgroundStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

<div className="p-6 text-white">
  <div className="flex items-center justify-between gap-4 mb-4">
    <div className="flex flex-col items-center gap-2">
      <CrestImage url={match.home_team.crest_url} alt="" size="lg" className="drop-shadow-lg" />
      <span className="font-heading text-xl font-bold text-center">{match.home_team.name}</span>
    </div>
    <div className="text-center">
      <span className="text-3xl font-bold text-white">VS</span>
      {match.home_score !== null && match.away_score !== null && (
        <div className="mt-2 text-2xl font-mono font-bold bg-black/40 px-3 py-1 rounded-lg">
          {match.home_score} – {match.away_score}
        </div>
      )}
    </div>
    <div className="flex flex-col items-center gap-2">
      <CrestImage url={match.away_team.crest_url} alt="" size="lg" className="drop-shadow-lg" />
      <span className="font-heading text-xl font-bold text-center">{match.away_team.name}</span>
    </div>
  </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-6 text-sm text-white/80">
              <span className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full">
                <Trophy className="h-3.5 w-3.5" />
                {match.competition.name}
              </span>
              <span className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(match.utc_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/70 text-sm uppercase tracking-wide">MK‑806 Prediction</span>
                <StatusBadge status={prediction.status} />
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xl font-bold text-gold">{prediction.selection}</span>
                <span className="text-lg font-semibold">{prediction.predicted_odds.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-gold" />
                <span className="text-sm text-white/80">Confidence:</span>
                <span className="text-sm font-bold">{Math.round(prediction.confidence_score * 100)}%</span>
                <div className="ml-2 h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full" style={{ width: `${prediction.confidence_score * 100}%` }} />
                </div>
              </div>

              <div className={`mt-3 p-3 rounded-lg ${isWin ? 'bg-green-500/20 border border-green-400/30' : isLoss ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/5'}`}>
                <p className="text-sm font-medium">
                  {isWin && "Prediction was correct!"}
                  {isLoss && "Prediction was incorrect."}
                  {!isWin && !isLoss && "Result pending."}
                </p>
              </div>

              <PreviousAdvisorBar
                confidenceScore={prediction.confidence_score}
                selection={prediction.selection}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main Page Component (unchanged) ─────────────────────────────────────────
type DateFilter = "yesterday" | "today" | "all";

const PreviousPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [filter, setFilter] = useState<DateFilter>("all");
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(new Set());

  const fetchCompletedPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("predictions")
        .select(`
          id,
          match_id,
          bet_type,
          selection,
          predicted_odds,
          confidence_score,
          reasoning,
          status,
          created_at,
          matches (
            utc_date,
            status,
            home_score,
            away_score,
            home_team:teams!matches_home_team_id_fkey ( name, tla, crest_url ),
            away_team:teams!matches_away_team_id_fkey ( name, tla, crest_url ),
            competition:competitions ( id, name, code, area_name )
          )
        `)
        .in("status", ["WIN", "LOSS", "HALF_WIN", "HALF_LOSS", "VOID"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPredictions(data as unknown as Prediction[]);
    } catch (e) {
      setError("Failed to load previous predictions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedPredictions();
  }, []);

  const getKenyaDate = (utcDate: string): string => {
    const date = new Date(utcDate);
    const kenyaTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    return kenyaTime.toISOString().split("T")[0];
  };

  const filteredPredictions = predictions.filter((p) => {
    const matchDate = getKenyaDate(p.matches.utc_date);
    const today = new Date();
    const todayStr = new Date(today.getTime() + 3 * 60 * 60 * 1000).toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = new Date(yesterday.getTime() + 3 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (filter === "today") return matchDate === todayStr;
    if (filter === "yesterday") return matchDate === yesterdayStr;
    return true;
  });

  const groupedByLeague: Record<string, Prediction[]> = {};
  filteredPredictions.forEach((p) => {
    const leagueName = p.matches.competition.name;
    if (!groupedByLeague[leagueName]) groupedByLeague[leagueName] = [];
    groupedByLeague[leagueName].push(p);
  });

  const toggleLeague = (league: string) => {
    setExpandedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(league)) next.delete(league);
      else next.add(league);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-heading font-bold">Previous Predictions</h1>
          <button
            onClick={fetchCompletedPredictions}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {(["yesterday", "today", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "gradient-gold text-accent-foreground shadow-gold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "yesterday" ? "Yesterday" : f === "today" ? "Today" : "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <button onClick={fetchCompletedPredictions} className="text-sm text-gold hover:underline">
              Try again
            </button>
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No predictions found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortLeagues(Object.entries(groupedByLeague)).map(([leagueName, leaguePredictions]) => {
              const first = leaguePredictions[0];
              const code = first.matches.competition.code;
              const emblem = getLeagueEmblem(code);
              const isCL = code === "CL";
              const isExpanded = expandedLeagues.has(leagueName);
              return (
                <div
                  key={leagueName}
                  className={`rounded-xl border overflow-hidden ${
                    isCL
                      ? "border-blue-500/40 bg-gradient-to-r from-[#0a1628]/80 to-card shadow-[0_0_18px_rgba(0,80,200,0.15)]"
                      : "border-border bg-card"
                  }`}
                >
                  <button
                    onClick={() => toggleLeague(leagueName)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {emblem && (
                        <img
                          src={emblem}
                          alt=""
                          className={`object-contain ${isCL ? "h-8 w-8" : "h-6 w-6"}`}
                        />
                      )}
                      <span className={`font-heading font-semibold ${isCL ? "text-blue-200" : "text-foreground"}`}>
                        {leagueName}
                      </span>
                      {isCL && (
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          UCL
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({leaguePredictions.length} prediction{leaguePredictions.length !== 1 ? "s" : ""})
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left px-4 py-3 font-heading font-semibold">Date</th>
                            <th className="text-left px-4 py-3 font-heading font-semibold">Fixture</th>
                            <th className="text-left px-4 py-3 font-heading font-semibold">Prediction</th>
                            <th className="text-left px-4 py-3 font-heading font-semibold">Odds</th>
                            <th className="text-left px-4 py-3 font-heading font-semibold">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaguePredictions.map((p) => {
                            const match = p.matches;
                            const fixtureName = `${match.home_team.tla || match.home_team.name} vs ${match.away_team.tla || match.away_team.name}`;
                            return (
                              <tr
                                key={p.id}
                                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => setSelectedPrediction(p)}
                              >
                                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                                <td className="px-4 py-3 font-medium">{fixtureName}</td>
                                <td className="px-4 py-3 text-muted-foreground">{p.selection}</td>
                                <td className="px-4 py-3 font-semibold text-gold">{p.predicted_odds.toFixed(2)}</td>
                                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <PredictionModal
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
        />
      </div>
    </Layout>
  );
};

export default PreviousPage;