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
} from "recharts";
import { TrendingUp, Target, Percent, Flame, RefreshCw, AlertCircle } from "lucide-react";

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

const AnalyticsPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all completed predictions (WIN/LOSS/HALF variants)
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

  // Compute stats from predictions
  const computeStats = () => {
    if (predictions.length === 0) {
      return {
        total: 0,
        won: 0,
        lost: 0,
        winRate: 0,
        roi: 0,
        streak: 0,
      };
    }

    let won = 0;
    let lost = 0;
    let totalStake = 0;
    let totalReturn = 0;

    predictions.forEach((p) => {
      // Count wins/losses (treat HALF_WIN as 0.5 win, HALF_LOSS as 0.5 loss)
      if (p.status === "WIN") won++;
      else if (p.status === "LOSS") lost++;
      else if (p.status === "HALF_WIN") won += 0.5;
      else if (p.status === "HALF_LOSS") lost += 0.5;
      // VOID ignored

      // ROI calculation: assume stake = 1 per bet
      totalStake += 1;
      if (p.status === "WIN") totalReturn += p.predicted_odds;
      else if (p.status === "LOSS") totalReturn += 0;
      else if (p.status === "HALF_WIN") totalReturn += 1 + (p.predicted_odds - 1) / 2;
      else if (p.status === "HALF_LOSS") totalReturn += 0.5;
    });

    const total = won + lost;
    const winRate = total > 0 ? (won / total) * 100 : 0;
    const roi = totalStake > 0 ? ((totalReturn - totalStake) / totalStake) * 100 : 0;

    // Simple streak calculation (most recent consecutive wins)
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
    };
  };

  // Prepare weekly performance data (last 4 weeks)
  const getWeeklyData = () => {
    const now = new Date();
    const weeks: { week: string; won: number; lost: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const weekLabel = `${start.getDate()}/${start.getMonth() + 1}`;

      let won = 0;
      let lost = 0;
      predictions.forEach((p) => {
        const predDate = new Date(p.created_at);
        if (predDate >= start && predDate <= end) {
          if (p.status === "WIN") won++;
          else if (p.status === "LOSS") lost++;
          else if (p.status === "HALF_WIN") won += 0.5;
          else if (p.status === "HALF_LOSS") lost += 0.5;
        }
      });
      weeks.push({ week: weekLabel, won, lost });
    }
    return weeks;
  };

  // Prepare league breakdown
  const getLeagueData = () => {
    const leagueMap: Record<string, { won: number; lost: number }> = {};
    predictions.forEach((p) => {
      const league = p.matches?.competition?.name || "Unknown";
      if (!leagueMap[league]) leagueMap[league] = { won: 0, lost: 0 };
      if (p.status === "WIN") leagueMap[league].won++;
      else if (p.status === "LOSS") leagueMap[league].lost++;
      else if (p.status === "HALF_WIN") leagueMap[league].won += 0.5;
      else if (p.status === "HALF_LOSS") leagueMap[league].lost += 0.5;
    });
    return Object.entries(leagueMap).map(([league, { won, lost }]) => ({
      league,
      won,
      lost,
    }));
  };

  const stats = computeStats();
  const weeklyData = getWeeklyData();
  const leagueData = getLeagueData();
  const pieData = [
    { name: "Won", value: stats.won },
    { name: "Lost", value: stats.lost },
  ];

  // Stats cards configuration
  const statCards = [
    { icon: Target, label: "Total Predictions", value: stats.total },
    { icon: Percent, label: "Win Rate", value: `${stats.winRate.toFixed(1)}%` },
    { icon: TrendingUp, label: "ROI", value: `${stats.roi >= 0 ? "+" : ""}${stats.roi.toFixed(1)}%` },
    { icon: Flame, label: "Current Streak", value: `${stats.streak}W` },
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
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-heading font-bold">MK-806 Analytics</h1>
          <button
            onClick={fetchAnalyticsData}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <p className="text-muted-foreground mb-6">Performance dashboard of the prediction engine.</p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <s.icon className="h-5 w-5 text-gold mb-2" />
              <p className="text-2xl font-heading font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {predictions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No completed predictions yet. Check back after matches finish!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly performance */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-heading font-semibold mb-4">Weekly Performance</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="won" fill="#22c55e" radius={[4, 4, 0, 0]} />   {/* Green */}
                  <Bar dataKey="lost" fill="#ef4444" radius={[4, 4, 0, 0]} />  {/* Red */}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Win/Loss pie */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-heading font-semibold mb-4">Win / Loss Ratio</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#22c55e" />  {/* Green */}
                    <Cell fill="#ef4444" />  {/* Red */}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* League breakdown */}
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <h3 className="font-heading font-semibold mb-4">Performance by League</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={leagueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="league" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="won" fill="#22c55e" radius={[0, 4, 4, 0]} />   {/* Green */}
                  <Bar dataKey="lost" fill="#ef4444" radius={[0, 4, 4, 0]} />  {/* Red */}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;