import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// Base URL for edge functions – same as used elsewhere in your project
const FUNCTIONS_BASE =
  (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string) ??
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

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

const selectClasses =
  "w-full rounded-xl bg-[#0a0a0e] border border-white/15 text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-[#D4AF37] transition disabled:opacity-40 appearance-none";

// Static list of all market types and selections
const ALL_MARKET_TYPES: Record<string, string[]> = {
  "1X2": ["home", "draw", "away"],
  DC: ["1x", "12", "x2"],
  DNB: ["home", "away"],
  BTTS: ["yes", "no"],
  OVER_UNDER: [
    "over 0.5", "over 1.5", "over 2.5", "over 3.5", "over 4.5", "over 5.5", "over 6.5",
    "under 0.5", "under 1.5", "under 2.5", "under 3.5", "under 4.5", "under 5.5", "under 6.5",
  ],
  CORNERS: ["over 8.5", "over 9.5", "over 10.5", "under 8.5", "under 9.5", "under 10.5"],
  CARDS: ["over 3.5", "over 4.5", "over 5.5", "under 3.5", "under 4.5", "under 5.5"],
  TIME_OF_FIRST_GOAL: ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90", "no goal"],
  TOTAL_GOALS_BANDS: ["0-1", "2-3", "4-6", "7+"],
  EVEN_ODD: ["even", "odd"],
  CLEAN_SHEET: ["home yes", "home no", "away yes", "away no"],
  WIN_TO_NIL: ["home yes", "home no", "away yes", "away no"],
  PENALTY_AWARDED: ["yes", "no"],
  RED_CARD: ["yes", "no"],
  OWN_GOAL: ["yes", "no"],
  EXACT_TOTAL_GOALS: ["0", "1", "2", "3", "4", "5", "6+"],
};

export default function LiveMarketModal({ isOpen, onClose, onSelect, availableMatches }: Props) {
  const [matchId, setMatchId] = useState<number | "">("");
  const [marketType, setMarketType] = useState<string>("");
  const [selection, setSelection] = useState<string>("");
  const [dynamicSelections, setDynamicSelections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [creating, setCreating] = useState(false); // ← building chart state

  // Deduplicate matches
  const matches = useMemo(() => {
    const seen = new Map<number, AvailableMatch>();
    availableMatches.forEach((m) => seen.set(m.bsd_match_id, m));
    return [...seen.values()];
  }, [availableMatches]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMatchId("");
      setMarketType("");
      setSelection("");
      setDynamicSelections([]);
      setError(null);
      setSuccess(false);
      setCreating(false);
      setLoading(false);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // When market type changes, populate selections
  useEffect(() => {
    if (marketType) {
      setSelection("");
      setDynamicSelections(ALL_MARKET_TYPES[marketType] ?? []);
    } else {
      setDynamicSelections([]);
    }
  }, [marketType]);

  const canConfirm = matchId !== "" && marketType !== "" && selection !== "" && !creating;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const match = matches.find((m) => m.bsd_match_id === matchId);
    if (!match) return;

    // 1. Show "building" state
    setCreating(true);
    setError(null);

    try {
      // 2. Call the new create‑market edge function
      const res = await fetch(`${FUNCTIONS_BASE}/create-market`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bsd_match_id: match.bsd_match_id,
          market_type: marketType,
          market_selection: selection,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("[LiveMarketModal] create‑market response:", data);
    } catch (e: any) {
      console.error("[LiveMarketModal] create‑market failed:", e);
      setError(e?.message ?? "Failed to create market");
      setCreating(false);
      return;
    }

    // 3. Success animation
    setCreating(false);
    setSuccess(true);

    setTimeout(() => {
      onSelect({
        bsd_match_id: match.bsd_match_id,
        market_type: marketType,
        market_selection: selection,
        match_name: match.match_name,
      });
      onClose();
    }, 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0e] p-6 shadow-2xl"
            style={{ boxShadow: "0 0 60px rgba(212,175,55,0.15)" }}
            initial={{ scale: 0.9, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Pick a Market</h2>
                <p className="text-xs text-white/50 mt-0.5">
                  Three quick choices and you're watching it live.
                </p>
              </div>
              <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white transition text-xl leading-none">
                ×
              </button>
            </div>

            <AnimatePresence mode="wait">
              {creating ? (
                <motion.div
                  key="creating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-10 gap-4"
                >
                  <div className="w-10 h-10 border-2 border-t-[#D4AF37] border-white/10 rounded-full animate-spin" />
                  <p className="text-white/80 font-medium">Building your chart…</p>
                  <p className="text-white/40 text-xs">This may take a few seconds</p>
                </motion.div>
              ) : success ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 text-3xl"
                  >
                    ✓
                  </motion.div>
                  <p className="mt-3 text-white font-medium">Chart ready – opening now…</p>
                </motion.div>
              ) : (
                <motion.div key="form" className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Match</label>
                    <select
                      className={selectClasses}
                      value={matchId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMatchId(v === "" ? "" : Number(v));
                        setMarketType("");
                      }}
                    >
                      <option value="">Select a match…</option>
                      {matches.map((m) => (
                        <option key={m.bsd_match_id} value={m.bsd_match_id}>
                          {m.match_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Market Type</label>
                    <select
                      className={selectClasses}
                      value={marketType}
                      onChange={(e) => setMarketType(e.target.value)}
                      disabled={matchId === ""}
                    >
                      <option value="">Select market type…</option>
                      {Object.keys(ALL_MARKET_TYPES).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Selection</label>
                    <select
                      className={selectClasses}
                      value={selection}
                      onChange={(e) => setSelection(e.target.value)}
                      disabled={!marketType}
                    >
                      <option value="">Select selection…</option>
                      {dynamicSelections.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center justify-between gap-3">
                      <span>{error}</span>
                      <button onClick={() => setError(null)} className="text-rose-200 hover:text-white">
                        Dismiss
                      </button>
                    </div>
                  )}

                  <button
                    disabled={!canConfirm}
                    onClick={handleConfirm}
                    className="w-full mt-2 rounded-xl bg-[#D4AF37] text-black font-semibold py-3 text-sm uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
                    style={{ boxShadow: canConfirm ? "0 0 24px rgba(212,175,55,0.35)" : undefined }}
                  >
                    Complete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}