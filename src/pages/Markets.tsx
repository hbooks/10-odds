import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import LiveMarketModal, { type AvailableMatch, type SelectedMarket } from "@/components/LiveMarketModal";
import { RefreshCw, TrendingUp, BookOpen, CheckCircle, ArrowLeft, Radio, Plus, Wifi, WifiOff, RotateCcw } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ─────────────────────────────────────────────────────────────────────
type MarketRow = {
  bsd_match_id:      number;
  market_type:       string;
  market_selection:  string;
  match_name:        string;
  competition_name:  string | null;
  kickoff_utc:       string;
  status:            string;
  confidence:        number;
  home_score:        number;
  away_score:        number;
  current_minute:    number;
  last_updated:      string;
};

type LiveStatsRow = {
  bsd_match_id:     number;
  match_name:       string;
  competition_name: string | null;
  kickoff_utc:      string;
  home_score:       number;
  away_score:       number;
  current_minute:   number;
  period:           string;
};

// ─── Error classifier ───────────────────────────────────────────────────────────
interface FriendlyError {
  icon:    "wifi-off" | "server" | "clock" | "warning";
  title:   string;
  reason:  string;
  tip:     string;
}

function classifyError(raw: string): FriendlyError {
  const msg = raw.toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
    return {
      icon:   "wifi-off",
      title:  "No connection",
      reason: "Your device couldn't reach 10 Odds servers.",
      tip:    "Check your internet and try refreshing.",
    };
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return {
      icon:   "clock",
      title:  "Request timed out",
      reason: "The server took too long to respond.",
      tip:    "This is usually temporary — try again.",
    };
  }
  if (msg.includes("500") || msg.includes("internal") || msg.includes("pgrst")) {
    return {
      icon:   "server",
      title:  "Server error",
      reason: "Something went wrong on our end.",
      tip:    "We've been notified. Please try again shortly.",
    };
  }
  if (msg.includes("jwt") || msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) {
    return {
      icon:   "warning",
      title:  "Access error",
      reason: "Your session may have expired.",
      tip:    "Refresh the page to restore your session.",
    };
  }
  return {
    icon:   "warning",
    title:  "Something went wrong",
    reason: "We couldn't load the live market data.",
    tip:    "Try refreshing — this is usually temporary.",
  };
}

// ─── Tokens ─────────────────────────────────────────────────────────────────────
const GOLD        = "#C9A535";
const SURFACE     = "rgba(255,255,255,0.025)";
const BORDER      = "rgba(255,255,255,0.07)";
const BORDER_HOVER= "rgba(255,255,255,0.13)";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatKenyaTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-KE", {
      hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi",
    });
  } catch { return "—"; }
}

function splitMatchName(name: string): [string, string] {
  const idx = name.indexOf(" vs ");
  if (idx === -1) return [name, ""];
  return [name.slice(0, idx), name.slice(idx + 4)];
}

function confidenceColor(c: number) {
  if (c >= 65) return "#4ade80";
  if (c <= 35) return "#f87171";
  return GOLD;
}
function confidenceBg(c: number) {
  if (c >= 65) return "rgba(74,222,128,0.07)";
  if (c <= 35) return "rgba(248,113,113,0.07)";
  return "rgba(201,165,53,0.07)";
}
function confidenceBorder(c: number) {
  if (c >= 65) return "rgba(74,222,128,0.18)";
  if (c <= 35) return "rgba(248,113,113,0.18)";
  return "rgba(201,165,53,0.18)";
}

// ─── Sub-components ─────────────────────────────────────────────────────────────
function LiveBadge({ minute }: { minute: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shrink-0"
      style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
        style={{ animation: "livePulse 2s ease-in-out infinite" }} />
      {minute}′
    </div>
  );
}

function ConfBar({ value }: { value: number }) {
  return (
    <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
      <motion.div className="h-full rounded-full" style={{ background: confidenceColor(value) }}
        initial={{ width: 0 }} animate={{ width: `${value}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }} />
    </div>
  );
}

function MarketPill({ market, onClick }: { market: MarketRow; onClick: (m: MarketRow) => void }) {
  const color  = confidenceColor(market.confidence);
  const bg     = confidenceBg(market.confidence);
  const border = confidenceBorder(market.confidence);

  return (
    <motion.button
      onClick={() => onClick(market)}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
      title={`${market.market_type} · ${market.market_selection} · ${market.confidence.toFixed(0)}%`}
      className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      style={{ background: bg, border: `1px solid ${border}`, minWidth: 96 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
          {market.market_type}
        </span>
        <span className="text-[11px] font-black tabular-nums" style={{ color }}>
          {market.confidence.toFixed(0)}%
        </span>
      </div>
      <span className="text-xs font-semibold capitalize" style={{ color: "rgba(255,255,255,0.82)" }}>
        {market.market_selection}
      </span>
      <ConfBar value={market.confidence} />
    </motion.button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] select-none"
        style={{ color: "rgba(255,255,255,0.25)" }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

// ─── Match card ──────────────────────────────────────────────────────────────────
function MatchCard({
  match, index, onPickMarket,
}: {
  match: {
    bsd_match_id: number; match_name: string; competition_name: string | null;
    kickoff_utc: string; home_score: number; away_score: number;
    current_minute: number; markets: MarketRow[];
  };
  index: number;
  onPickMarket: (m: MarketRow) => void;
}) {
  const [home, away] = splitMatchName(match.match_name);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.045, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl overflow-hidden group/card"
      style={{
        background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
        border: `1px solid ${BORDER}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER_HOVER;
        (e.currentTarget as HTMLElement).style.boxShadow =
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER;
        (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.03)";
      }}
    >
      {/* Card header */}
      <div className="px-4 py-3.5 flex items-center justify-between gap-3"
        style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white/95 text-sm leading-snug truncate">{home}</span>
            {away && (
              <>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-sm font-black shrink-0"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "white", letterSpacing: "0.06em" }}>
                  <span>{match.home_score}</span>
                  <span className="text-white/25 mx-0.5">:</span>
                  <span>{match.away_score}</span>
                </div>
                <span className="font-bold text-white/95 text-sm leading-snug truncate">{away}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {match.competition_name && (
              <span className="text-[11px] text-white/35 font-medium truncate">{match.competition_name}</span>
            )}
            {match.competition_name && <span className="text-white/15 text-[10px]">·</span>}
            <span className="text-[11px] text-white/28 tabular-nums">
              KO {formatKenyaTime(match.kickoff_utc)}
            </span>
          </div>
        </div>
        {match.current_minute > 0 && <LiveBadge minute={match.current_minute} />}
      </div>

      {/* Markets grid */}
      {match.markets.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2.5 select-none"
            style={{ color: "rgba(255,255,255,0.2)" }}>
            Tracked markets
          </p>
          <div className="flex flex-wrap gap-2">
            {match.markets.map((m) => (
              <MarketPill key={`${m.market_type}-${m.market_selection}`}
                market={m} onClick={onPickMarket} />
            ))}
          </div>
        </div>
      )}
    </motion.article>
  );
}

// ─── Untracked card ───────────────────────────────────────────────────────────────
function UntrackedCard({ match, index, onTrack }: {
  match: LiveStatsRow; index: number; onTrack: () => void;
}) {
  const [home, away] = splitMatchName(match.match_name);
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, transition: "border-color 0.18s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BORDER_HOVER; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; }}
    >
      <div className="px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white/80 truncate">{home}</span>
            {away && (
              <>
                <span className="font-mono text-xs font-bold shrink-0 px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)",
                    letterSpacing: "0.06em" }}>
                  {match.home_score}:{match.away_score}
                </span>
                <span className="text-sm font-semibold text-white/80 truncate">{away}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {match.competition_name && (
              <span className="text-[11px] text-white/30">{match.competition_name}</span>
            )}
            {match.current_minute > 0 && (
              <>
                {match.competition_name && <span className="text-white/15 text-[10px]">·</span>}
                <span className="text-[11px] text-emerald-400/70 font-medium tabular-nums">
                  {match.current_minute}′
                </span>
              </>
            )}
          </div>
        </div>
        <motion.button
          onClick={onTrack}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
          aria-label={`Track a market for ${match.match_name}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          style={{ background: "rgba(201,165,53,0.09)", border: "1px solid rgba(201,165,53,0.22)", color: GOLD }}
        >
          <Plus className="w-3 h-3" />
          Track
        </motion.button>
      </div>
    </motion.article>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
      className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-4 w-28 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-6 w-10 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-4 w-24 rounded-lg bg-white/5 animate-pulse" />
        </div>
        <div className="h-3 w-36 rounded bg-white/4 animate-pulse" />
      </div>
      <div className="px-4 py-3 flex gap-2">
        {[80, 96, 88].map((w, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/4 animate-pulse"
            style={{ width: w, animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────────
function ErrorState({ raw, onRetry }: { raw: string; onRetry: () => void }) {
  const err = classifyError(raw);

  const IconComponent = {
    "wifi-off": WifiOff,
    "server":   Radio,
    "clock":    RefreshCw,
    "warning":  Radio,
  }[err.icon];

  const iconColor = {
    "wifi-off": "#fb923c",
    "server":   "#f87171",
    "clock":    GOLD,
    "warning":  "#fbbf24",
  }[err.icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.08)` }}
    >
      {/* Top bar accent */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${iconColor}66, transparent)` }} />

      <div className="p-6 flex flex-col items-center text-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `${iconColor}12`, border: `1px solid ${iconColor}28` }}>
          <IconComponent className="h-5 w-5" style={{ color: iconColor }} />
        </div>

        {/* Text */}
        <div>
          <p className="text-white/85 font-semibold text-sm mb-1">{err.title}</p>
          <p className="text-white/40 text-xs leading-relaxed max-w-xs">{err.reason}</p>
        </div>

        {/* Tip */}
        <div className="px-3 py-2 rounded-xl text-xs w-full text-left"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.4)" }}>
          <span style={{ color: "rgba(255,255,255,0.55)" }}>💡 </span>{err.tip}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 w-full">
          <motion.button
            onClick={onRetry} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
            style={{ background: `${iconColor}14`, border: `1px solid ${iconColor}2a`, color: iconColor }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try Again
          </motion.button>
          <motion.button
            onClick={() => window.location.reload()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center gap-4"
    >
      {/* Animated football icon */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}` }}
      >
        <span className="text-2xl select-none">⚽</span>
      </motion.div>
      <div>
        <p className="text-white/50 font-semibold text-sm mb-1">No live markets yet</p>
        <p className="text-white/25 text-xs leading-relaxed max-w-[200px]">
          Track a market when a game kicks off.
        </p>
      </div>
      <motion.button
        onClick={() => window.location.reload()}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
        style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
          color: "rgba(255,255,255,0.4)" }}
      >
        <RefreshCw className="h-3 w-3" /> Check again
      </motion.button>
    </motion.div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────────
export default function Markets() {
  const navigate = useNavigate();
  const [marketRows,    setMarketRows]    = useState<MarketRow[]>([]);
  const [liveMatches,   setLiveMatches]   = useState<LiveStatsRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [{ data: markets, error: mErr }, { data: stats, error: sErr }] =
        await Promise.all([
          supabase
            .from("live_market_data")
            .select("bsd_match_id,market_type,market_selection,match_name,competition_name,kickoff_utc,status,confidence,home_score,away_score,current_minute,last_updated")
            .eq("status", "active")
            .order("kickoff_utc", { ascending: true }),
          supabase
            .from("live_stats")
            .select("bsd_match_id,match_name,competition_name,kickoff_utc,home_score,away_score,current_minute,period")
            .neq("period", "FT")
            .order("kickoff_utc", { ascending: true }),
        ]);
      if (mErr) throw mErr;
      if (sErr) throw sErr;
      setMarketRows((markets as MarketRow[]) ?? []);
      setLiveMatches((stats as LiveStatsRow[]) ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message
        : (e as { message?: string })?.message ?? "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("markets-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_market_data" },
        () => fetchData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [fetchData]);

  const trackedMatches = useMemo(() => {
    const map = new Map<number, MarketRow[]>();
    marketRows.forEach((r) => {
      const list = map.get(r.bsd_match_id) ?? [];
      list.push(r);
      map.set(r.bsd_match_id, list);
    });
    return Array.from(map.entries()).map(([id, markets]) => {
      const first = markets[0];
      return {
        bsd_match_id:    id,
        match_name:      first.match_name,
        competition_name:first.competition_name,
        kickoff_utc:     first.kickoff_utc,
        home_score:      first.home_score ?? 0,
        away_score:      first.away_score ?? 0,
        current_minute:  first.current_minute ?? 0,
        markets,
      };
    });
  }, [marketRows]);

  const untrackedMatches = useMemo(
    () => liveMatches.filter((m) => !trackedMatches.some((t) => t.bsd_match_id === m.bsd_match_id)),
    [liveMatches, trackedMatches]
  );

  const modalMatches: AvailableMatch[] = useMemo(
    () => liveMatches.map((m) => ({
      bsd_match_id:    m.bsd_match_id,
      match_name:      m.match_name,
      competition_name:m.competition_name,
    })),
    [liveMatches]
  );

  const handleSelectMarket  = (market: SelectedMarket) => {
    navigate(`/chart?match=${market.bsd_match_id}&type=${encodeURIComponent(market.market_type)}&sel=${encodeURIComponent(market.market_selection)}&name=${encodeURIComponent(market.match_name)}`);
  };
  const handlePickTrackedMarket = (m: MarketRow) => {
    navigate(`/chart?match=${m.bsd_match_id}&type=${encodeURIComponent(m.market_type)}&sel=${encodeURIComponent(m.market_selection)}&name=${encodeURIComponent(m.match_name)}`);
  };

  const isEmpty   = !loading && !error && trackedMatches.length === 0 && liveMatches.length === 0;
  const liveCount = liveMatches.length;

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>

      <div className="min-h-screen text-white"
        style={{ background: "#060609", fontFamily: "'Sora', 'DM Sans', 'Segoe UI', sans-serif" }}>

        {/* ── Navbar ── */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6"
          style={{ height: 52, background: "rgba(6,6,9,0.9)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>

          <div className="flex items-center gap-2.5">
            <Link to="/games" aria-label="Back"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/35 hover:text-white/75 transition-all duration-150"
              style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: "rgba(201,165,53,0.12)", border: "1px solid rgba(201,165,53,0.22)" }}>
                <TrendingUp className="h-3 w-3" style={{ color: GOLD }} />
              </div>
              <span className="text-sm font-bold text-white/90 tracking-tight">Live Markets</span>
              {liveCount > 0 && !loading && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                  style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
                    color: "#4ade80" }}>
                  {liveCount} live
                </span>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-0.5">
            <Link to="/closed"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/38 hover:text-white/70 transition-all duration-150 hover:bg-white/4">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Closed</span>
            </Link>
            <Link to="/guide#ch-07"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/38 hover:text-white/70 transition-all duration-150 hover:bg-white/4">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Guide</span>
            </Link>
            {/* Realtime indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 ml-1 rounded-lg"
              style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
              <Wifi className="h-3 w-3" style={{ color: "#4ade80" }} />
              <span className="text-[10px] font-mono font-bold hidden sm:inline" style={{ color: "#4ade8099" }}>
                LIVE
              </span>
            </div>
          </nav>
        </header>

        {/* ── Page content ── */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-7">

          {/* Heading */}
          <div className="flex items-start justify-between mb-7">
            <div>
              <h1 className="text-2xl sm:text-[28px] font-black tracking-tight leading-none"
                style={{ color: GOLD, letterSpacing: "-0.025em", fontFamily: "'Sora', sans-serif" }}>
                10 Odds
              </h1>
              <p className="text-white/32 text-xs mt-1.5 leading-relaxed">
                Real-time win rate for live football markets.
              </p>
            </div>
            <button onClick={() => fetchData(true)} disabled={refreshing || loading}
              aria-label="Refresh"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <RefreshCw className={`h-3.5 w-3.5 text-white/45 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* ── States ── */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} className="space-y-3">
                {[0, 0.07, 0.13].map((d, i) => <SkeletonCard key={i} delay={d} />)}
              </motion.div>
            ) : error ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ErrorState raw={error} onRetry={() => fetchData()} />
              </motion.div>
            ) : isEmpty ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState />
              </motion.div>
            ) : (
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} className="space-y-6">
                {trackedMatches.length > 0 && (
                  <section>
                    <SectionLabel>Tracked</SectionLabel>
                    <AnimatePresence initial={false}>
                      <div className="space-y-2.5">
                        {trackedMatches.map((match, i) => (
                          <MatchCard key={match.bsd_match_id} match={match} index={i}
                            onPickMarket={handlePickTrackedMarket} />
                        ))}
                      </div>
                    </AnimatePresence>
                  </section>
                )}
                {untrackedMatches.length > 0 && (
                  <section>
                    <SectionLabel>Live · not yet tracked</SectionLabel>
                    <div className="space-y-2">
                      {untrackedMatches.map((m, i) => (
                        <UntrackedCard key={m.bsd_match_id} match={m} index={i}
                          onTrack={() => setModalOpen(true)} />
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── FAB ── */}
        <AnimatePresence>
          {!loading && (
            <motion.button
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0,  y: 8,   scale: 0.95 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={() => setModalOpen(true)}
              aria-label="Track a new market"
              className="fixed bottom-24 right-5 sm:right-10 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
              style={{
                background: `linear-gradient(135deg, #E8C050, ${GOLD} 50%, #A8892A)`,
                color: "#0a0703",
                boxShadow: `0 0 0 1px rgba(201,165,53,0.45), 0 8px 28px rgba(201,165,53,0.30), 0 2px 8px rgba(0,0,0,0.45)`,
              }}
              whileHover={{ scale: 1.05, boxShadow: `0 0 0 1px rgba(201,165,53,0.6), 0 12px 36px rgba(201,165,53,0.42)` }}
              whileTap={{ scale: 0.96 }}
            >
              <Plus className="h-3.5 w-3.5" />
              Track a Market
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Modal ── */}
        <LiveMarketModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={handleSelectMarket}
          availableMatches={modalMatches}
        />
      </div>
    </>
  );
}