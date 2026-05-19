import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ──────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

type Candle = {
  minute: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type MarketRow = {
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  status: "active" | "won" | "lost" | "void";
  confidence: number;
  candles: Candle[] | null;
};

type Props = {
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
  onSwitchMarket?: (next: {
    market_type: string;
    market_selection: string;
  }) => void;
};

const GOLD = "#D4AF37";
const GREEN = "#10b981";
const GREEN_DK = "#059669";
const ROSE = "#f43f5e";
const ROSE_DK = "#e11d48";

// ── Animated number hook ──────────────────────────────────────────
function useAnimatedNumber(value: number, duration = 600) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    const start = performance.now();
    let raf = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

// ── Skeleton ──────────────────────────────────────────────────────
function SkeletonChart() {
  return (
    <div className="space-y-3">
      <div className="h-10 w-40 rounded-xl bg-white/5 animate-pulse" />
      <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
      <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
function CandlestickChartInner({
  bsd_match_id,
  market_type,
  market_selection,
  match_name,
  onSwitchMarket,
}: Props) {
  const [row, setRow] = useState<MarketRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherMarkets, setOtherMarkets] = useState<
    { market_type: string; market_selection: string }[]
  >([]);
  const [showSwitch, setShowSwitch] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const settled = row?.status === "won" || row?.status === "lost";
  const animatedConfidence = useAnimatedNumber(row?.confidence ?? 0);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("live_market_data")
        .select(
          "bsd_match_id, market_type, market_selection, status, confidence, candles",
        )
        .eq("bsd_match_id", bsd_match_id)
        .eq("market_type", market_type)
        .eq("market_selection", market_selection)
        .maybeSingle();
      if (err) throw err;
      setRow(data as MarketRow | null);

      const { data: others } = await supabase
        .from("live_market_data")
        .select("market_type, market_selection")
        .eq("bsd_match_id", bsd_match_id)
        .eq("status", "active");
      setOtherMarkets(
        (others ?? []).filter(
          (m: any) =>
            !(
              m.market_type === market_type &&
              m.market_selection === market_selection
            ),
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to load market");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [bsd_match_id, market_type, market_selection]);

  // Real‑time subscription
  useEffect(() => {
    if (settled) return;

    const channel = supabase
      .channel(`market-${bsd_match_id}-${market_type}-${market_selection}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_market_data",
          filter: `bsd_match_id=eq.${bsd_match_id}`,
        },
        (payload: any) => {
          const n = payload.new as MarketRow;
          if (
            n.market_type === market_type &&
            n.market_selection === market_selection
          ) {
            setRow((prev) => ({ ...(prev ?? n), ...n }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [bsd_match_id, market_type, market_selection, settled]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const candles = useMemo<Candle[]>(() => {
    const list = (row?.candles ?? []).filter(
      (c) => c.minute >= 0 && c.minute <= 90,
    );
    return list.sort((a, b) => a.minute - b.minute);
  }, [row]);

  const currentMinute = candles.length
    ? candles[candles.length - 1].minute
    : -1;

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6">
        <SkeletonChart />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
        <p className="text-rose-300 mb-4">
          Unable to load market data. Please try again.
        </p>
        <button
          onClick={fetchAll}
          className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-sm font-medium hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!row || candles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-10 text-center">
        <p className="text-white/70">
          This market hasn't started yet. Data will appear once the match
          kicks off.
        </p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // Custom chart that overlays real SVG candles on Recharts scaffold
  // ══════════════════════════════════════════════════════════════
  const CHART_WIDTH = 640;
  const CHART_HEIGHT = 288;
  const MARGIN = { top: 10, right: 16, left: 0, bottom: 10 };
  const PLOT_W = CHART_WIDTH - MARGIN.left - MARGIN.right;
  const PLOT_H = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

  // Scale functions
  const scaleX = (minute: number) =>
    MARGIN.left + (minute / 90) * PLOT_W;
  const scaleY = (value: number) =>
    MARGIN.top + PLOT_H - (value / 100) * PLOT_H;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 space-y-4 h-fit">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40">
            Match
          </p>
          <p className="text-white font-semibold">{match_name}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40">
            Market
          </p>
          <p className="text-white">{market_type}</p>
          <p className="text-[#D4AF37] text-sm">{market_selection}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40">
            Confidence
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {animatedConfidence.toFixed(1)}%
          </p>
        </div>
        <div className="pt-2 border-t border-white/10">
          <button
            disabled={cooldown > 0 || otherMarkets.length === 0}
            onClick={() => setShowSwitch((v) => !v)}
            className="w-full px-3 py-2 rounded-xl bg-[#3b82f6] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
          >
            {cooldown > 0
              ? `Switch available in ${cooldown}s`
              : "Switch Market"}
          </button>
          <AnimatePresence>
            {showSwitch && cooldown === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0a0a0e]"
              >
                {otherMarkets.map((m, i) => (
                  <button
                    key={`${m.market_type}-${m.market_selection}-${i}`}
                    onClick={() => {
                      setShowSwitch(false);
                      setCooldown(30);
                      onSwitchMarket?.(m);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white">{m.market_type}</span>{" "}
                    <span className="text-[#D4AF37]">
                      {m.market_selection}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* ── Chart ──────────────────────────────────────────────── */}
      <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4">
        <div className="flex items-baseline justify-between mb-3 px-2">
          <h3 className="text-white font-semibold">
            Market Confidence · 90′
          </h3>
          <motion.span
            key={Math.round(animatedConfidence)}
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold text-[#D4AF37]"
            style={{
              textShadow: `0 0 14px rgba(212,175,55,0.45)`,
            }}
          >
            {animatedConfidence.toFixed(0)}%
          </motion.span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px] h-72 relative">
            {/* Hidden Recharts chart (provides axis + grid) */}
            <div className="absolute inset-0 opacity-0 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={candles}
                  margin={MARGIN}
                >
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="minute"
                    type="number"
                    domain={[0, 90]}
                    ticks={[0, 15, 30, 45, 60, 75, 90]}
                  />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hand‑drawn SVG overlay */}
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((v) => (
                <line
                  key={v}
                  x1={MARGIN.left}
                  x2={CHART_WIDTH - MARGIN.right}
                  y1={scaleY(v)}
                  y2={scaleY(v)}
                  stroke="rgba(255,255,255,0.06)"
                />
              ))}
              {/* Win/loss line */}
              <line
                x1={MARGIN.left}
                x2={CHART_WIDTH - MARGIN.right}
                y1={scaleY(50)}
                y2={scaleY(50)}
                stroke="rgba(255,255,255,0.4)"
                strokeDasharray="4 4"
              />
              {/* Glow areas */}
              <rect
                x={MARGIN.left}
                y={scaleY(100)}
                width={PLOT_W}
                height={scaleY(50) - scaleY(100)}
                fill="url(#aboveGlow)"
              />
              <rect
                x={MARGIN.left}
                y={scaleY(50)}
                width={PLOT_W}
                height={scaleY(0) - scaleY(50)}
                fill="url(#belowGlow)"
              />
              {/* Axis labels */}
              {[0, 15, 30, 45, 60, 75, 90].map((m) => (
                <text
                  key={m}
                  x={scaleX(m)}
                  y={CHART_HEIGHT - 4}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize={12}
                >
                  {m}′
                </text>
              ))}
              {[0, 25, 50, 75, 100].map((v) => (
                <text
                  key={v}
                  x={MARGIN.left - 6}
                  y={scaleY(v) + 4}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.5)"
                  fontSize={12}
                >
                  {v}
                </text>
              ))}
              {/* Candles */}
              {candles.map((c) => {
                const x = scaleX(c.minute);
                const w = Math.max(PLOT_W / 90 / 3, 3); // ~2.3px candle width
                const yHigh = scaleY(c.high);
                const yLow = scaleY(c.low);
                const yOpen = scaleY(c.open);
                const yClose = scaleY(c.close);
                const yBody = Math.min(yOpen, yClose);
                const bodyH = Math.max(Math.abs(yClose - yOpen), 2);
                const isUp = c.close > c.open;
                const fill = isUp ? GREEN : ROSE;
                const stroke = isUp ? GREEN_DK : ROSE_DK;
                const isCurrent = c.minute === currentMinute;

                return (
                  <g key={c.minute}>
                    <line
                      x1={x}
                      x2={x}
                      y1={yHigh}
                      y2={yLow}
                      stroke={stroke}
                      strokeWidth={1}
                    />
                    <rect
                      x={x - w / 2}
                      y={yBody}
                      width={w}
                      height={bodyH}
                      fill={fill}
                      stroke={isCurrent ? GOLD : stroke}
                      strokeWidth={isCurrent ? 2 : 1}
                      rx={1}
                      style={
                        isCurrent
                          ? { filter: `drop-shadow(0 0 6px ${GOLD})` }
                          : undefined
                      }
                    />
                  </g>
                );
              })}
              <defs>
                <linearGradient
                  id="aboveGlow"
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="belowGlow"
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop offset="0%" stopColor={ROSE} stopOpacity={0} />
                  <stop offset="100%" stopColor={ROSE} stopOpacity={0.18} />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Result overlay */}
        <AnimatePresence>
          {settled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm"
            >
              <div
                className={`px-8 py-5 rounded-2xl border text-2xl font-bold ${
                  row.status === "won"
                    ? "border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]"
                    : "border-rose-500/50 bg-rose-500/10 text-rose-400"
                }`}
                style={{
                  boxShadow:
                    row.status === "won"
                      ? "0 0 30px rgba(212,175,55,0.4)"
                      : "0 0 30px rgba(244,63,94,0.35)",
                }}
              >
                {row.status === "won" ? "Market Won ✅" : "Market Lost ❌"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const CandlestickChart = memo(CandlestickChartInner);
export default CandlestickChart;