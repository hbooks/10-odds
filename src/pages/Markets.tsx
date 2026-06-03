import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import LiveMarketModal, { type AvailableMatch, type SelectedMarket } from "@/components/LiveMarketModal";
import {
  RefreshCw, TrendingUp, BookOpen, CheckCircle, ArrowLeft,
  Radio, Plus, Wifi, WifiOff, RotateCcw, Activity, Zap,
} from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ──────────────────────────────────────────────────────────────────────
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

// ─── Error classifier ────────────────────────────────────────────────────────────
interface FriendlyError {
  icon:    "wifi-off" | "server" | "clock" | "warning";
  title:   string;
  reason:  string;
  tip:     string;
}

function classifyError(raw: string): FriendlyError {
  const msg = raw.toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
    return { icon: "wifi-off", title: "No connection", reason: "Your device couldn't reach 10 Odds servers.", tip: "Check your internet and try refreshing." };
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return { icon: "clock", title: "Request timed out", reason: "The server took too long to respond.", tip: "This is usually temporary — try again." };
  }
  if (msg.includes("500") || msg.includes("internal") || msg.includes("pgrst")) {
    return { icon: "server", title: "Server error", reason: "Something went wrong on our end.", tip: "We've been notified. Please try again shortly." };
  }
  if (msg.includes("jwt") || msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) {
    return { icon: "warning", title: "Access error", reason: "Your session may have expired.", tip: "Refresh the page to restore your session." };
  }
  return { icon: "warning", title: "Something went wrong", reason: "We couldn't load the live market data.", tip: "Try refreshing — this is usually temporary." };
}

// ─── Design tokens ──────────────────────────────────────────────────────────────
const GOLD         = "#C9A535";
const GOLD_BRIGHT  = "#E8C050";
const BG           = "#07080A";
const SURFACE_1    = "rgba(255,255,255,0.028)";
const SURFACE_2    = "rgba(255,255,255,0.045)";
const BORDER_DIM   = "rgba(255,255,255,0.06)";
const BORDER_MID   = "rgba(255,255,255,0.10)";
const BORDER_GOLD  = "rgba(201,165,53,0.30)";
const GREEN        = "#22C55E";
const RED_SOFT     = "#F87171";

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatKenyaTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
  } catch { return "—"; }
}

function splitMatchName(name: string): [string, string] {
  const idx = name.indexOf(" vs ");
  if (idx === -1) return [name, ""];
  return [name.slice(0, idx), name.slice(idx + 4)];
}

function confidenceColor(c: number): string {
  if (c >= 65) return GREEN;
  if (c <= 35) return RED_SOFT;
  return GOLD;
}
function confidenceLabel(c: number): string {
  if (c >= 65) return "HIGH";
  if (c <= 35) return "LOW";
  return "MID";
}

// ─── Components ─────────────────────────────────────────────────────────────────

/** Blinking live dot */
function PulseDot({ color = GREEN }: { color?: string }) {
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
      background: color, flexShrink: 0,
      animation: "pulse 2s ease-in-out infinite",
    }} />
  );
}

/** Confidence bar – thin horizontal fill */
function ConfBar({ value }: { value: number }) {
  const color = confidenceColor(value);
  return (
    <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
      <motion.div
        style={{ height: "100%", background: color, borderRadius: 99 }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

/** Single market chip */
function MarketPill({ market, onClick }: { market: MarketRow; onClick: (m: MarketRow) => void }) {
  const color = confidenceColor(market.confidence);
  const label = confidenceLabel(market.confidence);
  return (
    <motion.button
      onClick={() => onClick(market)}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px",
        borderRadius: 10, textAlign: "left", cursor: "pointer",
        background: `${color}0D`, border: `1px solid ${color}28`,
        minWidth: 100, flexShrink: 0,
        transition: "box-shadow 0.18s",
      }}
      title={`${market.market_type} · ${market.market_selection} · ${market.confidence.toFixed(0)}%`}
    >
      {/* Top row: type + score */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace" }}>
          {market.market_type}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, color, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.04em" }}>
          {market.confidence.toFixed(0)}%
        </span>
      </div>
      {/* Selection */}
      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", textTransform: "capitalize", lineHeight: 1.3 }}>
        {market.market_selection}
      </span>
      {/* Bar + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }}><ConfBar value={market.confidence} /></div>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: `${color}99`, fontFamily: "'IBM Plex Mono', monospace" }}>
          {label}
        </span>
      </div>
    </motion.button>
  );
}

/** Divider with label */
function Ticker({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${BORDER_GOLD}, transparent)` }} />
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
        color: `${GOLD}88`, fontFamily: "'IBM Plex Mono', monospace",
        padding: "3px 8px", borderRadius: 4,
        background: `${GOLD}0A`, border: `1px solid ${GOLD}20`,
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, transparent, ${BORDER_GOLD})` }} />
    </div>
  );
}

/** Live minute badge */
function LiveBadge({ minute }: { minute: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 6,
      background: `${GREEN}10`, border: `1px solid ${GREEN}28`,
      flexShrink: 0,
    }}>
      <PulseDot />
      <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.04em" }}>
        {minute}′
      </span>
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
  const isLive = match.current_minute > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      style={{
        borderRadius: 14,
        background: `linear-gradient(145deg, ${SURFACE_2}, ${SURFACE_1})`,
        border: `1px solid ${isLive ? "rgba(34,197,94,0.15)" : BORDER_DIM}`,
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isLive ? "rgba(34,197,94,0.28)" : BORDER_MID;
        (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 32px rgba(0,0,0,0.28)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isLive ? "rgba(34,197,94,0.15)" : BORDER_DIM;
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Gold accent line on tracked cards */}
      <div style={{ height: 1.5, background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)` }} />

      {/* Header */}
      <div style={{
        padding: "14px 16px",
        borderBottom: `1px solid ${BORDER_DIM}`,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Teams + score */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.92)", lineHeight: 1.3 }}>{home}</span>
            {away && (
              <>
                <div style={{
                  display: "flex", alignItems: "center", gap: 3,
                  padding: "3px 10px", borderRadius: 7, flexShrink: 0,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 800, color: "white", letterSpacing: "0.06em" }}>
                    {match.home_score}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, margin: "0 1px" }}>—</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 800, color: "white", letterSpacing: "0.06em" }}>
                    {match.away_score}
                  </span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.92)", lineHeight: 1.3 }}>{away}</span>
              </>
            )}
          </div>
          {/* Meta: competition + KO */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
            {match.competition_name && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", fontWeight: 500 }}>
                {match.competition_name}
              </span>
            )}
            {match.competition_name && <span style={{ color: "rgba(255,255,255,0.12)", fontSize: 10 }}>·</span>}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: "'IBM Plex Mono', monospace" }}>
              KO {formatKenyaTime(match.kickoff_utc)}
            </span>
          </div>
        </div>
        {isLive && <LiveBadge minute={match.current_minute} />}
      </div>

      {/* Markets */}
      {match.markets.length > 0 && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Activity size={11} color={`${GOLD}80`} />
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase", color: `${GOLD}70`,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              Tracked markets
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {match.markets.map((m) => (
              <MarketPill key={`${m.market_type}-${m.market_selection}`} market={m} onClick={onPickMarket} />
            ))}
          </div>
        </div>
      )}
    </motion.article>
  );
}

// ─── Untracked card ───────────────────────────────────────────────────────────────
function UntrackedCard({ match, index, onTrack }: { match: LiveStatsRow; index: number; onTrack: () => void }) {
  const [home, away] = splitMatchName(match.match_name);
  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      style={{
        borderRadius: 12, overflow: "hidden",
        background: SURFACE_1, border: `1px solid ${BORDER_DIM}`,
        transition: "border-color 0.18s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BORDER_MID; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BORDER_DIM; }}
    >
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{home}</span>
            {away && (
              <>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700,
                  color: "rgba(255,255,255,0.45)", padding: "2px 7px", borderRadius: 5,
                  background: "rgba(255,255,255,0.05)", letterSpacing: "0.06em", flexShrink: 0,
                }}>
                  {match.home_score}:{match.away_score}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{away}</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            {match.competition_name && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{match.competition_name}</span>
            )}
            {match.current_minute > 0 && (
              <>
                {match.competition_name && <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>}
                <span style={{ fontSize: 11, color: `${GREEN}88`, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                  {match.current_minute}′
                </span>
              </>
            )}
          </div>
        </div>

        <motion.button
          onClick={onTrack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 8, flexShrink: 0,
            background: `${GOLD}10`, border: `1px solid ${GOLD}30`,
            color: GOLD, fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = `${GOLD}1A`;
            (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}55`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = `${GOLD}10`;
            (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}30`;
          }}
        >
          <Plus size={11} />
          TRACK
        </motion.button>
      </div>
    </motion.article>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
      style={{ borderRadius: 14, border: `1px solid ${BORDER_DIM}`, overflow: "hidden" }}>
      <div style={{ height: 1.5, background: "rgba(255,255,255,0.04)" }} />
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER_DIM}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          {[108, 48, 90].map((w, i) => (
            <div key={i} style={{ height: 14, width: w, borderRadius: 6, background: "rgba(255,255,255,0.05)", animation: `shimmer 1.6s ease-in-out ${i * 0.12}s infinite alternate` }} />
          ))}
        </div>
        <div style={{ height: 10, width: 140, borderRadius: 4, background: "rgba(255,255,255,0.03)", animation: "shimmer 1.6s ease-in-out 0.2s infinite alternate" }} />
      </div>
      <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
        {[96, 110, 88].map((w, i) => (
          <div key={i} style={{ height: 64, width: w, borderRadius: 10, background: "rgba(255,255,255,0.04)", animation: `shimmer 1.6s ease-in-out ${i * 0.15}s infinite alternate` }} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────────
function ErrorState({ raw, onRetry }: { raw: string; onRetry: () => void }) {
  const err = classifyError(raw);
  const colorMap = { "wifi-off": "#FB923C", server: RED_SOFT, clock: GOLD, warning: "#FBBF24" };
  const color = colorMap[err.icon] ?? GOLD;
  const IconComp = { "wifi-off": WifiOff, server: Radio, clock: RefreshCw, warning: Radio }[err.icon];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ borderRadius: 14, background: SURFACE_1, border: `1px solid ${BORDER_DIM}`, overflow: "hidden" }}>
      <div style={{ height: 1.5, background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
      <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}12`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconComp size={20} color={color} />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>{err.title}</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, maxWidth: 260 }}>{err.reason}</p>
        </div>
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_DIM}`, fontSize: 12, color: "rgba(255,255,255,0.38)", width: "100%", textAlign: "left" }}>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>↳ </span>{err.tip}
        </div>
        <div style={{ display: "flex", gap: 8, width: "100%", flexWrap: "wrap" }}>
          <motion.button onClick={onRetry} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 10, cursor: "pointer", background: `${color}14`, border: `1px solid ${color}2a`, color, fontSize: 12, fontWeight: 700 }}>
            <RotateCcw size={13} /> Try again
          </motion.button>
          <motion.button onClick={() => window.location.reload()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_DIM}`, color: "rgba(255,255,255,0.38)", fontSize: 12, fontWeight: 600 }}>
            <RefreshCw size={13} /> Reload
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 0", textAlign: "center", gap: 18 }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>No live markets yet</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", lineHeight: 1.6, maxWidth: 180 }}>
          Markets appear here once games kick off and you start tracking.
        </p>
      </div>
      <motion.button onClick={() => window.location.reload()} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_DIM}`, color: "rgba(255,255,255,0.38)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        <RefreshCw size={12} /> Check again
      </motion.button>
    </motion.div>
  );
}

// ─── Stat pill (header bar) ───────────────────────────────────────────────────────
function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2,
      padding: "8px 14px", borderRadius: 10,
      background: SURFACE_1, border: `1px solid ${BORDER_DIM}`,
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: accent ?? "rgba(255,255,255,0.82)", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────────
export default function Markets() {
  const navigate = useNavigate();
  const [marketRows,  setMarketRows]  = useState<MarketRow[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveStatsRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [{ data: markets, error: mErr }, { data: stats, error: sErr }] = await Promise.all([
        supabase.from("live_market_data")
          .select("bsd_match_id,market_type,market_selection,match_name,competition_name,kickoff_utc,status,confidence,home_score,away_score,current_minute,last_updated")
          .eq("status", "active").order("kickoff_utc", { ascending: true }),
        supabase.from("live_stats")
          .select("bsd_match_id,match_name,competition_name,kickoff_utc,home_score,away_score,current_minute,period")
          .neq("period", "FT").order("kickoff_utc", { ascending: true }),
      ]);
      if (mErr) throw mErr;
      if (sErr) throw sErr;
      setMarketRows((markets as MarketRow[]) ?? []);
      setLiveMatches((stats as LiveStatsRow[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel("markets-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_market_data" }, () => fetchData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [fetchData]);

  const trackedMatches = useMemo(() => {
    const map = new Map<number, MarketRow[]>();
    marketRows.forEach((r) => { const l = map.get(r.bsd_match_id) ?? []; l.push(r); map.set(r.bsd_match_id, l); });
    return Array.from(map.entries()).map(([id, markets]) => {
      const f = markets[0];
      return { bsd_match_id: id, match_name: f.match_name, competition_name: f.competition_name, kickoff_utc: f.kickoff_utc, home_score: f.home_score ?? 0, away_score: f.away_score ?? 0, current_minute: f.current_minute ?? 0, markets };
    });
  }, [marketRows]);

  const untrackedMatches = useMemo(
    () => liveMatches.filter((m) => !trackedMatches.some((t) => t.bsd_match_id === m.bsd_match_id)),
    [liveMatches, trackedMatches]
  );

  const modalMatches: AvailableMatch[] = useMemo(
    () => liveMatches.map((m) => ({ bsd_match_id: m.bsd_match_id, match_name: m.match_name, competition_name: m.competition_name })),
    [liveMatches]
  );

  const handleSelectMarket = (market: SelectedMarket) => {
    navigate(`/chart?match=${market.bsd_match_id}&type=${encodeURIComponent(market.market_type)}&sel=${encodeURIComponent(market.market_selection)}&name=${encodeURIComponent(market.match_name)}`);
  };
  const handlePickTrackedMarket = (m: MarketRow) => {
    navigate(`/chart?match=${m.bsd_match_id}&type=${encodeURIComponent(m.market_type)}&sel=${encodeURIComponent(m.market_selection)}&name=${encodeURIComponent(m.match_name)}`);
  };

  const isEmpty   = !loading && !error && trackedMatches.length === 0 && liveMatches.length === 0;
  const liveCount = liveMatches.length;
  const totalMarkets = marketRows.length;
  const avgConf = totalMarkets > 0 ? Math.round(marketRows.reduce((a, r) => a + r.confidence, 0) / totalMarkets) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800;900&display=swap');

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.7); }
        }
        @keyframes shimmer {
          0%   { opacity: 0.4; }
          100% { opacity: 0.7; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,165,53,0.18); border-radius: 99px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: BG, color: "white", fontFamily: "'Sora', 'Segoe UI', sans-serif", position: "relative", overflow: "hidden" }}>

        {/* ── Background grid texture ── */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(201,165,53,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,165,53,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }} />

        {/* ── Radial spotlight top ── */}
        <div style={{
          position: "fixed", top: -180, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 360,
          background: `radial-gradient(ellipse at center, ${GOLD}10 0%, transparent 70%)`,
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* ── Navbar ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 30,
          height: 52,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          background: "rgba(7,8,10,0.88)",
          borderBottom: `1px solid ${BORDER_DIM}`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to="/games" aria-label="Back" style={{
              width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_DIM}`,
              transition: "color 0.15s, border-color 0.15s", textDecoration: "none",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; (e.currentTarget as HTMLElement).style.borderColor = BORDER_MID; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; (e.currentTarget as HTMLElement).style.borderColor = BORDER_DIM; }}>
              <ArrowLeft size={14} />
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Logo mark */}
              <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}08)`, border: `1px solid ${GOLD}35` }}>
                <TrendingUp size={13} color={GOLD} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.02em", fontFamily: "'Sora', sans-serif" }}>
                Live Markets
              </span>
              {liveCount > 0 && !loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 5, background: `${GREEN}10`, border: `1px solid ${GREEN}25` }}>
                  <PulseDot />
                  <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, fontFamily: "'IBM Plex Mono', monospace" }}>{liveCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {[
              { to: "/closed", icon: <CheckCircle size={14} />, label: "Closed" },
              { to: "/guide#ch-07", icon: <BookOpen size={14} />, label: "Guide" },
            ].map(({ to, icon, label }) => (
              <Link key={to} to={to} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8,
                fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.32)",
                textDecoration: "none", transition: "color 0.15s, background 0.15s",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.32)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                {icon}
                <span className="hidden sm:inline" style={{ display: "none" }}>{label}</span>
              </Link>
            ))}

            {/* Realtime badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", marginLeft: 4, borderRadius: 7, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.14)" }}>
              <Wifi size={12} color={`${GREEN}99`} />
              <span style={{ fontSize: 9, fontWeight: 700, color: `${GREEN}88`, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em" }}>RT</span>
            </div>
          </nav>
        </header>

        {/* ── Page ── */}
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px 120px", position: "relative", zIndex: 1 }}>

          {/* ── Hero header ── */}
          <div style={{ marginBottom: 28 }}>
            {/* Title row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1, color: GOLD_BRIGHT, fontFamily: "'Sora', sans-serif" }}>
                    10 Odds
                  </h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, background: `${GOLD}10`, border: `1px solid ${GOLD}28` }}>
                    <Zap size={9} color={`${GOLD}AA`} />
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: `${GOLD}AA`, fontFamily: "'IBM Plex Mono', monospace" }}>MARKETS</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", lineHeight: 1.6, maxWidth: 300 }}>
                  Real-time win probability for live football markets. Track, analyse, and act with precision.
                </p>
              </div>

              {/* Refresh btn */}
              <motion.button
                onClick={() => fetchData(true)}
                disabled={refreshing || loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_DIM}`,
                  cursor: refreshing || loading ? "not-allowed" : "pointer",
                  opacity: refreshing || loading ? 0.35 : 1, transition: "opacity 0.15s",
                }}
                aria-label="Refresh"
              >
                <RefreshCw size={14} color="rgba(255,255,255,0.4)" style={refreshing ? { animation: "spin 0.8s linear infinite" } : {}} />
              </motion.button>
            </div>

            {/* Stats row */}
            {!loading && !error && (liveCount > 0 || totalMarkets > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatPill label="Live games" value={liveCount} accent={liveCount > 0 ? GREEN : undefined} />
                <StatPill label="Tracked mkts" value={totalMarkets} accent={totalMarkets > 0 ? GOLD : undefined} />
                {totalMarkets > 0 && <StatPill label="Avg confidence" value={`${avgConf}%`} accent={confidenceColor(avgConf)} />}
              </motion.div>
            )}
          </div>

          {/* ── Content states ── */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[0, 0.08, 0.15].map((d, i) => <SkeletonCard key={i} delay={d} />)}
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
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Tracked section */}
                {trackedMatches.length > 0 && (
                  <section>
                    <Ticker>Tracked · {trackedMatches.length} match{trackedMatches.length !== 1 ? "es" : ""}</Ticker>
                    <AnimatePresence initial={false}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {trackedMatches.map((match, i) => (
                          <MatchCard key={match.bsd_match_id} match={match} index={i} onPickMarket={handlePickTrackedMarket} />
                        ))}
                      </div>
                    </AnimatePresence>
                  </section>
                )}

                {/* Untracked section */}
                {untrackedMatches.length > 0 && (
                  <section>
                    <Ticker>Live · not tracked · {untrackedMatches.length}</Ticker>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {untrackedMatches.map((m, i) => (
                        <UntrackedCard key={m.bsd_match_id} match={m} index={i} onTrack={() => setModalOpen(true)} />
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── FAB — position unchanged ── */}
        <AnimatePresence>
          {!loading && (
            <motion.button
              initial={{ opacity: 0, y: 16, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              onClick={() => setModalOpen(true)}
              aria-label="Track a new market"
              style={{
                position: "fixed", bottom: 96, right: 20,
                zIndex: 40,
                display: "flex", alignItems: "center", gap: 7,
                padding: "11px 18px", borderRadius: 14,
                background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD} 55%, #A8892A)`,
                color: "#080500",
                fontSize: 12, fontWeight: 800, letterSpacing: "0.05em",
                fontFamily: "'IBM Plex Mono', monospace",
                boxShadow: `0 0 0 1px rgba(201,165,53,0.45), 0 10px 32px rgba(201,165,53,0.28), 0 2px 8px rgba(0,0,0,0.5)`,
                cursor: "pointer", border: "none",
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: `0 0 0 1px rgba(201,165,53,0.65), 0 14px 40px rgba(201,165,53,0.42)`,
              }}
              whileTap={{ scale: 0.96 }}
            >
              <Plus size={14} strokeWidth={2.5} />
              TRACK A MARKET
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
