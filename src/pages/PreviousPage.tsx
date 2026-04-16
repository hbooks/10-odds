import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import { RefreshCw, AlertCircle } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type PredictionResult = "PENDING" | "WIN" | "LOSS" | "HALF_WIN" | "HALF_LOSS" | "VOID";

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
  matches: {
    utc_date: string;
    home_team: { name: string; tla: string | null };
    away_team: { name: string; tla: string | null };
    competition: { name: string };
  };
}

const STATUS_STYLES: Record<PredictionResult, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-muted/60 text-muted-foreground" },
  WIN:       { label: "Won ✓",     className: "bg-green-500/20 text-green-400" },
  LOSS:      { label: "Lost ✗",    className: "bg-red-500/20 text-red-400" },
  HALF_WIN:  { label: "½ Win",     className: "bg-yellow-500/20 text-yellow-400" },
  HALF_LOSS: { label: "½ Loss",    className: "bg-orange-500/20 text-orange-400" },
  VOID:      { label: "Void",      className: "bg-muted/40 text-muted-foreground" },
};

const StatusBadge = ({ status }: { status: PredictionResult }) => {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${style.className}`}>
      {style.label}
    </span>
  );
};

const PreviousPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletedPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("predictions")
        .select(`
          id,
          match_id,
          bet_type,
          selection,
          predicted_odds,
          confidence_score,
          reasoning,
          status,
          created_at,
          matches (
            utc_date,
            home_team:teams!matches_home_team_id_fkey ( name, tla ),
            away_team:teams!matches_away_team_id_fkey ( name, tla ),
            competition:competitions ( name )
          )
        `)
        .in("status", ["WIN", "LOSS", "HALF_WIN", "HALF_LOSS", "VOID"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPredictions(data as unknown as Prediction[]);
    } catch (e) {
      setError("Failed to load previous predictions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedPredictions();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-heading font-bold">Previous Predictions</h1>
          <button
            onClick={fetchCompletedPredictions}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <p className="text-muted-foreground mb-6">Full history of MK-806's completed predictions.</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <button onClick={fetchCompletedPredictions} className="text-sm text-gold hover:underline">
              Try again
            </button>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No previous predictions yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-heading font-semibold">Date</th>
                    <th className="text-left px-4 py-3 font-heading font-semibold">Fixture</th>
                    <th className="text-left px-4 py-3 font-heading font-semibold">Prediction</th>
                    <th className="text-left px-4 py-3 font-heading font-semibold">Odds</th>
                    <th className="text-left px-4 py-3 font-heading font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => {
                    const match = p.matches;
                    const fixtureName = `${match.home_team.tla || match.home_team.name} vs ${match.away_team.tla || match.away_team.name}`;
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                        <td className="px-4 py-3 font-medium">{fixtureName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.selection}</td>
                        <td className="px-4 py-3 font-semibold text-gold">{p.predicted_odds.toFixed(2)}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PreviousPage;