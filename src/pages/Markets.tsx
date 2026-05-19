import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import LiveMarketModal from "@/components/LiveMarketModal";
import { RefreshCw, TrendingUp, BookOpen, CheckCircle, XCircle } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type MarketRow = {
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
  competition_name: string | null;
  kickoff_utc: string;
  status: string;
  confidence: number;
  home_score: number;
  away_score: number;
  current_minute: number;
};

function formatKenyaTime(iso: string) {
  try {
    const d = new Date(iso);
    const kenya = new Date(d.getTime() + 3 * 60 * 60 * 1000);
    return kenya.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

export default function Markets() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("live_market_data")
        .select("*")
        .eq("status", "active")
        .order("kickoff_utc", { ascending: true });
      if (err) throw err;
      setRows(data as MarketRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load markets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMarkets(); }, []);

  const grouped = useMemo(() => {
    const map = new Map<number, MarketRow[]>();
    rows.forEach(r => {
      const list = map.get(r.bsd_match_id) || [];
      list.push(r);
      map.set(r.bsd_match_id, list);
    });
    return Array.from(map.entries()).map(([id, markets]) => {
      const first = markets[0];
      return {
        bsd_match_id: id,
        match_name: first.match_name,
        competition_name: first.competition_name,
        kickoff_utc: first.kickoff_utc,
        home_score: first.home_score,
        away_score: first.away_score,
        current_minute: first.current_minute,
        markets,
      };
    });
  }, [rows]);

  const handleSelectMarket = (market: { bsd_match_id: number; market_type: string; market_selection: string; match_name: string }) => {
    navigate(`/chart?match=${market.bsd_match_id}&type=${market.market_type}&sel=${market.market_selection}&name=${encodeURIComponent(market.match_name)}`);
  };

  // ── Navigation bar ──────────────────────────────────────────────
  const NavBar = () => (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0a0a0e]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-white/60 hover:text-white transition" aria-label="Back home">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <Link to="/markets" className="flex items-center gap-1.5 text-sm font-semibold text-[#D4AF37]">
          <TrendingUp className="h-4 w-4" />
          Markets
        </Link>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/closed" className="text-white/60 hover:text-white transition flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4" />
          Closed Markets
        </Link>
        <Link to="/guide" className="text-white/60 hover:text-white transition flex items-center gap-1.5">
          <BookOpen className="h-4 w-4" />
          Guide & terms
        </Link>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-[#05050a] text-white" style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gold">Live Markets</h1>
            <p className="text-white/60 text-sm mt-1">Pick a market to watch it move like a stock ticker.</p>
          </div>
          <button onClick={fetchMarkets} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
            <RefreshCw className="h-5 w-5 text-white/70" />
          </button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <p className="text-rose-300">{error}</p>
            <button onClick={fetchMarkets} className="mt-3 px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-sm">Retry</button>
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-20 text-white/50">
            <p className="text-lg">No live matches right now.</p>
            <p className="text-sm mt-2">Check back when the games kick off.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(match => (
              <motion.div
                key={match.bsd_match_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-white">{match.match_name}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/50">{match.competition_name}</span>
                    <span className="text-[#D4AF37] font-mono">{formatKenyaTime(match.kickoff_utc)}</span>
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs">
                      {match.current_minute}′
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {match.markets.slice(0, 5).map(m => (
                    <button
                      key={`${m.market_type}-${m.market_selection}`}
                      onClick={() => handleSelectMarket({ bsd_match_id: m.bsd_match_id, market_type: m.market_type, market_selection: m.market_selection, match_name: m.match_name })}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white/80 transition"
                    >
                      {m.market_type} <span className="text-[#D4AF37]">{m.market_selection}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Floating button – placed higher to avoid Support/Customer care clashes */}
        <button
          onClick={() => setModalOpen(true)}
          className="fixed bottom-28 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#D4AF37] text-black font-bold shadow-lg shadow-[#D4AF37]/30"
        >
          <TrendingUp className="h-4 w-4" />
          <span>Choose a Market</span>
        </button>
      </div>

      <LiveMarketModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelectMarket}
        availableMatches={grouped.map(g => ({
          bsd_match_id: g.bsd_match_id,
          match_name: g.match_name,
          competition_name: g.competition_name,
        }))}
      />
    </div>
  );
}