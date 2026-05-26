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

// ─── Market catalogue ──────────────────────────────────────────────────────────
const ALL_MARKET_TYPES: Record<string, string[]> = {
  "HOME, AWAY OR DRAW (1X2)": ["home", "draw", "away"],
  "DOUBLE CHANCE": ["1x", "12", "x2"],
  "DRAW NO BET": ["home", "away"],
  "BOTH TEAMS TO SCORE": ["yes", "no"],
  "OVER UNDER": [
    "over 0.5","over 1.5","over 2.5","over 3.5","over 4.5","over 5.5","over 6.5",
    "under 0.5","under 1.5","under 2.5","under 3.5","under 4.5","under 5.5","under 6.5",
  ],
  "TOTAL CORNERS": ["over 8.5","over 9.5","over 10.5","under 8.5","under 9.5","under 10.5"],
  "TOTAL CARDS": ["over 3.5","over 4.5","over 5.5","under 3.5","under 4.5","under 5.5"],
  "TIME OF FIRST GOAL": ["0-15","16-30","31-45","46-60","61-75","76-90","no goal"],
  "TOTAL GOALS BANDS": ["0-1","2-3","4-6","7+"],
  "EVEN OR ODD": ["even","odd"],
  "CLEAN SHEET": ["home yes","home no","away yes","away no"],
  "WIN TO NIL": ["home yes","home no","away yes","away no"],
  "PENALTY AWARDED": ["yes","no"],
  "RED CARD": ["yes","no"],
  "OWN GOAL": ["yes","no"],
  "EXACT TOTAL GOALS": ["0","1","2","3","4","5","6+"],
};

// ─── Error classifier — converts raw errors into human-friendly objects ────────
interface FriendlyError {
  title:       string;   // what happened
  reason:      string;   // why it happened
  actions:     Array<{ label: string; action: "retry" | "refresh" | "close" }>;
  isRetryable: boolean;
}

function classifyError(raw: string): FriendlyError {
  const msg = raw.toLowerCase();

  // Network / connectivity
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
    return {
      title: "Connection lost",
      reason: "Your device couldn't reach our servers. This usually means a temporary network hiccup.",
      actions: [
        { label: "Retry",   action: "retry"   },
        { label: "Refresh", action: "refresh" },
      ],
      isRetryable: true,
    };
  }

  // Rate limit / cooldown
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("too many")) {
    return {
      title: "Too many requests",
      reason: "You've sent several requests in a short window. The system needs a moment to catch up.",
      actions: [
        { label: "Wait a moment, then retry", action: "retry" },
      ],
      isRetryable: true,
    };
  }

  // Market already exists (duplicate)
  if (msg.includes("23505") || msg.includes("duplicate") || msg.includes("already exists") || msg.includes("conflict")) {
    return {
      title: "Market already tracked",
      reason: "This exact market for this match is already being tracked. You can view it on the Markets page.",
      actions: [
        { label: "Close", action: "close" },
      ],
      isRetryable: false,
    };
  }

  // Live stats not available
  if (msg.includes("404") || msg.includes("not available") || msg.includes("not found")) {
    return {
      title: "Match data unavailable",
      reason: "Live statistics for this match haven't been received yet. The match may not have started or data is still loading.",
      actions: [
        { label: "Try again in a moment", action: "retry" },
      ],
      isRetryable: true,
    };
  }

  // Server error
  if (msg.includes("500") || msg.includes("internal") || msg.includes("server error")) {
    return {
      title: "Server error",
      reason: "Something went wrong on our end while creating the chart. This is temporary.",
      actions: [
        { label: "Retry",   action: "retry"   },
        { label: "Refresh", action: "refresh" },
      ],
      isRetryable: true,
    };
  }

  // Timeout
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return {
      title: "Request timed out",
      reason: "The chart took too long to generate. This can happen with busy matches — try again.",
      actions: [
        { label: "Retry", action: "retry" },
      ],
      isRetryable: true,
    };
  }

  // Fallback
  return {
    title: "Something went wrong",
    reason: "The market couldn't be created right now. This is usually temporary.",
    actions: [
      { label: "Retry",   action: "retry"   },
      { label: "Refresh", action: "refresh" },
    ],
    isRetryable: true,
  };
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
const GOLD      = "#C9A84C";
const GOLD_GLOW = "rgba(201,168,76,0.3)";

// ─── Sub-components ───────────────────────────────────────────────────────────
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

const selectCls = [
  "w-full rounded-xl pr-9",
  "text-white/85 text-sm px-3.5 py-2.5",
  "appearance-none cursor-pointer",
  "transition-all duration-150",
  "focus:outline-none",
  "disabled:opacity-25 disabled:cursor-not-allowed",
].join(" ");

const selectStyle = {
  background: "rgba(17, 13, 13, 0.91)",
  border: "1px solid rgba(255,255,255,0.09)",
};

// ─── Friendly error banner ────────────────────────────────────────────────────
function ErrorBanner({
  raw,
  onAction,
}: {
  raw: string;
  onAction: (a: "retry" | "refresh" | "close") => void;
}) {
  const err = classifyError(raw);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.18)",
        }}
      >
        {/* Header row */}
        <div className="flex items-start gap-2.5 mb-2">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)" }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 2L11.5 11H1.5L6.5 2Z" stroke="#f87171" strokeWidth="1.3"
                strokeLinejoin="round" />
              <path d="M6.5 5.5V7.5M6.5 9h.01" stroke="#f87171" strokeWidth="1.3"
                strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "rgba(252,165,165,0.95)" }}>
              {err.title}
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(252,165,165,0.55)" }}>
              {err.reason}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-3 pt-2.5"
          style={{ borderTop: "1px solid rgba(239,68,68,0.12)" }}>
          {err.actions.map((act) => (
            <button
              key={act.action}
              onClick={() => onAction(act.action)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.22)",
                color: "rgba(252,165,165,0.85)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.18)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.10)";
              }}
            >
              {act.action === "retry" && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M9.5 2A5 5 0 1 0 10 6" stroke="currentColor" strokeWidth="1.4"
                    strokeLinecap="round" />
                  <path d="M9.5 2V5H6.5" stroke="currentColor" strokeWidth="1.4"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {act.action === "refresh" && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 1.5v2M5.5 7.5v2M1.5 5.5h2M7.5 5.5h2" stroke="currentColor"
                    strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              )}
              {act.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div
      className="w-1.5 h-1.5 rounded-full transition-all duration-300"
      style={{
        background: done
          ? "#4ade80"
          : active
          ? GOLD
          : "rgba(255,255,255,0.12)",
        boxShadow: active ? `0 0 6px ${GOLD}` : "none",
      }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type Phase = "idle" | "creating" | "success";

export default function LiveMarketModal({ isOpen, onClose, onSelect, availableMatches }: Props) {
  const [matchId,    setMatchId]    = useState<number | null>(null);
  const [marketType, setMarketType] = useState("");
  const [selection,  setSelection]  = useState("");
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [error,      setError]      = useState<string | null>(null);

  // Cooldown state
  const [cooldownUntil, setCooldownUntil] = useState<number>(() => {
    const saved = localStorage.getItem("lm_cooldown_until");
    const ts    = saved ? parseInt(saved, 10) : 0;
    return ts > Date.now() ? ts : 0;
  });
  const [cooldownSec,      setCooldownSec]      = useState(0);
  const [submissionCount,  setSubmissionCount]  = useState<number>(() => {
    const saved = localStorage.getItem("lm_submission_count");
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    if (cooldownUntil <= Date.now()) { setCooldownSec(0); return; }
    const tick = () => {
      const rem = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (rem <= 0) {
        setCooldownUntil(0); setCooldownSec(0);
        localStorage.removeItem("lm_cooldown_until");
        setSubmissionCount(0);
        localStorage.setItem("lm_submission_count", "0");
        clearInterval(interval);
      } else { setCooldownSec(rem); }
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

  useEffect(() => {
    if (!isOpen) {
      setMatchId(null); setMarketType(""); setSelection("");
      setPhase("idle"); setError(null);
    } else {
      setTimeout(() => firstSelectRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && phase === "idle") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, phase, onClose]);

  useEffect(() => { setSelection(""); }, [marketType]);

  const inCooldown = cooldownUntil > Date.now();
  const step1Done  = matchId !== null;
  const step2Done  = step1Done && marketType !== "";
  const step3Done  = step2Done && selection  !== "";
  const canConfirm = step3Done && phase === "idle" && !inCooldown;

  // ─── Error action handler ─────────────────────────────────────────────────
  const handleErrorAction = (action: "retry" | "refresh" | "close") => {
    if (action === "retry")   { setError(null); handleConfirm(); }
    if (action === "refresh") { window.location.reload(); }
    if (action === "close")   { onClose(); }
  };

  const handleConfirm = async () => {
    if (!canConfirm && !error) return;  // allow retry even when canConfirm may be stale
    const match = matches.find((m) => m.bsd_match_id === matchId);
    if (!match) return;

    setPhase("creating"); setError(null);

    try {
      const res = await fetch(`${FUNCTIONS_BASE}/create-market`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bsd_match_id:     match.bsd_match_id,
          market_type:      marketType,
          market_selection: selection,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      // Track submissions + cooldown
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
      console.error("[LiveMarketModal]", e);
      setError(msg);
      setPhase("idle");
      return;
    }

    setPhase("success");
    setTimeout(() => {
      onSelect({ bsd_match_id: match.bsd_match_id, market_type: marketType,
                 market_selection: selection, match_name: match.match_name });
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog" aria-modal="true" aria-label="Pick a Market"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: "rgba(0,0,0,0.78)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => { if (phase === "idle") onClose(); }}
        >
          <div className="absolute inset-0 backdrop-blur-md -z-10" />

          <motion.div
            className="relative w-full sm:max-w-[440px] sm:rounded-2xl overflow-hidden"
            style={{
              background: "#07070d",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.7), 0 0 100px ${GOLD_GLOW}`,
              borderRadius: "1.25rem 1.25rem 0 0",
            }}
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Gold top accent line ── */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

            {/* ── Subtle gold glow behind header ── */}
            <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 80% 100% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)`,
              }} />

            {/* ── Mobile drag handle ── */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            <div className="px-6 pb-6 pt-4 sm:pt-5">
              {/* ── Header ── */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-white">
                    Track a Market
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Pick a live match, type, and outcome
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Step dots */}
                  {phase === "idle" && (
                    <div className="flex items-center gap-1.5">
                      <StepDot active={!step1Done} done={step1Done} />
                      <StepDot active={step1Done && !step2Done} done={step2Done} />
                      <StepDot active={step2Done && !step3Done} done={step3Done} />
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    disabled={phase === "creating"}
                    aria-label="Close"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-20 disabled:pointer-events-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.35)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Body phases ── */}
              <AnimatePresence mode="wait">

                {/* CREATING */}
                {phase === "creating" && (
                  <motion.div key="creating"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center py-14 gap-4"
                  >
                    {/* Animated concentric rings */}
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ border: `1px solid ${GOLD}22` }}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full"
                        style={{ border: `1px solid ${GOLD}44` }}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, delay: 0.3, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: `${GOLD} transparent transparent transparent` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white/80">Building live chart…</p>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.28)" }}>
                        Replaying match history
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* SUCCESS */}
                {phase === "success" && (
                  <motion.div key="success"
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", damping: 18, stiffness: 260 }}
                    className="flex flex-col items-center justify-center py-14 gap-3"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", damping: 14, stiffness: 240, delay: 0.06 }}
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(74,222,128,0.1)",
                        border: "1px solid rgba(74,222,128,0.35)",
                        boxShadow: "0 0 32px rgba(74,222,128,0.18)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10L8.5 14.5L16.5 5.5" stroke="#4ade80"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white/90">Chart ready!</p>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Opening now…
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* IDLE FORM */}
                {phase === "idle" && (
                  <motion.div key="form"
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}
                    className="space-y-3.5"
                  >
                    {/* Match */}
                    <div>
                      <FieldLabel>Match</FieldLabel>
                      <SelectWrapper>
                        <select
                          ref={firstSelectRef}
                          className={selectCls}
                          style={{
                            ...selectStyle,
                            ...(matchId !== null
                              ? { borderColor: `${GOLD}55`, boxShadow: `0 0 0 1px ${GOLD}22` }
                              : {}),
                          }}
                          value={matchId ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setMatchId(raw === "" ? null : Number(raw));
                            setMarketType(""); setSelection("");
                          }}
                        >
                          <option value="">Select a match…</option>
                          {matches.map((m) => (
                            <option key={m.bsd_match_id} value={m.bsd_match_id}>
                              {m.match_name}{m.competition_name ? ` — ${m.competition_name}` : ""}
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
                          className={selectCls}
                          style={{
                            ...selectStyle,
                            ...(marketType
                              ? { borderColor: `${GOLD}55`, boxShadow: `0 0 0 1px ${GOLD}22` }
                              : {}),
                          }}
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
                          className={selectCls}
                          style={{
                            ...selectStyle,
                            ...(selection
                              ? { borderColor: `${GOLD}55`, boxShadow: `0 0 0 1px ${GOLD}22` }
                              : {}),
                          }}
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

                    {/* ── Friendly error state ── */}
                    <AnimatePresence>
                      {error && (
                        <ErrorBanner
                          raw={error}
                          onAction={handleErrorAction}
                        />
                      )}
                    </AnimatePresence>

                    {/* ── CTA ── */}
                    <div className="pt-1">
                      {inCooldown ? (
                        <div
                          className="w-full rounded-xl py-3 text-center"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
                            Cool-down active — {cooldownSec}s
                          </p>
                          <div
                            className="mx-auto mt-1.5 h-0.5 rounded-full overflow-hidden"
                            style={{ width: 80, background: "rgba(255,255,255,0.06)" }}
                          >
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: GOLD }}
                              animate={{ width: `${(cooldownSec / 60) * 100}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      ) : (
                        <motion.button
                          disabled={!canConfirm}
                          onClick={handleConfirm}
                          whileHover={canConfirm ? { scale: 1.02 } : {}}
                          whileTap={canConfirm  ? { scale: 0.98 } : {}}
                          className="w-full rounded-xl py-3 text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200 disabled:cursor-not-allowed"
                          style={
                            canConfirm
                              ? {
                                  background: `linear-gradient(135deg, #E8C050, ${GOLD} 50%, #B8922A)`,
                                  color: "#0a0603",
                                  boxShadow: `0 0 24px ${GOLD_GLOW}, 0 4px 12px rgba(0,0,0,0.4)`,
                                }
                              : {
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.07)",
                                  color: "rgba(255,255,255,0.2)",
                                }
                          }
                        >
                          {canConfirm ? "Open Live Chart →" : "Complete all fields"}
                        </motion.button>
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