import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import LiveMarketModal, {
  type AvailableMatch,
} from "@/components/LiveMarketModal";
import CandlestickChart from "@/components/CandlestickChart";

// ── Supabase client ──────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

type Row = {
  bsd_match_id: number;
  match_name: string;
  competition_name: string | null;
  kickoff_utc: string;
  market_type: string;
  market_selection: string;
  confidence: number;
  status: string;
};

type GroupedMatch = AvailableMatch & {
  kickoff_utc: string;
  market_count: number;
};

type SelectedMarket = {
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
};

function formatKickoff(iso: string) {
  try {
    // Convert UTC to Kenya time (UTC+3)
    const d = new Date(iso);
    const kenya = new Date(d.getTime() + 3 * 60 * 60 * 1000);
    return kenya.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 space-y-3">
      <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
      <div className="h-3 w-1/3 bg-white/5 rounded animate-pulse" />
      <div className="h-9 w-full bg-white/5 rounded-xl animate-pulse mt-2" />
    </div>
  );
}

export default function LiveMarkets() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedMarket | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("live_market_data")
        .select(
          "bsd_match_id, match_name, competition_name, kickoff_utc, market_type, market_selection, confidence, status",
        )
        .eq("status", "active")
        .order("kickoff_utc", { ascending: true });
      if (err) throw err;
      setRows((data ?? []) as Row[]);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't load live matches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const grouped: GroupedMatch[] = useMemo(() => {
    const map = new Map<number, GroupedMatch>();
    for (const r of rows) {
      const existing = map.get(r.bsd_match_id);
      if (existing) {
        existing.market_count += 1;
      } else {
        map.set(r.bsd_match_id, {
          bsd_match_id: r.bsd_match_id,
          match_name: r.match_name,
          competition_name: r.competition_name,
          kickoff_utc: r.kickoff_utc,
          market_count: 1,
        });
      }
    }
    return [...map.values()];
  }, [rows]);

  const handleSelect = (m: SelectedMarket) => {
    setSelected(m);
  };

  const handleSwitch = (next: {
    market_type: string;
    market_selection: string;
  }) => {
    if (!selected) return;
    setSelected({ ...selected, ...next });
  };

  return (
    <div
      className="min-h-screen bg-[#05050a] text-white"
      style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{
              background:
                "linear-gradient(90deg, #D4AF37 0%, #f5d878 50%, #D4AF37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Live Market Monitor
          </h1>
          <p className="mt-2 text-white/60 text-sm sm:text-base">
            Watch betting markets move in real‑time – like a stock chart for
            football.
          </p>
        </motion.header>

        {/* Instructions */}
        <div className="mb-6">
          <button
            onClick={() => setShowInstructions((v) => !v)}
            className="text-sm text-[#3b82f6] hover:underline"
          >
            {showInstructions ? "Hide" : "How does this work?"}
          </button>
          <AnimatePresence>
            {showInstructions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 text-sm text-white/70 leading-relaxed">
                  Pick any live match and a market (1X2, Over/Under, BTTS
                  and more). We'll stream the model's confidence minute by
                  minute as the game unfolds. Green candles = momentum
                  rising, red = falling. Cross the dashed 50% line and the
                  market is leaning your way.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA */}
        {!selected && (
          <div className="flex justify-center mb-10">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={grouped.length === 0}
              onClick={() => setModalOpen(true)}
              className="px-8 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold tracking-wider uppercase text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 28px rgba(212,175,55,0.45)" }}
            >
              Watch Market
            </motion.button>
          </div>
        )}

        {/* Chart view */}
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.section
              key="chart"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelected(null)}
                  className="text-sm text-white/60 hover:text-white"
                >
                  ← Back to matches
                </button>
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-sm text-[#3b82f6] hover:underline"
                >
                  Change market
                </button>
              </div>
              <CandlestickChart
                bsd_match_id={selected.bsd_match_id}
                market_type={selected.market_type}
                market_selection={selected.market_selection}
                match_name={selected.match_name}
                onSwitchMarket={handleSwitch}
              />
            </motion.section>
          ) : (
            <motion.section
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
                  <p className="text-rose-300 mb-3">{error}</p>
                  <button
                    onClick={fetchMatches}
                    className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-sm font-medium hover:opacity-90"
                  >
                    Try again
                  </button>
                </div>
              ) : grouped.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-10 text-center text-white/60">
                  No live matches right now. Check back when the games kick
                  off.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped.map((m) => (
                    <motion.div
                      key={m.bsd_match_id}
                      whileHover={{ y: -3 }}
                      className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/40">
                        <span>{m.competition_name ?? "Football"}</span>
                        <span>{formatKickoff(m.kickoff_utc)}</span>
                      </div>
                      <p className="text-white font-semibold leading-snug">
                        {m.match_name}
                      </p>
                      <p className="text-xs text-emerald-400">
                        {m.market_count} live market
                        {m.market_count === 1 ? "" : "s"}
                      </p>
                      <button
                        onClick={() => setModalOpen(true)}
                        className="mt-2 w-full rounded-xl bg-[#3b82f6] text-white text-sm font-medium py-2 hover:opacity-90 transition"
                      >
                        View Markets
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <LiveMarketModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelect}
        availableMatches={grouped.map(
          ({ bsd_match_id, match_name, competition_name }) => ({
            bsd_match_id,
            match_name,
            competition_name,
          }),
        )}
      />
    </div>
  );
};