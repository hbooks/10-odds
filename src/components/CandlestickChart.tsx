import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, TrendingUp } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type Candle = { minute: number; open: number; high: number; low: number; close: number };
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
  onClose?: () => void; // new close button
};

const GOLD = "#D4AF37";
const GREEN = "#10b981";
const GREEN_DK = "#059669";
const ROSE = "#f43f5e";
const ROSE_DK = "#e11d48";

function SkeletonChart() {
  return (
    <div className="space-y-3">
      <div className="h-10 w-40 rounded-xl bg-white/5 animate-pulse" />
      <div className="h-80 rounded-2xl bg-white/5 animate-pulse" />
    </div>
  );
}

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
      if (p < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

function CandlestickChartInner({ bsd_match_id, market_type, market_selection, match_name, onClose }: Props) {
  const [row, setRow] = useState<MarketRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("live_market_data")
        .select("bsd_match_id, market_type, market_selection, status, confidence, candles")
        .eq("bsd_match_id", bsd_match_id)
        .eq("market_type", market_type)
        .eq("market_selection", market_selection)
        .maybeSingle();
      if (err) throw err;
      setRow(data as MarketRow | null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load market");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [bsd_match_id, market_type, market_selection]);

  useEffect(() => {
    if (!row || row.status !== "active") return;
    const channel = supabase
      .channel(`chart-${bsd_match_id}-${market_type}-${market_selection}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_market_data", filter: `bsd_match_id=eq.${bsd_match_id}` }, (payload: any) => {
        const n = payload.new as MarketRow;
        if (n.market_type === market_type && n.market_selection === market_selection) {
          setRow(prev => ({ ...(prev ?? n), ...n }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [row?.status]);

  const candles = useMemo(() => {
    return ((row?.candles ?? []) as Candle[]).filter(c => c.minute >= 0 && c.minute <= 90).sort((a, b) => a.minute - b.minute);
  }, [row]);

  const animatedConfidence = useAnimatedNumber(row?.confidence ?? 0);
  const settled = row?.status === "won" || row?.status === "lost";
  const currentMinute = candles.length ? candles[candles.length - 1].minute : -1;

  if (loading) return <SkeletonChart />;
  if (error) return <div className="text-center py-10 text-rose-400">{error} <button onClick={fetchAll} className="ml-2 underline">Retry</button></div>;
  if (!row || candles.length === 0) return <div className="text-center py-10 text-white/60">Market data not yet available.</div>;

  // Chart dimensions
  const CHART_W = 800, CHART_H = 400, MARGIN = { top: 20, right: 20, bottom: 30, left: 50 };
  const PLOT_W = CHART_W - MARGIN.left - MARGIN.right;
  const PLOT_H = CHART_H - MARGIN.top - MARGIN.bottom;
  const scaleX = (min: number) => MARGIN.left + (min / 90) * PLOT_W;
  const scaleY = (val: number) => MARGIN.top + PLOT_H - (val / 100) * PLOT_H;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10"><ArrowLeft className="h-4 w-4 text-white/80" /></button>
          )}
          <h3 className="text-lg font-bold text-white">{match_name}</h3>
          <span className="text-sm text-white/50">{market_type} · {market_selection}</span>
        </div>
        <motion.div className="text-2xl font-bold text-[#D4AF37]" style={{ textShadow: `0 0 14px ${GOLD}80` }}>
          {animatedConfidence.toFixed(0)}%
        </motion.div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid and labels */}
          {[0,25,50,75,100].map(v => (
            <line key={v} x1={MARGIN.left} x2={CHART_W-MARGIN.right} y1={scaleY(v)} y2={scaleY(v)} stroke="rgba(255,255,255,0.06)" />
          ))}
          <line x1={MARGIN.left} x2={CHART_W-MARGIN.right} y1={scaleY(50)} y2={scaleY(50)} stroke="rgba(255,255,255,0.4)" strokeDasharray="4 4" />
          <text x={MARGIN.left-5} y={scaleY(50)+4} textAnchor="end" fill="white" fontSize={12}>50%</text>
          {/* Candles */}
          {candles.map(c => {
            const x = scaleX(c.minute);
            const w = Math.max(PLOT_W/90/3, 2.5);
            const yH = scaleY(c.high), yL = scaleY(c.low), yO = scaleY(c.open), yC = scaleY(c.close);
            const yB = Math.min(yO, yC);
            const bodyH = Math.max(Math.abs(yC-yO), 2);
            const isUp = c.close > c.open;
            const fill = isUp ? GREEN : ROSE;
            const stroke = isUp ? GREEN_DK : ROSE_DK;
            const isCurrent = c.minute === currentMinute;
            return (
              <g key={c.minute}>
                <line x1={x} x2={x} y1={yH} y2={yL} stroke={stroke} strokeWidth={1} />
                <rect x={x - w/2} y={yB} width={w} height={bodyH} fill={fill} stroke={isCurrent ? GOLD : stroke} strokeWidth={isCurrent ? 2 : 1} rx={1} />
              </g>
            );
          })}
          {/* Halftime line */}
          <line x1={scaleX(45)} x2={scaleX(45)} y1={MARGIN.top} y2={CHART_H-MARGIN.bottom} stroke="rgba(255,255,255,0.3)" strokeDasharray="2 2" />
          <text x={scaleX(45)} y={CHART_H-5} textAnchor="middle" fill="white" fontSize={10}>HT</text>
          {/* Axes labels */}
          {[0,15,30,45,60,75,90].map(m => <text key={m} x={scaleX(m)} y={CHART_H-5} textAnchor="middle" fill="white" fontSize={10}>{m}′</text>)}
        </svg>
      </div>

      <AnimatePresence>
        {settled && (
          <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl backdrop-blur-sm">
            <div className={`px-8 py-5 rounded-2xl border text-2xl font-bold ${row.status==="won" ? "border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]" : "border-rose-500/50 bg-rose-500/10 text-rose-400"}`}>
              {row.status === "won" ? "Market Won ✅" : "Market Lost ❌"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const CandlestickChart = memo(CandlestickChartInner);
export default CandlestickChart;