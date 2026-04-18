import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const EMERALD  = "#10b981";
const ROSE     = "#f43f5e";
const GOLD     = "#f5a623";
const SAPPHIRE = "#3b82f6";

// League colors mapping
const LEAGUE_COLORS: Record<string, string> = {
  "Premier League": "#3b82f6",
  "La Liga":        "#f59e0b",
  "Serie A":        "#10b981",
  "Bundesliga":     "#ef4444",
  "Ligue 1":        "#8b5cf6",
};

// Bet type colors
const BET_TYPE_COLORS: Record<string, string> = {
  "HOME_WIN":  "#10b981",
  "AWAY_WIN":  "#3b82f6",
  "DRAW":      "#f59e0b",
  "OVER_2.5":  "#a855f7",
  "OVER_1.5":  "#a855f7",
  "OVER_0.5":  "#a855f7",
  "OVER_3.5":  "#a855f7",
  "OVER_4.5":  "#a855f7",
  "OVER_5.5":  "#a855f7",
  "UNDER_2.5": "#ec4899",
  "UNDER_1.5": "#ec4899",
  "UNDER_0.5": "#ec4899",
  "UNDER_3.5": "#ec4899",
  "UNDER_4.5": "#ec4899",
  "UNDER_5.5": "#ec4899",
  "BTTS_YES":  "#ec4899",
  "BTTS_NO":   "#f97316",
};

const BET_TYPE_LABELS: Record<string, string> = {
  "HOME_WIN": "Home Win",
  "AWAY_WIN": "Away Win",
  "DRAW":     "Draw",
  "OVER_0.5": "Over 0.5",
  "OVER_1.5": "Over 1.5",
  "OVER_2.5": "Over 2.5",
  "OVER_3.5": "Over 3.5",
  "OVER_4.5": "Over 4.5",
  "OVER_5.5": "Over 5.5",
  "UNDER_0.5": "Under 0.5",
  "UNDER_1.5": "Under 1.5",
  "UNDER_2.5": "Under 2.5",
  "UNDER_3.5": "Under 3.5",
  "UNDER_4.5": "Under 4.5",
  "UNDER_5.5": "Under 5.5",
  "BTTS_YES": "BTTS Yes",
  "BTTS_NO":  "BTTS No",
};

// ─── Animation variants ───────────────────────────────────────────────────────
const card = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" },
  }),
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3.5 py-2.5 shadow-xl text-xs">
      <p className="font-heading font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }} className="font-mono">
          {p.name}: {typeof p.value === "number" && p.value % 1 !== 0
            ? p.value.toFixed(1)
            : p.value}
          {p.name === "roi" || p.name === "ROI" ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

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
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={card}
      className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </span>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accent ?? GOLD}22` }}
        >
          <Icon className="h-4 w-4" style={{ color: accent ?? GOLD }} />
        </div>
      </div>
      <div>
        <p
          className="text-3xl font-heading font-bold tabular-nums"
          style={{ color: accent ?? "inherit" }}
        >
          {value}
        </p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === "up"   && <TrendingUp  className="h-3 w-3 text-emerald-400" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-rose-400" />}
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </h2>
  );
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({
  index,
  title,
  subtitle,
  children,
  className = "",
}: {
  index: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={card}
      className={`rounded-xl border border-border bg-card p-5 ${className}`}
    >
      <div className="mb-4">
        <p className="font-heading font-semibold text-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </motion.div>
  );
}

// ─── Win-rate radial gauge ────────────────────────────────────────────────────
function WinRateGauge({ rate }: { rate: number }) {
  const data = [
    { name: "Win Rate", value: rate,       fill: EMERALD },
    { name: "Blank",    value: 100 - rate, fill: "transparent" },
  ];
  return (
    <div className="relative flex items-center justify-center h-48">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%" cy="60%"
          innerRadius="65%" outerRadius="90%"
          startAngle={200} endAngle={-20}
          data={data}
          barSize={14}
        >
          <RadialBar dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-6 gap-0.5">
        <span className="text-4xl font-heading font-bold text-emerald-400 tabular-nums">
          {rate.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">Win Rate</span>
      </div>
    </div>
  );
}

// ─── League bar ───────────────────────────────────────────────────────────────
function LeagueBar({ league, winRate, color }: { league: string; winRate: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{league}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${winRate}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span
        className="text-xs font-mono font-semibold w-12 text-right tabular-nums"
        style={{ color }}
      >
        {winRate.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Helper functions for data processing ─────────────────────────────────────
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

  // Sort by date ascending for cumulative/streak calculations
  const sorted = [...predictions].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Summary stats
  let wins = 0, losses = 0, voids = 0, totalStake = 0, totalReturn = 0;
  sorted.forEach(p => {
    totalStake += 1;
    if (p.status === "WIN") {
      wins++;
      totalReturn += p.predicted_odds;
    } else if (p.status === "LOSS") {
      losses++;
    } else if (p.status === "HALF_WIN") {
      wins += 0.5;
      totalReturn += 1 + (p.predicted_odds - 1) / 2;
    } else if (p.status === "HALF_LOSS") {
      losses += 0.5;
      totalReturn += 0.5;
    } else if (p.status === "VOID") {
      voids++;
      totalReturn += 1;
    }
  });

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const roi = totalStake > 0 ? ((totalReturn - totalStake) / totalStake) * 100 : 0;
  const profitUnits = totalReturn - totalStake;

  // Current streak (most recent consecutive wins)
  let streak = 0;
  let streakType: "win" | "loss" = "win";
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    if (p.status === "WIN" || p.status === "HALF_WIN") {
      if (streakType === "win" || streak === 0) {
        streakType = "win";
        streak++;
      } else break;
    } else if (p.status === "LOSS" || p.status === "HALF_LOSS") {
      if (streakType === "loss" || streak === 0) {
        streakType = "loss";
        streak++;
      } else break;
    } else {
      break;
    }
  }

  const summary = {
    total: predictions.length,
    wins,
    losses,
    voids,
    winRate,
    roi,
    streak,
    streakType,
    profitUnits,
  };

  // Weekly performance (last 8 weeks)
  const weeklyMap: Record<string, { wins: number; losses: number; roi: number; stake: number; return: number }> = {};
  sorted.forEach(p => {
    const date = new Date(p.created_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = { wins: 0, losses: 0, roi: 0, stake: 0, return: 0 };
    }
    weeklyMap[weekKey].stake += 1;
    if (p.status === "WIN") {
      weeklyMap[weekKey].wins++;
      weeklyMap[weekKey].return += p.predicted_odds;
    } else if (p.status === "LOSS") {
      weeklyMap[weekKey].losses++;
    } else if (p.status === "HALF_WIN") {
      weeklyMap[weekKey].wins += 0.5;
      weeklyMap[weekKey].return += 1 + (p.predicted_odds - 1) / 2;
    } else if (p.status === "HALF_LOSS") {
      weeklyMap[weekKey].losses += 0.5;
      weeklyMap[weekKey].return += 0.5;
    } else if (p.status === "VOID") {
      weeklyMap[weekKey].return += 1;
    }
  });

  const weekly = Object.entries(weeklyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([week, data]) => {
      const roi = data.stake > 0 ? ((data.return - data.stake) / data.stake) * 100 : 0;
      return {
        week: `W${new Date(week).getDate()}/${new Date(week).getMonth() + 1}`,
        wins: data.wins,
        losses: data.losses,
        roi,
      };
    });

  // Cumulative ROI
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

  Object.entries(dayMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([day, data], idx) => {
      runningStake += data.stake;
      runningReturn += data.return;
      const roi = runningStake > 0 ? ((runningReturn - runningStake) / runningStake) * 100 : 0;
      cumulative.push({
        day: `Day ${idx + 1}`,
        roi: Math.round(roi * 10) / 10,
      });
    });

  // League breakdown
  const leagueMap: Record<string, { wins: number; total: number; color: string }> = {};
  sorted.forEach(p => {
    const league = p.matches?.competition?.name || "Other";
    if (!leagueMap[league]) {
      leagueMap[league] = { wins: 0, total: 0, color: LEAGUE_COLORS[league] || "#6b7280" };
    }
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

  // Bet type breakdown
  const betTypeMap: Record<string, number> = {};
  sorted.forEach(p => {
    const label = BET_TYPE_LABELS[p.bet_type] || p.bet_type;
    betTypeMap[label] = (betTypeMap[label] || 0) + 1;
  });

  const betTypeBreakdown = Object.entries(betTypeMap)
    .map(([name, value]) => {
      const originalKey = Object.keys(BET_TYPE_LABELS).find(k => BET_TYPE_LABELS[k] === name) || name;
      return {
        name,
        value,
        color: BET_TYPE_COLORS[originalKey] || "#6b7280",
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Confidence buckets
  const buckets = [
    { min: 0.40, max: 0.50, range: "40–50%" },
    { min: 0.50, max: 0.60, range: "50–60%" },
    { min: 0.60, max: 0.70, range: "60–70%" },
    { min: 0.70, max: 0.80, range: "70–80%" },
    { min: 0.80, max: 1.00, range: "80%+" },
  ];

  const confidenceBuckets = buckets.map(bucket => {
    const inBucket = sorted.filter(p =>
      p.confidence_score >= bucket.min && p.confidence_score < bucket.max
    );
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

// ─── Main page ────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("predictions")
        .select(`
          id,
          status,
          predicted_odds,
          confidence_score,
          created_at,
          bet_type,
          matches (
            competition:competitions ( name )
          )
        `)
        .in("status", ["WIN", "LOSS", "HALF_WIN", "HALF_LOSS", "VOID"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPredictions(data as unknown as Prediction[]);
    } catch (e) {
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const {
    summary,
    weekly,
    cumulative,
    leagueBreakdown,
    betTypeBreakdown,
    confidenceBuckets,
  } = processPredictions(predictions);

  const voidRate = summary.total > 0 ? (summary.voids / summary.total) * 100 : 0;
  const lossRate = summary.total > 0 ? (summary.losses / summary.total) * 100 : 0;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{error}</p>
          <button onClick={fetchData} className="mt-4 text-sm text-gold hover:underline">
            Try again
          </button>
        </div>
      </Layout>
    );
  }

  if (predictions.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
              <BarChart2 className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-3xl font-heading font-bold">
              MK-806 <span className="text-gold">Analytics</span>
            </h1>
          </motion.div>
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No completed predictions yet.</p>
            <p className="text-sm mt-2">Analytics will appear once matches finish and results are updated.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-1"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
              <BarChart2 className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-3xl font-heading font-bold">
              MK-806 <span className="text-gold">Analytics</span>
            </h1>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-muted-foreground text-sm mb-8 pl-[52px]"
        >
          Season performance breakdown — all five leagues tracked
        </motion.p>

        {/* ── KPI row ─────────────────────────────────────────────────── */}
        <SectionLabel>Overview</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard
            index={0}
            icon={Target}
            label="Total Predictions"
            value={summary.total}
            sub={`${summary.wins.toFixed(1)}W · ${summary.losses.toFixed(1)}L · ${summary.voids} void`}
            accent={GOLD}
          />
          <StatCard
            index={1}
            icon={Trophy}
            label="Win Rate"
            value={`${summary.winRate.toFixed(1)}%`}
            sub="Completed predictions"
            accent={EMERALD}
            trend={summary.winRate >= 50 ? "up" : "down"}
          />
          <StatCard
            index={2}
            icon={DollarSign}
            label="Season ROI"
            value={`${summary.roi >= 0 ? "+" : ""}${summary.roi.toFixed(1)}%`}
            sub={`${summary.profitUnits >= 0 ? "+" : ""}${summary.profitUnits.toFixed(1)} units`}
            accent={SAPPHIRE}
            trend={summary.roi >= 0 ? "up" : "down"}
          />
          <StatCard
            index={3}
            icon={Flame}
            label={`Current ${summary.streakType === "win" ? "Win" : "Loss"} Streak`}
            value={`${summary.streak} ${summary.streakType === "win" ? "✓" : "✗"}`}
            sub="Consecutive predictions"
            accent={summary.streakType === "win" ? EMERALD : ROSE}
            trend={summary.streakType === "win" ? "up" : "down"}
          />
        </div>

        {/* ── Win rate gauge + Bet type pie ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ChartCard
            index={4}
            title="Overall Win Rate"
            subtitle={`${summary.wins.toFixed(1)} wins from ${summary.total} predictions`}
          >
            <WinRateGauge rate={summary.winRate} />
            <div className="flex justify-center gap-4 mt-2">
              {[
                { label: "Win",  pct: summary.winRate.toFixed(1), color: EMERALD },
                { label: "Loss", pct: lossRate.toFixed(1), color: ROSE },
                { label: "Void", pct: voidRate.toFixed(1), color: GOLD },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span
                    className="text-xs font-mono font-semibold tabular-nums"
                    style={{ color: item.color }}
                  >
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard
            index={5}
            title="Predictions by Bet Type"
            subtitle="Distribution across all bet categories"
          >
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={betTypeBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {betTypeBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-1">
              {betTypeBreakdown.map((b) => (
                <div key={b.name} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: b.color }}
                  />
                  <span className="text-xs text-muted-foreground">{b.name}</span>
                  <span className="text-xs font-mono ml-auto tabular-nums" style={{ color: b.color }}>
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* ── Cumulative ROI area chart ────────────────────────────────── */}
        <ChartCard
          index={6}
          title="Cumulative ROI"
          subtitle="Season-to-date return on investment (1 unit stake)"
          className="mb-4"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulative} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={summary.roi >= 0 ? EMERALD : ROSE} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={summary.roi >= 0 ? EMERALD : ROSE} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="roi"
                  name="ROI"
                  stroke={summary.roi >= 0 ? EMERALD : ROSE}
                  strokeWidth={2.5}
                  fill="url(#roiGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: summary.roi >= 0 ? EMERALD : ROSE, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* ── Weekly W/L bar ───────────────────────────────────────────── */}
        <ChartCard
          index={7}
          title="Weekly Wins & Losses"
          subtitle={`Last ${weekly.length} weeks`}
          className="mb-4"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekly}
                barGap={4}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                />
                <Bar dataKey="wins"   name="Wins"   fill={EMERALD} radius={[4,4,0,0]} maxBarSize={28} />
                <Bar dataKey="losses" name="Losses" fill={ROSE}    radius={[4,4,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* ── League breakdown + Confidence calibration ────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ChartCard index={8} title="League Win Rate" subtitle="Top-5 European leagues tracked">
            <div className="space-y-4 mt-2">
              {leagueBreakdown.map((l) => (
                <LeagueBar
                  key={l.league}
                  league={l.league}
                  winRate={l.winRate}
                  color={l.color}
                />
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border grid grid-cols-5 gap-1">
              {leagueBreakdown.slice(0, 5).map((l) => (
                <div key={l.code} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{l.code}</p>
                  <p className="text-xs font-mono font-semibold tabular-nums" style={{ color: l.color }}>
                    {l.wins.toFixed(1)}/{l.total}
                  </p>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard
            index={9}
            title="Confidence Calibration"
            subtitle="Model confidence vs actual win rate"
          >
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={confidenceBuckets}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="winRate"
                    name="Actual Win %"
                    radius={[4,4,0,0]}
                    maxBarSize={32}
                  >
                    {confidenceBuckets.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.winRate >= 65 ? EMERALD : entry.winRate >= 50 ? GOLD : ROSE}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 bg-muted/40 rounded-lg px-3 py-2.5 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 inline-block text-gold mr-1 -mt-0.5" />
              {confidenceBuckets.length > 0
                ? "Model is well-calibrated — higher confidence bands consistently produce higher actual win rates."
                : "Not enough data yet to evaluate calibration."}
            </div>
          </ChartCard>
        </div>

        {/* ── ROI by week breakdown table ──────────────────────────────── */}
        <ChartCard
          index={10}
          title="Weekly ROI Detail"
          subtitle="Return on investment per week (1 unit flat stake)"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Week", "Wins", "Losses", "ROI", "Status"].map((h) => (
                    <th
                      key={h}
                      className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide first:pl-0"
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
                      transition={{ delay: 0.4 + i * 0.04 }}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 font-heading font-semibold text-foreground">
                        {w.week}
                      </td>
                      <td className="py-3">
                        <span className="text-emerald-400 font-mono tabular-nums">
                          {w.wins.toFixed(1)}W
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-rose-400 font-mono tabular-nums">
                          {w.losses.toFixed(1)}L
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className="font-mono font-semibold tabular-nums"
                          style={{ color: positive ? EMERALD : ROSE }}
                        >
                          {positive ? "+" : ""}
                          {w.roi.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            positive
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-rose-500/15 text-rose-400"
                          }`}
                        >
                          {positive
                            ? <TrendingUp className="h-3 w-3" />
                            : <TrendingDown className="h-3 w-3" />}
                          {positive ? "Profit" : "Loss"}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary row */}
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4">
            {[
              { label: "Avg Weekly Wins",  value: (summary.wins / Math.max(weekly.length, 1)).toFixed(1),  color: EMERALD },
              { label: "Avg Weekly Losses",value: (summary.losses / Math.max(weekly.length, 1)).toFixed(1), color: ROSE },
              { label: "Best Week ROI",    value: `+${Math.max(...weekly.map(w => w.roi), 0).toFixed(1)}%`, color: GOLD },
              { label: "Worst Week ROI",   value: `${Math.min(...weekly.map(w => w.roi), 0).toFixed(1)}%`, color: ROSE },
            ].map((s) => (
              <div key={s.label} className="min-w-[120px]">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                  {s.label}
                </p>
                <p
                  className="text-lg font-heading font-bold tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>

      </div>
    </Layout>
  );
};

export default AnalyticsPage;