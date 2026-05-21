// src/components/LiveMarketModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

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

// ─── Market catalogue ────────────────────────────────────────────────────────
const ALL_MARKET_TYPES: Record<string, string[]> = {
  "1X2": ["home", "draw", "away"],
  DC: ["1x", "12", "x2"],
  DNB: ["home", "away"],
  BTTS: ["yes", "no"],
  OVER_UNDER: [
    "over 0.5", "over 1.5", "over 2.5", "over 3.5", "over 4.5", "over 5.5",
    "over 6.5", "under 0.5", "under 1.5", "under 2.5", "under 3.5", "under 4.5",
    "under 5.5", "under 6.5",
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

// ─── Shared style tokens ─────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_GLOW = "rgba(201,168,76,0.35)";

const selectBase = [
  "w-full rounded-lg",
  "bg-[#0d0d12] border border-white/10",
  "text-white/90 text-sm px-3.5 py-2.5",
  "appearance-none cursor-pointer",
  "transition-all duration-150",
  "focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/40",
  "disabled:opacity-30 disabled:cursor-not-allowed",
  "hover:border-white/20",
].join(" ");

// ─── Sub‑components ──────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-1.5 select-none">
      {children}
    </label>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
type Phase = "idle" | "creating" | "success";

export default function LiveMarketModal({ isOpen, onClose, onSelect, availableMatches }: Props) {
  const [matchId, setMatchId] = useState<number | null>(null);
  const [marketType, setMarketType] = useState("");
  const [selection, setSelection] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  // ─── Cooldown state (persisted in localStorage) ──────────────────────────
  const [cooldownUntil, setCooldownUntil] = useState<number>(() => {
    const saved = localStorage.getItem("lm_cooldown_until");
    const ts = saved ? parseInt(saved, 10) : 0;
    return ts > Date.now() ? ts : 0;
  });
  const [cooldownSec, setCooldownSec] = useState<number>(0);
  const [submissionCount, setSubmissionCount] = useState<number>(() => {
    const saved = localStorage.getItem("lm_submission_count");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Update countdown every second
  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      setCooldownSec(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownUntil(0);
        setCooldownSec(0);
        localStorage.removeItem("lm_cooldown_until");
        setSubmissionCount(0);
        localStorage.setItem("lm_submission_count", "0");
        clearInterval(interval);
      } else {
        setCooldownSec(remaining);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const firstSelectRef = useRef<HTMLSelectElement>(null);

  const matches = useMemo(() => {
    const seen = new Map<number, AvailableMatch>();
    availableMatches.forEach((m) => seen.set(m.bsd_match_id, m));
    return [...seen.values()];
  }, [availableMatches]);

  const availableSelections = useMemo(
    () => (marketType ? (ALL_MARKET_TYPES[marketType] ?? []) : []),
    [marketType]
  );

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setMatchId(null);
      setMarketType("");
      setSelection("");
      setPhase("idle");
      setError(null);
    } else {
      setTimeout(() => firstSelectRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "idle") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, phase, onClose]);

  useEffect(() => {
    setSelection("");
  }, [marketType]);

  const inCooldown = cooldownUntil > Date.now();
  const canConfirm = matchId !== null && marketType !== "" && selection !== "" && phase === "idle" && !inCooldown;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const match = matches.find((m) => m.bsd_match_id === matchId);
    if (!match) return;

    setPhase("creating");
    setError(null);

    try {
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

      // ─── Track submission & apply cooldown ──────────────────────────
      const newCount = submissionCount + 1;
      if (newCount >= 3) {
        const until = Date.now() + 60_000;
        setCooldownUntil(until);
        localStorage.setItem("lm_cooldown_until", String(until));
        setSubmissionCount(0);
        localStorage.setItem("lm_submission_count", "0");
        setCooldownSec(60);
      } else {
        setSubmissionCount(newCount);
        localStorage.setItem("lm_submission_count", String(newCount));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create market";
      console.error("[LiveMarketModal] create-market failed:", e);
      setError(msg);
      setPhase("idle");
      return;
    }

    setPhase("success");
    setTimeout(() => {
      onSelect({
        bsd_match_id: match.bsd_match_id,
        market_type: marketType,
        market_selection: selection,
        match_name: match.match_name,
      });
      onClose();
    }, 900);
  };

  const handleBackdropClick = () => {
    if (phase === "idle") onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Pick a Market"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleBackdropClick}
        >
          <div className="absolute inset-0 backdrop-blur-md -z-10" />

          <motion.div
            className="relative w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[#08080d] overflow-hidden"
            style={{
              boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.6), 0 0 80px ${GOLD_GLOW}`,
            }}
            initial={{ scale: 0.93, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 4 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
            />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-white">Pick a Market</h2>
                  <p className="text-xs text-white/35 mt-0.5 leading-relaxed">
                    Select a match, type, and outcome to track live.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  disabled={phase === "creating"}
                  aria-label="Close modal"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/6 transition disabled:opacity-20 disabled:pointer-events-none -mt-0.5 -mr-1"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Body phases */}
              <AnimatePresence mode="wait">
                {phase === "creating" && (
                  <motion.div
                    key="creating"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col items-center justify-center py-12 gap-3"
                  >
                    <div
                      className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: `${GOLD} transparent transparent transparent` }}
                    />
                    <p className="text-white/75 text-sm font-medium">Opening Live chart…</p>
                    <p className="text-white/30 text-xs">This takes a moment</p>
                  </motion.div>
                )}

                {phase === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 240 }}
                    className="flex flex-col items-center justify-center py-12 gap-3"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", damping: 16, stiffness: 260, delay: 0.05 }}
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(52,211,153,0.12)",
                        border: "1px solid rgba(52,211,153,0.4)",
                        boxShadow: "0 0 28px rgba(52,211,153,0.2)",
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M4 11L9 16L18 6" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                    <p className="text-white/90 text-sm font-medium">Chart ready — opening now…</p>
                  </motion.div>
                )}

                {phase === "idle" && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    {/* Match */}
                    <div>
                      <FieldLabel>Match</FieldLabel>
                      <SelectWrapper>
                        <select
                          ref={firstSelectRef}
                          className={selectBase}
                          value={matchId ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setMatchId(raw === "" ? null : Number(raw));
                            setMarketType("");
                            setSelection("");
                          }}
                        >
                          <option value="">Select a match…</option>
                          {matches.map((m) => (
                            <option key={m.bsd_match_id} value={m.bsd_match_id}>
                              {m.match_name}
                              {m.competition_name ? ` — ${m.competition_name}` : ""}
                            </option>
                          ))}
                        </select>
                      </SelectWrapper>
                    </div>

                    {/* Market Type */}
                    <div>
                      <FieldLabel>Market Type</FieldLabel>
                      <SelectWrapper>
                        <select
                          className={selectBase}
                          value={marketType}
                          onChange={(e) => setMarketType(e.target.value)}
                          disabled={matchId === null}
                        >
                          <option value="">Select market type…</option>
                          {Object.keys(ALL_MARKET_TYPES).map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </SelectWrapper>
                    </div>

                    {/* Selection */}
                    <div>
                      <FieldLabel>Selection</FieldLabel>
                      <SelectWrapper>
                        <select
                          className={selectBase}
                          value={selection}
                          onChange={(e) => setSelection(e.target.value)}
                          disabled={!marketType}
                        >
                          <option value="">Select outcome…</option>
                          {availableSelections.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </SelectWrapper>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-lg border border-rose-500/25 bg-rose-500/8 px-3.5 py-2.5 text-xs text-rose-300/90 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 min-w-0">
                              <svg className="shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="5" stroke="#F87171" strokeWidth="1.2" />
                                <path d="M6 3.5V6.5M6 8H6.01" stroke="#F87171" strokeWidth="1.2" strokeLinecap="round" />
                              </svg>
                              <span className="break-words">{error}</span>
                            </div>
                            <button
                              onClick={() => setError(null)}
                              aria-label="Dismiss error"
                              className="shrink-0 text-rose-300/50 hover:text-rose-200 transition"
                            >
                              ×
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* CTA with cooldown */}
                    <div className="mt-2">
                      {inCooldown ? (
                        <button
                          disabled
                          className="w-full rounded-lg py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-150"
                          style={{
                            background: "#1a1a22",
                            color: "#ffffff40",
                            cursor: "not-allowed",
                          }}
                        >
                          Cool down — wait {cooldownSec}s
                        </button>
                      ) : (
                        <button
                          disabled={!canConfirm}
                          onClick={handleConfirm}
                          className="w-full rounded-lg py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                          style={
                            canConfirm
                              ? {
                                  background: `linear-gradient(135deg, #D4A843, ${GOLD} 50%, #B8922A)`,
                                  color: "#0a0805",
                                  boxShadow: `0 0 20px ${GOLD_GLOW}, 0 2px 8px rgba(0,0,0,0.4)`,
                                }
                              : {
                                  background: "#1a1a22",
                                  color: "#ffffff40",
                                }
                          }
                        >
                          Confirm Selection
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}