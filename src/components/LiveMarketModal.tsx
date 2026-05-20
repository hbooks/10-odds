import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { ChevronDown, X } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────────────────────────
export type AvailableMatch = {
  bsd_match_id: number;
  match_name: string;
  competition_name?: string | null;
};

export type SelectedMarket = {
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (m: SelectedMarket) => void;
  availableMatches: AvailableMatch[];
};

// ─── All possible market types and their selections ───────────────────────────
// This allows the user to request a market even if it hasn't been created yet.
const ALL_MARKETS: Record<string, string[]> = {
  "1X2": ["Home", "Draw", "Away"],
  DC: ["Home or Draw", "Home or Away", "Draw or Away"],
  DNB: ["Home", "Away"],
  BTTS: ["Yes", "No"],
  OVER_UNDER: [
    "Over 0.5", "Over 1.5", "Over 2.5", "Over 3.5", "Over 4.5", "Over 5.5",
    "Under 0.5", "Under 1.5", "Under 2.5", "Under 3.5", "Under 4.5", "Under 5.5",
  ],
  CORNERS: [
    "Over 8.5", "Over 9.5", "Over 10.5",
    "Under 8.5", "Under 9.5", "Under 10.5",
  ],
  CARDS: [
    "Over 3.5", "Over 4.5", "Over 5.5",
    "Under 3.5", "Under 4.5", "Under 5.5",
  ],
  BTTS_AND_WIN: ["Home & Yes", "Away & Yes"],
  TIME_OF_FIRST_GOAL: ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90", "No Goal"],
  TOTAL_GOALS_BANDS: ["0-1", "2-3", "4-6", "7+"],
  EVEN_ODD: ["Even", "Odd"],
  CLEAN_SHEET: ["Home Yes", "Home No", "Away Yes", "Away No"],
  WIN_TO_NIL: ["Home Yes", "Away Yes"],
  PENALTY_AWARDED: ["Yes", "No"],
  RED_CARD: ["Yes", "No"],
  EXACT_TOTAL_GOALS: ["0", "1", "2", "3", "4", "5", "6+"],
};

const MARKET_TYPE_LABELS: Record<string, string> = {
  "1X2": "1X2 – Match Result",
  DC: "DC – Double Chance",
  DNB: "DNB – Draw No Bet",
  BTTS: "BTTS – Both Teams to Score",
  OVER_UNDER: "Over / Under Goals",
  CORNERS: "Corners",
  CARDS: "Cards",
  BTTS_AND_WIN: "BTTS & Win",
  TIME_OF_FIRST_GOAL: "Time of First Goal",
  TOTAL_GOALS_BANDS: "Total Goals Bands",
  EVEN_ODD: "Even / Odd Goals",
  CLEAN_SHEET: "Clean Sheet",
  WIN_TO_NIL: "Win to Nil",
  PENALTY_AWARDED: "Penalty Awarded",
  RED_CARD: "Red Card",
  EXACT_TOTAL_GOALS: "Exact Total Goals",
};

// ─── Styled select wrapper ────────────────────────────────────────────────────
function SelectField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  children,
  step,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  children: React.ReactNode;
  step: 1 | 2 | 3;
}) {
  const active = value !== "" && !disabled;
  const stepColors = ["#3b82f6", "#D4AF37", "#22c55e"];
  const accent = stepColors[step - 1];

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0"
          style={{
            background: active ? `${accent}22` : "rgba(255,255,255,0.06)",
            border: `1px solid ${active ? accent : "rgba(255,255,255,0.1)"}`,
            color: active ? accent : "rgba(255,255,255,0.3)",
          }}
        >
          {step}
        </span>
        <label
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}
        >
          {label}
        </label>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm transition-all outline-none"
          style={{
            background: disabled
              ? "rgba(255,255,255,0.03)"
              : active
              ? `rgba(${accent === "#D4AF37" ? "212,175,55" : accent === "#3b82f6" ? "59,130,246" : "34,197,94"},0.06)`
              : "rgba(255,255,255,0.05)",
            border: `1px solid ${
              disabled
                ? "rgba(255,255,255,0.05)"
                : active
                ? `${accent}50`
                : "rgba(255,255,255,0.1)"
            }`,
            color: disabled
              ? "rgba(255,255,255,0.2)"
              : value === ""
              ? "rgba(255,255,255,0.35)"
              : "rgba(255,255,255,0.9)",
            cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: active ? `0 0 0 1px ${accent}20, inset 0 1px 0 rgba(255,255,255,0.03)` : "none",
          }}
        >
          <option value="" style={{ background: "#0a0a0e" }}>
            {placeholder}
          </option>
          {children}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: 14,
            height: 14,
            color: disabled ? "rgba(255,255,255,0.15)" : active ? accent : "rgba(255,255,255,0.3)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function LiveMarketModal({
  isOpen,
  onClose,
  onSelect,
  availableMatches,
}: Props) {
  const [matchId, setMatchId] = useState<number | "">("");
  const [marketType, setMarketType] = useState<string>("");
  const [selection, setSelection] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // De-dupe matches
  const matches = useMemo(() => {
    const seen = new Map<number, AvailableMatch>();
    availableMatches.forEach((m) => seen.set(m.bsd_match_id, m));
    return [...seen.values()];
  }, [availableMatches]);

  const marketTypes = useMemo(() => Object.keys(ALL_MARKETS), []);
  const selections = useMemo(
    () => (marketType ? ALL_MARKETS[marketType] ?? [] : []),
    [marketType]
  );

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setMatchId("");
      setMarketType("");
      setSelection("");
      setError(null);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const canConfirm =
    matchId !== "" && marketType !== "" && selection !== "" && !submitting;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const match = matches.find((m) => m.bsd_match_id === matchId);
    if (!match) return;

    setSubmitting(true);
    setError(null);

    try {
      // Normalise selection to lowercase to match backend scoring functions
      const normalisedSelection = selection.toLowerCase();

      const { error: rpcErr } = await supabase.rpc("save_user_request", {
        p_bsd_match_id: match.bsd_match_id,
        p_market_type: marketType,
        p_market_selection: normalisedSelection,
      });
      if (rpcErr) {
        console.warn("[LiveMarketModal] RPC non-fatal:", rpcErr.message);
      }

      setSuccess(true);

      setTimeout(() => {
        onSelect({
          bsd_match_id: match.bsd_match_id,
          market_type: marketType,
          market_selection: normalisedSelection,
          match_name: match.match_name,
        });
        onClose();
      }, 800);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #0f0f15 0%, #08080d 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 -20px 80px rgba(212,175,55,0.08), 0 40px 120px rgba(0,0,0,0.8)",
            }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gold top accent line */}
            <div
              className="h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)",
              }}
            />

            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-1">
              <div>
                <h2
                  className="text-lg font-bold text-white"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Choose a Market
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Pick a match, market type, and selection to start tracking.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition ml-4 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 px-6"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 14, stiffness: 200 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                    style={{
                      background: "rgba(34,197,94,0.12)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      boxShadow: "0 0 40px rgba(34,197,94,0.15)",
                    }}
                  >
                    ✓
                  </motion.div>
                  <p className="text-white font-semibold text-base">Market locked in</p>
                  <p className="text-white/40 text-sm mt-1">Opening your chart…</p>
                </motion.div>
              ) : (
                <motion.div key="form" className="px-6 pb-6 pt-4 space-y-4">
                  {/* Step 1 – Match */}
                  <SelectField
                    label="Match"
                    value={matchId}
                    onChange={(v) => {
                      setMatchId(v === "" ? "" : Number(v));
                      setMarketType("");
                      setSelection("");
                    }}
                    placeholder="Select a live match…"
                    step={1}
                  >
                    {matches.map((m) => (
                      <option
                        key={m.bsd_match_id}
                        value={m.bsd_match_id}
                        style={{ background: "#0a0a0e" }}
                      >
                        {m.match_name}
                        {m.competition_name ? ` — ${m.competition_name}` : ""}
                      </option>
                    ))}
                  </SelectField>

                  {/* Step 2 – Market type */}
                  <SelectField
                    label="Market Type"
                    value={marketType}
                    onChange={(v) => {
                      setMarketType(v);
                      setSelection("");
                    }}
                    disabled={matchId === ""}
                    placeholder="Select market type…"
                    step={2}
                  >
                    {marketTypes.map((t) => (
                      <option key={t} value={t} style={{ background: "#0a0a0e" }}>
                        {MARKET_TYPE_LABELS[t] ?? t}
                      </option>
                    ))}
                  </SelectField>

                  {/* Step 3 – Selection */}
                  <SelectField
                    label="Selection"
                    value={selection}
                    onChange={setSelection}
                    disabled={!marketType}
                    placeholder="Select your pick…"
                    step={3}
                  >
                    {selections.map((s) => (
                      <option key={s} value={s} style={{ background: "#0a0a0e" }}>
                        {s}
                      </option>
                    ))}
                  </SelectField>

                  {/* Summary preview */}
                  <AnimatePresence>
                    {canConfirm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="rounded-xl px-4 py-3 text-sm"
                          style={{
                            background: "rgba(212,175,55,0.06)",
                            border: "1px solid rgba(212,175,55,0.2)",
                          }}
                        >
                          <p className="text-white/50 text-xs mb-1 uppercase tracking-wider font-semibold">
                            Tracking
                          </p>
                          <p className="text-white font-medium">
                            {matches.find((m) => m.bsd_match_id === matchId)?.match_name}
                          </p>
                          <p className="text-white/50 text-xs mt-0.5">
                            {MARKET_TYPE_LABELS[marketType] ?? marketType}{" "}
                            <span style={{ color: "#D4AF37" }}>→ {selection}</span>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 flex items-center justify-between gap-3"
                      >
                        <span>{error}</span>
                        <button
                          onClick={() => setError(null)}
                          className="text-rose-300/60 hover:text-rose-200 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* CTA */}
                  <button
                    disabled={!canConfirm}
                    onClick={handleConfirm}
                    className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-widest transition-all"
                    style={{
                      background: canConfirm
                        ? "linear-gradient(135deg, #D4AF37, #b8972a)"
                        : "rgba(255,255,255,0.06)",
                      color: canConfirm ? "#000" : "rgba(255,255,255,0.25)",
                      boxShadow: canConfirm ? "0 0 30px rgba(212,175,55,0.3)" : "none",
                      cursor: canConfirm ? "pointer" : "not-allowed",
                    }}
                  >
                    {submitting ? "Starting…" : "Watch Live →"}
                  </button>

                  <p className="text-center text-[10px] text-white/20">
                    New markets may take up to 3 minutes to show their first candle.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}