import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  AlertCircle,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";
import { getAnimalByLabel } from "@/lib/patternAnimals";
import AnimalIcon from "@/components/AnimalIcon";
import PatternQuickLook from "@/components/PatternQuickLook";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Types ────────────────────────────────────────────────────────────────────
type PatternType = "WIN" | "LOSS" | "NEUTRAL" | "INSUFFICIENT_DATA";

interface PatternRow {
  id: number;
  pattern_label: string;
  total_predictions: number;
  wins: number;
  losses: number;
  win_rate: number;
  pattern_type: PatternType;
  avg_odds: number;
  updated_at: string;
}

type SortKey = keyof Pick<
  PatternRow,
  "pattern_label" | "total_predictions" | "win_rate" | "avg_odds"
>;

// ─── Pattern type config (icon + color) ───────────────────────────────────────
const PATTERN_CONFIG: Record<
  PatternType,
  { label: string; icon: React.ElementType; className: string; dot: string; color: string }
> = {
  WIN: {
    label: "WIN",
    icon: TrendingUp,
    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    dot: "bg-emerald-400",
    color: "#34d399",
  },
  LOSS: {
    label: "LOSS",
    icon: TrendingDown,
    className: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
    dot: "bg-rose-400",
    color: "#fb7185",
  },
  NEUTRAL: {
    label: "NEUTRAL",
    icon: Minus,
    className: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    dot: "bg-amber-400",
    color: "#fbbf24",
  },
  INSUFFICIENT_DATA: {
    label: "INSUFFICIENT",
    icon: HelpCircle,
    className: "bg-muted/50 text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    color: "#9ca3af",
  },
};

// ─── Badge (unchanged) ────────────────────────────────────────────────────────
function PatternBadge({ type }: { type: PatternType }) {
  const cfg = PATTERN_CONFIG[type] ?? PATTERN_CONFIG.INSUFFICIENT_DATA;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.className}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── Win rate bar (unchanged) ─────────────────────────────────────────────────
function WinRateBar({ rate, type }: { rate: number; type: PatternType }) {
  const color =
    type === "WIN" ? "bg-emerald-400"
    : type === "LOSS" ? "bg-rose-400"
    : type === "NEUTRAL" ? "bg-amber-400"
    : "bg-muted-foreground/50";

  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span
        className="text-xs font-mono font-semibold tabular-nums w-10 text-right"
        style={{
          color:
            type === "WIN" ? "#34d399"
            : type === "LOSS" ? "#fb7185"
            : type === "NEUTRAL" ? "#fbbf24"
            : undefined,
        }}
      >
        {rate.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Sort icon (unchanged) ────────────────────────────────────────────────────
function SortIcon({
  col,
  active,
  dir,
}: {
  col: SortKey;
  active: SortKey;
  dir: "asc" | "desc";
}) {
  if (col !== active) return <ChevronUp className="h-3 w-3 opacity-20" />;
  return dir === "asc" ? (
    <ChevronUp className="h-3 w-3 text-gold" />
  ) : (
    <ChevronDown className="h-3 w-3 text-gold" />
  );
}

// ─── Summary stat (unchanged) ─────────────────────────────────────────────────
function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className="text-xl font-heading font-bold tabular-nums"
        style={{ color: color ?? "inherit" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const PatternAnalyserPage = () => {
  const [rows, setRows]       = useState<PatternRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("total_predictions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter]   = useState<PatternType | "ALL">("ALL");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("pattern_analysis")
        .select("*")
        .order("total_predictions", { ascending: false });

      if (err) throw err;
      setRows((data as PatternRow[]) ?? []);

      const latest = (data as PatternRow[])?.reduce((max, r) =>
        r.updated_at > max ? r.updated_at : max, ""
      );
      if (latest) {
        setLastUpdated(
          new Date(latest).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })
        );
      }
    } catch {
      setError("Failed to load pattern data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...rows]
    .filter((r) => filter === "ALL" || r.pattern_type === filter)
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const counts = {
    WIN:              rows.filter((r) => r.pattern_type === "WIN").length,
    LOSS:             rows.filter((r) => r.pattern_type === "LOSS").length,
    NEUTRAL:          rows.filter((r) => r.pattern_type === "NEUTRAL").length,
    INSUFFICIENT_DATA:rows.filter((r) => r.pattern_type === "INSUFFICIENT_DATA").length,
  };
  const totalPreds = rows.reduce((s, r) => s + r.total_predictions, 0);
  const avgWinRate =
    rows.length > 0
      ? (rows.reduce((s, r) => s + r.win_rate, 0) / rows.length).toFixed(1)
      : "—";

  const Th = ({
    col,
    children,
    className = "",
  }: {
    col: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none ${className}`}
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon col={col} active={sortKey} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-1"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
              <Brain className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold">
                Pattern <span className="text-gold">Analyser</span>
              </h1>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors mt-1"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-sm mb-6 pl-[52px]"
        >
          Prediction's pattern performance — derived from all resolved predictions
          {lastUpdated && (
            <span className="ml-2 text-xs text-muted-foreground/60">
              · updated {lastUpdated}
            </span>
          )}
        </motion.p>

        {!loading && !error && rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl gradient-navy p-5 mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4"
          >
            <SummaryStat label="Total Patterns" value={rows.length} color="#fcfdf0ff" />
            <SummaryStat label="Total Predictions" value={totalPreds} color="#bed3e0ff" />
            <SummaryStat label="Avg Win Rate" value={`${avgWinRate}%`} color="#34d399" />
            <SummaryStat label="WIN Patterns"  value={counts.WIN}  color="#34d399" />
            <SummaryStat label="LOSS Patterns" value={counts.LOSS} color="#fb7185" />
            <SummaryStat label="Neutral / Unknown" value={counts.NEUTRAL + counts.INSUFFICIENT_DATA} color="#e2a429ff" />
          </motion.div>
        )}

        {!loading && !error && rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 mb-4"
          >
            {(["ALL", "WIN", "LOSS", "NEUTRAL", "INSUFFICIENT_DATA"] as const).map((f) => {
              const active = filter === f;
              const cfg    = f === "ALL" ? null : PATTERN_CONFIG[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border ${
                    active
                      ? "border-gold text-gold bg-gold/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {f === "ALL" ? "All Patterns" : cfg?.label ?? f}
                  {f !== "ALL" && (
                    <span className="ml-1.5 opacity-70">
                      ({f === "INSUFFICIENT_DATA"
                        ? counts.INSUFFICIENT_DATA
                        : counts[f as Exclude<typeof f, "ALL">]})
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4 py-24">
            <RefreshCw className="h-7 w-7 animate-spin text-gold" />
            <p className="text-sm text-muted-foreground">Loading pattern data…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <button onClick={load} className="text-sm text-gold hover:underline">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>No pattern data yet. Run <code className="text-xs bg-muted px-1.5 py-0.5 rounded">update_patterns.py</code> after predictions have resolved.</p>
          </div>
        )}

        <AnimatePresence>
          {!loading && !error && sorted.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <Th col="pattern_label">Animal / Pattern</Th>
                      <Th col="total_predictions" className="hidden sm:table-cell">Predictions</Th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                        Wins / Losses
                      </th>
                      <Th col="win_rate">Win Rate</Th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Pattern Type
                      </th>
                      <Th col="avg_odds" className="hidden lg:table-cell">Avg Odds</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row, i) => {
                      const cfg = PATTERN_CONFIG[row.pattern_type] ?? PATTERN_CONFIG.INSUFFICIENT_DATA;
                      const animal = getAnimalByLabel(row.pattern_label);
                      const TypeIcon = cfg.icon; // the lucide icon for this pattern type
                      return (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/25 transition-colors"
                          style={{ borderLeft: `2px solid ${cfg.color}`, borderLeftWidth: "3px" }}
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              {/* ★ Pattern type direction arrow – now the main visual cue */}
                              <motion.div
                                whileHover={{ scale: 1.15, rotate: 5 }}
                                transition={{ type: "spring", stiffness: 400 }}
                                className="shrink-0"
                              >
                                <TypeIcon className="h-5 w-5" style={{ color: cfg.color }} />
                              </motion.div>

                              {animal ? (
                                <>
                                  <AnimalIcon animal={animal.animal} size={20} className="text-foreground" />
                                  <div>
                                    <span className="font-semibold text-foreground">{animal.animal} Pattern</span>
                                    {/* original label hidden for clarity */}
                                  </div>
                                </>
                              ) : (
                                <span className="font-mono text-xs font-medium text-foreground">{row.pattern_label}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 hidden sm:table-cell">
                            <span className="font-heading font-bold text-foreground tabular-nums">
                              {row.total_predictions}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">preds</span>
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                              <span className="text-emerald-400">{Number(row.wins).toFixed(1)}W</span>
                              <span className="text-muted-foreground/40">/</span>
                              <span className="text-rose-400">{Number(row.losses).toFixed(1)}L</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <WinRateBar rate={row.win_rate} type={row.pattern_type} />
                          </td>
                          <td className="px-4 py-3.5">
                            <PatternBadge type={row.pattern_type} />
                          </td>
                          <td className="px-4 py-3.5 hidden lg:table-cell">
                            <span className="font-mono text-xs text-gold tabular-nums">
                              {Number(row.avg_odds).toFixed(2)}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-between">
                <span>
                  Showing {sorted.length} of {rows.length} patterns
                </span>
                <span>
                  Patterns updated daily by MK-806 aggregator
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !error && rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground"
          >
            <span className="font-semibold text-foreground">Legend:</span>
            <span><span className="text-emerald-400 font-medium">WIN</span> = win rate ≥ 55% (min 5 predictions)</span>
            <span><span className="text-rose-400 font-medium">LOSS</span> = win rate ≤ 45%</span>
            <span><span className="text-amber-400 font-medium">NEUTRAL</span> = 45–55%</span>
            <span><span className="text-muted-foreground font-medium">INSUFFICIENT</span> = {"<"} 5 predictions</span>
          </motion.div>
        )}
      </div>
      <PatternQuickLook />
    </Layout>
  );
};

export default PatternAnalyserPage;