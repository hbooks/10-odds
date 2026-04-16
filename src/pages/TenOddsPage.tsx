import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronDown, ChevronUp, RefreshCw, AlertCircle, Trophy, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase client (public anon key — read-only via RLS) ───────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────────────────────────
type PredictionResult = "PENDING" | "WIN" | "LOSS" | "HALF_WIN" | "HALF_LOSS" | "VOID";

interface SlipPick {
  id: number;
  pick_order: number;
  odds_at_time: number;
  prediction: {
    id: number;
    bet_type: string;
    selection: string;
    confidence_score: number;
    reasoning: string;
    status: PredictionResult;
  };
  match: {
    id: number;
    utc_date: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team: { name: string; tla: string | null; crest_url: string | null };
    away_team: { name: string; tla: string | null; crest_url: string | null };
    competition: { name: string; code: string };
  };
}

interface DailySlip {
  id: number;
  slip_date: string;
  total_odds: number;
  status: PredictionResult;
  picks: SlipPick[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<PredictionResult, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-muted/60 text-muted-foreground" },
  WIN:       { label: "Won ✓",     className: "bg-green-500/20 text-green-400" },
  LOSS:      { label: "Lost ✗",    className: "bg-red-500/20 text-red-400" },
  HALF_WIN:  { label: "½ Win",     className: "bg-yellow-500/20 text-yellow-400" },
  HALF_LOSS: { label: "½ Loss",    className: "bg-orange-500/20 text-orange-400" },
  VOID:      { label: "Void",      className: "bg-muted/40 text-muted-foreground" },
};

function formatKickOff(utcDate: string): string {
  return new Date(utcDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function ConfidenceDots({ score }: { score: number }) {
  const filled = Math.round(score * 5);
  return (
    <div className="flex gap-0.5" title={`${(score * 100).toFixed(0)}% confidence`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
            i < filled ? "bg-gold" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Supabase query ───────────────────────────────────────────────────────────
async function fetchTodaysSlip(): Promise<DailySlip | null> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Fetch the slip for today
  const { data: slipData, error: slipError } = await supabase
    .from("ten_odds_slips")
    .select("id, slip_date, total_odds, status")
    .eq("slip_date", today)
    .single();

  if (slipError || !slipData) return null;

  // Fetch picks with nested joins
  const { data: picksData, error: picksError } = await supabase
    .from("slip_picks")
    .select(`
      id,
      pick_order,
      odds_at_time,
      predictions (
        id,
        bet_type,
        selection,
        confidence_score,
        reasoning,
        status
      ),
      matches (
        id,
        utc_date,
        status,
        home_score,
        away_score,
        home_team:teams!matches_home_team_id_fkey ( name, tla, crest_url ),
        away_team:teams!matches_away_team_id_fkey ( name, tla, crest_url ),
        competition:competitions ( name, code )
      )
    `)
    .eq("slip_id", slipData.id)
    .order("pick_order");

  if (picksError || !picksData) return null;

  // Reshape to our interface
  const picks: SlipPick[] = (picksData as any[]).map((row) => ({
    id:           row.id,
    pick_order:   row.pick_order,
    odds_at_time: row.odds_at_time,
    prediction:   row.predictions,
    match:        row.matches,
  }));

  return { ...slipData, picks };
}

// ─── Component ────────────────────────────────────────────────────────────────
const TenOddsPage = () => {
  const [slip, setSlip] = useState<DailySlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadSlip = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTodaysSlip();
      if (!data) {
        setError("No slip generated for today yet. Check back soon — MK-806 runs daily.");
      }
      setSlip(data);
      setLastRefreshed(new Date());
    } catch (e) {
      setError("Failed to load today's slip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSlip(); }, []);

  // ── Render: loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <PageHeader />
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
            <Zap className="h-8 w-8 animate-pulse text-gold" />
            <p className="font-heading text-sm">MK-806 is loading today's slip…</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Render: error ────────────────────────────────────────────────────────
  if (error || !slip) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <PageHeader />
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground max-w-sm">{error ?? "No slip available."}</p>
            <button
              onClick={loadSlip}
              className="flex items-center gap-2 text-sm text-gold hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const slipStatus = STATUS_STYLES[slip.status] ?? STATUS_STYLES.PENDING;

  // ── Render: slip ─────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-1">
          <PageHeader />
          <button
            onClick={loadSlip}
            className="mt-1 p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <p className="text-muted-foreground text-sm">
            Today's AI-curated accumulator by{" "}
            <strong className="text-foreground">MK-806</strong>
            {" · "}
            <span className="text-xs">{formatDate(slip.slip_date)}</span>
          </p>
        </div>

        {/* ── Total odds banner ─────────────────────────────────────────── */}
        <div className="rounded-xl gradient-navy p-4 mb-6 flex items-center justify-between">
          <div>
            <span className="text-primary-foreground font-heading font-semibold">
              Combined Odds
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Trophy className="h-3.5 w-3.5 text-gold" />
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${slipStatus.className}`}>
                {slipStatus.label}
              </span>
            </div>
          </div>
          <span className="text-3xl font-heading font-bold text-gold tabular-nums">
            {slip.total_odds.toFixed(2)}
          </span>
        </div>

        {/* ── Picks list ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {slip.picks.map((pick, i) => {
            const isOpen = expanded === pick.id;
            const pred   = pick.prediction;
            const match  = pick.match;
            const pStatus = STATUS_STYLES[pred.status] ?? STATUS_STYLES.PENDING;
            const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
            const isFinished = match.status === "FINISHED";
            const scoreStr = isFinished || isLive
              ? `${match.home_score ?? 0} – ${match.away_score ?? 0}`
              : null;

            return (
              <motion.div
                key={pick.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : pick.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  {/* Pick number */}
                  <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full gradient-gold flex items-center justify-center text-[10px] font-bold text-accent-foreground">
                    {pick.pick_order}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Teams */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {match.home_team.crest_url && (
                        <img src={match.home_team.crest_url} alt="" className="h-4 w-4 object-contain" />
                      )}
                      <p className="font-heading font-semibold text-sm truncate">
                        {match.home_team.tla ?? match.home_team.name}
                        {" vs "}
                        {match.away_team.tla ?? match.away_team.name}
                      </p>
                      {match.away_team.crest_url && (
                        <img src={match.away_team.crest_url} alt="" className="h-4 w-4 object-contain" />
                      )}
                    </div>

                    {/* League · kick-off / score */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                      <span>{match.competition.name}</span>
                      <span>·</span>
                      {isLive ? (
                        <span className="text-green-400 flex items-center gap-0.5 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                          LIVE {scoreStr}
                        </span>
                      ) : isFinished ? (
                        <span className="font-medium">{scoreStr} FT</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatKickOff(match.utc_date)}
                        </span>
                      )}
                    </div>

                    {/* Bet label + confidence */}
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gold font-medium">{pred.selection}</p>
                      <ConfidenceDots score={pred.confidence_score} />
                    </div>
                  </div>

                  {/* Right column: odds + status */}
                  <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                    <span className="text-sm font-semibold bg-accent/15 text-gold px-2.5 py-0.5 rounded-full tabular-nums">
                      {pick.odds_at_time.toFixed(2)}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${pStatus.className}`}>
                      {pStatus.label}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    )}
                  </div>
                </button>

                {/* Expandable reasoning */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-border pt-3">
                        <p className="text-xs font-heading text-muted-foreground uppercase tracking-wide mb-1.5">
                          MK-806 Analysis
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {pred.reasoning}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground/60">
                          Confidence: {(pred.confidence_score * 100).toFixed(1)}%
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          Last updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {" · "}Predictions by MK-806 are for informational purposes only.
        </p>
      </div>
    </Layout>
  );
};

// ─── Sub-component ────────────────────────────────────────────────────────────
function PageHeader() {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold animate-pulse-gold">
        <Zap className="h-5 w-5 text-accent-foreground" />
      </div>
      <h1 className="text-3xl font-heading font-bold">
        10-Odds <span className="text-gold">Slip</span>
      </h1>
    </div>
  );
}

export default TenOddsPage;