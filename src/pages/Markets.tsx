import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import LiveMarketModal from "@/components/LiveMarketModal";
import {
  RefreshCw,
  TrendingUp,
  BookOpen,
  CheckCircle,
  ArrowLeft,
  Wifi,
} from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────────────────────────
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
  last_updated: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatKenyaTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    });
  } catch {
    return "—";
  }
}

function confidenceBg(conf: number): string {
  if (conf >= 65) return "rgba(34,197,94,0.12)";
  if (conf <= 35) return "rgba(239,68,68,0.12)";
  return "rgba(212,175,55,0.10)";
}
function confidenceColor(conf: number): string {
  if (conf >= 65) return "#22c55e";
  if (conf <= 35) return "#ef4444";
  return "#D4AF37";
}

// ─── Match card ───────────────────────────────────────────────────────────────
function MatchCard({
  match,
  onPickMarket,
}: {
  match: {
    bsd_match_id: number;
    match_name: string;
    competition_name: string | null;
    kickoff_utc: string;
    home_score: number;
    away_score: number;
    current_minute: number;
    markets: MarketRow[];
  };
  onPickMarket: (m: MarketRow) => void;
}) {
  const teamParts = match.match_name.split(" vs ");
  const home = teamParts[0] ?? match.match_name;
  const away = teamParts[1] ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Match header */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Teams + score */}
          <div>
            {away ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm leading-tight">{home}</span>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-sm font-black"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    letterSpacing: "0.08em",
                  }}
                >
                  <span>{match.home_score}</span>
                  <span className="text-white/30">–</span>
                  <span>{match.away_score}</span>
                </div>
                <span className="font-bold text-white text-sm leading-tight">{away}</span>
              </div>
            ) : (
              <span className="font-bold text-white text-sm">{match.match_name}</span>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {match.competition_name && (
                <span className="text-[11px] text-white/35 font-medium">
                  {match.competition_name}
                </span>
              )}
              <span className="text-white/15 text-[10px]">·</span>
              <span className="text-[11px] text-white/35">
                KO {formatKenyaTime(match.kickoff_utc)}
              </span>
            </div>
          </div>

          {/* Live indicator */}
          {match.current_minute > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: "#4ade80",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ animation: "pulse 1.5s infinite" }}
              />
              {match.current_minute}′
            </div>
          )}
        </div>
      </div>

      {/* Market pills */}
      <div className="px-5 py-3">
        <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2.5">
          Tracked markets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {match.markets.map((m) => (
            <button
              key={`${m.market_type}-${m.market_selection}`}
              onClick={() => onPickMarket(m)}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: confidenceBg(m.confidence),
                border: `1px solid ${confidenceColor(m.confidence)}22`,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              <span className="text-white/50">{m.market_type}</span>
              <span
                className="font-bold"
                style={{ color: confidenceColor(m.confidence) }}
              >
                {m.market_selection}
              </span>
              <span
                className="text-[10px] font-mono ml-0.5"
                style={{ color: confidenceColor(m.confidence) }}
              >
                {m.confidence.toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton cards ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="h-5 w-48 rounded-lg bg-white/5 animate-pulse mb-2" />
        <div className="h-3.5 w-32 rounded-lg bg-white/5 animate-pulse" />
      </div>
      <div className="px-5 py-3 flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-24 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Markets() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMarkets = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("live_market_data")
        .select(
          "bsd_match_id, market_type, market_selection, match_name, competition_name, kickoff_utc, status, confidence, home_score, away_score, current_minute, last_updated"
        )
        .eq("status", "active")
        .order("kickoff_utc", { ascending: true });
      if (err) throw err;
      setRows((data as MarketRow[]) ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load markets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    // Subscribe to any changes in live_market_data to keep the list fresh
    const channel = supabase
      .channel("markets-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_market_data" },
        () => {
          fetchMarkets(true);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<number, MarketRow[]>();
    rows.forEach((r) => {
      const list = map.get(r.bsd_match_id) ?? [];
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
        home_score: first.home_score ?? 0,
        away_score: first.away_score ?? 0,
        current_minute: first.current_minute ?? 0,
        markets,
      };
    });
  }, [rows]);

  const handleSelectMarket = (market: {
    bsd_match_id: number;
    market_type: string;
    market_selection: string;
    match_name: string;
  }) => {
    navigate(
      `/chart?match=${market.bsd_match_id}&type=${encodeURIComponent(market.market_type)}&sel=${encodeURIComponent(market.market_selection)}&name=${encodeURIComponent(market.match_name)}`
    );
  };

  return (
    <div
      className="min-h-screen bg-[#05050a] text-white"
      style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}
    >
      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 backdrop-blur-md"
        style={{
          background: "rgba(5,5,10,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            to="/markets"
            className="flex items-center gap-1.5 text-sm font-bold"
            style={{ color: "#D4AF37" }}
          >
            <TrendingUp className="h-4 w-4" />
            Live Markets
          </Link>
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          <Link
            to="/closed"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Closed</span>
          </Link>
          <Link
            to="/guide&terms"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Guide & Terms</span>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-7">
        {/* ── Page title ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ color: "#D4AF37", letterSpacing: "-0.02em" }}
            >
              10 Odds Live Markets
            </h1>
            <p className="text-white/40 text-sm mt-0.5">
              Real-time probability charts for live football markets.
            </p>
          </div>
          <button
            onClick={() => fetchMarkets(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 text-white/60 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <p className="text-rose-300 text-sm mb-3">{error}</p>
            <button
              onClick={() => fetchMarkets()}
              className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-sm font-medium hover:bg-blue-500 transition"
            >
              Retry
            </button>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Wifi className="h-7 w-7 text-white/20" />
            </div>
            <div>
              <p className="text-white/50 font-medium">No tracked markets yet</p>
              <p className="text-white/25 text-sm mt-1">
                Use the button below to start tracking a live match.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-black transition"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #b8972a)",
                boxShadow: "0 0 24px rgba(212,175,55,0.3)",
              }}
            >
              Choose a Market
            </button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-3">
              {grouped.map((match) => (
                <MatchCard
                  key={match.bsd_match_id}
                  match={match}
                  onPickMarket={handleSelectMarket}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Floating CTA ── */}
      {!loading && grouped.length > 0 && (
        <button
          onClick={() => setModalOpen(true)}
          className="fixed bottom-24 right-5 z-40 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-black transition-all"
          style={{
            background: "linear-gradient(135deg, #D4AF37, #b8972a)",
            boxShadow: "0 4px 24px rgba(212,175,55,0.4), 0 0 0 1px rgba(212,175,55,0.3)",
          }}
        >
          <TrendingUp className="h-4 w-4" />
          Track a Market
        </button>
      )}

      <LiveMarketModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelectMarket}
        availableMatches={grouped.map((g) => ({
          bsd_match_id: g.bsd_match_id,
          match_name: g.match_name,
          competition_name: g.competition_name,
        }))}
      />
    </div>
  );
}