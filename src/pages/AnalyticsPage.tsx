import Layout from "@/components/Layout";
import { analyticsData } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Target, Percent, Flame } from "lucide-react";

const stats = [
  { icon: Target, label: "Total Predictions", value: analyticsData.overallStats.totalPredictions },
  { icon: Percent, label: "Win Rate", value: `${analyticsData.overallStats.winRate}%` },
  { icon: TrendingUp, label: "ROI", value: `+${analyticsData.overallStats.roi}%` },
  { icon: Flame, label: "Current Streak", value: `${analyticsData.overallStats.streak}W` },
];

const COLORS = ["hsl(45, 95%, 55%)", "hsl(220, 40%, 70%)"];

const AnalyticsPage = () => {
  const pieData = [
    { name: "Won", value: analyticsData.overallStats.won },
    { name: "Lost", value: analyticsData.overallStats.lost },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold mb-1">MK-806 Analytics</h1>
        <p className="text-muted-foreground mb-6">Performance dashboard of the prediction engine.</p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <s.icon className="h-5 w-5 text-gold mb-2" />
              <p className="text-2xl font-heading font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly performance */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold mb-4">Weekly Performance</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analyticsData.weeklyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="won" fill="hsl(45, 95%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lost" fill="hsl(220, 40%, 70%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Win/Loss pie */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold mb-4">Win / Loss Ratio</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
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
              <BarChart data={analyticsData.leagueBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="league" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="won" fill="hsl(45, 95%, 55%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="lost" fill="hsl(220, 40%, 70%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;
