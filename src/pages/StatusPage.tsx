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

// ─── Advisor Bar (_806) ───────────────────────────────────────────────────────
function AdvisorBar({
  confidenceScore,
  selection,
}: {
  confidenceScore: number;
  selection: string;
}) {
  const [advice, setAdvice]   = useState<PatternAdvice | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);

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
      <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 bg-white/10 rounded-full w-1/3" />
            <div className="h-2 bg-white/10 rounded-full w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!advice) return null;

  const ui     = PATTERN_UI[advice.pattern_type] ?? PATTERN_UI.INSUFFICIENT_DATA;
  const Icon   = ui.icon;
  const animal = getAnimalByLabel(advice.pattern_label);
  const stats  =
    advice.total_predictions >= 5
      ? `${advice.total_predictions} picks · ${advice.win_rate.toFixed(1)}% win rate`
      : `${advice.total_predictions} pick${advice.total_predictions !== 1 ? "s" : ""} so far`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mt-5 rounded-2xl overflow-hidden border border-white/10 bg-black/30 backdrop-blur-md"
    >
      {/* ── Collapsed header (always visible) ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
      >
        {/* _806 avatar */}
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#4A5BA8] to-[#1e2f7a] flex items-center justify-center text-white text-[11px] font-bold shrink-0 ring-1 ring-white/20">
          806
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-white/90">_806 </span>
            <BadgeCheck className="h-3.5 w-3.5 text-[#4A5BA8] shrink-0" />
            {animal && (
              <span className={`flex items-center gap-1 text-[10px] font-medium ${ui.color} opacity-80`}>
                <AnimalIcon animal={animal.animal} size={12} className={ui.color} />
                {animal.animal}
              </span>
            )}
          </div>
          <p className={`text-[10px] mt-0.5 ${ui.color} opacity-70`}>
            <Icon className="inline h-3 w-3 mr-0.5 -mt-px" />
            {ui.label} · {stats}
          </p>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-white/40 group-hover:text-white/60 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </button>

      {/* ── Expanded body ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="insight-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/10">
              <p className="text-xs text-white/70 leading-relaxed">{advice.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Confidence Ring ──────────────────────────────────────────────────────────
function ConfidenceRing({ pct, color }: { pct: number; color: string }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0 -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <motion.circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
      <text
        x="18"
        y="18"
        dominantBaseline="central"
        textAnchor="middle"
        fill="white"
        fontSize="7"
        fontWeight="700"
        className="rotate-90 origin-center"
        style={{ transform: "rotate(90deg)", transformOrigin: "18px 18px" }}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ─── Market Card ──────────────────────────────────────────────────────────────
interface MarketCardProps {
  label: string;
  fullMarket: string;
  selection: string;
  confidence: number;
  isPrimary?: boolean;
  isBest?: boolean;
  color: string;
  index: number;
}

function MarketCard({ label, fullMarket, selection, confidence, isPrimary, isBest, color, index }: MarketCardProps) {
  const [open, setOpen] = useState(false);

  // Tooltip horizontal anchor: last 2 cards (index 3,4) anchor right so they
  // don't overflow the modal edge; first 2 cards anchor left; middle is centred.
  const tooltipPos =
    index >= 3
      ? "right-0 translate-x-0"
      : index <= 1
      ? "left-0 translate-x-0"
      : "left-1/2 -translate-x-1/2";

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((o) => !o);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
      className="relative"
      // Desktop: hover to show tooltip
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // Mobile: block the entire touch sequence from reaching the backdrop
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={handleToggle}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={`absolute bottom-full mb-2 z-30 w-36 bg-[#0f1117] border border-white/20 rounded-xl px-3 py-2 text-center pointer-events-none shadow-xl ${tooltipPos}`}
          >
            <p className="text-[10px] font-semibold text-gold leading-tight">{fullMarket}</p>
            <p className="text-[11px] text-white mt-0.5">{selection}</p>
            <p className="text-[10px] mt-0.5" style={{ color }}>{confidence}% confidence</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onClick={handleToggle}
        className={`relative rounded-2xl p-3 flex flex-col items-center gap-1.5 border transition-all duration-200 cursor-pointer select-none
          ${isPrimary
            ? "border-gold/50 shadow-[0_0_16px_rgba(212,175,55,0.2)]"
            : isBest
            ? "border-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
            : "border-white/10 hover:border-white/20"
          }`}
        style={{
          background: isPrimary
            ? "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(0,0,0,0.4) 100%)"
            : `linear-gradient(135deg, ${color}18 0%, rgba(0,0,0,0.35) 100%)`,
        }}
      >
        {/* Crown / Primary badge */}
        {(isPrimary || isBest) && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
            {isPrimary ? (
              <span className="text-[9px] font-bold bg-gold text-black px-1.5 py-0.5 rounded-full whitespace-nowrap">
                MK‑806
              </span>
            ) : (
              <svg className="h-4 w-4 text-gold drop-shadow-[0_0_4px_rgba(212,175,55,0.8)]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
              </svg>
            )}
          </div>
        )}

        {/* Ring + label */}
        <ConfidenceRing pct={confidence} color={color} />

        <span
          className="text-[10px] font-bold tracking-wide uppercase"
          style={{ color: isPrimary ? "#D4AF37" : "rgba(255,255,255,0.55)" }}
        >
          {label}
        </span>

        <span className="text-[11px] font-bold text-white text-center leading-tight px-0.5">
          {selection}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-white/10 bg-white/5 h-24 animate-pulse"
    />
  );
}

// ─── Prediction Modal ─────────────────────────────────────────────────────────
interface PredictionModalProps {
  prediction: Prediction | null;
  onClose: () => void;
}

const PredictionModal = ({ prediction, onClose }: PredictionModalProps) => {
  const [showHippo,    setShowHippo]    = useState(false);
  const [hippoLoading, setHippoLoading] = useState(false);
  const [hippoError,   setHippoError]   = useState<string | null>(null);
  const [hippoData, setHippoData] = useState<{
    market_1: string; selection_1: string; confidence_1: number;
    market_2: string; selection_2: string; confidence_2: number;
    market_3: string; selection_3: string; confidence_3: number;
    market_4: string; selection_4: string; confidence_4: number;
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
    setShowHippo(true); // show skeleton immediately
    setHippoError(null);

    try {
      // 1. Check cache
      const { data: cached } = await supabase
        .from("hippo_predictions")
        .select(
          "market_1, selection_1, confidence_1, market_2, selection_2, confidence_2, market_3, selection_3, confidence_3, market_4, selection_4, confidence_4"
        )
        .eq("prediction_id", prediction.id)
        .maybeSingle();

      if (cached) {
        setHippoData(cached);
        setHippoLoading(false);
        return;
      }

      // 2. Not cached → call edge function
      const res = await fetch(`${FUNCTIONS_BASE}/hippo-predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_HIPPO_PUBLIC_TOKEN}`,
        },
        body: JSON.stringify({ prediction_id: prediction.id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Internal server error");
      }

      const result = await res.json();
      const markets = result.markets as Array<{ market: string; selection: string; confidence: number }>;
      if (!markets || markets.length < 4) throw new Error("Invalid response from server");

      setHippoData({
        market_1: markets[0].market, selection_1: markets[0].selection, confidence_1: markets[0].confidence,
        market_2: markets[1].market, selection_2: markets[1].selection, confidence_2: markets[1].confidence,
        market_3: markets[2].market, selection_3: markets[2].selection, confidence_3: markets[2].confidence,
        market_4: markets[3].market, selection_4: markets[3].selection, confidence_4: markets[3].confidence,
      });
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

  // ── Hippo markets ──────────────────────────────────────────────────────────
  const hippoMarkets = hippoData
    ? [
        { market: hippoData.market_1, selection: hippoData.selection_1, confidence: hippoData.confidence_1 },
        { market: hippoData.market_2, selection: hippoData.selection_2, confidence: hippoData.confidence_2 },
        { market: hippoData.market_3, selection: hippoData.selection_3, confidence: hippoData.confidence_3 },
        { market: hippoData.market_4, selection: hippoData.selection_4, confidence: hippoData.confidence_4 },
      ]
    : [];

  const bestHippoConfidence =
    hippoMarkets.length > 0 ? Math.max(...hippoMarkets.map((m) => m.confidence ?? 0)) : 0;
  const bestIsUnique =
    bestHippoConfidence > 0 &&
    hippoMarkets.filter((m) => m.confidence === bestHippoConfidence).length === 1;

  const shortMarketLabel = (market: string): string => {
    const m = market.toLowerCase();
    if (m.includes("1x2"))                    return "1X2";
    if (m.includes("double chance"))           return "DC";
    if (m.includes("draw no bet"))             return "DNB";
    if (m.includes("btts"))                    return "BTTS";
    if (m.includes("over") || m.includes("under")) {
      const num = market.match(/[\d.]+/)?.[0];
      return `${m.startsWith("over") ? "O" : "U"}${num ? " " + num : ""}`;
    }
    if (m.includes("asian handicap"))          return "AH";
    if (m.includes("european handicap"))       return "EH";
    if (m.includes("correct score"))           return "CS";
    if (m.includes("ht/ft"))                   return "HT/FT";
    if (m.includes("clean sheet"))             return "CS";
    if (m.includes("win to nil"))              return "WTN";
    if (m.includes("corner"))                  return "Cnr";
    if (m.includes("total goals"))             return "TG";
    if (m.includes("even") || m.includes("odd")) return "E/O";
    if (m.includes("half-time result"))        return "HT 1X2";
    if (m.includes("half-time over") || m.includes("half-time under")) return "HT O/U";
    if (m.includes("half-time btts"))          return "HT BTTS";
    if (m.includes("first half goals"))        return "1H G";
    if (m.includes("second half goals"))       return "2H G";
    if (m.includes("multi-goal"))              return "Multi";
    if (m.includes("goal line"))               return "GL";
    if (m.includes("booking points"))          return "BP";
    if (m.includes("red card"))                return "Red";
    return market.slice(0, 6).toUpperCase();
  };

  const confidenceColor = (pct: number) => {
    if (pct >= 80) return "#34d399";
    if (pct >= 65) return "#84cc16";
    if (pct >= 50) return "#facc15";
    if (pct >= 35) return "#f97316";
    return "#ef4444";
  };

  const mkConfidencePct = Math.round(prediction.confidence_score * 100);

  return (
    <AnimatePresence>
      {/* ── Backdrop ── */}
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.72)", touchAction: "none" }}
        onClick={onClose}
        onTouchEnd={(e) => {
          // Only close if the touch didn't move (not a scroll gesture)
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* ── Panel ── */}
        <motion.div
          key="modal-panel"
          initial={{ scale: 0.93, y: 28, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.93, y: 28, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="relative w-full max-w-xl rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] max-h-[90vh] overflow-y-auto"
          style={{
            background: "rgba(8, 10, 18, 0.82)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* ── Pitch background (stronger overlay for readability) ── */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `url('https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.07,
            }}
          />

          {/* ── Gold top-edge glow ── */}
          <div
            className="absolute top-0 left-0 right-0 h-px z-10 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.5) 40%, rgba(212,175,55,0.5) 60%, transparent)" }}
          />

          {/* ── Close button ── */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-all"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* ── Content ── */}
          <div className="relative z-10 px-6 py-7 text-white">

            {/* ────── Teams header ────── */}
            <div className="flex items-center justify-between gap-3 mb-5">
              {/* Home */}
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {match.home_team.crest_url && (
                  <CrestImage url={match.home_team.crest_url} alt="" size="lg" />
                )}
                <span className="font-heading text-sm font-bold text-center leading-tight text-white/95">
                  {match.home_team.name}
                </span>
              </div>

              {/* VS chip */}
              <div className="flex flex-col items-center shrink-0 gap-1">
                <span className="text-2xl font-black text-gold tracking-tighter leading-none">VS</span>
                {isLive && (
                  <span className="flex items-center gap-1 bg-red-500/25 border border-red-400/30 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-300 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    LIVE
                  </span>
                )}
              </div>

              {/* Away */}
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {match.away_team.crest_url && (
                  <CrestImage url={match.away_team.crest_url} alt="" size="lg" />
                )}
                <span className="font-heading text-sm font-bold text-center leading-tight text-white/95">
                  {match.away_team.name}
                </span>
              </div>
            </div>

            {/* ── Competition + kickoff pills ── */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <span className="flex items-center gap-1.5 bg-white/8 border border-white/10 px-3 py-1.5 rounded-full text-[11px] text-white/75">
                <Trophy className="h-3 w-3 text-gold" />{match.competition.name}
              </span>
              <span className="flex items-center gap-1.5 bg-white/8 border border-white/10 px-3 py-1.5 rounded-full text-[11px] text-white/75">
                <Calendar className="h-3 w-3 text-white/50" />{kickoff}
              </span>
            </div>

            {/* ──────── MK-806 Prediction card ──────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-white/10 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(0,0,0,0.4) 100%)",
              }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.9)]" />
                  <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
                    MK‑806 Primary Pick
                  </span>
                </div>
                {isLive ? (
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-red-500/30 text-red-200 border border-red-400/30 animate-pulse">
                    LIVE
                  </span>
                ) : (
                  <StatusBadge status={prediction.status} />
                )}
              </div>

              {/* Selection headline */}
              <div className="px-5 py-5">
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-2xl font-black text-gold leading-tight tracking-tight"
                  style={{ textShadow: "0 0 24px rgba(212,175,55,0.35)" }}
                >
                  {prediction.selection}
                </motion.p>

                {/* Subtle gold underline bar */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
                  className="mt-2 h-0.5 w-16 rounded-full origin-left"
                  style={{ background: "linear-gradient(90deg, #D4AF37, rgba(212,175,55,0))" }}
                />

                {/* Bet type sub-label */}
                <p className="mt-2 text-xs text-white/40 font-medium">
                  {prediction.bet_type}
                </p>
              </div>
            </motion.div>

            {/* ──────── Advisor Bar ──────── */}
            <AdvisorBar
              confidenceScore={prediction.confidence_score}
              selection={prediction.selection}
            />

            {/* ──────── Other Markets section ──────── */}
            <div className="mt-5">
              {!showHippo ? (
                /* ── Trigger button ── */
                <motion.button
                  onClick={loadHippo}
                  disabled={hippoLoading}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="group relative w-full flex items-center justify-center gap-2.5 rounded-2xl border border-white/15 px-5 py-3.5 text-sm font-semibold text-white/85 transition-all duration-200 overflow-hidden hover:border-gold/40"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  {/* Subtle gold glow on hover */}
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at center, rgba(212,175,55,0.06) 0%, transparent 70%)" }}
                  />

                  {/* Hippo icon */}
                  <svg className="h-4 w-4 text-gold/70 group-hover:text-gold transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 12h8M12 8v8" strokeLinecap="round" />
                  </svg>
                  <span>Explore Alternative Markets</span>
                  <span className="text-[10px] font-normal text-white/40 ml-0.5">via Hippo AI</span>

                  {/* Animated arrow */}
                  <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="ml-auto text-gold/60"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                </motion.button>

              ) : hippoLoading ? (
                /* ── Skeleton shimmer ── */
                <div>
                  <p className="text-[11px] text-white/40 mb-3 text-center font-medium tracking-wide uppercase">
                    Fetching alternative markets…
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {[0,1,2,3,4].map((i) => <SkeletonCard key={i} index={i} />)}
                  </div>
                </div>

              ) : hippoError ? (
                /* ── Error state ── */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 py-6 rounded-2xl border border-white/10 bg-white/4"
                >
                  <div className="h-10 w-10 rounded-full bg-red-500/15 border border-red-400/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <p className="text-sm text-white/60 text-center px-4">{hippoError}</p>
                  <button
                    onClick={loadHippo}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </motion.div>

              ) : hippoMarkets.length > 0 ? (
                /* ── Market cards grid ── */
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-white/8" />
                    <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest px-1">
                      Alternative Markets · Hippo AI
                    </span>
                    <div className="h-px flex-1 bg-white/8" />
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-3">
                    {/* MK-806 as primary card */}
                    <MarketCard
                      label="MK‑806"
                      fullMarket={prediction.bet_type}
                      selection={prediction.selection}
                      confidence={mkConfidencePct}
                      isPrimary
                      color={confidenceColor(mkConfidencePct)}
                      index={0}
                    />

                    {/* Hippo cards */}
                    {hippoMarkets.map((m, idx) => {
                      const pct     = m.confidence ?? 0;
                      const isBest  = pct === bestHippoConfidence && pct > 0 && bestIsUnique;
                      return (
                        <MarketCard
                          key={idx}
                          label={shortMarketLabel(m.market)}
                          fullMarket={m.market}
                          selection={m.selection}
                          confidence={pct}
                          isBest={isBest}
                          color={confidenceColor(pct)}
                          index={idx + 1}
                        />
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-white/25 mt-3 text-center">
                    Tap or hover a card for full market details
                  </p>
                </div>

              ) : (
                /* ── Empty state ── */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2.5 py-6 rounded-2xl border border-white/8 bg-white/3"
                >
                  <div className="h-9 w-9 rounded-full bg-white/6 border border-white/10 flex items-center justify-center">
                    <svg className="h-4 w-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-xs text-white/40 text-center px-4">
                    Hippo AI hasn't analysed this one yet.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Bottom spacing */}
            <div className="h-1" />
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