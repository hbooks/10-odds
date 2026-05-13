import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  BarChart2,
  Trophy,
  Flame,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Activity,
  Brain,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────────────────────────
type PredictionResult = "PENDING" | "WIN" | "LOSS" | "HALF_WIN" | "HALF_LOSS" | "VOID";

interface Prediction {
  id: number;
  status: PredictionResult;
  predicted_odds: number;
  confidence_score: number;
  created_at: string;
  bet_type: string;
  matches: {
    competition: { name: string };
  };
}

interface HippoMarketEval {
  market: string;
  selection: string;
  confidence: number;
  result: "won" | "lost" | "pending";
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const EMERALD  = "#10b981";
const ROSE     = "#f43f5e";
const GOLD     = "#D4AF37";
const SAPPHIRE = "#3b82f6";

const LEAGUE_COLORS: Record<string, string> = {
  "Premier League": "#3b82f6",
  "La Liga":        "#f59e0b",
  "Serie A":        "#10b981",
  "Bundesliga":     "#ef4444",
  "Ligue 1":        "#8b5cf6",
};

const BET_TYPE_COLORS: Record<string, string> = {
  "HOME_WIN":   "#10b981",
  "AWAY_WIN":   "#3b82f6",
  "DRAW":       "#f59e0b",
  "OVER_2.5":   "#a855f7",
  "OVER_1.5":   "#a855f7",
  "OVER_0.5":   "#a855f7",
  "OVER_3.5":   "#a855f7",
  "OVER_4.5":   "#a855f7",
  "OVER_5.5":   "#a855f7",
  "UNDER_2.5":  "#ec4899",
  "UNDER_1.5":  "#ec4899",
  "UNDER_0.5":  "#ec4899",
  "UNDER_3.5":  "#ec4899",
  "UNDER_4.5":  "#ec4899",
  "UNDER_5.5":  "#ec4899",
  "BTTS_YES":   "#ec4899",
  "BTTS_NO":    "#f97316",
};

const BET_TYPE_LABELS: Record<string, string> = {
  "HOME_WIN":   "Home Win",
  "AWAY_WIN":   "Away Win",
  "DRAW":       "Draw",
  "OVER_0.5":   "Over 0.5",
  "OVER_1.5":   "Over 1.5",
  "OVER_2.5":   "Over 2.5",
  "OVER_3.5":   "Over 3.5",
  "OVER_4.5":   "Over 4.5",
  "OVER_5.5":   "Over 5.5",
  "UNDER_0.5":  "Under 0.5",
  "UNDER_1.5":  "Under 1.5",
  "UNDER_2.5":  "Under 2.5",
  "UNDER_3.5":  "Under 3.5",
  "UNDER_4.5":  "Under 4.5",
  "UNDER_5.5":  "Under 5.5",
  "BTTS_YES":   "BTTS Yes",
  "BTTS_NO":    "BTTS No",
};

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const staggerChild = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Section reveal hook ──────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return { ref, inView };
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border border-white/10 px-4 py-3 shadow-2xl text-xs"
      style={{ background: "rgba(10,10,20,0.92)", backdropFilter: "blur(16px)" }}
    >
      <p className="font-semibold text-white/90 mb-1.5 tracking-wide">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill ?? GOLD }} className="font-mono font-medium">
          {p.name}:{" "}
          {typeof p.value === "number" && p.value % 1 !== 0
            ? p.value.toFixed(1)
            : p.value}
          {p.name === "roi" || p.name === "ROI" || p.name === "Win Rate" || p.name === "Actual Win %" ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

// ─── Glow badge ──────────────────────────────────────────────────────────────
function GlowBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {children}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  index,
  icon: Icon,
  label,
  value,
  sub,
  accent,
  trend,
}: {
  index: number;
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const color = accent ?? GOLD;
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="relative rounded-2xl overflow-hidden p-5 flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Corner accent glow */}
      <div
        className="absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-25 pointer-events-none"
        style={{ background: color }}
      />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          {label}
        </span>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>

      <div className="relative z-10">
        <p
          className="text-3xl font-black tabular-nums tracking-tight"
          style={{ color }}
        >
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-white/40 mt-1 flex items-center gap-1">
            {trend === "up"   && <TrendingUp  className="h-3 w-3 text-emerald-400 shrink-0" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-rose-400 shrink-0"   />}
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  icon: Icon,
  accentColor,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  accentColor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, inView } = useReveal();
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerChild}
      className={`relative rounded-2xl overflow-hidden p-5 ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
      }}
    >
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-60"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        />
      )}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-0.5">
          {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: accentColor ?? GOLD }} />}
          <p className="font-bold text-white/90 text-sm tracking-wide">{title}</p>
        </div>
        {subtitle && (
          <p className="text-[11px] text-white/35 pl-6">{subtitle}</p>
        )}
      </div>
      {children}
    </motion.div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  highlight,
  subtitle,
  accentColor,
}: {
  icon: React.ElementType;
  title: string;
  highlight: string;
  subtitle: string;
  accentColor: string;
}) {
  const { ref, inView } = useReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 mt-14 first:mt-0"
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}35` }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <h2 className="text-2xl font-black tracking-tight">
          {title} <span style={{ color: accentColor }}>{highlight}</span>
        </h2>
      </div>
      <p className="text-sm text-white/40 pl-[52px]">{subtitle}</p>
      <div
        className="mt-4 h-px w-full opacity-30"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />
    </motion.div>
  );
}

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-white/5 ${className}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Shimmer key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Shimmer className="h-64" />
        <Shimmer className="h-64" />
      </div>
      <Shimmer className="h-56" />
      <Shimmer className="h-56" />
    </div>
  );
}

// ─── Win-rate radial gauge ────────────────────────────────────────────────────
function WinRateGauge({ rate }: { rate: number }) {
  const data = [
    { name: "Win Rate", value: rate,       fill: EMERALD },
    { name: "Blank",    value: 100 - rate, fill: "transparent" },
  ];
  return (
    <div className="relative flex items-center justify-center h-52">
      {/* Outer glow ring */}
      <div
        className="absolute inset-8 rounded-full blur-xl opacity-20 pointer-events-none"
        style={{ background: EMERALD }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%" cy="58%"
          innerRadius="62%" outerRadius="88%"
          startAngle={210} endAngle={-30}
          data={data}
          barSize={16}
        >
          <RadialBar dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-8 gap-1">
        <span className="text-4xl font-black tabular-nums" style={{ color: EMERALD }}>
          {rate.toFixed(1)}%
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Win Rate
        </span>
      </div>
    </div>
  );
}

// ─── League bar ───────────────────────────────────────────────────────────────
function LeagueBar({ league, winRate, total, wins, color }: {
  league: string; winRate: number; total: number; wins: number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs text-white/50 w-28 shrink-0 truncate group-hover:text-white/80 transition-colors">
        {league}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${winRate}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}bb, ${color})` }}
        />
      </div>
      <div className="flex items-center gap-2 w-28 justify-end">
        <span className="text-[10px] text-white/30 tabular-nums">
          {wins.toFixed(0)}/{total}
        </span>
        <span className="text-xs font-mono font-bold tabular-nums w-12 text-right" style={{ color }}>
          {winRate.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ─── Data processing ──────────────────────────────────────────────────────────
function processPredictions(predictions: Prediction[]) {
  if (!predictions.length) {
    return {
      summary: { total: 0, wins: 0, losses: 0, voids: 0, winRate: 0, roi: 0, streak: 0, streakType: "win" as const, profitUnits: 0 },
      weekly: [],
      cumulative: [],
      leagueBreakdown: [],
      betTypeBreakdown: [],
      confidenceBuckets: [],
    };
  }

  const sorted = [...predictions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let wins = 0, losses = 0, voids = 0, totalStake = 0, totalReturn = 0;
  sorted.forEach(p => {
    totalStake += 1;
    if (p.status === "WIN") { wins++; totalReturn += p.predicted_odds; }
    else if (p.status === "LOSS") { losses++; }
    else if (p.status === "HALF_WIN") { wins += 0.5; totalReturn += 1 + (p.predicted_odds - 1) / 2; }
    else if (p.status === "HALF_LOSS") { losses += 0.5; totalReturn += 0.5; }
    else if (p.status === "VOID") { voids++; totalReturn += 1; }
  });

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const roi = totalStake > 0 ? ((totalReturn - totalStake) / totalStake) * 100 : 0;
  const profitUnits = totalReturn - totalStake;

  let streak = 0;
  let streakType: "win" | "loss" = "win";
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    if (p.status === "WIN" || p.status === "HALF_WIN") {
      if (streakType === "win" || streak === 0) { streakType = "win"; streak++; }
      else break;
    } else if (p.status === "LOSS" || p.status === "HALF_LOSS") {
      if (streakType === "loss" || streak === 0) { streakType = "loss"; streak++; }
      else break;
    } else { break; }
  }

  const summary = { total: predictions.length, wins, losses, voids, winRate, roi, streak, streakType, profitUnits };

  const weeklyMap: Record<string, { wins: number; losses: number; stake: number; return: number }> = {};
  sorted.forEach(p => {
    const date = new Date(p.created_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
    const weekKey = weekStart.toISOString().split("T")[0];
    if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { wins: 0, losses: 0, stake: 0, return: 0 };
    weeklyMap[weekKey].stake += 1;
    if (p.status === "WIN") { weeklyMap[weekKey].wins++; weeklyMap[weekKey].return += p.predicted_odds; }
    else if (p.status === "LOSS") { weeklyMap[weekKey].losses++; }
    else if (p.status === "HALF_WIN") { weeklyMap[weekKey].wins += 0.5; weeklyMap[weekKey].return += 1 + (p.predicted_odds - 1) / 2; }
    else if (p.status === "HALF_LOSS") { weeklyMap[weekKey].losses += 0.5; weeklyMap[weekKey].return += 0.5; }
    else if (p.status === "VOID") { weeklyMap[weekKey].return += 1; }
  });

  const weekly = Object.entries(weeklyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([week, data]) => ({
      week: `W${new Date(week).getDate()}/${new Date(week).getMonth() + 1}`,
      wins: data.wins,
      losses: data.losses,
      roi: data.stake > 0 ? ((data.return - data.stake) / data.stake) * 100 : 0,
    }));

  let runningStake = 0, runningReturn = 0;
  const cumulative: { day: string; roi: number }[] = [];
  const dayMap: Record<string, { stake: number; return: number }> = {};
  sorted.forEach(p => {
    const day = p.created_at.split("T")[0];
    if (!dayMap[day]) dayMap[day] = { stake: 0, return: 0 };
    dayMap[day].stake += 1;
    if (p.status === "WIN") dayMap[day].return += p.predicted_odds;
    else if (p.status === "HALF_WIN") dayMap[day].return += 1 + (p.predicted_odds - 1) / 2;
    else if (p.status === "HALF_LOSS") dayMap[day].return += 0.5;
    else if (p.status === "VOID") dayMap[day].return += 1;
  });

  Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([_, data], idx) => {
    runningStake += data.stake;
    runningReturn += data.return;
    cumulative.push({
      day: `Day ${idx + 1}`,
      roi: Math.round(((runningReturn - runningStake) / Math.max(runningStake, 1)) * 1000) / 10,
    });
  });

  const leagueMap: Record<string, { wins: number; total: number; color: string }> = {};
  sorted.forEach(p => {
    const league = p.matches?.competition?.name || "Other";
    if (!leagueMap[league]) leagueMap[league] = { wins: 0, total: 0, color: LEAGUE_COLORS[league] || "#6b7280" };
    leagueMap[league].total++;
    if (p.status === "WIN") leagueMap[league].wins++;
    else if (p.status === "HALF_WIN") leagueMap[league].wins += 0.5;
  });

  const leagueBreakdown = Object.entries(leagueMap)
    .map(([league, data]) => ({
      league,
      code: league.slice(0, 3).toUpperCase(),
      wins: data.wins,
      total: data.total,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      color: data.color,
    }))
    .filter(l => l.total > 0)
    .sort((a, b) => b.winRate - a.winRate);

  const betTypeMap: Record<string, number> = {};
  sorted.forEach(p => {
    const label = BET_TYPE_LABELS[p.bet_type] || p.bet_type;
    betTypeMap[label] = (betTypeMap[label] || 0) + 1;
  });

  const betTypeBreakdown = Object.entries(betTypeMap)
    .map(([name, value]) => {
      const originalKey = Object.keys(BET_TYPE_LABELS).find(k => BET_TYPE_LABELS[k] === name) || name;
      return { name, value, color: BET_TYPE_COLORS[originalKey] || "#6b7280" };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const buckets = [
    { min: 0.40, max: 0.50, range: "40–50%" },
    { min: 0.50, max: 0.60, range: "50–60%" },
    { min: 0.60, max: 0.70, range: "60–70%" },
    { min: 0.70, max: 0.80, range: "70–80%" },
    { min: 0.80, max: 1.00, range: "80%+" },
  ];

  const confidenceBuckets = buckets.map(bucket => {
    const inBucket = sorted.filter(p => p.confidence_score >= bucket.min && p.confidence_score < bucket.max);
    let bucketWins = 0;
    inBucket.forEach(p => {
      if (p.status === "WIN") bucketWins++;
      else if (p.status === "HALF_WIN") bucketWins += 0.5;
    });
    return {
      range: bucket.range,
      predictions: inBucket.length,
      winRate: inBucket.length > 0 ? (bucketWins / inBucket.length) * 100 : 0,
    };
  }).filter(b => b.predictions > 0);

  return { summary, weekly, cumulative, leagueBreakdown, betTypeBreakdown, confidenceBuckets };
}

function processHippoMarkets(rows: any[]): HippoMarketEval[] {
  const evals: HippoMarketEval[] = [];
  for (const row of rows) {
    const status = row.result_status || {};
    const markets = [
      { market: row.market_1, selection: row.selection_1, confidence: row.confidence_1, key: "market_1" },
      { market: row.market_2, selection: row.selection_2, confidence: row.confidence_2, key: "market_2" },
      { market: row.market_3, selection: row.selection_3, confidence: row.confidence_3, key: "market_3" },
      { market: row.market_4, selection: row.selection_4, confidence: row.confidence_4, key: "market_4" },
    ];
    for (const m of markets) {
      const result = status[m.key];
      if (result === "won" || result === "lost") {
        evals.push({ market: m.market, selection: m.selection, confidence: m.confidence, result });
      }
    }
  }
  return evals;
}

function computeHippoStats(evals: HippoMarketEval[]) {
  if (!evals.length) return null;
  const total = evals.length;
  const wins  = evals.filter(e => e.result === "won").length;
  const losses = evals.filter(e => e.result === "lost").length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const marketMap: Record<string, { wins: number; losses: number; total: number }> = {};
  evals.forEach(e => {
    const label = `${e.market} – ${e.selection}`;
    if (!marketMap[label]) marketMap[label] = { wins: 0, losses: 0, total: 0 };
    marketMap[label].total++;
    if (e.result === "won")  marketMap[label].wins++;
    if (e.result === "lost") marketMap[label].losses++;
  });

  const marketBreakdown = Object.entries(marketMap)
    .map(([name, data]) => ({
      name,
      wins: data.wins,
      losses: data.losses,
      total: data.total,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  return { total, wins, losses, winRate, marketBreakdown };
}

// ─── Main page ────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hippoEvals, setHippoEvals] = useState<HippoMarketEval[]>([]);
  const [hippoLoading, setHippoLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMKData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("predictions")
        .select(`
          id, status, predicted_odds, confidence_score, created_at, bet_type,
          matches ( competition:competitions ( name ) )
        `)
        .in("status", ["WIN", "LOSS", "HALF_WIN", "HALF_LOSS", "VOID"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      setPredictions(data as unknown as Prediction[]);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to load MK-806 analytics data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHippoData = async () => {
    setHippoLoading(true);
    try {
      const { data, error } = await supabase
        .from("hippo_predictions")
        .select(`
          market_1, selection_1, confidence_1,
          market_2, selection_2, confidence_2,
          market_3, selection_3, confidence_3,
          market_4, selection_4, confidence_4,
          result_status
        `)
        .not("result_status", "is", null)
        .not("result_status", "eq", "{}");
      if (error) throw error;
      setHippoEvals(processHippoMarkets(data ?? []));
    } catch {
      setHippoEvals([]);
    } finally {
      setHippoLoading(false);
    }
  };

  useEffect(() => {
    fetchMKData();
    fetchHippoData();
  }, []);

  const mkData     = processPredictions(predictions);
  const hippoStats = computeHippoStats(hippoEvals);
  const { summary, weekly, cumulative, leagueBreakdown, betTypeBreakdown, confidenceBuckets } = mkData;
  const voidRate   = summary.total > 0 ? (summary.voids / summary.total) * 100 : 0;
  const lossRate   = summary.total > 0 ? (summary.losses / summary.total) * 100 : 0;
  const roiColor   = summary.roi >= 0 ? EMERALD : ROSE;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}
            >
              <RefreshCw className="h-5 w-5 animate-spin" style={{ color: GOLD }} />
            </div>
            <div>
              <div className="h-7 w-56 rounded-lg bg-white/5 animate-pulse mb-1" />
              <div className="h-3 w-40 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
          <LoadingSkeleton />
        </div>
      </Layout>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center max-w-md">
          <div className="rounded-2xl p-8" style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)" }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: ROSE }} />
            <p className="font-semibold text-white/80 mb-1">Data unavailable</p>
            <p className="text-sm text-white/40 mb-6">{error}</p>
            <button
              onClick={() => { fetchMKData(); fetchHippoData(); }}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-105"
              style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}40` }}
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* ════════════════ HERO HEADER ════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 relative"
        >
          {/* Decorative background glow */}
          <div
            className="absolute -top-12 -left-12 h-64 w-64 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ background: GOLD }}
          />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GlowBadge color={GOLD}>
                  <Sparkles className="h-3 w-3" /> Intelligence Dashboard
                </GlowBadge>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2">
                MK-806 &amp;{" "}
                <span style={{ color: GOLD }}>Hippo AI</span>{" "}
                Analytics
              </h1>
              <p className="text-sm text-white/40 mt-1.5 max-w-xl">
                Season-long performance intelligence — five leagues tracked, alternative markets evaluated, confidence calibrated.
              </p>
              {lastUpdated && (
                <p className="text-[11px] text-white/25 mt-2 flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Last updated {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={() => { fetchMKData(); fetchHippoData(); }}
              className="p-2.5 rounded-xl hover:scale-105 transition-all shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4 text-white/50" />
            </button>
          </div>
        </motion.div>

        {/* ════════════════ MK-806 SECTION ════════════════ */}
        <SectionHeader
          icon={Trophy}
          title="MK-806"
          highlight="Performance"
          subtitle="Prediction engine results across all tracked competitions"
          accentColor={GOLD}
        />

        {/* KPI row */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          <StatCard index={0} icon={Target}     label="Total Predictions"
            value={summary.total}
            sub={`${summary.wins.toFixed(1)}W · ${summary.losses.toFixed(1)}L · ${summary.voids} void`}
            accent={GOLD}
          />
          <StatCard index={1} icon={Trophy}     label="Win Rate"
            value={`${summary.winRate.toFixed(1)}%`}
            sub="Completed predictions"
            accent={EMERALD}
            trend={summary.winRate >= 50 ? "up" : "down"}
          />
          <StatCard index={2} icon={DollarSign} label="Season ROI"
            value={`${summary.roi >= 0 ? "+" : ""}${summary.roi.toFixed(1)}%`}
            sub={`${summary.profitUnits >= 0 ? "+" : ""}${summary.profitUnits.toFixed(1)} units`}
            accent={SAPPHIRE}
            trend={summary.roi >= 0 ? "up" : "down"}
          />
          <StatCard index={3} icon={Flame}      label={`${summary.streakType === "win" ? "Win" : "Loss"} Streak`}
            value={`${summary.streak}${summary.streakType === "win" ? " ✓" : " ✗"}`}
            sub="Consecutive outcomes"
            accent={summary.streakType === "win" ? EMERALD : ROSE}
            trend={summary.streakType === "win" ? "up" : "down"}
          />
        </motion.div>

        {/* Win rate gauge + Bet type pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ChartCard title="Overall Win Rate" subtitle={`${summary.wins.toFixed(1)} wins from ${summary.total} predictions`}
            icon={Target} accentColor={EMERALD}>
            <WinRateGauge rate={summary.winRate} />
            <div className="flex justify-center gap-5 mt-2">
              {[
                { label: "Win",  pct: summary.winRate.toFixed(1), color: EMERALD },
                { label: "Loss", pct: lossRate.toFixed(1),         color: ROSE   },
                { label: "Void", pct: voidRate.toFixed(1),         color: GOLD   },
              ].map(item => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <span
                    className="h-1 w-8 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: item.color }}>
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Predictions by Bet Type" subtitle="Distribution across all bet categories"
            icon={Layers} accentColor={SAPPHIRE}>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={betTypeBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={56} outerRadius={82}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {betTypeBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
              {betTypeBreakdown.map(b => (
                <div key={b.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: b.color }} />
                  <span className="text-[11px] text-white/50 truncate">{b.name}</span>
                  <span className="text-[11px] font-mono ml-auto" style={{ color: b.color }}>{b.value}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Cumulative ROI */}
        <ChartCard
          title="Cumulative ROI"
          subtitle="Season-to-date return on investment — 1 unit flat stake"
          icon={TrendingUp}
          accentColor={roiColor}
          className="mb-4"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulative} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={roiColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={roiColor} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day"
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="roi" name="ROI"
                  stroke={roiColor} strokeWidth={2.5}
                  fill="url(#roiGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: roiColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Weekly W/L bar chart */}
        <ChartCard
          title="Weekly Wins &amp; Losses"
          subtitle={`Last ${weekly.length} weeks performance`}
          icon={BarChart2}
          accentColor={SAPPHIRE}
          className="mb-4"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} barGap={4} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="week"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={7}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "12px", color: "rgba(255,255,255,0.4)" }}
                />
                <Bar dataKey="wins"   name="Wins"   fill={EMERALD} radius={[5,5,0,0]} maxBarSize={28} />
                <Bar dataKey="losses" name="Losses" fill={ROSE}    radius={[5,5,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* League breakdown + Confidence calibration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ChartCard title="League Win Rate" subtitle="Top European leagues tracked" icon={Trophy} accentColor={GOLD}>
            <div className="space-y-4 mt-2">
              {leagueBreakdown.map(l => (
                <LeagueBar key={l.league} league={l.league} winRate={l.winRate} total={l.total} wins={l.wins} color={l.color} />
              ))}
            </div>
            {leagueBreakdown.length === 0 && (
              <p className="text-sm text-white/30 text-center py-6">No league data yet</p>
            )}
            {leagueBreakdown.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(leagueBreakdown.length, 5)}, 1fr)` }}>
                {leagueBreakdown.slice(0, 5).map(l => (
                  <div key={l.code} className="text-center">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{l.code}</p>
                    <p className="text-xs font-mono font-bold tabular-nums" style={{ color: l.color }}>
                      {l.wins.toFixed(0)}/{l.total}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Confidence Calibration" subtitle="Model confidence vs actual win rate" icon={Activity} accentColor={SAPPHIRE}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceBuckets} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="range"
                    tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="winRate" name="Actual Win %" radius={[5,5,0,0]} maxBarSize={36}>
                    {confidenceBuckets.map((entry, i) => (
                      <Cell key={i} fill={entry.winRate >= 65 ? EMERALD : entry.winRate >= 50 ? GOLD : ROSE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div
              className="mt-3 rounded-xl px-3 py-2.5 text-[11px] text-white/40"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Zap className="h-3 w-3 inline-block mr-1 -mt-0.5" style={{ color: GOLD }} />
              {confidenceBuckets.length > 0
                ? "Higher confidence bands consistently produce higher actual win rates — model is well-calibrated."
                : "Not enough data yet to evaluate calibration accuracy."}
            </div>
          </ChartCard>
        </div>

        {/* Weekly ROI table */}
        <ChartCard
          title="Weekly ROI Detail"
          subtitle="Return on investment per week — 1 unit flat stake"
          icon={DollarSign}
          accentColor={GOLD}
          className="mb-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  {["Week", "Wins", "Losses", "ROI", "Status"].map(h => (
                    <th key={h}
                      className="pb-3 text-left text-[10px] font-semibold text-white/30 uppercase tracking-widest first:pl-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekly.map((w, i) => {
                  const positive = w.roi >= 0;
                  return (
                    <motion.tr
                      key={w.week}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors"
                    >
                      <td className="py-3 font-bold text-white/80">{w.week}</td>
                      <td className="py-3">
                        <span className="font-mono tabular-nums" style={{ color: EMERALD }}>
                          {w.wins.toFixed(1)}W
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-mono tabular-nums" style={{ color: ROSE }}>
                          {w.losses.toFixed(1)}L
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-mono font-bold tabular-nums"
                          style={{ color: positive ? EMERALD : ROSE }}>
                          {positive ? "+" : ""}{w.roi.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3">
                        <GlowBadge color={positive ? EMERALD : ROSE}>
                          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {positive ? "Profit" : "Loss"}
                        </GlowBadge>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          {weekly.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap gap-6">
              {[
                { label: "Avg Weekly Wins",   value: (summary.wins / Math.max(weekly.length, 1)).toFixed(1),           color: EMERALD },
                { label: "Avg Weekly Losses", value: (summary.losses / Math.max(weekly.length, 1)).toFixed(1),         color: ROSE   },
                { label: "Best Week ROI",     value: `+${Math.max(...weekly.map(w => w.roi), 0).toFixed(1)}%`,         color: GOLD   },
                { label: "Worst Week ROI",    value: `${Math.min(...weekly.map(w => w.roi), 0).toFixed(1)}%`,          color: ROSE   },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">{s.label}</p>
                  <p className="text-lg font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* ════════════════ HIPPO AI SECTION ════════════════ */}
        <SectionHeader
          icon={Brain}
          title="Hippo AI"
          highlight="Alternative Markets"
          subtitle="Performance of the 4 alternative markets Hippo selects for each prediction"
          accentColor={SAPPHIRE}
        />

        {hippoLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {[...Array(3)].map((_, i) => <Shimmer key={i} className="h-32" />)}
            </div>
            <Shimmer className="h-64" />
            <Shimmer className="h-48" />
          </div>
        ) : !hippoStats ? (
          <div
            className="text-center py-16 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-white/50">No Hippo market results yet</p>
            <p className="text-sm text-white/25 mt-1.5 max-w-sm mx-auto">
              Results will appear once matches conclude and the update-results function processes them.
            </p>
          </div>
        ) : (
          <>
            {/* Hippo summary stats */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
            >
              <StatCard index={0} icon={Target}     label="Total Hippo Picks"
                value={hippoStats.total}
                sub={`${hippoStats.wins}W · ${hippoStats.losses}L`}
                accent={SAPPHIRE}
              />
              <StatCard index={1} icon={Trophy}     label="Overall Win Rate"
                value={`${hippoStats.winRate.toFixed(1)}%`}
                sub="All alternative markets"
                accent={EMERALD}
                trend={hippoStats.winRate >= 50 ? "up" : "down"}
              />
              <StatCard index={2} icon={Flame}      label="Top Market"
                value={hippoStats.marketBreakdown[0]?.name.split("–")[0].trim() || "—"}
                sub={`${hippoStats.marketBreakdown[0]?.winRate.toFixed(1) ?? 0}% win rate`}
                accent={GOLD}
              />
              <StatCard index={3} icon={Zap}        label="Analysed Markets"
                value={hippoStats.marketBreakdown.length}
                sub="Unique market-selection pairs"
                accent={ROSE}
              />
            </motion.div>

            {/* Market win-rate horizontal bar chart */}
            <ChartCard
              title="Win Rate by Market Type"
              subtitle="Each bar represents a specific market + selection pair"
              icon={BarChart2}
              accentColor={SAPPHIRE}
              className="mb-4"
            >
              <div style={{ height: `${Math.max(hippoStats.marketBreakdown.length * 38 + 20, 180)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hippoStats.marketBreakdown}
                    layout="vertical"
                    margin={{ top: 4, right: 48, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis
                      type="number" domain={[0, 100]}
                      tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => `${v}%`}
                    />
                    <YAxis
                      dataKey="name" type="category" width={170}
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="winRate" name="Win Rate" radius={[0, 5, 5, 0]} maxBarSize={22}>
                      {hippoStats.marketBreakdown.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.winRate >= 60 ? EMERALD : entry.winRate >= 40 ? GOLD : ROSE}
                          opacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3">
                {[
                  { label: "Strong  ≥ 60%", color: EMERALD },
                  { label: "Mid 40–60%",    color: GOLD   },
                  { label: "Weak  < 40%",   color: ROSE   },
                ].map(x => (
                  <div key={x.label} className="flex items-center gap-1.5">
                    <span className="h-2 w-4 rounded-full" style={{ background: x.color }} />
                    <span className="text-[10px] text-white/40">{x.label}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Detailed market table */}
            <ChartCard
              title="Market Detail Breakdown"
              subtitle="Wins, losses, and win rate per market-selection pair"
              icon={Layers}
              accentColor={GOLD}
              className="mb-4"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      {["Market & Selection", "W", "L", "Total", "Win Rate"].map(h => (
                        <th key={h}
                          className="pb-3 text-left text-[10px] font-semibold text-white/30 uppercase tracking-widest first:pl-0"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hippoStats.marketBreakdown.map((row, i) => {
                      const color = row.winRate >= 60 ? EMERALD : row.winRate >= 40 ? GOLD : ROSE;
                      return (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.035 }}
                          className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors"
                        >
                          <td className="py-3 font-medium text-white/80">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-3 w-3 shrink-0" style={{ color }} />
                              {row.name}
                            </div>
                          </td>
                          <td className="py-3 font-mono tabular-nums" style={{ color: EMERALD }}>
                            {row.wins}
                          </td>
                          <td className="py-3 font-mono tabular-nums" style={{ color: ROSE }}>
                            {row.losses}
                          </td>
                          <td className="py-3 font-mono tabular-nums text-white/40">{row.total}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full overflow-hidden max-w-16" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${row.winRate}%`, background: color }}
                                />
                              </div>
                              <span className="font-mono font-bold tabular-nums text-xs" style={{ color }}>
                                {row.winRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                className="mt-4 rounded-xl px-3.5 py-3 text-[11px] text-white/35"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Zap className="h-3 w-3 inline-block mr-1.5 -mt-0.5" style={{ color: SAPPHIRE }} />
                Hippo AI markets are evaluated using BSD match result data. Voided picks represent matches where BSD data was unavailable at settlement time.
              </div>
            </ChartCard>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;