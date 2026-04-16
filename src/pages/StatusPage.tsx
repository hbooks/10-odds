import Layout from "@/components/Layout";
import StatusBadge from "@/components/StatusBadge";
import { activePredictions } from "@/data/mockData";

const StatusPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold mb-1">Active Predictions</h1>
        <p className="text-muted-foreground mb-6">Live status of MK-806's current picks.</p>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-heading font-semibold">Fixture</th>
                  <th className="text-left px-4 py-3 font-heading font-semibold">Prediction</th>
                  <th className="text-left px-4 py-3 font-heading font-semibold">Odds</th>
                  <th className="text-left px-4 py-3 font-heading font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {activePredictions.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.fixture}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.prediction}</td>
                    <td className="px-4 py-3 font-semibold text-gold">{p.odds.toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StatusPage;
