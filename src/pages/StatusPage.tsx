import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import {
  RefreshCw,
  AlertCircle,
  X,
  Calendar,
  Trophy,
  Target,
  BadgeCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import AnimalIcon from "@/components/AnimalIcon";
import { getAnimalByLabel } from "@/lib/patternAnimals";

// ─── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

const FUNCTIONS_BASE =
  (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string) ??
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// ─── Types ────────────────────────────────────────────────────────────────────
type PredictionResult = "PENDING" | "WIN" | "LOSS" | "HALF_WIN" | "HALF_LOSS" | "VOID";
type PatternType      = "WIN" | "LOSS" | "NEUTRAL" | "INSUFFICIENT_DATA";

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

interface PatternAdvice {
  pattern_label:     string;
  pattern_type:      PatternType;
  message:           string;
  total_predictions: number;
  win_rate:          number;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<PredictionResult, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-yellow-500/20 text-black border border-yellow-400/30" },
  WIN:       { label: "Won ✓",     className: "bg-green-500/20 text-green-400" },
  LOSS:      { label: "Lost ✗",    className: "bg-red-500/20 text-red-400" },
  HALF_WIN:  { label: "½ Win",     className: "bg-green-400/20 text-green-300" },
  HALF_LOSS: { label: "½ Loss",    className: "bg-orange-500/20 text-orange-300" },
  VOID:      { label: "Void",      className: "bg-muted/40 text-muted-foreground" },
};

const StatusBadge = ({ status }: { status: PredictionResult }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.className}`}>
      {s.label}
    </span>
  );
};

// ─── Pattern type config ──────────────────────────────────────────────────────
const PATTERN_UI: Record<PatternType, { icon: React.ElementType; color: string; label: string; barColor: string }> = {
  WIN:               { icon: TrendingUp,   color: "text-emerald-400", label: "WIN Pattern",     barColor: "bg-emerald-400" },
  LOSS:              { icon: TrendingDown,  color: "text-rose-400",    label: "LOSS Pattern",    barColor: "bg-rose-400"    },
  NEUTRAL:           { icon: Minus,         color: "text-amber-400",   label: "NEUTRAL Pattern", barColor: "bg-amber-400"   },
  INSUFFICIENT_DATA: { icon: HelpCircle,    color: "text-muted-foreground", label: "NEW Pattern", barColor: "bg-muted-foreground" },
};

// ─── Advisor bar ──────────────────────────────────────────────────────────────
function AdvisorBar({ confidenceScore, selection }: { confidenceScore: number; selection: string }) {
  const [advice, setAdvice] = useState<PatternAdvice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetch806 = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${FUNCTIONS_BASE}/get-pattern-advice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confidence_score: confidenceScore, selection }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: PatternAdvice = await res.json();
        if (!cancelled) setAdvice(data);
      } catch {
        if (!cancelled) setAdvice(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch806();
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

  const ui      = PATTERN_UI[advice.pattern_type] ?? PATTERN_UI.INSUFFICIENT_DATA;
  const Icon    = ui.icon;
  const animal  = getAnimalByLabel(advice.pattern_label);
  const stats   = advice.total_predictions >= 5
    ? `${advice.total_predictions} predictions · ${advice.win_rate.toFixed(1)}% win rate`
    : `${advice.total_predictions} prediction${advice.total_predictions !== 1 ? "s" : ""} so far`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-4 rounded-xl bg-black/40 border border-white/10 overflow-hidden"
    >
      {/* ── Header strip with animal name + pattern type ── */}
      <div className={`px-4 py-1.5 flex items-center gap-2 text-xs font-medium ${ui.color} bg-black/20`}>
        <Icon className="h-3 w-3" />
        {animal ? (
          <span className="flex items-center gap-1.5">
            <AnimalIcon animal={animal.animal} size={14} className={ui.color} />
            <span className="font-semibold">{animal.animal}" Pattern"</span>
            {/*<span className="opacity-50 font-mono text-[10px]">({advice.pattern_label})</span>*/}
          </span>
        ) : (
          <span className="font-mono">{advice.pattern_label}</span>
        )}
        <span className="ml-auto opacity-60">{stats}</span>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#4A5BA8] to-[#33468D] flex items-center justify-center text-white text-xs font-bold select-none shrink-0">
          806
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-semibold text-white/90">_806</span>
            <BadgeCheck className="h-3.5 w-3.5 text-[#4A5BA8] shrink-0" />
          </div>
          <p className="text-xs text-white/75 leading-relaxed">{advice.message}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Prediction Modal ─────────────────────────────────────────────────────────
interface PredictionModalProps {
  prediction: Prediction | null;
  onClose: () => void;
}

const PredictionModal = ({ prediction, onClose }: PredictionModalProps) => {
  if (!prediction) return null;

  const match   = prediction.matches;
  const kickoff = new Date(match.utc_date).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";

  const backgroundStyle = {
    backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 100%), url('https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
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
          initial={{ scale: 0.92, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
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
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {match.home_team.crest_url && (
                  <img src={match.home_team.crest_url} alt="" className="h-16 w-16 object-contain drop-shadow-lg" />
                )}
                <span className="font-heading text-base font-bold text-center leading-tight">
                  {match.home_team.name}
                </span>
              </div>
              <span className="text-3xl font-bold text-gold shrink-0">VS</span>
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {match.away_team.crest_url && (
                  <img src={match.away_team.crest_url} alt="" className="h-16 w-16 object-contain drop-shadow-lg" />
                )}
                <span className="font-heading text-base font-bold text-center leading-tight">
                  {match.away_team.name}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
              <span className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full text-xs text-white/80">
                <Trophy className="h-3.5 w-3.5" />{match.competition.name}
              </span>
              <span className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full text-xs text-white/80">
                <Calendar className="h-3.5 w-3.5" />{kickoff}
              </span>
              {isLive && (
                <span className="flex items-center gap-1 bg-red-500/30 px-3 py-1 rounded-full text-xs animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-red-400" />LIVE
                </span>
              )}
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-xs uppercase tracking-wide">MK‑806 Prediction</span>
                {isLive ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-500/30 text-red-200">LIVE</span>
                ) : (
                  <StatusBadge status={prediction.status} />
                )}
              </div>

              <div className="flex items-baseline justify-between gap-2 mb-3">
                <span className="text-xl font-bold text-gold leading-snug flex-1 min-w-0 break-words">
                  {prediction.selection}
                </span>
                <span className="text-lg font-semibold shrink-0">
                  {prediction.predicted_odds.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gold shrink-0" />
                <span className="text-xs text-white/70">Confidence:</span>
                <span className="text-xs font-bold">{Math.round(prediction.confidence_score * 100)}%</span>
                <div className="ml-1.5 h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prediction.confidence_score * 100}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background:
                        prediction.confidence_score >= 0.7 ? "#34d399"
                        : prediction.confidence_score >= 0.5 ? "#fbbf24"
                        : "#fb7185",
                    }}
                  />
                </div>
              </div>

              <AdvisorBar
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

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toKenyaDateStr(utcIso: string): string {
  const d = new Date(utcIso);
  return new Date(d.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function groupPredictionsByDay(predictions: Prediction[]) {
  const nowKenya    = new Date(new Date().getTime() + 3 * 60 * 60 * 1000);
  const todayStr    = nowKenya.toISOString().slice(0, 10);
  const tomorrowStr = new Date(nowKenya.getTime() + 86_400_000).toISOString().slice(0, 10);
  const dayAfterStr = new Date(nowKenya.getTime() + 2 * 86_400_000).toISOString().slice(0, 10);

  const today: Prediction[] = [];
  const tomorrow: Prediction[] = [];
  const dayAfter: Prediction[] = [];

  predictions.forEach((p) => {
    const matchDay = toKenyaDateStr(p.matches.utc_date);
    if (matchDay === todayStr)         today.push(p);
    else if (matchDay === tomorrowStr) tomorrow.push(p);
    else if (matchDay === dayAfterStr) dayAfter.push(p);
  });

  const groups: { label: string; predictions: Prediction[] }[] = [];
  if (today.length > 0)    groups.push({ label: "Today",              predictions: today });
  if (tomorrow.length > 0) groups.push({ label: "Tomorrow",           predictions: tomorrow });
  if (dayAfter.length > 0) groups.push({ label: "Day After Tomorrow", predictions: dayAfter });
  return groups;
}

// ─── Prediction row ───────────────────────────────────────────────────────────
function PredictionRow({ p, onClick }: { p: Prediction; onClick: () => void }) {
  const match   = p.matches;
  const fixture = `${match.home_team.tla || match.home_team.name} vs ${match.away_team.tla || match.away_team.name}`;
  const isLive  = match.status === "IN_PLAY" || match.status === "PAUSED";

  return (
    <tr className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={onClick}>
      <td className="px-4 py-3.5">
        <div className="font-medium leading-tight">{fixture}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{match.competition.name}</div>
      </td>
      <td className="px-4 py-3.5 text-muted-foreground text-xs hidden md:table-cell max-w-[180px] truncate">
        {p.selection}
      </td>
      <td className="px-4 py-3.5 font-semibold text-gold tabular-nums">
        {p.predicted_odds.toFixed(2)}
      </td>
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted/60 overflow-hidden">
            <div className="h-full rounded-full bg-gold" style={{ width: `${p.confidence_score * 100}%` }} />
          </div>
          <span className="text-xs tabular-nums">{Math.round(p.confidence_score * 100)}%</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        {isLive ? (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-500/20 text-red-400 animate-pulse">
            LIVE
          </span>
        ) : (
          <StatusBadge status={p.status} />
        )}
      </td>
    </tr>
  );
}

function PredictionGroup({
  group, index, onSelect,
}: {
  group: { label: string; predictions: Prediction[] };
  index: number;
  onSelect: (p: Prediction) => void;
}) {
  const badgeStyle =
    index === 0
      ? "bg-gold/15 text-gold border border-gold/30"
      : index === 1
      ? "bg-[#4A5BA8]/15 text-[#4A5BA8] border border-[#4A5BA8]/30"
      : "bg-muted/60 text-muted-foreground border border-border";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-3 mb-2 px-1">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeStyle}`}>
          {group.label}
        </span>
        <span className="text-xs text-muted-foreground/60">
          {group.predictions.length} prediction{group.predictions.length !== 1 ? "s" : ""}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide">Fixture</th>
                <th className="text-left px-4 py-2.5 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Prediction</th>
                <th className="text-left px-4 py-2.5 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide">Odds</th>
                <th className="text-left px-4 py-2.5 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Confidence</th>
                <th className="text-left px-4 py-2.5 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {group.predictions.map((p) => (
                <PredictionRow key={p.id} p={p} onClick={() => onSelect(p)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const StatusPage = () => {
  const [predictions,        setPredictions]        = useState<Prediction[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [showGuideBanner,    setShowGuideBanner]    = useState(true);

  const fetchActivePredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("predictions")
        .select(`
          id, match_id, bet_type, selection, predicted_odds, confidence_score,
          reasoning, status, created_at,
          matches (
            utc_date, status,
            home_team:teams!matches_home_team_id_fkey ( name, tla, crest_url ),
            away_team:teams!matches_away_team_id_fkey ( name, tla, crest_url ),
            competition:competitions ( name )
          )
        `)
        .in("status", ["PENDING"])
        .order("matches(utc_date)", { ascending: true });

      if (err) throw err;
      setPredictions((data as unknown as Prediction[]) ?? []);
    } catch {
      setError("Failed to load active predictions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActivePredictions(); }, [fetchActivePredictions]);

  const groupedPredictions = groupPredictionsByDay(predictions);

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
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Live status of MK-806's current picks. Tap a row to see full analysis.
        </p>

        <AnimatePresence>
          {showGuideBanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6 rounded-xl bg-slate-800/90 border border-gold/40 shadow-lg"
            >
              <div className="flex items-start justify-between p-5 gap-4">
                <div className="flex items-start gap-3 text-sm">
                  <BookOpen className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white mb-1">Read Before Building Your Betslip</p>
                    <p className="text-slate-300 leading-relaxed">
                      Understanding how MK-806 and _806 work together can help you make more informed decisions.
                      We strongly recommend reading our{" "}
                      <Link to="/guide" className="text-gold underline hover:no-underline font-semibold">
                        Pattern & Prediction Guide
                      </Link>{" "}
                      before placing any real-world bets.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuideBanner(false)}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <button onClick={fetchActivePredictions} className="text-sm text-gold hover:underline">Try again</button>
          </div>
        )}

        {!loading && !error && predictions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p>No active predictions at the moment.</p>
          </div>
        )}

        {!loading && !error && groupedPredictions.length > 0 && (
          <div className="space-y-6">
            {groupedPredictions.map((group, i) => (
              <PredictionGroup
                key={group.label}
                group={group}
                index={i}
                onSelect={setSelectedPrediction}
              />
            ))}
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