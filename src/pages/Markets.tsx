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
const SURFACE     = "rgba(255,255,255,0.02)";
const BORDER      = "rgba(255,255,255,0.06)";
const BORDER_HOVER= "rgba(255,255,255,0.12)";

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
  if (c >= 65) return "rgba(74,222,128,0.06)";
  if (c <= 35) return "rgba(248,113,113,0.06)";
  return "rgba(201,165,53,0.06)";
}
function confidenceBorder(c: number) {
  if (c >= 65) return "rgba(74,222,128,0.16)";
  if (c <= 35) return "rgba(248,113,113,0.16)";
  return "rgba(201,165,53,0.16)";
}

// ─── Sub-components ─────────────────────────────────────────────────────────────
function LiveBadge({ minute }: { minute: number }) {
  return (
    <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg text-[12px] font-semibold tabular-nums shrink-0"
      style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.18)", color: "#4ade80" }}>
      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" style={{ animation: "livePulse 1.8s ease-in-out infinite" }} />
      {minute}′
    </div>
  );
}

function ConfBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
      <motion.div className="h-full rounded-full" style={{ background: confidenceColor(value) }}
        initial={{ width: 0 }} animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }} />
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={`${market.market_type} · ${market.market_selection} · ${market.confidence.toFixed(0)}%`}
      className="flex flex-col gap-1 px-3 py-2 rounded-lg text-left min-w-[120px] max-w-[240px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      style={{ background: bg, border: `1px solid ${border}`, color: "rgba(255,255,255,0.92)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.32)" }}>
          {market.market_type}
        </span>
        <span className="text-[12px] font-extrabold tabular-nums" style={{ color }}>
          {market.confidence.toFixed(0)}%
        </span>
      </div>
      <span className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
        {market.market_selection}
      </span>
      <div className="mt-1"><ConfBar value={market.confidence} /></div>
    </motion.button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-bold uppercase tracking-wider select-none" style={{ color: "rgba(255,255,255,0.28)" }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER_HOVER;
        (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.36)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER;
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Card header */}
      <div className="px-4 py-3.5 flex items-start justify-between gap-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white/95 text-sm truncate">{home}</span>
                    <span className="font-italic text-gold/40 text-xs">vs</span>
                    {away && <span className="text-sm font-bold text-white/65 truncate">{away}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[12px] text-white/40">
                    {match.competition_name && <span className="truncate">{match.competition_name}</span>}
                    <span className="text-white/18">·</span>
                    <span className="tabular-nums">KO {formatKenyaTime(match.kickoff_utc)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="px-3 py-1 rounded-lg font-mono font-bold text-sm"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.06)` }}>
                <span className="tabular-nums">{match.home_score}</span>
                <span className="text-white/25 mx-2">:</span>
                <span className="tabular-nums">{match.away_score}</span>
              </div>
              {match.current_minute > 0 && <LiveBadge minute={match.current_minute} />}
            </div>
          </div>
        </div>
      </div>

      {/* Markets grid */}
      {match.markets.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-[11px] font-semibold mb-3" style={{ color: "rgba(255,255,255,0.24)" }}>
            Tracked markets
          </div>

          {/* responsive grid: scroll on small screens, grid on larger */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {match.markets.map((m) => (
              <MarketPill key={`${m.market_type}-${m.market_selection}-${m.last_updated}`} market={m} onClick={onPickMarket} />
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
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BORDER_HOVER; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; }}
    >
      <div className="px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white/88 truncate">{home}</span>
                  <span className="font-italic text-gold/40 text-xs">vs</span>
                {away && <span className="text-sm text-white/65 truncate">{away}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[12px] text-white/36">
                {match.competition_name && <span className="truncate">{match.competition_name}</span>}
                {match.current_minute > 0 && (
                  <>
                    <span className="text-white/18">·</span>
                    <span className="text-emerald-400/75 tabular-nums">{match.current_minute}′</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-lg font-mono font-bold text-sm"
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.06)` }}>
            {match.home_score}:{match.away_score}
          </div>
          <motion.button
            onClick={onTrack}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}
            aria-label={`Track a market for ${match.match_name}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            style={{ background: "rgba(201,165,53,0.08)", border: "1px solid rgba(201,165,53,0.18)", color: GOLD }}
          >
            <Plus className="w-3 h-3" />
            Track
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
      className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
      <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
          <div className="h-6 w-12 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="h-3 w-40 rounded bg-white/6 animate-pulse" />
      </div>
      <div className="px-4 py-3 grid gap-3 grid-cols-2 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
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
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.07)` }}
    >
      <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: `${iconColor}14`, border: `1px solid ${iconColor}2a` }}>
          <IconComponent className="h-6 w-6" style={{ color: iconColor }} />
        </div>

        <div>
          <p className="text-white/88 font-semibold text-base mb-1">{err.title}</p>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">{err.reason}</p>
        </div>

        <div className="px-3 py-2 rounded-lg text-sm w-full text-left"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.42)" }}>
          <span style={{ color: "rgba(255,255,255,0.55)" }}>💡 </span>{err.tip}
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <motion.button
            onClick={onRetry} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold"
            style={{ background: `${iconColor}16`, border: `1px solid ${iconColor}28`, color: iconColor }}
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </motion.button>
          <motion.button
            onClick={() => window.location.reload()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.44)" }}
          >
            <RefreshCw className="h-4 w-4" />
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
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center gap-4"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}
      >
        <span className="text-2xl select-none">⚽</span>
      </motion.div>
      <div>
        <p className="text-white/60 font-semibold text-sm mb-1">No live markets yet</p>
        <p className="text-white/30 text-sm leading-relaxed max-w-[240px]">Track a market when a game kicks off. Use the Track button to add markets to your list.</p>
      </div>
      <motion.button
        onClick={() => window.location.reload()}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.46)" }}
      >
        <RefreshCw className="h-4 w-4" /> Check again
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
    }).sort((a,b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
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
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>

      <div className="min-h-screen text-white" style={{ background: "#060609", fontFamily: "'Sora', 'DM Sans', 'Segoe UI', sans-serif" }}>
        {/* ── Navbar ── */}
        <header className="sticky top-0 z-30 px-4 sm:px-6" style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
          <div className="max-w-3xl mx-auto flex items-center justify-between h-14" style={{ background: "rgba(6,6,9,0.85)", borderRadius: 12, border: `1px solid ${BORDER}`, padding: 8 }}>
            <div className="flex items-center gap-3">
              <Link to="/games" aria-label="Back"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 transition-all duration-150"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.03)` }}>
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "rgba(201,165,53,0.12)", border: "1px solid rgba(201,165,53,0.18)" }}>
                  <TrendingUp className="h-4 w-4" style={{ color: GOLD }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white/92">Live Monitor</div>
                  <div className="text-[12px] text-white/30">Real-time market win rates</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <nav className="hidden sm:flex items-center gap-2">
                <Link to="/closed" className="flex items-center gap-2 px-3 py-1 rounded-md text-sm text-white/40 hover:text-white/80 transition">
                  <CheckCircle className="h-4 w-4" />
                  Closed
                </Link>
                <Link to="/guide#ch-07" className="flex items-center gap-2 px-3 py-1 rounded-md text-sm text-white/40 hover:text-white/80 transition">
                  <BookOpen className="h-4 w-4" />
                  Guide
                </Link>
              </nav>

              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)" }}>
                <Wifi className="h-4 w-4" style={{ color: "#4ade80" }} />
                <span className="text-[12px] font-mono font-bold text-emerald-400/80">LIVE {liveCount > 0 && `· ${liveCount}`}</span>
              </div>

              <button onClick={() => fetchData(true)} disabled={refreshing || loading}
                aria-label="Refresh"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <RefreshCw className={`h-4 w-4 text-white/40 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-7">
          <div className="mb-6">
            <h1 className="text-3xl font-black" style={{ color: GOLD, letterSpacing: "-0.02em" }}>10 Odds</h1>
            <p className="text-sm text-white/30 mt-1">Live win-rate predictions for football markets. Tap a market to view a performance chart.</p>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {[0, 0.06, 0.12].map((d, i) => <SkeletonCard key={i} delay={d} />)}
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
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {trackedMatches.length > 0 && (
                  <section>
                    <SectionLabel>Tracked</SectionLabel>
                    <div className="grid gap-4">
                      {trackedMatches.map((match, i) => (
                        <MatchCard key={match.bsd_match_id} match={match} index={i} onPickMarket={handlePickTrackedMarket} />
                      ))}
                    </div>
                  </section>
                )}

                {untrackedMatches.length > 0 && (
                  <section>
                    <SectionLabel>Live · not tracked</SectionLabel>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {untrackedMatches.map((m, i) => (
                        <UntrackedCard key={m.bsd_match_id} match={m} index={i} onTrack={() => setModalOpen(true)} />
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ── FAB (left as-is per request) ── */}
        <AnimatePresence>
          {!loading && (
            <motion.button
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => setModalOpen(true)}
              aria-label="Track a new market"
              className="fixed bottom-24 right-5 sm:right-10 z-40 flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40"
              style={{
                background: `linear-gradient(135deg, #E8C050, ${GOLD} 50%, #A8892A)`,
                color: "#0a0703",
                boxShadow: `0 6px 28px rgba(201,165,53,0.25)`,
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus className="h-4 w-4" />
              Track a Market
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Modal (unchanged) ── */}
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
