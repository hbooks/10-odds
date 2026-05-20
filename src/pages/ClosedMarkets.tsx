import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Trophy, XCircle, Archive } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────────────────────────
type ClosedMarket = {
  id: number;
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
  competition_name: string | null;
  status: "won" | "lost" | "void";
  confidence: number;
  last_updated: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

const STATUS_CONFIG = {
  won: {
    label: "WON",
    icon: Trophy,
    bg: "rgba(212,175,55,0.10)",
    border: "rgba(212,175,55,0.25)",
    text: "#D4AF37",
    glow: "rgba(212,175,55,0.15)",
  },
  lost: {
    label: "LOST",
    icon: XCircle,
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    text: "#f87171",
    glow: "rgba(239,68,68,0.1)",
  },
  void: {
    label: "VOID",
    icon: Archive,
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
    text: "rgba(255,255,255,0.4)",
    glow: "transparent",
  },
};

// ─── Market card ──────────────────────────────────────────────────────────────
function MarketCard({ market, index }: { market: ClosedMarket; index: number }) {
  const cfg = STATUS_CONFIG[market.status] ?? STATUS_CONFIG.void;
  const StatusIcon = cfg.icon;
  const teamParts = market.match_name.split(" vs ");
  const home = teamParts[0] ?? market.match_name;
  const away = teamParts[1] ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="rounded-2xl overflow-hidden flex items-stretch"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 30px ${cfg.glow}`,
      }}
    >
      {/* Status stripe */}
      <div
        className="w-1 shrink-0 rounded-l-2xl"
        style={{ background: cfg.text }}
      />

      {/* Content */}
      <div className="flex-1 flex items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          {/* Match name */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-white text-sm leading-tight">{home}</span>
            {away && (
              <>
                <span className="text-white/25 text-xs">vs</span>
                <span className="font-bold text-white text-sm leading-tight">{away}</span>
              </>
            )}
          </div>
          {/* Market info */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-xs text-white/35 font-medium">{market.market_type}</span>
            <span className="text-white/15">·</span>
            <span className="text-xs font-bold" style={{ color: cfg.text }}>
              {market.market_selection}
            </span>
            {market.competition_name && (
              <>
                <span className="text-white/15">·</span>
                <span className="text-xs text-white/25">{market.competition_name}</span>
              </>
            )}
          </div>
          {/* Time ago */}
          <p className="text-[10px] text-white/20 mt-1">{timeAgo(market.last_updated)}</p>
        </div>

        {/* Status badge */}
        <div
          className="flex flex-col items-center gap-1 shrink-0 px-4 py-2 rounded-xl"
          style={{
            background: `${cfg.text}12`,
            border: `1px solid ${cfg.text}25`,
          }}
        >
          <StatusIcon
            style={{ width: 18, height: 18, color: cfg.text }}
          />
          <span
            className="text-[10px] font-black tracking-widest uppercase"
            style={{ color: cfg.text }}
          >
            {cfg.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl h-20 animate-pulse"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClosedMarkets() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<ClosedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "won" | "lost">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("live_market_data")
        .select(
          "id, bsd_match_id, market_type, market_selection, match_name, competition_name, status, confidence, last_updated"
        )
        .in("status", ["won", "lost", "void"])
        .order("last_updated", { ascending: false })
        .limit(100);
      setMarkets((data as ClosedMarket[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all"
    ? markets
    : markets.filter((m) => m.status === filter);

  const wonCount = markets.filter((m) => m.status === "won").length;
  const lostCount = markets.filter((m) => m.status === "lost").length;

  return (
    <div
      className="min-h-screen bg-[#05050a] text-white"
      style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}
    >
      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-3 backdrop-blur-md"
        style={{
          background: "rgba(5,5,10,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={() => navigate("/markets")}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
          aria-label="Back to markets"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" style={{ color: "#D4AF37" }} />
          <span
            className="text-sm font-bold"
            style={{ color: "#D4AF37" }}
          >
            Closed Markets
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-7">
        {/* ── Header ── */}
        <div className="mb-6">
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight mb-1"
            style={{ color: "white", letterSpacing: "-0.02em" }}
          >
            Closed Markets
          </h1>
          <p className="text-white/40 text-sm">
            All settled markets from the current and recent sessions.
          </p>
        </div>

        {/* ── Stats row ── */}
        {!loading && markets.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Total", value: markets.length, color: "rgba(255,255,255,0.6)" },
              { label: "Won", value: wonCount, color: "#D4AF37" },
              { label: "Lost", value: lostCount, color: "#f87171" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl px-4 py-3 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p
                  className="text-2xl font-black tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
                <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter tabs ── */}
        {!loading && markets.length > 0 && (
          <div
            className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {(["all", "won", "lost"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                style={{
                  background: filter === f ? (f === "won" ? "rgba(212,175,55,0.15)" : f === "lost" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.08)") : "transparent",
                  color: filter === f ? (f === "won" ? "#D4AF37" : f === "lost" ? "#f87171" : "white") : "rgba(255,255,255,0.35)",
                  border: filter === f
                    ? `1px solid ${f === "won" ? "rgba(212,175,55,0.3)" : f === "lost" ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.15)"}`
                    : "1px solid transparent",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* ── List ── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Archive className="h-10 w-10 text-white/15" />
            <div className="text-center">
              <p className="text-white/40 font-medium">
                {filter === "all" ? "No closed markets yet" : `No ${filter} markets`}
              </p>
              <p className="text-white/20 text-sm mt-1">
                Markets settle when confidence reaches ≥98% or ≤2%.
              </p>
            </div>
            <button
              onClick={() => navigate("/markets")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #b8972a)",
              }}
            >
              View Live Markets
            </button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-2.5">
              {filtered.map((m, i) => (
                <MarketCard key={m.id} market={m} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}