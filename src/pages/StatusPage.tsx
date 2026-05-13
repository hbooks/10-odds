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
import CrestImage from "@/components/CrestImage";

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
            <span className="font-semibold">{animal.animal}</span>
            {/*<span className="opacity-50 font-mono text-[10px]">({advice.pattern_label})</span>*/}

            {/* Keeping the original label hidden for now since it's mostly just useful
            for debugging and can be a bit technical/confusing for users */}
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
  const [showHippo, setShowHippo] = useState(false);
  const [hippoLoading, setHippoLoading] = useState(false);
  const [hippoError, setHippoError] = useState<string | null>(null);
  const [hippoData, setHippoData] = useState<{
    market_1: string;
    selection_1: string;
    confidence_1: number;
    market_2: string;
    selection_2: string;
    confidence_2: number;
    market_3: string;
    selection_3: string;
    confidence_3: number;
    market_4: string;
    selection_4: string;
    confidence_4: number;
  } | null>(null);

  // Reset Hippo state when the prediction changes
  useEffect(() => {
    setShowHippo(false);
    setHippoLoading(false);
    setHippoError(null);
    setHippoData(null);
  }, [prediction?.id]);

  const loadHippo = useCallback(async () => {
    if (!prediction) return;
    setHippoLoading(true);
    setHippoError(null);

    try {
      // 1. Check if cached data already exists
      const { data: cached, error: cacheErr } = await supabase
        .from("hippo_predictions")
        .select(
          "market_1, selection_1, confidence_1, market_2, selection_2, confidence_2, market_3, selection_3, confidence_3, market_4, selection_4, confidence_4"
        )
        .eq("prediction_id", prediction.id)
        .maybeSingle();

      if (cached) {
        setHippoData(cached);
        setShowHippo(true);
        setHippoLoading(false);
        return;
      }

      // 2. Not cached → call the edge function for this single prediction
      const res = await fetch(
        `${FUNCTIONS_BASE}/hippo-predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_HIPPO_PUBLIC_TOKEN}`,
          },
          body: JSON.stringify({ prediction_id: prediction.id }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Internal server error");
      }

      const result = await res.json();
      const markets = result.markets as Array<{
        market: string;
        selection: string;
        confidence: number;
      }>;
      if (!markets || markets.length < 4) {
        throw new Error("Invalid response from server");
      }

      const mapped = {
        market_1:    markets[0].market,
        selection_1: markets[0].selection,
        confidence_1: markets[0].confidence,
        market_2:    markets[1].market,
        selection_2: markets[1].selection,
        confidence_2: markets[1].confidence,
        market_3:    markets[2].market,
        selection_3: markets[2].selection,
        confidence_3: markets[2].confidence,
        market_4:    markets[3].market,
        selection_4: markets[3].selection,
        confidence_4: markets[3].confidence,
      };

      setHippoData(mapped);
      setShowHippo(true);
    } catch (err: any) {
      setHippoError(err.message || "Internal server error");
    } finally {
      setHippoLoading(false);
    }
  }, [prediction]);

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

  // ── Hippo markets array ───────────────────────────────────────
  const hippoMarkets = hippoData
    ? [
        { market: hippoData.market_1, selection: hippoData.selection_1, confidence: hippoData.confidence_1 },
        { market: hippoData.market_2, selection: hippoData.selection_2, confidence: hippoData.confidence_2 },
        { market: hippoData.market_3, selection: hippoData.selection_3, confidence: hippoData.confidence_3 },
        { market: hippoData.market_4, selection: hippoData.selection_4, confidence: hippoData.confidence_4 },
      ]
    : [];

  const bestHippoConfidence = Math.max(...hippoMarkets.map((m) => m.confidence ?? 0));
  const hasBest = bestHippoConfidence > 0 && hippoMarkets.filter((m) => m.confidence === bestHippoConfidence).length === 1;

  const shortMarketLabel = (market: string): string => {
    const m = market.toLowerCase();
    if (m.includes("1x2")) return "1X2";
    if (m.includes("double chance")) return "DC";
    if (m.includes("draw no bet")) return "DNB";
    if (m.includes("btts")) return "BTTS";
    if (m.includes("over") || m.includes("under")) {
      const num = market.match(/[\d.]+/)?.[0];
      return `${m.startsWith("Over") ? "O" : "U"}${num ? " " + num : ""}`;
    }
    if (m.includes("goal line")) return "GL";
    if (m.includes("asian handicap")) return "AH";
    if (m.includes("european handicap")) return "EH";
    if (m.includes("correct score")) return "CS";
    if (m.includes("ht/ft")) return "HT/FT";
    if (m.includes("clean sheet")) return "CS";
    if (m.includes("win to nil")) return "WTN";
    if (m.includes("corner")) return "Cnr";
    if (m.includes("card")) return "Card";
    if (m.includes("booking points")) return "BP";
    if (m.includes("offside")) return "Off";
    if (m.includes("total goals")) return "TG";
    if (m.includes("exact total goals")) return "ETG";
    if (m.includes("even") || m.includes("odd")) return "E/O";
    if (m.includes("penalty awarded")) return "Pen";
    if (m.includes("red card")) return "Red";
    if (m.includes("own goal")) return "OG";
    if (m.includes("comeback win")) return "Comeback";
    if (m.includes("goal scorer")) return "Scorer";
    if (m.includes("half-time result")) return "HT 1X2";
    if (m.includes("half-time over") || m.includes("half-time under")) return "HT O/U";
    if (m.includes("half-time btts")) return "HT BTTS";
    if (m.includes("first half goals")) return "1H G";
    if (m.includes("second half goals")) return "2H G";
    if (m.includes("multi-goal")) return "Multi";
    if (m.includes("time of first goal")) return "1st Gl";
    if (m.includes("highest scoring half")) return "HSH";
    if (m.includes("team to win both halves")) return "TW BH";
    if (m.includes("team to win either half")) return "TW EH";
    if (m.includes("1x2 & btts")) return "1X2+BTTS";
    return market.slice(0, 6).toUpperCase();
  };

  const confidenceColor = (pct: number) => {
    if (pct >= 80) return "#34d399";
    if (pct >= 65) return "#84cc16";
    if (pct >= 50) return "#facc15";
    if (pct >= 35) return "#f97316";
    return "#ef4444";
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
          className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
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
            {/* Teams and kickoff */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {match.home_team.crest_url && (
                  <CrestImage url={match.home_team.crest_url} alt="" size="lg" />
                )}
                <span className="font-heading text-base font-bold text-center leading-tight">
                  {match.home_team.name}
                </span>
              </div>
              <span className="text-3xl font-bold text-gold shrink-0">VS</span>
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {match.away_team.crest_url && (
                  <CrestImage url={match.away_team.crest_url} alt="" size="lg" />
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

            {/* MK-806 Prediction box */}
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

              {/* ── Other Markets button ── */}
              <div className="mt-4">
                {!showHippo ? (
                  <button
                    onClick={loadHippo}
                    disabled={hippoLoading}
                    className="flex items-center gap-2 text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 transition-colors"
                  >
                    {hippoLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3-9h6v2H9zm0-4h6v2H9z" />
                      </svg>
                    )}
                    Other Markets
                  </button>
                ) : hippoLoading ? (
                  <div>
                    <p className="text-xs text-white/70 mb-2 font-medium">Loading alternative markets…</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[0,1,2,3,4].map((i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2 animate-pulse flex flex-col items-center justify-center border border-white/10 h-20" />
                      ))}
                    </div>
                  </div>
                ) : hippoError ? (
                  <p className="text-xs text-white/70 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                    {hippoError}
                  </p>
                ) : hippoMarkets.length > 0 ? (
                  <div>
                    <p className="text-xs text-white/70 mb-2 font-medium">Alternative Markets (Hippo AI)</p>
                    <div className="grid grid-cols-5 gap-2">
                      {/* MK-806 card */}
                      <div
                        className="bg-white/5 rounded-lg p-2 flex flex-col items-center justify-center border border-gold/40"
                        title={`MK-806: ${prediction.bet_type} - ${prediction.selection}`}
                      >
                        <span className="text-[10px] font-semibold text-gold mb-0.5">MK</span>
                        <span className="text-xs font-bold text-center leading-tight">
                          {prediction.selection}
                        </span>
                        <span className="text-[10px] mt-1" style={{ color: confidenceColor(prediction.confidence_score * 100) }}>
                          {Math.round(prediction.confidence_score * 100)}%
                        </span>
                      </div>

                      {/* Hippo cards */}
                      {hippoMarkets.map((m, idx) => {
                        const pct = m.confidence ?? 0;
                        const isBest = pct === bestHippoConfidence && pct > 0 && hippoMarkets.filter(c => c.confidence === bestHippoConfidence).length === 1;
                        return (
                          <div
                            key={idx}
                            className={`rounded-lg p-2 flex flex-col items-center justify-center border transition-all ${
                              isBest ? "border-gold shadow-[0_0_8px_rgba(255,215,0,0.5)]" : "border-white/10"
                            }`}
                            style={{
                              background: `radial-gradient(circle at center, ${confidenceColor(pct)}20 0%, rgba(0,0,0,0.2) 100%)`,
                            }}
                            title={`${m.market}: ${m.selection} (${pct}%)`}
                          >
                            <span className="text-[10px] font-semibold text-white/80 mb-0.5">
                              {shortMarketLabel(m.market)}
                            </span>
                            <span className="text-[11px] font-bold leading-tight text-center">
                              {m.selection}
                            </span>
                            <span className="text-[10px] mt-1 font-medium" style={{ color: confidenceColor(pct) }}>
                              {pct}%
                            </span>
                            {isBest && (
                              <svg className="absolute -top-1 -right-1 h-4 w-4 text-gold" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-white/40 mt-1.5 text-right">Tap cards for details</p>
                  </div>
                ) : (
                  <p className="text-xs text-white/50 italic">No alternative markets available yet.</p>
                )}
              </div>
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