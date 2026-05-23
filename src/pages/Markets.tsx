import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import LiveMarketModal, { type AvailableMatch, type SelectedMarket } from "@/components/LiveMarketModal";
import { RefreshCw, TrendingUp, BookOpen, CheckCircle, ArrowLeft, Radio, Plus } from "lucide-react";

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

type LiveStatsRow = {
  bsd_match_id: number;
  match_name: string;
  competition_name: string | null;
  kickoff_utc: string;
  home_score: number;
  away_score: number;
  current_minute: number;
  period: string;
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const GOLD = "#C9A535";
const SURFACE = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.07)";
const BORDER_HOVER = "rgba(255,255,255,0.13)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKenyaTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    });
  } catch {
    return "—";
  }
}

/** Split "Team A vs Team B" safely */
function splitMatchName(name: string): [string, string] {
  const idx = name.indexOf(" vs ");
  if (idx === -1) return [name, ""];
  return [name.slice(0, idx), name.slice(idx + 4)];
}

function confidenceColor(conf: number): string {
  if (conf >= 65) return "#4ade80";
  if (conf <= 35) return "#f87171";
  return GOLD;
}

function confidenceBg(conf: number): string {
  if (conf >= 65) return "rgba(74,222,128,0.08)";
  if (conf <= 35) return "rgba(248,113,113,0.08)";
  return "rgba(201,165,53,0.08)";
}

function confidenceBorder(conf: number): string {
  if (conf >= 65) return "rgba(74,222,128,0.2)";
  if (conf <= 35) return "rgba(248,113,113,0.2)";
  return "rgba(201,165,53,0.2)";
}

// ─── Live badge ───────────────────────────────────────────────────────────────

function LiveBadge({ minute }: { minute: number }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shrink-0"
      style={{
        background: "rgba(74,222,128,0.1)",
        border: "1px solid rgba(74,222,128,0.22)",
        color: "#4ade80",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
        style={{ animation: "livePulse 2s ease-in-out infinite" }}
      />
      {minute}′
    </div>
  );
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfBar({ value }: { value: number }) {
  const color = confidenceColor(value);
  return (
    <div className="w-full h-0.5 rounded-full bg-white/5 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── Market pill ──────────────────────────────────────────────────────────────

function MarketPill({
  market,
  onClick,
}: {
  market: MarketRow;
  onClick: (m: MarketRow) => void;
}) {
  const color = confidenceColor(market.confidence);
  const bg = confidenceBg(market.confidence);
  const border = confidenceBorder(market.confidence);

  return (
    <button
      onClick={() => onClick(market)}
      title={`${market.market_type} · ${market.market_selection} · ${market.confidence.toFixed(0)}% confidence`}
      className="group flex flex-col gap-1.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        minWidth: "96px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = color + "55";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = border;
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {market.market_type}
        </span>
        <span
          className="text-[11px] font-bold tabular-nums"
          style={{ color }}
        >
          {market.confidence.toFixed(0)}%
        </span>
      </div>
      <span className="text-xs font-semibold capitalize" style={{ color: "rgba(255,255,255,0.85)" }}>
        {market.market_selection}
      </span>
      <ConfBar value={market.confidence} />
    </button>
  );
}

// ─── Tracked match card ───────────────────────────────────────────────────────

function MatchCard({
  match,
  index,
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
  index: number;
  onPickMarket: (m: MarketRow) => void;
}) {
  const [home, away] = splitMatchName(match.match_name);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.045, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl overflow-hidden group/card"
      style={{
        background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
        border: `1px solid ${BORDER}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035)",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER_HOVER;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER;
      }}
    >
      {/* Card header */}
      <div
        className="px-4 py-3.5 flex items-center justify-between gap-3"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="min-w-0 flex-1">
          {/* Teams + score row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white/95 text-sm leading-snug truncate">{home}</span>
            {away && (
              <>
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-sm font-black shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    letterSpacing: "0.06em",
                  }}
                >
                  <span>{match.home_score}</span>
                  <span className="text-white/25 mx-0.5">:</span>
                  <span>{match.away_score}</span>
                </div>
                <span className="font-bold text-white/95 text-sm leading-snug truncate">{away}</span>
              </>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {match.competition_name && (
              <span className="text-[11px] text-white/35 font-medium truncate">
                {match.competition_name}
              </span>
            )}
            {match.competition_name && (
              <span className="text-white/15 text-[10px] select-none">·</span>
            )}
            <span className="text-[11px] text-white/30 tabular-nums">
              KO {formatKenyaTime(match.kickoff_utc)}
            </span>
          </div>
        </div>

        {match.current_minute > 0 && <LiveBadge minute={match.current_minute} />}
      </div>

      {/* Markets grid */}
      {match.markets.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/22 mb-2.5 select-none">
            Tracked markets
          </p>
          <div className="flex flex-wrap gap-2">
            {match.markets.map((m) => (
              <MarketPill
                key={`${m.market_type}-${m.market_selection}`}
                market={m}
                onClick={onPickMarket}
              />
            ))}
          </div>
        </div>
      )}
    </motion.article>
  );
}

// ─── Untracked match card ─────────────────────────────────────────────────────

function UntrackedCard({
  match,
  index,
  onTrack,
}: {
  match: LiveStatsRow;
  index: number;
  onTrack: () => void;
}) {
  const [home, away] = splitMatchName(match.match_name);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER_HOVER;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = BORDER;
      }}
    >
      <div className="px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white/80 truncate">{home}</span>
            {away && (
              <>
                <span
                  className="font-mono text-xs font-bold shrink-0 px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.6)",
                    letterSpacing: "0.06em",
                  }}
                >
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
                {match.competition_name && (
                  <span className="text-white/15 text-[10px]">·</span>
                )}
                <span className="text-[11px] text-emerald-400/70 font-medium tabular-nums">
                  {match.current_minute}′
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={onTrack}
          aria-label={`Track a market for ${match.match_name}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          style={{
            background: `rgba(201,165,53,0.1)`,
            border: `1px solid rgba(201,165,53,0.25)`,
            color: GOLD,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(201,165,53,0.18)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(201,165,53,0.1)";
          }}
        >
          <Plus className="w-3 h-3" />
          Track
        </button>
      </div>
    </motion.article>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
          <div className="h-6 w-12 rounded-md bg-white/5 animate-pulse" />
          <div className="h-4 w-28 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="h-3 w-40 rounded bg-white/4 animate-pulse" />
      </div>
      <div className="px-4 py-3 flex gap-2">
        {[80, 96, 88].map((w, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-white/4 animate-pulse"
            style={{ width: w, animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 select-none">
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Markets() {
  const navigate = useNavigate();
  const [marketRows, setMarketRows] = useState<MarketRow[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveStatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // useCallback so it's stable for useEffect deps
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [{ data: markets, error: mErr }, { data: stats, error: sErr }] =
        await Promise.all([
          supabase
            .from("live_market_data")
            .select(
              "bsd_match_id,market_type,market_selection,match_name,competition_name,kickoff_utc,status,confidence,home_score,away_score,current_minute,last_updated"
            )
            .eq("status", "active")
            .order("kickoff_utc", { ascending: true }),
          supabase
            .from("live_stats")
            .select(
              "bsd_match_id,match_name,competition_name,kickoff_utc,home_score,away_score,current_minute,period"
            )
            .neq("period", "FT")
            .order("kickoff_utc", { ascending: true }),
        ]);

      // Throw the first error encountered
      if (mErr) throw mErr;
      if (sErr) throw sErr;

      setMarketRows((markets as MarketRow[]) ?? []);
      setLiveMatches((stats as LiveStatsRow[]) ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Failed to load data";
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
      .on("postgres_changes", { event: "*", schema: "public", table: "live_market_data" }, () =>
        fetchData(true)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [fetchData]);

  // Group market rows by match
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
  }, [marketRows]);

  // Untracked live matches (in live_stats but no tracked market)
  const untrackedMatches = useMemo(
    () => liveMatches.filter((m) => !trackedMatches.some((t) => t.bsd_match_id === m.bsd_match_id)),
    [liveMatches, trackedMatches]
  );

  // All matches fed to the modal
  const modalMatches: AvailableMatch[] = useMemo(
    () =>
      liveMatches.map((m) => ({
        bsd_match_id: m.bsd_match_id,
        match_name: m.match_name,
        competition_name: m.competition_name,
      })),
    [liveMatches]
  );

  const handleSelectMarket = (market: SelectedMarket) => {
    navigate(
      `/chart?match=${market.bsd_match_id}&type=${encodeURIComponent(market.market_type)}&sel=${encodeURIComponent(market.market_selection)}&name=${encodeURIComponent(market.match_name)}`
    );
  };

  const handlePickTrackedMarket = (m: MarketRow) => {
    navigate(
      `/chart?match=${m.bsd_match_id}&type=${encodeURIComponent(m.market_type)}&sel=${encodeURIComponent(m.market_selection)}&name=${encodeURIComponent(m.match_name)}`
    );
  };

  const isEmpty = !loading && !error && trackedMatches.length === 0 && liveMatches.length === 0;
  const liveCount = liveMatches.length;

  return (
    <>
      {/* Global pulse keyframe */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.8); }
        }
      `}</style>

      <div
        className="min-h-screen text-white"
        style={{
          background: "#060609",
          fontFamily: "'Sora', 'DM Sans', 'Segoe UI', sans-serif",
        }}
      >
        {/* ── Navbar ── */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-13"
          style={{
            height: "52px",
            background: "rgba(6,6,9,0.9)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <Link
              to="/games"
              aria-label="Back to Games"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 transition-all duration-150"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>

            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: `rgba(201,165,53,0.12)`, border: `1px solid rgba(201,165,53,0.25)` }}
              >
                <TrendingUp className="h-3 w-3" style={{ color: GOLD }} />
              </div>
              <span className="text-sm font-bold text-white/90 tracking-tight">
                Live Markets
              </span>
              {liveCount > 0 && !loading && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                  style={{
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.2)",
                    color: "#4ade80",
                  }}
                >
                  {liveCount} live
                </span>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-0.5">
            <Link
              to="/closed"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/75 transition-all duration-150 hover:bg-white/4"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Closed</span>
            </Link>
            <Link
              to="/guide#ch-07"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/75 transition-all duration-150 hover:bg-white/4"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Guide</span>
            </Link>
          </nav>
        </header>

        {/* ── Page content ── */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-7">

          {/* Page heading */}
          <div className="flex items-start justify-between mb-7">
            <div>
              <h1
                className="text-2xl sm:text-[28px] font-black tracking-tight leading-none"
                style={{
                  color: GOLD,
                  letterSpacing: "-0.025em",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                10 Odds
              </h1>
              <p className="text-white/35 text-xs mt-1.5 leading-relaxed">
                Real-time Win rate for live football markets.
              </p>
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              aria-label="Refresh data"
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-white/50 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* ── States ── */}

          {loading ? (
            <div className="space-y-3">
              {[0, 0.06, 0.12].map((d, i) => (
                <SkeletonCard key={i} delay={d} />
              ))}
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-5 text-center"
              style={{
                background: "rgba(248,113,113,0.06)",
                border: "1px solid rgba(248,113,113,0.18)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}
              >
                <Radio className="h-5 w-5 text-rose-400" />
              </div>
              <p className="text-rose-300/90 text-sm mb-1 font-medium">Failed to load</p>
              <p className="text-rose-300/50 text-xs mb-4">{error}</p>
              <button
                onClick={() => fetchData()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-rose-200 transition-all duration-150"
                style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.25)",
                }}
              >
                Try again
              </button>
            </motion.div>
          ) : isEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center gap-3"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}
              >
                <Radio className="h-6 w-6 text-white/15" />
              </div>
              <p className="text-white/45 font-semibold text-sm">No live matches</p>
              <p className="text-white/22 text-xs leading-relaxed max-w-[200px]">
                Check back when the games kick off.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Tracked matches */}
              {trackedMatches.length > 0 && (
                <section>
                  <SectionLabel>Tracked</SectionLabel>
                  <AnimatePresence initial={false}>
                    <div className="space-y-2.5">
                      {trackedMatches.map((match, i) => (
                        <MatchCard
                          key={match.bsd_match_id}
                          match={match}
                          index={i}
                          onPickMarket={handlePickTrackedMarket}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                </section>
              )}

              {/* Untracked live matches */}
              {untrackedMatches.length > 0 && (
                <section>
                  <SectionLabel>Live — not yet tracked</SectionLabel>
                  <div className="space-y-2">
                    {untrackedMatches.map((m, i) => (
                      <UntrackedCard
                        key={m.bsd_match_id}
                        match={m}
                        index={i}
                        onTrack={() => setModalOpen(true)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* ── FAB ── */}
        <AnimatePresence>
          {!loading && (
            <motion.button
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={() => setModalOpen(true)}
              aria-label="Track a new market"
              className="fixed bottom-24 right-10 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
              style={{
                background: `linear-gradient(135deg, #D4A843 0%, ${GOLD} 50%, #A8892A 100%)`,
                color: "#0a0703",
                boxShadow: `0 0 0 1px rgba(201,165,53,0.4), 0 8px 28px rgba(201,165,53,0.28), 0 2px 8px rgba(0,0,0,0.4)`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  `0 0 0 1px rgba(201,165,53,0.55), 0 12px 36px rgba(201,165,53,0.38), 0 2px 8px rgba(0,0,0,0.4)`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  `0 0 0 1px rgba(201,165,53,0.4), 0 8px 28px rgba(201,165,53,0.28), 0 2px 8px rgba(0,0,0,0.4)`;
              }}
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