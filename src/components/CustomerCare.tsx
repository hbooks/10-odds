import { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, ArrowRightLeft, ChevronLeft, ChevronRight, Minus } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
type Persona = "nancy" | "emily" | "tech" | "george";
type MessageType = "user" | "agent" | "system";

interface Message {
  id: string;
  type: MessageType;
  text: string;
  persona?: Persona;
  timestamp: Date;
  status?: "sent" | "seen" | "typing" | "replied";
}

interface ChatState {
  persona: Persona;
  warningCount: number;
  history: { sender: "user" | "agent"; text: string }[];
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const PERSONA_NAMES: Record<Persona, string> = {
  nancy: "Nancy",
  emily: "Emily",
  tech: "tECH",
  george: "George",
};

const PERSONA_COLORS: Record<Persona, string> = {
  nancy: "#a78bfa",
  emily: "#34d399",
  tech: "#60a5fa",
  george: "#f87171",
};

const PERSONA_AVATARS: Record<Persona, string> = {
  nancy: "N",
  emily: "E",
  tech: "⚙",
  george: "G",
};

const IDLE_TIMEOUT_MS = 180_000;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
const uid = () => Math.random().toString(36).slice(2);
const delayMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* ═══════════════════════════════════════════════════════════
   API CALL
═══════════════════════════════════════════════════════════ */
async function getAgentReply(
  userMessage: string,
  state: ChatState
): Promise<{
  response: string;
  persona: Persona;
  warningCount: number;
  banned: boolean;
  transfer: boolean;
  end_conversation: boolean;
}> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-care-v2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: userMessage,
      persona: state.persona,
      warningCount: state.warningCount,
      history: state.history,
    }),
  });
  if (!res.ok) throw new Error("Edge function error");
  return res.json();
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS (defined outside to prevent remount on parent rerender)
═══════════════════════════════════════════════════════════ */
const ConnectingDots = memo(() => (
  <div style={{ display: "flex", gap: 6 }}>
    {[0, 1, 2, 3].map(i => (
      <span
        key={i}
        style={{
          width: 8, height: 8, borderRadius: "50%", background: "#a78bfa",
          animation: `typingBounce 1.2s ${i * 0.15}s ease-in-out infinite`,
          display: "block",
        }}
      />
    ))}
  </div>
));

const MessageBubble = memo(({
  msg,
  personaColor,
  currentPersonaName,
  currentPersonaColor,
}: {
  msg: Message;
  personaColor: string;
  currentPersonaName?: string;
  currentPersonaColor?: string;
}) => {
  if (msg.type === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}
      >
        <span
          style={{
            fontSize: 11, color: "#6b7280", background: "#111118",
            padding: "4px 14px", borderRadius: 10, fontWeight: 500,
            textAlign: "center", maxWidth: "85%",
          }}
        >
          {msg.text}
        </span>
      </motion.div>
    );
  }

  const isUser = msg.type === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28, height: 28, borderRadius: 10, flexShrink: 0,
            background: `${personaColor}22`,
            border: `1px solid ${personaColor}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: personaColor, fontWeight: 700, marginBottom: 2,
          }}
        >
          {msg.persona ? { nancy: "N", emily: "E", tech: "⚙", george: "G" }[msg.persona] : "?"}
        </div>
      )}

      <div
        style={{
          maxWidth: "78%",
          display: "flex", flexDirection: "column",
          alignItems: isUser ? "flex-end" : "flex-start",
          gap: 3,
        }}
      >
        {!isUser && msg.persona && (
          <span style={{ fontSize: 10, color: personaColor, fontWeight: 700, paddingLeft: 4 }}>
            {{ nancy: "Nancy", emily: "Emily", tech: "tECH", george: "George" }[msg.persona] ?? "Unknown"}
          </span>
        )}
        <div
          style={{
            padding: "9px 13px",
            borderRadius: isUser ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
            background: isUser
              ? `linear-gradient(135deg, ${personaColor}cc, ${personaColor}99)`
              : "#1a1a22",
            border: isUser ? "none" : "1px solid #ffffff0d",
            color: isUser ? "#fff" : "#d1d5db",
            fontSize: 13, lineHeight: 1.55,
            boxShadow: isUser ? `0 4px 12px ${personaColor}33` : "none",
          }}
        >
          {msg.text}
        </div>
        <span style={{ fontSize: 10, color: "#4b5563", paddingInline: 4 }}>
          {formatTime(msg.timestamp)}
        </span>
        {isUser && msg.status && currentPersonaName && (
          <div
            style={{
              fontSize: 10, color: currentPersonaColor || "#6b7280",
              display: "flex", alignItems: "center", gap: 4, paddingRight: 4,
            }}
          >
            {msg.status === "seen" && (
              <><span>{currentPersonaName} seen</span><span style={{ fontWeight: 700 }}>✓</span></>
            )}
            {msg.status === "typing" && (
              <span style={{ opacity: 0.6 }}>typing…</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

/* ═══════════════════════════════════════════════════════════
   PANEL CONTENT — extracted as stable component with explicit props
   This prevents remounting on every parent state change (the root
   cause of keyboard-close, scroll-reset and focus-loss bugs).
═══════════════════════════════════════════════════════════ */
interface PanelProps {
  stage: "idle" | "connecting" | "chat";
  minimized: boolean;
  transferring: boolean;
  transferToPersona: Persona | null;
  visibleMessages: Message[];
  isTyping: boolean;
  input: string;
  connectTimer: number;
  chatState: ChatState;
  currentPersonaColor: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  onMinimize: () => void;
  onClose: () => void;
  onConnect: () => void;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const PanelContent = memo(({
  stage,
  minimized,
  transferring,
  transferToPersona,
  visibleMessages,
  isTyping,
  input,
  connectTimer,
  chatState,
  currentPersonaColor,
  messagesEndRef,
  inputRef,
  onMinimize,
  onClose,
  onConnect,
  onInputChange,
  onSend,
  onKeyDown,
  onFocus,
  onBlur,
}: PanelProps) => {
  const currentPersonaName = PERSONA_NAMES[chatState.persona];

  return (
    <>
      {/* ── Header ─────────────────────────────── */}
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${currentPersonaColor}18`,
          background: `linear-gradient(180deg, ${currentPersonaColor}0d 0%, transparent 100%)`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 13,
            background: `${currentPersonaColor}20`,
            border: `1.5px solid ${currentPersonaColor}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 700, color: currentPersonaColor,
            flexShrink: 0, transition: "all 0.4s ease",
          }}
        >
          {stage === "chat" ? PERSONA_AVATARS[chatState.persona] : "💬"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: "#f1f1f1", fontWeight: 700, fontSize: 14 }}>
              {stage === "chat" ? PERSONA_NAMES[chatState.persona] : "10 Odds Support"}
            </span>
            {stage === "chat" && (
              <span
                style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: transferring ? "#facc15" : "#4ade80",
                  flexShrink: 0,
                  boxShadow: transferring ? "0 0 6px #facc1580" : "0 0 6px #4ade8080",
                }}
              />
            )}
          </div>
          <div style={{ color: "#6b7280", fontSize: 11, marginTop: 1 }}>
            {transferring
              ? `Transferring to ${transferToPersona ? PERSONA_NAMES[transferToPersona] : "another agent"}…`
              : stage === "chat"
              ? "Online · 10 Odds Customer Care"
              : "We typically reply in under a minute"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={onMinimize}
            title={minimized ? "Expand" : "Minimise"}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "transparent", border: "none",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#6b7280",
              WebkitTapHighlightColor: "transparent",
              transition: "color 0.15s",
            }}
          >
            <Minus size={15} />
          </button>
          <button
            onClick={onClose}
            title="Close"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "transparent", border: "none",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#6b7280",
              WebkitTapHighlightColor: "transparent",
              transition: "color 0.15s",
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Minimised strip ─────────────────────── */}
      <AnimatePresence initial={false}>
        {minimized ? (
          <motion.div
            key="minimized-strip"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden", flexShrink: 0 }}
          >
            <div
              onClick={onMinimize}
              style={{
                padding: "10px 18px", color: "#6b7280", fontSize: 13,
                cursor: "pointer", userSelect: "none",
                WebkitTapHighlightColor: "transparent",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 10 }}>▲</span>
              <span>Expand chat</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="panel-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            {/* ── Body ────────────────────────── */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "14px 14px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                position: "relative",
                // Prevent scroll-jump when content updates
                overflowAnchor: "none",
              }}
            >
              {/* Transfer overlay */}
              <AnimatePresence>
                {transferring && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: "absolute", inset: 0,
                      background: "rgba(10,10,14,0.88)",
                      backdropFilter: "blur(8px)",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      gap: 14, zIndex: 10,
                    }}
                  >
                    <ArrowRightLeft
                      style={{
                        width: 28, height: 28, color: "#facc15",
                        animation: "spin 1.5s linear infinite",
                      }}
                    />
                    <p style={{ color: "#f1f1f1", fontWeight: 700, fontSize: 15, margin: 0 }}>
                      Transferring to{" "}
                      {transferToPersona ? PERSONA_NAMES[transferToPersona] : "another agent"}…
                    </p>
                    <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>
                      Please hold, this will only take a moment.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Idle */}
              {stage === "idle" && (
                <div
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    textAlign: "center", gap: 16, padding: "28px 16px",
                  }}
                >
                  <div
                    style={{
                      width: 64, height: 64, borderRadius: 20,
                      background: "linear-gradient(135deg, #a78bfa18, #60a5fa18)",
                      border: "1px solid #a78bfa30",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 28,
                    }}
                  >
                    💬
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={{ color: "#f1f1f1", fontWeight: 700, fontSize: 16, margin: 0 }}>
                      Welcome to 10 Odds Support
                    </p>
                    <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                      Our agents are available to help you with patterns,
                      predictions, and anything else on the site.
                    </p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {["Account help", "Bet queries", "Technical issue", "Other"].map(label => (
                      <span
                        key={label}
                        style={{
                          padding: "5px 13px", borderRadius: 20,
                          fontSize: 12, color: "#9ca3af",
                          border: "1px solid #ffffff12", background: "#ffffff07",
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={onConnect}
                    style={{
                      marginTop: 4, padding: "12px 36px",
                      borderRadius: 13,
                      background: "linear-gradient(135deg, #a78bfa, #818cf8)",
                      color: "#fff", fontWeight: 700, fontSize: 15,
                      border: "none", cursor: "pointer",
                      boxShadow: "0 4px 24px rgba(167,139,250,0.35)",
                      fontFamily: "inherit",
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                      minHeight: 48,
                    }}
                  >
                    Start Chat
                  </button>
                </div>
              )}

              {/* Connecting */}
              {stage === "connecting" && (
                <div
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    gap: 14, color: "#9ca3af",
                  }}
                >
                  <ConnectingDots />
                  <p style={{ fontSize: 13, margin: 0 }}>Connecting you to an agent…</p>
                  <div
                    style={{
                      padding: "7px 16px", borderRadius: 10,
                      background: "#ffffff08", border: "1px solid #ffffff10",
                      fontSize: 12, color: "#4b5563",
                    }}
                  >
                    Estimated wait: {Math.floor(connectTimer / 60)}m {connectTimer % 60}s
                  </div>
                </div>
              )}

              {/* Chat messages */}
              {stage === "chat" && (
                <>
                  {visibleMessages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      personaColor={msg.persona ? PERSONA_COLORS[msg.persona] : "#a78bfa"}
                      currentPersonaName={currentPersonaName}
                      currentPersonaColor={currentPersonaColor}
                    />
                  ))}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: 10, flexShrink: 0,
                          background: `${currentPersonaColor}22`,
                          border: `1px solid ${currentPersonaColor}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, color: currentPersonaColor, fontWeight: 700,
                        }}
                      >
                        {PERSONA_AVATARS[chatState.persona]}
                      </div>
                      <div
                        style={{
                          background: "#1a1a22", border: "1px solid #ffffff0d",
                          borderRadius: "4px 14px 14px 14px",
                          padding: "10px 14px", display: "flex", gap: 5, alignItems: "center",
                        }}
                      >
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            style={{
                              width: 7, height: 7, borderRadius: "50%",
                              background: currentPersonaColor, display: "block", opacity: 0.7,
                              animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {/* Scroll anchor — sits at the bottom of the list */}
                  <div ref={messagesEndRef} style={{ height: 1, flexShrink: 0 }} />
                </>
              )}
            </div>

            {/* ── Input bar ────────────────────── */}
            {stage === "chat" && (
              <div
                style={{
                  padding: "10px 12px",
                  borderTop: "1px solid #ffffff0d",
                  background: "#0a0a0e",
                  display: "flex", gap: 8, alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="text"
                  value={input}
                  onChange={e => onInputChange(e.target.value)}
                  onKeyDown={onKeyDown}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Type a message…"
                  disabled={isTyping || transferring}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  spellCheck={false}
                  style={{
                    flex: 1, background: "#15151e",
                    border: "1px solid #ffffff0d", borderRadius: 12,
                    padding: "10px 14px",
                    // max(16px,14px) prevents iOS auto-zoom on focus
                    fontSize: "max(16px, 14px)" as string,
                    color: "#e5e7eb", outline: "none",
                    transition: "border-color 0.2s", fontFamily: "inherit",
                    minHeight: 44,
                  }}
                />
                <button
                  onClick={onSend}
                  disabled={isTyping || transferring || !input.trim()}
                  style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: input.trim()
                      ? `linear-gradient(135deg, ${currentPersonaColor}, ${currentPersonaColor}99)`
                      : "#1f1f2e",
                    border: "none",
                    cursor: input.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                    opacity: isTyping || transferring ? 0.5 : 1,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  <Send style={{ width: 16, height: 16, color: "#fff" }} />
                </button>
              </div>
            )}

            <div style={{ padding: "6px 16px 8px", textAlign: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "#374151" }}>10 Odds · Customer Support</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const CustomerCare = () => {
  const [banned, setBanned] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [stage, setStage] = useState<"idle" | "connecting" | "chat">("idle");
  const [transferring, setTransferring] = useState(false);
  const [transferToPersona, setTransferToPersona] = useState<Persona | null>(null);

  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>({
    persona: "nancy",
    warningCount: 0,
    history: [],
  });

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [connectTimer, setConnectTimer] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Keep a ref to chatState so callbacks don't go stale
  const chatStateRef = useRef(chatState);
  chatStateRef.current = chatState;

  /* ─── Init ───────────────────────────────────────── */
  useEffect(() => {
    const b = localStorage.getItem("cc_banned") === "true";
    if (b) { setBanned(true); return; }
    resetChatState();
  }, []);

  /* ─── Auto-scroll — smooth, without causing re-render loops ── */
  useEffect(() => {
    if (!messagesEndRef.current) return;
    // Use requestAnimationFrame to scroll after paint, not mid-render
    const raf = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(raf);
  }, [visibleMessages.length, isTyping]);

  /* ─── Focus input only on open/stage transition, not on every render ── */
  const prevOpenRef = useRef(false);
  const prevStageRef = useRef<"idle" | "connecting" | "chat">("idle");
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    const justEnteredChat = stage === "chat" && prevStageRef.current !== "chat";
    const justExpanded = !minimized;

    if ((justOpened || justEnteredChat) && stage === "chat" && !minimized) {
      // Delay to let animation settle; don't steal focus on mobile mid-type
      const t = setTimeout(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, 350);
      return () => clearTimeout(t);
    }

    prevOpenRef.current = open;
    prevStageRef.current = stage;
  }, [open, stage, minimized]);

  /* ─── Idle timer ─────────────────────────────────── */
  const resetIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (chatStateRef.current && stage !== "chat") return;
    idleTimerRef.current = setTimeout(() => {
      const agentName = PERSONA_NAMES[chatStateRef.current.persona];
      setVisibleMessages(p => [...p, {
        id: uid(), type: "system",
        text: `${agentName} closed this chat.`,
        timestamp: new Date(),
      }]);
      setTimeout(() => { setOpen(false); resetChatState(); }, 4000);
    }, IDLE_TIMEOUT_MS);
  }, [stage]);

  useEffect(() => {
    resetIdle();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [stage, resetIdle]);

  /* ─── Reset ──────────────────────────────────────── */
  const resetChatState = () => {
    setStage("idle");
    setVisibleMessages([]);
    setChatState({ persona: "nancy", warningCount: 0, history: [] });
    setInput("");
    setIsTyping(false);
    setTransferring(false);
    setTransferToPersona(null);
    setMinimized(false);
    localStorage.removeItem("cc_warnings");
    localStorage.removeItem("cc_persona");
  };

  const persistBan = () => localStorage.setItem("cc_banned", "true");

  /* ─── Connect ────────────────────────────────────── */
  const handleConnect = useCallback(() => {
    setStage("connecting");
    const agent: Persona = Math.random() > 0.5 ? "nancy" : "emily";
    setChatState(s => ({ ...s, persona: agent }));
    const waitSecs = 180 + Math.floor(Math.random() * 240);
    setConnectTimer(waitSecs);

    let rem = waitSecs;
    const t = setInterval(() => {
      rem--;
      setConnectTimer(rem);
      if (rem <= 0) {
        clearInterval(t);
        setStage("chat");
        const agentName = PERSONA_NAMES[agent];
        const connectSys: Message = {
          id: uid(), type: "system",
          text: `You have been connected to ${agentName}.`,
          timestamp: new Date(),
        };
        const greetings: Record<Persona, string[]> = {
          nancy: [
            `Hi there! 👋 I'm Nancy from 10 Odds support. What can I help you with today?`,
            `Hello! Nancy here. How can I make your 10 Odds experience better?`,
          ],
          emily: [
            `Hey! Emily here from 10 Odds. What's up?`,
            `Hi! I'm Emily — 10 Odds support. What can I do for you?`,
          ],
          tech: [], george: [],
        };
        const pool = greetings[agent];
        const greeting = pool[Math.floor(Math.random() * pool.length)];
        const greetMsg: Message = {
          id: uid(), type: "agent", text: greeting,
          persona: agent, timestamp: new Date(),
        };
        setVisibleMessages([connectSys, greetMsg]);
        setChatState(s => ({ ...s, history: [{ sender: "agent", text: greeting }] }));
      }
    }, 1000);
  }, []);

  /* ─── Send message ───────────────────────────────── */
  const sendMessage = useCallback(async () => {
    const currentInput = inputRef.current?.value ?? "";
    if (!currentInput.trim() || isTyping || transferring) return;
    const userText = currentInput.trim();
    setInput("");
    resetIdle();

    const userMsgId = uid();
    const userMsg: Message = {
      id: userMsgId, type: "user", text: userText,
      timestamp: new Date(), status: "sent",
    };
    setVisibleMessages(p => [...p, userMsg]);
    setIsTyping(false);

    const totalDelay = 7000 + Math.random() * 2000;
    const minTyping = 4000;
    const seenDelay = 2000 + Math.random() * 5000;
    await delayMs(seenDelay);
    setVisibleMessages(p => p.map(m => m.id === userMsgId ? { ...m, status: "seen" as const } : m));

    const remainingAfterSeen = totalDelay - seenDelay;
    const maxSeenStay = Math.min(remainingAfterSeen - minTyping, 3000);
    const seenStay = Math.max(1000, Math.floor(Math.random() * maxSeenStay + 500));
    await delayMs(seenStay);

    const typingStart = Date.now();
    setIsTyping(true);
    setVisibleMessages(p => p.map(m => m.id === userMsgId ? { ...m, status: "typing" as const } : m));

    let result;
    try {
      result = await getAgentReply(userText, chatStateRef.current);
    } catch {
      setVisibleMessages(p => [...p, {
        id: uid(), type: "system",
        text: "Unable to connect. Please try again later.",
        timestamp: new Date(),
      }]);
      setIsTyping(false);
      resetIdle();
      return;
    }

    const elapsed = Date.now() - typingStart;
    const totalElapsed = seenDelay + seenStay + elapsed;
    if (totalElapsed < totalDelay) await delayMs(totalDelay - totalElapsed);

    setIsTyping(false);
    setVisibleMessages(p => p.map(m => m.id === userMsgId ? { ...m, status: "replied" as const } : m));

    const newHistory: ChatState["history"] = [
      ...chatStateRef.current.history,
      { sender: "user", text: userText },
      { sender: "agent", text: result.response },
    ];
    const newState: ChatState = { persona: result.persona, warningCount: result.warningCount, history: newHistory };

    if (result.banned) { setBanned(true); persistBan(); return; }

    if (result.transfer && result.persona !== chatStateRef.current.persona) {
      const oldPersonaName = PERSONA_NAMES[chatStateRef.current.persona];
      setVisibleMessages(p => [...p, {
        id: uid(), type: "system",
        text: `${oldPersonaName} transferred this chat. Please wait as we connect you.`,
        timestamp: new Date(),
      }]);
      setVisibleMessages(p => [...p, {
        id: uid(), type: "agent", text: result.response,
        persona: chatStateRef.current.persona, timestamp: new Date(),
      }]);
      setTransferToPersona(result.persona);
      setTransferring(true);

      const transferWait = 20000 + Math.floor(Math.random() * 5000);
      await delayMs(transferWait);

      const newAgentName = PERSONA_NAMES[result.persona];
      const transferDoneSys: Message = {
        id: uid(), type: "system",
        text: `${oldPersonaName} transferred you to another agent. You are now connected to ${newAgentName}.`,
        timestamp: new Date(),
      };
      setChatState(newState);
      setVisibleMessages([]);
      setTransferring(false);
      setTransferToPersona(null);

      const introTexts: Record<Persona, string[]> = {
        tech: [
          "Hey — tECH here. I've been briefed. Let's get this sorted.",
          "tECH joining the chat. Tell me what's going on.",
          "Hey, I'm tECH. Nancy filled me in — what's the issue?",
        ],
        george: [
          "George here. I understand there's been some difficulty. Let's handle this properly.",
          "This is George. I'm listening — you have one chance to explain the issue.",
          "George. Keep it professional and we'll get somewhere.",
        ],
        nancy: [], emily: [],
      };
      const pool = introTexts[result.persona] ?? [];
      if (pool.length > 0) {
        const intro = pool[Math.floor(Math.random() * pool.length)];
        const introMsg: Message = {
          id: uid(), type: "agent", text: intro,
          persona: result.persona, timestamp: new Date(),
        };
        setVisibleMessages([transferDoneSys, introMsg]);
        setChatState(s => ({ ...s, history: [...newHistory, { sender: "agent", text: intro }] }));
      } else {
        setVisibleMessages([transferDoneSys]);
      }
      resetIdle();
      return;
    }

    const agentMsg: Message = {
      id: uid(), type: "agent", text: result.response,
      persona: result.persona, timestamp: new Date(),
    };
    setVisibleMessages(p => [...p, agentMsg]);
    setChatState(newState);

    if (result.end_conversation) {
      const agentName = PERSONA_NAMES[result.persona];
      setVisibleMessages(p => [...p, {
        id: uid(), type: "system",
        text: `${agentName} closed this chat.`,
        timestamp: new Date(),
      }]);
      setTimeout(() => { setOpen(false); resetChatState(); }, 4000);
      return;
    }
    resetIdle();
  }, [isTyping, transferring, resetIdle]);

  /* ─── Stable callbacks for input (avoid re-creating PanelContent) ── */
  const handleInputChange = useCallback((val: string) => {
    setInput(val);
    resetIdle();
  }, [resetIdle]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
    resetIdle();
  }, [sendMessage, resetIdle]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    resetIdle();
    e.currentTarget.style.borderColor = `${chatStateRef.current ? PERSONA_COLORS[chatStateRef.current.persona] : "#a78bfa"}66`;
  }, [resetIdle]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#ffffff0d";
  }, []);

  const handleMinimize = useCallback(() => setMinimized(m => !m), []);
  const handleClose = useCallback(() => { setOpen(false); resetChatState(); }, []);
  const handleSend = useCallback(() => { sendMessage(); resetIdle(); }, [sendMessage, resetIdle]);

  if (banned) return null;

  const currentPersonaColor = PERSONA_COLORS[chatState.persona];

  /* ─── Shared props for PanelContent ─────────────── */
  const panelProps: PanelProps = {
    stage,
    minimized,
    transferring,
    transferToPersona,
    visibleMessages,
    isTyping,
    input,
    connectTimer,
    chatState,
    currentPersonaColor,
    messagesEndRef,
    inputRef,
    onMinimize: handleMinimize,
    onClose: handleClose,
    onConnect: handleConnect,
    onInputChange: handleInputChange,
    onSend: handleSend,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };

  return (
    <>
      {/* ════════════════════════════════
          DESKTOP: side tab + drawer
      ════════════════════════════════ */}
      <div className="cc-desktop-only">
        {/* Side Tab */}
        <motion.button
          onClick={() => setOpen(o => !o)}
          initial={{ x: 60 }}
          animate={{ x: open ? 60 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: "fixed", right: 0, top: "50%",
            transform: "translateY(-50%)",
            zIndex: 9997, background: "transparent",
            border: "none", padding: 0, cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div
            style={{
              background: `linear-gradient(180deg, ${currentPersonaColor}ee, ${currentPersonaColor}99)`,
              borderRadius: "10px 0 0 10px",
              padding: "18px 9px",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 8,
              boxShadow: `-4px 0 20px ${currentPersonaColor}44`,
              position: "relative",
            }}
          >
            {stage === "chat" && !open && (
              <span
                style={{
                  position: "absolute", top: 8, right: 8,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#4ade80",
                  animation: "ccPing 1.5s ease-in-out infinite",
                }}
              />
            )}
            {open ? <ChevronRight size={16} color="#fff" /> : <ChevronLeft size={16} color="#fff" />}
            <span
              style={{
                color: "#fff", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                writingMode: "vertical-rl", transform: "rotate(180deg)",
                fontFamily: "'DM Sans', 'Segoe UI', sans-serif", whiteSpace: "nowrap",
              }}
            >
              Support
            </span>
          </div>
        </motion.button>

        {/* Drawer */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="desktop-drawer"
              initial={{ x: 370, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 370, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{
                position: "fixed", right: 0, bottom: 0,
                width: 360, zIndex: 9998,
                display: "flex", flexDirection: "column",
                background: "#0c0c12",
                borderLeft: `1px solid ${currentPersonaColor}28`,
                boxShadow: `-8px 0 40px rgba(0,0,0,0.55)`,
                fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                // Collapse from bottom when minimized; full height otherwise
                maxHeight: minimized ? "60px" : "100vh",
                transition: "max-height 0.22s ease",
                overflow: "hidden",
              }}
            >
              <PanelContent {...panelProps} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ════════════════════════════════
          MOBILE: FAB + full bottom sheet
      ════════════════════════════════ */}
      <div className="cc-mobile-only">
        {/* FAB */}
{!open && (
  <motion.button
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    onClick={() => setOpen(true)}
    style={{
      position: "fixed",
      bottom: 145,   // ⬆️ was 24 – now sits above the Support Project & Community buttons
      right: 15,     // slightly left of the other buttons for extra breathing room
      width: 56,
      height: 56,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${currentPersonaColor}dd, ${currentPersonaColor}99)`,
      border: `1.5px solid ${currentPersonaColor}55`,
      boxShadow: `0 6px 24px ${currentPersonaColor}55`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9997,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
      touchAction: "manipulation",
    }}
  >
    <span style={{ fontSize: 22 }}>💬</span>
    {stage === "chat" && (
      <span
        style={{
          position: "absolute", top: 8, right: 8,
          width: 9, height: 9, borderRadius: "50%",
          background: "#4ade80",
          border: "1.5px solid #272f1eff",
          animation: "ccPing 1.5s ease-in-out infinite",
        }}
      />
    )}
  </motion.button>
)}

        {/* Bottom sheet */}
        <AnimatePresence>
          {open && (
            <>
              {/* Scrim — only shown when not minimized */}
              {!minimized && (
                <motion.div
                  key="scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleClose}
                  style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.55)",
                    zIndex: 9996,
                  }}
                />
              )}
              {/* Sheet */}
              <motion.div
                key="mobile-sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 36 }}
                style={{
                  position: "fixed",
                  left: 0, right: 0, bottom: 0,
                  // When minimized just show the header bar (~60px)
                  height: minimized ? "auto" : "88dvh",
                  maxHeight: minimized ? "64px" : "88dvh",
                  transition: "max-height 0.22s ease",
                  zIndex: 9998,
                  display: "flex", flexDirection: "column",
                  background: "#0c0c12",
                  borderRadius: minimized ? "16px 16px 0 0" : "20px 20px 0 0",
                  borderTop: `1px solid ${currentPersonaColor}28`,
                  boxShadow: `0 -8px 40px rgba(0,0,0,0.5)`,
                  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                  overflow: "hidden",
                }}
              >
                {/* Drag handle — only when not minimized */}
                {!minimized && (
                  <div
                    style={{
                      width: 36, height: 4, borderRadius: 4,
                      background: "#374151", margin: "10px auto 2px",
                      flexShrink: 0,
                    }}
                  />
                )}
                <PanelContent {...panelProps} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        /* Responsive visibility */
        .cc-desktop-only { display: block; }
        .cc-mobile-only  { display: none; }
        @media (max-width: 640px) {
          .cc-desktop-only { display: none; }
          .cc-mobile-only  { display: block; }
        }

        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ccPing {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(1.4); }
        }

        /* Prevent iOS text zoom on input focus */
        .cc-desktop-only input,
        .cc-mobile-only input {
          font-size: max(16px, 14px) !important;
          /* Prevent layout shift from virtual keyboard pushing content */
          touch-action: manipulation;
        }

        /* Smooth height transitions for the sheet */
        .cc-mobile-only [data-sheet] {
          will-change: height;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
      `}</style>
    </>
  );
};

export default CustomerCare;