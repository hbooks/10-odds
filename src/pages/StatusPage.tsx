import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import { RefreshCw, AlertCircle, X, Calendar, Clock, Trophy, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type PredictionResult = "PENDING" | "WIN" | "LOSS" | "HALF_WIN" | "HALF_LOSS" | "VOID";

interface Team {
  name: string;
  tla: string | null;
  crest_url?: string | null;
}

interface Match {
  utc_date: string;
  status: string;
  home_team: Team;
  away_team: Team;
  competition: { name: string };
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

const STATUS_STYLES: Record<PredictionResult, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-yellow-500/20 text-yellow-200 border border-yellow-400/30" },
  WIN:       { label: "Won ✓",     className: "bg-green-500/20 text-green-400" },
  LOSS:      { label: "Lost ✗",    className: "bg-red-500/20 text-red-400" },
  HALF_WIN:  { label: "½ Win",     className: "bg-green-400/20 text-green-300" },
  HALF_LOSS: { label: "½ Loss",    className: "bg-orange-500/20 text-orange-300" },
  VOID:      { label: "Void",      className: "bg-muted/40 text-muted-foreground" },
};

const StatusBadge = ({ status }: { status: PredictionResult }) => {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${style.className}`}>
      {style.label}
    </span>
  );
};

// ─── Modal Component ─────────────────────────────────────────────────────────
interface PredictionModalProps {
  prediction: Prediction | null;
  onClose: () => void;
}

const PredictionModal = ({ prediction, onClose }: PredictionModalProps) => {
  if (!prediction) return null;

  const match = prediction.matches;
  const kickoff = new Date(match.utc_date).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const displayStatus = isLive ? "LIVE" : prediction.status;

  const backgroundStyle = {
    backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%), url('https://images.unsplash.com/photo-1529906925868-158d82cdb4f4?q=80&w=2070&auto=format&fit=crop')`,
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
                {match.home_team.crest_url && (
                  <img src={match.home_team.crest_url} alt="" className="h-16 w-16 object-contain drop-shadow-lg" />
                )}
                <span className="font-heading text-xl font-bold text-center">
                  {match.home_team.name}
                </span>
              </div>
              <span className="text-3xl font-bold text-gold">VS</span>
              <div className="flex flex-col items-center gap-2">
                {match.away_team.crest_url && (
                  <img src={match.away_team.crest_url} alt="" className="h-16 w-16 object-contain drop-shadow-lg" />
                )}
                <span className="font-heading text-xl font-bold text-center">
                  {match.away_team.name}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-6 text-sm text-white/80">
              <span className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full">
                <Trophy className="h-3.5 w-3.5" />
                {match.competition.name}
              </span>
              <span className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full">
                <Calendar className="h-3.5 w-3.5" />
                {kickoff}
              </span>
              {isLive && (
                <span className="flex items-center gap-1 bg-red-500/30 px-3 py-1 rounded-full animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  LIVE
                </span>
              )}
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-sm uppercase tracking-wide">MK‑806 Prediction</span>
                {isLive ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-500/30 text-red-200">
                    LIVE
                  </span>
                ) : (
                  <StatusBadge status={prediction.status} />
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-gold">{prediction.selection}</span>
                <span className="text-lg font-semibold">{prediction.predicted_odds.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-gold" />
                <span className="text-sm text-white/80">Confidence:</span>
                <span className="text-sm font-bold">{Math.round(prediction.confidence_score * 100)}%</span>
                <div className="ml-2 h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full"
                    style={{ width: `${prediction.confidence_score * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main Page Component ─────────────────────────────────────────────────────
const StatusPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  const fetchActivePredictions = async () => {
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
            home_team:teams!matches_home_team_id_fkey ( name, tla, crest_url ),
            away_team:teams!matches_away_team_id_fkey ( name, tla, crest_url ),
            competition:competitions ( name )
          )
        `)
        .in("status", ["PENDING"])
        .order("matches(utc_date)", { ascending: true });  // <-- Sorted by match date

      if (error) throw error;
      setPredictions(data as unknown as Prediction[]);
    } catch (e) {
      setError("Failed to load active predictions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePredictions();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-heading font-bold">Active Predictions</h1>
          <button
            onClick={fetchActivePredictions}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <p className="text-muted-foreground mb-6">Live status of MK-806's current picks.</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <button onClick={fetchActivePredictions} className="text-sm text-gold hover:underline">
              Try again
            </button>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No active predictions at the moment.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-heading font-semibold">Fixture</th>
                    <th className="text-left px-4 py-3 font-heading font-semibold">Prediction</th>
                    <th className="text-left px-4 py-3 font-heading font-semibold">Odds</th>
                    <th className="text-left px-4 py-3 font-heading font-semibold">Confidence</th>
                    <th className="text-left px-4 py-3 font-heading font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => {
                    const match = p.matches;
                    const fixtureName = `${match.home_team.tla || match.home_team.name} vs ${match.away_team.tla || match.away_team.name}`;
                    const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedPrediction(p)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{fixtureName}</div>
                          <div className="text-xs text-muted-foreground">{match.competition.name}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.selection}</td>
                        <td className="px-4 py-3 font-semibold text-gold">{p.predicted_odds.toFixed(2)}</td>
                        <td className="px-4 py-3">{Math.round(p.confidence_score * 100)}%</td>
                        <td className="px-4 py-3">
                          {isLive ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-500/20 text-red-400">
                              LIVE
                            </span>
                          ) : (
                            <StatusBadge status={p.status} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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

export default StatusPage;