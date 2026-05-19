import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

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

export default function LiveMarketModal({
  isOpen,
  onClose,
  onSelect,
  availableMatches,
}: Props) {
  const [matchId, setMatchId] = useState<number | "">("");
  const [marketType, setMarketType] = useState<string>("");
  const [selection, setSelection] = useState<string>("");
  const [rows, setRows] = useState<
    { market_type: string; market_selection: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // De-dupe matches
  const matches = useMemo(() => {
    const seen = new Map<number, AvailableMatch>();
    availableMatches.forEach((m) => seen.set(m.bsd_match_id, m));
    return [...seen.values()];
  }, [availableMatches]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setMatchId("");
      setMarketType("");
      setSelection("");
      setRows([]);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Load markets when match changes
  useEffect(() => {
    if (matchId === "") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("live_market_data")
          .select("market_type, market_selection")
          .eq("bsd_match_id", matchId)
          .eq("status", "active");
        if (err) throw err;
        if (!cancelled) setRows((data ?? []) as any);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load markets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const marketTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.market_type))).sort(),
    [rows]
  );
  const selections = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter((r) => r.market_type === marketType)
            .map((r) => r.market_selection)
        )
      ).sort(),
    [rows, marketType]
  );

  const canConfirm =
    matchId !== "" && marketType !== "" && selection !== "" && !loading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const match = matches.find((m) => m.bsd_match_id === matchId);
    if (!match) return;
    setSuccess(true);
    try {
      // Call RPC to create/get the market
      const { error } = await supabase.rpc("save_user_request", {
        p_bsd_match_id: match.bsd_match_id,
        p_market_type: marketType,
        p_market_selection: selection,
      });
      if (error) console.warn("RPC error (non‑blocking):", error.message);
    } catch (e) {
      console.warn("RPC call failed (non‑blocking):", e);
    }
    setTimeout(() => {
      onSelect({
        bsd_match_id: match.bsd_match_id,
        market_type: marketType,
        market_selection: selection,
        match_name: match.match_name,
      });
      onClose();
    }, 650);
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
            {/* Close button & title */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Pick a Market
                </h2>
                <p className="text-xs text-white/50 mt-0.5">
                  Three quick choices and you're watching it live.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-white/50 hover:text-white transition text-xl leading-none"
              >
                ×
              </button>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
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
                  <p className="mt-3 text-white font-medium">
                    Locked in – opening your chart…
                  </p>
                </motion.div>
              ) : (
                <motion.div key="form" className="space-y-4">
                  {/* Match dropdown */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
                      Match
                    </label>
                    <select
                      className={selectClasses}
                      value={matchId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMatchId(v === "" ? "" : Number(v));
                        setMarketType("");
                        setSelection("");
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

                  {/* Market type dropdown */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
                      Market Type
                    </label>
                    <select
                      className={selectClasses}
                      value={marketType}
                      onChange={(e) => {
                        setMarketType(e.target.value);
                        setSelection("");
                      }}
                      disabled={matchId === "" || loading}
                    >
                      <option value="">
                        {loading ? "Loading…" : "Select market type…"}
                      </option>
                      {marketTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selection dropdown */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">
                      Selection
                    </label>
                    <select
                      className={selectClasses}
                      value={selection}
                      onChange={(e) => setSelection(e.target.value)}
                      disabled={!marketType}
                    >
                      <option value="">Select selection…</option>
                      {selections.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center justify-between gap-3">
                      <span>{error}</span>
                      <button
                        onClick={() => setError(null)}
                        className="text-rose-200 hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <button
                    disabled={!canConfirm}
                    onClick={handleConfirm}
                    className="w-full mt-2 rounded-xl bg-[#D4AF37] text-black font-semibold py-3 text-sm uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
                    style={{
                      boxShadow: canConfirm
                        ? "0 0 24px rgba(212,175,55,0.35)"
                        : undefined,
                    }}
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