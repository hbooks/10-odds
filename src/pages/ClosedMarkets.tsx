import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type ClosedMarket = {
  id: number;
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
  status: string;
  confidence: number;
  last_updated: string;
};

export default function ClosedMarkets() {
  const [markets, setMarkets] = useState<ClosedMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("live_market_data")
        .select("id, bsd_match_id, market_type, market_selection, match_name, status, confidence, last_updated")
        .in("status", ["won", "lost"])
        .order("last_updated", { ascending: false })
        .limit(50);
      setMarkets(data as ClosedMarket[] ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#05050a] text-white p-6" style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <h1 className="text-3xl font-bold text-gold mb-6">Closed Markets</h1>
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : markets.length === 0 ? (
        <p className="text-white/50">No closed markets yet.</p>
      ) : (
        <div className="space-y-2">
          {markets.map(m => (
            <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/10">
              <div>
                <p className="font-semibold">{m.match_name}</p>
                <p className="text-sm text-white/60">{m.market_type} · {m.market_selection}</p>
              </div>
              <div className={`text-lg font-bold ${m.status === "won" ? "text-emerald-400" : "text-rose-400"}`}>
                {m.status.toUpperCase()}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}