import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, Target, Percent, Flame, RefreshCw, AlertCircle, Trophy, DollarSign, Activity } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type PredictionResult = "PENDING" | "WIN" | "LOSS" | "HALF_WIN" | "HALF_LOSS" | "VOID";

interface Prediction {
  id: number;
  status: PredictionResult;
  predicted_odds: number;
  confidence_score: number;
  created_at: string;
  matches: {
    competition: { name: string };
  };
}

const COLORS = {
  win: "#22c55e",
  loss: "#ef4444",
  primary: "hsl(45, 95%, 55%)",
  secondary: "hsl(220, 40%, 70%)",
};

const AnalyticsPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
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
          matches (
            competition:competitions ( name )
          )
        `)
        .in("status", ["WIN", "LOSS", "HALF_WIN", "HALF_LOSS", "VOID"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPredictions(data as unknown as Prediction[]);
    } catch (e) {
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Compute stats
  const computeStats = () => {
    if (predictions.length === 0) {
      return { total: 0, won: 0, lost: 0, winRate: 0, roi: 0, streak: 0, avgOdds: 0 };
    }

    let won = 0, lost = 0, totalStake = 0, totalReturn = 0, totalOdds = 0;
    predictions.forEach((p) => {
      if (p.status === "WIN") won++;
      else if (p.status === "LOSS") lost++;
      else if (p.status === "HALF_WIN") won += 0.5;
      else if (p.status === "HALF_LOSS") lost += 0.5;

      totalOdds += p.predicted_odds;
      totalStake += 1;
      if (p.status === "WIN") totalReturn += p.predicted_odds;
      else if (p.status === "HALF_WIN") totalReturn += 1 + (p.predicted_odds - 1) / 2;
      else if (p.status === "HALF_LOSS") totalReturn += 0.5;
    });

    const total = won + lost;
    const winRate = total > 0 ? (won / total) * 100 : 0;
    const roi = totalStake > 0 ? ((totalReturn - totalStake) / totalStake) * 100 : 0;
    let streak = 0;
    for (const p of predictions) {
      if (p.status === "WIN" || p.status === "HALF_WIN") streak++;
      else break;
    }
    return {
      total: predictions.length,
      won,
      lost,
      winRate,
      roi,
      streak,
      avgOdds: totalOdds / predictions.length,
    };
  };

  // Weekly trend data (last 4 weeks)
  const getWeeklyData = () => {
    const now = new Date();
    const weeks: { week: string; won: number; lost: number; profit: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const weekLabel = `${start.getDate()}/${start.getMonth() + 1}`;

      let won = 0, lost = 0, profit = 0;
      predictions.forEach((p) => {
        const predDate = new Date(p.created_at);
        if (predDate >= start && predDate <= end) {
          if (p.status === "WIN") { won++; profit += p.predicted_odds - 1; }
          else if (p.status === "LOSS") { lost++; profit -= 1; }
          else if (p.status === "HALF_WIN") { won += 0.5; profit += (p.predicted_odds - 1) / 2; }
          else if (p.status === "HALF_LOSS") { lost += 0.5; profit -= 0.5; }
        }
      });
      weeks.push({ week: weekLabel, won, lost, profit: Math.round(profit * 100) / 100 });
    }
    return weeks;
  };

  // League breakdown
  const getLeagueData = () => {
    const leagueMap: Record<string, { won: number; lost: number; total: number }> = {};
    predictions.forEach((p) => {
      const league = p.matches?.competition?.name || "Unknown";
      if (!leagueMap[league]) leagueMap[league] = { won: 0, lost: 0, total: 0 };
      leagueMap[league].total++;
      if (p.status === "WIN") leagueMap[league].won++;
      else if (p.status === "LOSS") leagueMap[league].lost++;
      else if (p.status === "HALF_WIN") leagueMap[league].won += 0.5;
      else if (p.status === "HALF_LOSS") leagueMap[league].lost += 0.5;
    });
    return Object.entries(leagueMap).map(([league, data]) => ({
      league,
      won: data.won,
      lost: data.lost,
      winRate: data.total > 0 ? (data.won / (data.won + data.lost)) * 100 : 0,
    }));
  };

  const stats = computeStats();
  const weeklyData = getWeeklyData();
  const leagueData = getLeagueData();
  const pieData = [
    { name: "Won", value: stats.won, color: COLORS.win },
    { name: "Lost", value: stats.lost, color: COLORS.loss },
  ];

  const statCards = [
    { icon: Target, label: "Total Predictions", value: stats.total, color: "text-blue-400" },
    { icon: Percent, label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? "text-green-400" : "text-yellow-400" },
    { icon: DollarSign, label: "ROI", value: `${stats.roi >= 0 ? "+" : ""}${stats.roi.toFixed(1)}%`, color: stats.roi >= 0 ? "text-green-400" : "text-red-400" },
    { icon: Flame, label: "Current Streak", value: `${stats.streak}W`, color: "text-orange-400" },
  ];

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
          <button onClick={fetchAnalyticsData} className="mt-4 text-sm text-gold hover:underline">
            Try again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-heading font-bold">MK-806 Analytics</h1>
            <p className="text-muted-foreground">Performance dashboard of the prediction engine.</p>
          </div>
          <button
            onClick={fetchAnalyticsData}
            className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-3xl font-heading font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {predictions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card/30 rounded-xl border border-border">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No completed predictions yet.</p>
            <p className="text-sm">Check back after matches finish!</p>
          </div>
        ) : (
          <>
            {/* Row 1: Weekly performance + Pie chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Weekly trend (Area chart for profit) */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-heading font-semibold mb-1 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gold" />
                  Weekly Performance
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Profit/Loss per week (units)</p>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 25%)", borderRadius: "8px" }}
                    />
                    <Area type="monotone" dataKey="profit" stroke={COLORS.primary} fill="url(#profitGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Wins: {weeklyData.reduce((a, b) => a + b.won, 0)}</span>
                  <span>Losses: {weeklyData.reduce((a, b) => a + b.lost, 0)}</span>
                </div>
              </div>

              {/* Win/Loss ratio pie */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-heading font-semibold mb-1 flex items-center gap-2">
                  <Target className="h-4 w-4 text-gold" />
                  Win / Loss Ratio
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Distribution of outcomes</p>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 25%)", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2: League breakdown + additional stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* League performance */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-heading font-semibold mb-1 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gold" />
                  Performance by League
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Win rate per competition</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={leagueData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="league" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Win Rate"]}
                      contentStyle={{ backgroundColor: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 25%)", borderRadius: "8px" }}
                    />
                    <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                      {leagueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? COLORS.win : COLORS.loss} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gold" />
                  Performance Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">Average Odds</span>
                    <span className="text-lg font-semibold">{stats.avgOdds.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">Total Profit/Loss</span>
                    <span className={`text-lg font-semibold ${stats.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.roi >= 0 ? '+' : ''}{(stats.roi * stats.total / 100).toFixed(2)} units
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                    <span className="text-sm text-muted-foreground">Best League</span>
                    <span className="text-lg font-semibold">
                      {leagueData.length > 0 
                        ? leagueData.reduce((a, b) => a.winRate > b.winRate ? a : b).league 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-gold/10 to-transparent border border-gold/20">
                    <p className="text-sm font-medium text-gold">MK-806 Insight</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.winRate >= 55 ? "Strong performance! MK-806 is beating the market." :
                       stats.winRate >= 45 ? "Solid results. Continue refining the model." :
                       "Performance needs improvement. Consider adjusting the God‑of‑Time parameters."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;