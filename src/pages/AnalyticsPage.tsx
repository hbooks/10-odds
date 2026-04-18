import { useState } from "react";
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
} from "lucide-react";
import Layout from "@/components/Layout";

// ─── Mock data (replace with real Supabase queries) ──────────────────────────

const SUMMARY = {
  totalPredictions: 284,
  wins: 178,
  losses: 89,
  voids: 17,
  winRate: 66.7,
  roi: 12.4,
  currentStreak: 5,
  streakType: "win" as "win" | "loss",
  profitUnits: 35.2,
};

const WEEKLY_PERFORMANCE = [
  { week: "W1", wins: 8,  losses: 4, roi: 6.2  },
  { week: "W2", wins: 11, losses: 3, roi: 18.5 },
  { week: "W3", wins: 7,  losses: 6, roi: -4.1 },
  { week: "W4", wins: 13, losses: 2, roi: 24.3 },
  { week: "W5", wins: 9,  losses: 5, roi: 8.7  },
  { week: "W6", wins: 14, losses: 3, roi: 28.1 },
  { week: "W7", wins: 10, losses: 4, roi: 12.0 },
  { week: "W8", wins: 12, losses: 3, roi: 19.6 },
];

const CUMULATIVE_ROI = [
  { day: "Day 1",  roi: 3.1  },
  { day: "Day 8",  roi: 8.4  },
  { day: "Day 15", roi: 5.2  },
  { day: "Day 22", roi: 14.8 },
  { day: "Day 29", roi: 11.3 },
  { day: "Day 36", roi: 19.7 },
  { day: "Day 43", roi: 17.2 },
  { day: "Day 50", roi: 24.5 },
  { day: "Day 57", roi: 21.8 },
  { day: "Day 64", roi: 28.9 },
  { day: "Day 71", roi: 26.1 },
  { day: "Day 78", roi: 35.2 },
];

const LEAGUE_BREAKDOWN = [
  { league: "Premier League", code: "PL",  wins: 52, total: 74, winRate: 70.3, color: "#3b82f6" },
  { league: "La Liga",        code: "PD",  wins: 41, total: 58, winRate: 70.7, color: "#f59e0b" },
  { league: "Serie A",        code: "SA",  wins: 33, total: 54, winRate: 61.1, color: "#10b981" },
  { league: "Bundesliga",     code: "BL1", wins: 29, total: 52, winRate: 55.8, color: "#ef4444" },
  { league: "Ligue 1",        code: "FL1", wins: 23, total: 46, winRate: 50.0, color: "#8b5cf6" },
];

const BET_TYPE_BREAKDOWN = [
  { name: "Home Win",  value: 98,  color: "#10b981" },
  { name: "Away Win",  value: 67,  color: "#3b82f6" },
  { name: "Draw",      value: 31,  color: "#f59e0b" },
  { name: "Over 2.5",  value: 54,  color: "#a855f7" },
  { name: "BTTS Yes",  value: 34,  color: "#ec4899" },
];

const CONFIDENCE_BUCKETS = [
  { range: "40–50%", predictions: 38, winRate: 47.4 },
  { range: "50–60%", predictions: 71, winRate: 56.3 },
  { range: "60–70%", predictions: 94, winRate: 68.1 },
  { range: "70–80%", predictions: 58, winRate: 77.6 },
  { range: "80%+",   predictions: 23, winRate: 87.0 },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const EMERALD  = "#10b981";
const ROSE     = "#f43f5e";
const GOLD     = "#f5a623";
const SAPPHIRE = "#3b82f6";

// ─── Animation variants ───────────────────────────────────────────────────────
const card = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
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

// ─── Main page ────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [activeWeek, setActiveWeek] = useState<string | null>(null);

  const voidRate  = ((SUMMARY.voids / SUMMARY.totalPredictions) * 100).toFixed(1);
  const lossRate  = ((SUMMARY.losses / SUMMARY.totalPredictions) * 100).toFixed(1);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-1"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
            <BarChart2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold">
            MK-806 <span className="text-gold">Analytics</span>
          </h1>
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
            value={SUMMARY.totalPredictions}
            sub={`${SUMMARY.wins}W · ${SUMMARY.losses}L · ${SUMMARY.voids} void`}
            accent={GOLD}
          />
          <StatCard
            index={1}
            icon={Trophy}
            label="Win Rate"
            value={`${SUMMARY.winRate}%`}
            sub="Top-2 league accuracy"
            accent={EMERALD}
            trend="up"
          />
          <StatCard
            index={2}
            icon={DollarSign}
            label="Season ROI"
            value={`+${SUMMARY.roi}%`}
            sub={`+${SUMMARY.profitUnits} units profit`}
            accent={SAPPHIRE}
            trend="up"
          />
          <StatCard
            index={3}
            icon={Flame}
            label={`Current ${SUMMARY.streakType === "win" ? "Win" : "Loss"} Streak`}
            value={`${SUMMARY.currentStreak} ${SUMMARY.streakType === "win" ? "✓" : "✗"}`}
            sub="Consecutive predictions"
            accent={SUMMARY.streakType === "win" ? EMERALD : ROSE}
            trend={SUMMARY.streakType === "win" ? "up" : "down"}
          />
        </div>

        {/* ── Win rate gauge + Bet type pie ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ChartCard
            index={4}
            title="Overall Win Rate"
            subtitle={`${SUMMARY.wins} wins from ${SUMMARY.totalPredictions} predictions`}
          >
            <WinRateGauge rate={SUMMARY.winRate} />
            {/* Mini breakdown pills */}
            <div className="flex justify-center gap-4 mt-2">
              {[
                { label: "Win",  pct: SUMMARY.winRate.toFixed(1), color: EMERALD },
                { label: "Loss", pct: lossRate, color: ROSE },
                { label: "Void", pct: voidRate, color: GOLD },
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
                    data={BET_TYPE_BREAKDOWN}
                    cx="50%" cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {BET_TYPE_BREAKDOWN.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-1">
              {BET_TYPE_BREAKDOWN.map((b) => (
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
              <AreaChart data={CUMULATIVE_ROI} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={EMERALD} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={EMERALD} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
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
                  stroke={EMERALD}
                  strokeWidth={2.5}
                  fill="url(#roiGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: EMERALD, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* ── Weekly W/L bar + ROI line ────────────────────────────────── */}
        <ChartCard
          index={7}
          title="Weekly Wins & Losses"
          subtitle="Per-week breakdown — 8 most recent weeks"
          className="mb-4"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={WEEKLY_PERFORMANCE}
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
              {LEAGUE_BREAKDOWN.map((l) => (
                <LeagueBar
                  key={l.code}
                  league={l.league}
                  winRate={l.winRate}
                  color={l.color}
                />
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border grid grid-cols-5 gap-1">
              {LEAGUE_BREAKDOWN.map((l) => (
                <div key={l.code} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{l.code}</p>
                  <p className="text-xs font-mono font-semibold tabular-nums" style={{ color: l.color }}>
                    {l.wins}/{l.total}
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
                  data={CONFIDENCE_BUCKETS}
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
                    {CONFIDENCE_BUCKETS.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.winRate >= 65 ? EMERALD : entry.winRate >= 50 ? GOLD : ROSE}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Calibration note */}
            <div className="mt-3 bg-muted/40 rounded-lg px-3 py-2.5 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 inline-block text-gold mr-1 -mt-0.5" />
              Model is well-calibrated — higher confidence bands consistently
              produce higher actual win rates.
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
                {WEEKLY_PERFORMANCE.map((w, i) => {
                  const positive = w.roi >= 0;
                  return (
                    <motion.tr
                      key={w.week}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.04 }}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                      onMouseEnter={() => setActiveWeek(w.week)}
                      onMouseLeave={() => setActiveWeek(null)}
                    >
                      <td className="py-3 font-heading font-semibold text-foreground">
                        {w.week}
                      </td>
                      <td className="py-3">
                        <span className="text-emerald-400 font-mono tabular-nums">
                          {w.wins}W
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-rose-400 font-mono tabular-nums">
                          {w.losses}L
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
              { label: "Avg Weekly Wins",  value: (SUMMARY.wins / WEEKLY_PERFORMANCE.length).toFixed(1),  color: EMERALD },
              { label: "Avg Weekly Losses",value: (SUMMARY.losses / WEEKLY_PERFORMANCE.length).toFixed(1), color: ROSE },
              { label: "Best Week ROI",    value: `+${Math.max(...WEEKLY_PERFORMANCE.map(w => w.roi)).toFixed(1)}%`, color: GOLD },
              { label: "Worst Week ROI",   value: `${Math.min(...WEEKLY_PERFORMANCE.map(w => w.roi)).toFixed(1)}%`, color: ROSE },
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