import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Activity, Clock } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Candle = { minute: number; open: number; high: number; low: number; close: number };

type MarketRow = {
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
  status: "active" | "won" | "lost" | "void";
  confidence: number;
  candles: Candle[] | null;
  home_score?: number;
  away_score?: number;
  current_minute?: number;
};

type Props = {
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
  onClose?: () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD = "#D4AF37";
const GREEN = "#22c55e";
const GREEN_DK = "#16a34a";
const RED = "#ef4444";
const RED_DK = "#dc2626";
const DOJI = "#94a3b8"; // neutral candle (open === close)

const CHART_W = 900;
const CHART_H = 420;
const M = { top: 24, right: 60, bottom: 42, left: 58 };
const PLOT_W = CHART_W - M.left - M.right;
const PLOT_H = CHART_H - M.top - M.bottom;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const scaleX = (minute: number) => M.left + (minute / 90) * PLOT_W;
const scaleY = (val: number) => M.top + PLOT_H - (val / 100) * PLOT_H;

function useAnimatedNumber(target: number, duration = 700) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { prev.current = to; setDisplay(to); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0a0e] p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-6 w-52 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-5 w-28 rounded-lg bg-white/5 animate-pulse ml-2" />
      </div>
      <div className="h-[420px] rounded-xl bg-white/5 animate-pulse" />
    </div>
  );
}

// ─── Pulse ring on current candle ────────────────────────────────────────────
function PulseRing({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={6} fill="none" stroke={GOLD} strokeWidth={1.5} opacity={0.9}>
        <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={3} fill={GOLD} opacity={0.95} />
    </>
  );
}

// ─── Main SVG candlestick chart ───────────────────────────────────────────────
function CandleChart({
  candles,
  currentMinute,
}: {
  candles: Candle[];
  currentMinute: number;
}) {
  if (candles.length === 0) return null;

  // Candle slot width – fit up to 90 slots across PLOT_W, leaving a little padding
  const slotW = PLOT_W / 92; // ~1 slot per minute
  const bodyW = Math.max(slotW * 0.55, 2.5);

  // Y-axis ticks
  const yTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const xTicks = [0, 15, 30, 45, 60, 75, 90];

  // Win zone / loss zone shading
  const y50 = scaleY(50);

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full select-none"
      style={{ fontFamily: "'DM Mono','Courier New',monospace" }}
    >
      <defs>
        {/* Green glow above 50 */}
        <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        {/* Red glow below 50 */}
        <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.12" />
        </linearGradient>
        {/* Current candle glow */}
        <filter id="candleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Clip to plot area */}
        <clipPath id="plotClip">
          <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} />
        </clipPath>
      </defs>

      {/* ── Background zones ── */}
      {/* Win zone (above 50%) */}
      <rect
        x={M.left} y={M.top}
        width={PLOT_W} height={y50 - M.top}
        fill="url(#winGrad)"
        clipPath="url(#plotClip)"
      />
      {/* Loss zone (below 50%) */}
      <rect
        x={M.left} y={y50}
        width={PLOT_W} height={M.top + PLOT_H - y50}
        fill="url(#lossGrad)"
        clipPath="url(#plotClip)"
      />

      {/* ── Y-axis grid lines ── */}
      {yTicks.map(v => (
        <line
          key={v}
          x1={M.left} x2={M.left + PLOT_W}
          y1={scaleY(v)} y2={scaleY(v)}
          stroke={v === 50 ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.05)"}
          strokeWidth={1}
        />
      ))}

      {/* ── 50% threshold (dashed) ── */}
      <line
        x1={M.left} x2={M.left + PLOT_W}
        y1={y50} y2={y50}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      <text x={M.left + PLOT_W + 6} y={y50 + 4} fill="rgba(255,255,255,0.5)" fontSize={10} textAnchor="start">
        50
      </text>

      {/* ── Halftime vertical line ── */}
      <line
        x1={scaleX(45)} x2={scaleX(45)}
        y1={M.top} y2={M.top + PLOT_H}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      <rect
        x={scaleX(45) - 9} y={M.top + PLOT_H + 4}
        width={18} height={14}
        rx={3}
        fill="rgba(255,255,255,0.08)"
      />
      <text
        x={scaleX(45)} y={M.top + PLOT_H + 14}
        textAnchor="middle"
        fill="rgba(255,255,255,0.5)"
        fontSize={9}
        fontWeight="600"
        letterSpacing="0.5"
      >
        HT
      </text>

      {/* ── Candles ── */}
      <g clipPath="url(#plotClip)">
        {candles.map((c) => {
          const cx = scaleX(c.minute);
          const yHigh = scaleY(c.high);
          const yLow = scaleY(c.low);
          const yOpen = scaleY(c.open);
          const yClose = scaleY(c.close);
          const yBodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(Math.abs(yClose - yOpen), 2);
          const isCurrent = c.minute === currentMinute;

          const isUp = c.close > c.open + 0.1;
          const isDown = c.open > c.close + 0.1;
          const bodyColor = isUp ? GREEN : isDown ? RED : DOJI;
          const wickColor = isUp ? GREEN_DK : isDown ? RED_DK : "#64748b";

          return (
            <g key={c.minute} filter={isCurrent ? "url(#candleGlow)" : undefined}>
              {/* Wick */}
              <line
                x1={cx} x2={cx}
                y1={yHigh} y2={yLow}
                stroke={wickColor}
                strokeWidth={isCurrent ? 1.5 : 1}
                strokeLinecap="round"
              />
              {/* Body */}
              <rect
                x={cx - bodyW / 2}
                y={yBodyTop}
                width={bodyW}
                height={bodyH}
                fill={bodyColor}
                stroke={isCurrent ? GOLD : bodyColor}
                strokeWidth={isCurrent ? 1.5 : 0}
                rx={0.5}
                opacity={isCurrent ? 1 : 0.85}
              />
            </g>
          );
        })}
      </g>

      {/* ── Current candle pulse dot ── */}
      {currentMinute >= 0 && (() => {
        const last = candles.find(c => c.minute === currentMinute);
        if (!last) return null;
        return (
          <PulseRing
            cx={scaleX(last.minute)}
            cy={scaleY(last.close)}
          />
        );
      })()}

      {/* ── Y-axis labels ── */}
      {yTicks.map(v => (
        <text
          key={v}
          x={M.left - 8}
          y={scaleY(v) + 4}
          textAnchor="end"
          fill={v === 50 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)"}
          fontSize={10}
          fontWeight={v === 50 ? "600" : "400"}
        >
          {v}
        </text>
      ))}
      <text
        x={M.left - 38}
        y={M.top + PLOT_H / 2}
        textAnchor="middle"
        fill="rgba(255,255,255,0.25)"
        fontSize={9}
        transform={`rotate(-90, ${M.left - 38}, ${M.top + PLOT_H / 2})`}
        letterSpacing="1"
      >
        PROBABILITY %
      </text>

      {/* ── X-axis ── */}
      <line
        x1={M.left} x2={M.left + PLOT_W}
        y1={M.top + PLOT_H} y2={M.top + PLOT_H}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={1}
      />
      {xTicks.map(m => (
        <g key={m}>
          <line
            x1={scaleX(m)} x2={scaleX(m)}
            y1={M.top + PLOT_H} y2={M.top + PLOT_H + 4}
            stroke="rgba(255,255,255,0.2)"
          />
          <text
            x={scaleX(m)}
            y={M.top + PLOT_H + 16}
            textAnchor="middle"
            fill="rgba(255,255,255,0.35)"
            fontSize={10}
          >
            {m === 45 ? "" : `${m}′`}
          </text>
        </g>
      ))}

      {/* ── Right Y-axis border ── */}
      <line
        x1={M.left + PLOT_W} x2={M.left + PLOT_W}
        y1={M.top} y2={M.top + PLOT_H}
        stroke="rgba(255,255,255,0.07)"
      />
      {/* ── Left Y-axis border ── */}
      <line
        x1={M.left} x2={M.left}
        y1={M.top} y2={M.top + PLOT_H}
        stroke="rgba(255,255,255,0.07)"
      />
    </svg>
  );
}

// ─── Score badge ─────────────────────────────────────────────────────────────
function ScoreBadge({
  homeScore,
  awayScore,
  minute,
}: {
  homeScore?: number;
  awayScore?: number;
  minute?: number;
}) {
  if (homeScore === undefined || awayScore === undefined) return null;
  return (
    <div className="flex items-center gap-2">
      <span
        className="font-mono text-xl font-bold tracking-widest text-white"
        style={{ textShadow: "0 0 12px rgba(255,255,255,0.2)" }}
      >
        {homeScore}–{awayScore}
      </span>
      {minute !== undefined && minute > 0 && (
        <span className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ animation: "pulse 1.5s infinite" }}
          />
          {minute}′
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function CandlestickChartInner({
  bsd_match_id,
  market_type,
  market_selection,
  match_name,
  onClose,
}: Props) {
  const [row, setRow] = useState<MarketRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Initial fetch ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("live_market_data")
        .select(
          "bsd_match_id, market_type, market_selection, match_name, status, confidence, candles, home_score, away_score, current_minute"
        )
        .eq("bsd_match_id", bsd_match_id)
        .eq("market_type", market_type)
        .eq("market_selection", market_selection)
        .maybeSingle();
      if (err) throw err;
      setRow(data as MarketRow | null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, [bsd_match_id, market_type, market_selection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Realtime subscription ─────────────────────────────────────
  // Key fix: subscribe unconditionally (not gated on row.status),
  // use a filter on bsd_match_id which Supabase Realtime supports natively.
  useEffect(() => {
    const channelName = `chart:${bsd_match_id}:${market_type}:${market_selection}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_market_data",
          filter: `bsd_match_id=eq.${bsd_match_id}`,
        },
        (payload) => {
          const n = payload.new as MarketRow;
          // Guard: only update if this is the exact market we're watching
          if (
            n.market_type === market_type &&
            n.market_selection === market_selection
          ) {
            setRow((prev) => (prev ? { ...prev, ...n } : n));
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[CandlestickChart] Realtime subscription error – retrying fetch");
          setTimeout(fetchData, 5000);
        }
      });

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [bsd_match_id, market_type, market_selection, fetchData]);

  // ── Derived data ──────────────────────────────────────────────
  const candles = useMemo<Candle[]>(() => {
    if (!row?.candles) return [];
    return (row.candles as Candle[])
      .filter((c) => c.minute >= 0 && c.minute <= 120)
      .sort((a, b) => a.minute - b.minute);
  }, [row]);

  const currentMinute = candles.length
    ? candles[candles.length - 1].minute
    : -1;

  const animatedConfidence = useAnimatedNumber(row?.confidence ?? 0);
  const settled =
    row?.status === "won" || row?.status === "lost" || row?.status === "void";

  // ── Confidence color ──────────────────────────────────────────
  const confColor =
    animatedConfidence >= 65
      ? GREEN
      : animatedConfidence <= 35
      ? RED
      : GOLD;

  // ── Render states ─────────────────────────────────────────────
  if (loading) return <SkeletonChart />;

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <p className="text-rose-300 mb-3">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm hover:bg-rose-500/30 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!row || candles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0e] p-10 text-center">
        <Activity className="h-10 w-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/50 text-sm">
          Market data is being prepared. This usually takes under a minute.
        </p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition"
        >
          Refresh
        </button>
      </div>
    );
  }

  // Parse team names from match_name for display
  const teamNames = (row.match_name || match_name).split(" vs ");
  const homeTeam = teamNames[0] ?? "Home";
  const awayTeam = teamNames[1] ?? "Away";

  return (
    <div
      className="rounded-2xl border border-white/10 bg-[#0a0a0e] overflow-hidden relative"
      style={{ boxShadow: "0 0 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-5 pb-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Left: back + match info */}
        <div className="flex items-center gap-3 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4 text-white/70" />
            </button>
          )}
          <div className="min-w-0">
            {/* Teams */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                {homeTeam}
              </span>
              <span className="text-white/30 text-xs">vs</span>
              <span className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                {awayTeam}
              </span>
            </div>
            {/* Market type + selection */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                {market_type}
              </span>
              <span className="text-white/20 text-xs">·</span>
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: GOLD }}
              >
                {market_selection}
              </span>
            </div>
          </div>
        </div>

        {/* Right: score + minute + confidence */}
        <div className="flex items-center gap-4 shrink-0">
          <ScoreBadge
            homeScore={row.home_score}
            awayScore={row.away_score}
            minute={row.current_minute ?? currentMinute}
          />

          {/* Confidence meter */}
          <div className="flex flex-col items-end">
            <motion.span
              className="text-2xl sm:text-3xl font-black leading-none tabular-nums"
              style={{ color: confColor, textShadow: `0 0 20px ${confColor}60` }}
              key={Math.round(animatedConfidence)}
            >
              {animatedConfidence.toFixed(0)}%
            </motion.span>
            <span className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
              confidence
            </span>
          </div>
        </div>
      </div>

      {/* ── Confidence bar ── */}
      <div className="px-5 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${confColor}80, ${confColor})` }}
            animate={{ width: `${animatedConfidence}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-rose-400/60">LOSS</span>
          <span className="text-[10px] text-emerald-400/60">WIN</span>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="w-full overflow-x-auto px-1 pb-1">
        <div style={{ minWidth: 360 }}>
          <CandleChart candles={candles} currentMinute={currentMinute} />
        </div>
      </div>

      {/* ── Legend ── */}
      <div
        className="flex items-center gap-4 px-5 py-3 text-xs text-white/30"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: GREEN }} />
          Bullish (close &gt; open)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: RED }} />
          Bearish (close &lt; open)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-1 rounded-full border"
            style={{ borderColor: "rgba(255,255,255,0.3)", borderStyle: "dashed" }}
          />
          50% threshold
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <Clock className="h-3 w-3" />
          Updates every ~3 min
        </span>
      </div>

      {/* ── Result banner ── */}
      <AnimatePresence>
        {settled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
            className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl z-10"
          >
            <div
              className={`flex flex-col items-center gap-3 px-10 py-7 rounded-2xl border ${
                row.status === "won"
                  ? "border-[#D4AF37]/40 bg-[#D4AF37]/10"
                  : row.status === "void"
                  ? "border-white/20 bg-white/5"
                  : "border-rose-500/40 bg-rose-500/10"
              }`}
              style={
                row.status === "won"
                  ? { boxShadow: "0 0 60px rgba(212,175,55,0.25)" }
                  : row.status === "lost"
                  ? { boxShadow: "0 0 60px rgba(239,68,68,0.2)" }
                  : {}
              }
            >
              <div className="text-5xl">
                {row.status === "won" ? "🏆" : row.status === "void" ? "↩️" : "❌"}
              </div>
              <p
                className="text-2xl font-black tracking-wider"
                style={{
                  color:
                    row.status === "won"
                      ? GOLD
                      : row.status === "void"
                      ? "white"
                      : RED,
                }}
              >
                Market {row.status === "won" ? "Won" : row.status === "void" ? "Void" : "Lost"}
              </p>
              <p className="text-sm text-white/50">
                Final confidence: {row.confidence.toFixed(0)}%
              </p>
              {onClose && (
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2 rounded-xl bg-white/10 border border-white/15 text-white/70 text-sm hover:bg-white/15 transition"
                >
                  Back to Markets
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const CandlestickChart = memo(CandlestickChartInner);
export default CandlestickChart;