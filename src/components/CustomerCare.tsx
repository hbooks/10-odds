import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Minus, ArrowRightLeft } from "lucide-react";

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

type SnapEdge = "bottom-right" | "bottom-left" | "top-right" | "top-left";

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

const IDLE_TIMEOUT_MS = 180_000; // 3 minutes
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
const uid = () => Math.random().toString(36).slice(2);
const delayMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const snapPosition = (
  x: number,
  y: number,
  winW: number,
  winH: number
): SnapEdge => {
  const right = x > winW / 2;
  const bottom = y > winH / 2;
  if (right && bottom) return "bottom-right";
  if (!right && bottom) return "bottom-left";
  if (right && !bottom) return "top-right";
  return "top-left";
};

// Button offset: top positions moved down by ~1 inch (120px) to avoid navbar
const edgeStyle = (edge: SnapEdge): React.CSSProperties => {
  switch (edge) {
    case "bottom-right": return { bottom: 24, right: 24 };
    case "bottom-left":  return { bottom: 24, left: 24 };
    case "top-right":    return { top: 120, right: 24 };
    case "top-left":     return { top: 120, left: 24 };
    default:             return { top: 120, right: 24 };
  }
};

const panelPosition = (edge: SnapEdge): React.CSSProperties => {
  const base: React.CSSProperties = { position: "fixed", zIndex: 9999 };
  switch (edge) {
    case "bottom-right": return { ...base, bottom: 96, right: 24 };
    case "bottom-left":  return { ...base, bottom: 96, left: 24 };
    case "top-right":    return { ...base, top: 192, right: 24 };   // button top + 72
    case "top-left":     return { ...base, top: 192, left: 24 };
    default:             return { ...base, top: 192, right: 24 };
  }
};

/* ═══════════════════════════════════════════════════════════
   API CALL – safe proxy through Supabase edge function
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
   COMPONENT
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
  // Initial button position: top‑right, but moved down so it doesn't block navbar
  const [snapEdge, setSnapEdge] = useState<SnapEdge>("top-right");
  const [connectTimer, setConnectTimer] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    btnX: number;
    btnY: number;
  } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ─── Init from localStorage (only ban status) ────── */
  useEffect(() => {
    const b = localStorage.getItem("cc_banned") === "true";
    if (b) {
      setBanned(true);
      return;
    }
    // On fresh load, always start at idle (no persistent chat)
    resetChatState();
  }, []);

  /* ─── Auto‑scroll ───────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, isTyping]);

  /* ─── Idle timer (resets on any user action) ────── */
  const resetIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (stage !== "chat") return;
    idleTimerRef.current = setTimeout(() => {
      const currentAgent = chatState.persona;
      const agentName = PERSONA_NAMES[currentAgent];
      const closeMsg: Message = {
        id: uid(),
        type: "system",
        text: `${agentName} closed this chat.`,
        timestamp: new Date(),
      };
      setVisibleMessages(p => [...p, closeMsg]);
      // After a short delay, fully close and reset
      setTimeout(() => {
        setOpen(false);
        resetChatState();
      }, 4000);
    }, IDLE_TIMEOUT_MS);
  }, [stage, chatState.persona]);

  useEffect(() => {
    resetIdle();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [stage, resetIdle]);

  /* ─── Full reset to initial idle state ───────────── */
  const resetChatState = () => {
    setStage("idle");
    setVisibleMessages([]);
    setChatState({
      persona: "nancy",
      warningCount: 0,
      history: [],
    });
    setInput("");
    setIsTyping(false);
    setTransferring(false);
    setTransferToPersona(null);
    setMinimized(false);
    // Clear any warnings from localStorage so user gets a fresh start
    localStorage.removeItem("cc_warnings");
    localStorage.removeItem("cc_persona");
  };

  /* ─── Persist only ban ───────────────────────────── */
  const persistBan = () => {
    localStorage.setItem("cc_banned", "true");
  };

  /* ─── Connect ────────────────────────────────────── */
  const handleConnect = () => {
    setStage("connecting");
    const agent: Persona = Math.random() > 0.5 ? "nancy" : "emily";
    setChatState(s => ({ ...s, persona: agent }));
    // Wait time: 3‑7 minutes (180‑420 seconds)
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
        // System: connected
        const connectSys: Message = {
          id: uid(),
          type: "system",
          text: `You have been connected to ${agentName}.`,
          timestamp: new Date(),
        };
        // Agent greeting
        const greetings: Record<Persona, string[]> = {
          nancy: [
            `Hi there! 👋 I'm Nancy from 10 Odds support. What can I help you with today?`,
            `Hello! Nancy here. How can I make your 10 Odds experience better?`,
          ],
          emily: [
            `Hey! Emily here from 10 Odds. What's up?`,
            `Hi! I'm Emily — 10 Odds support. What can I do for you?`,
          ],
          tech: [],
          george: [],
        };
        const pool = greetings[agent];
        const greeting = pool[Math.floor(Math.random() * pool.length)];
        const greetMsg: Message = {
          id: uid(),
          type: "agent",
          text: greeting,
          persona: agent,
          timestamp: new Date(),
        };
        setVisibleMessages([connectSys, greetMsg]);
        setChatState(s => ({
          ...s,
          history: [{ sender: "agent", text: greeting }],
        }));
        resetIdle();
      }
    }, 1000);
  };

  /* ─── Send message (natural rhythm, 7‑9 sec total) ── */
  const sendMessage = async () => {
    if (!input.trim() || isTyping || transferring) return;

    const userText = input.trim();
    setInput("");
    resetIdle();

    const userMsgId = uid();
    const userMsg: Message = {
      id: userMsgId,
      type: "user",
      text: userText,
      timestamp: new Date(),
      status: "sent",
    };

    setVisibleMessages(p => [...p, userMsg]);
    setIsTyping(false);

    // Total reply delay: 7‑9 seconds
    const totalDelay = 7000 + Math.random() * 2000;
    const minTyping = 2000;

    // 1. Seen delay: 1‑3 s
    const seenDelay = 1000 + Math.random() * 2000;
    await delayMs(seenDelay);
    setVisibleMessages(p =>
      p.map(m => (m.id === userMsgId ? { ...m, status: "seen" as const } : m))
    );

    // 2. Seen stay: at least 1 s, up to 4 s (but ensure room for typing)
    const remainingAfterSeen = totalDelay - seenDelay;
    const maxSeenStay = Math.min(remainingAfterSeen - minTyping, 3000);
    const seenStay = Math.max(1000, Math.floor(Math.random() * maxSeenStay + 500));
    await delayMs(seenStay);

    // 3. Start typing dots
    const typingStart = Date.now();
    setIsTyping(true);
    setVisibleMessages(p =>
      p.map(m => (m.id === userMsgId ? { ...m, status: "typing" as const } : m))
    );

    // Fetch agent reply
    let result;
    try {
      result = await getAgentReply(userText, chatState);
    } catch {
      const errSys: Message = {
        id: uid(),
        type: "system",
        text: "Unable to connect. Please try again later.",
        timestamp: new Date(),
      };
      setVisibleMessages(p => [...p, errSys]);
      setIsTyping(false);
      resetIdle();
      return;
    }

    // 4. Enforce minimum typing display + total delay
    const elapsed = Date.now() - typingStart;
    const totalElapsed = seenDelay + seenStay + elapsed;
    if (totalElapsed < totalDelay) {
      await delayMs(totalDelay - totalElapsed);
    }

    setIsTyping(false);
    setVisibleMessages(p =>
      p.map(m => (m.id === userMsgId ? { ...m, status: "replied" as const } : m))
    );

    const newHistory: ChatState["history"] = [
      ...chatState.history,
      { sender: "user", text: userText },
      { sender: "agent", text: result.response },
    ];

    const newState: ChatState = {
      persona: result.persona,
      warningCount: result.warningCount,
      history: newHistory,
    };

    // Ban
    if (result.banned) {
      setBanned(true);
      persistBan();
      return;
    }

    // Transfer
    if (result.transfer && result.persona !== chatState.persona) {
      const oldPersonaName = PERSONA_NAMES[chatState.persona];

      // System: transfer initiated
      const transferInitSys: Message = {
        id: uid(),
        type: "system",
        text: `${oldPersonaName} transferred this chat. Please wait as we connect you.`,
        timestamp: new Date(),
      };
      setVisibleMessages(p => [...p, transferInitSys]);

      // Handoff message from current agent
      const handoffMsg: Message = {
        id: uid(),
        type: "agent",
        text: result.response,
        persona: chatState.persona,
        timestamp: new Date(),
      };
      setVisibleMessages(p => [...p, handoffMsg]);

      setTransferToPersona(result.persona);
      setTransferring(true);

      // Transfer wait: 20‑25 seconds
      const transferWait = 20000 + Math.floor(Math.random() * 5000);
      await delayMs(transferWait);

      // Post‑transfer system message
      const newAgentName = PERSONA_NAMES[result.persona];
      const transferDoneSys: Message = {
        id: uid(),
        type: "system",
        text: `${oldPersonaName} transferred you to another agent. You are now connected to ${newAgentName}.`,
        timestamp: new Date(),
      };

      setChatState(newState);
      setVisibleMessages([]); // clear old chat
      setTransferring(false);
      setTransferToPersona(null);

      // Add the system notice first, then new agent intro
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
        nancy: [],
        emily: [],
      };
      const pool = introTexts[result.persona] ?? [];
      if (pool.length > 0) {
        const intro = pool[Math.floor(Math.random() * pool.length)];
        const introMsg: Message = {
          id: uid(),
          type: "agent",
          text: intro,
          persona: result.persona,
          timestamp: new Date(),
        };
        setVisibleMessages([transferDoneSys, introMsg]);
        setChatState(s => ({
          ...s,
          history: [...newHistory, { sender: "agent", text: intro }],
        }));
      } else {
        setVisibleMessages([transferDoneSys]);
      }
      resetIdle();
      return;
    }

    // Normal reply
    const agentMsg: Message = {
      id: uid(),
      type: "agent",
      text: result.response,
      persona: result.persona,
      timestamp: new Date(),
    };
    setVisibleMessages(p => [...p, agentMsg]);
    setChatState(newState);

    if (result.end_conversation) {
      const agentName = PERSONA_NAMES[result.persona];
      const closeSys: Message = {
        id: uid(),
        type: "system",
        text: `${agentName} closed this chat.`,
        timestamp: new Date(),
      };
      setVisibleMessages(p => [...p, closeSys]);
      setTimeout(() => {
        setOpen(false);
        resetChatState();
      }, 4000);
      return;
    }

    resetIdle();
  };

  /* ─── Drag to snap ──────────────────────────────── */
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      btnX: rect.left,
      btnY: rect.top,
    };
    btnRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || !btnRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    btnRef.current.style.transition = "none";
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const moved = Math.abs(dx) > 8 || Math.abs(dy) > 8;
    const finalX = dragRef.current.btnX + dx + 28;
    const finalY = dragRef.current.btnY + dy + 28;
    dragRef.current = null;

    if (moved) {
      const edge = snapPosition(
        finalX,
        finalY,
        window.innerWidth,
        window.innerHeight
      );
      setSnapEdge(edge);
      if (btnRef.current) btnRef.current.style.transition = "";
    } else {
      setOpen(o => !o);
    }
  };

  // Manual close (X button) — full reset
  const handleClose = () => {
    setOpen(false);
    resetChatState();
  };

  if (banned) return null;

  const currentPersonaColor = PERSONA_COLORS[chatState.persona];

  return (
    <>
      {/* Floating Button – top‑right, moved down */}
      <motion.button
        ref={btnRef}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="fixed z-[9998] w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing select-none"
        style={{
          ...edgeStyle(snapEdge),
          background: `linear-gradient(135deg, ${currentPersonaColor}cc, ${currentPersonaColor}66)`,
          backdropFilter: "blur(12px)",
          border: `1px solid ${currentPersonaColor}44`,
          touchAction: "none",
        }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="h-5 w-5 text-white" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <MessageCircle className="h-6 w-6 text-white" />
            </motion.span>
          )}
        </AnimatePresence>
        {stage === "chat" && !open && (
          <span
            className="absolute inset-0 rounded-2xl animate-ping opacity-30"
            style={{ background: currentPersonaColor }}
          />
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              ...panelPosition(snapEdge),
              width: "min(380px, 95vw)",
              height: minimized ? "auto" : "min(580px, 85vh)",
              background: "#0a0a0e",
              border: `1px solid ${currentPersonaColor}22`,
              borderRadius: 20,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${currentPersonaColor}11`,
              fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 16px",
                borderBottom: `1px solid ${currentPersonaColor}18`,
                background: `linear-gradient(180deg, ${currentPersonaColor}0a 0%, transparent 100%)`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `${currentPersonaColor}22`,
                  border: `1.5px solid ${currentPersonaColor}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  color: currentPersonaColor,
                  flexShrink: 0,
                  transition: "all 0.4s ease",
                }}
              >
                {stage === "chat" ? PERSONA_AVATARS[chatState.persona] : "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      color: "#f1f1f1",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {stage === "chat"
                      ? PERSONA_NAMES[chatState.persona]
                      : "10 Odds Support"}
                  </span>
                  {stage === "chat" && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: transferring ? "#facc15" : "#4ade80",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                <div style={{ color: "#6b7280", fontSize: 11 }}>
                  {transferring
                    ? `Transferring to ${transferToPersona ? PERSONA_NAMES[transferToPersona] : "another agent"}…`
                    : stage === "chat"
                    ? "Online · 10 Odds Customer Care"
                    : "We typically reply in under a minute"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setMinimized(m => !m)}
                  style={{
                    padding: 6,
                    borderRadius: 8,
                    color: "#6b7280",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  title="Minimize"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    padding: 6,
                    borderRadius: 8,
                    color: "#6b7280",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Body */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {stage === "idle" && (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        gap: 12,
                        padding: "20px 16px",
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 20,
                          background:
                            "linear-gradient(135deg, #a78bfa22, #60a5fa22)",
                          border: "1px solid #a78bfa33",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                        }}
                      >
                        💬
                      </div>
                      <div>
                        <p
                          style={{
                            color: "#f1f1f1",
                            fontWeight: 700,
                            fontSize: 16,
                            marginBottom: 6,
                          }}
                        >
                          Welcome to 10 Odds Support
                        </p>
                        <p
                          style={{
                            color: "#6b7280",
                            fontSize: 13,
                            lineHeight: 1.5,
                          }}
                        >
                          Our agents are available to help you with patterns,
                          predictions, and anything else on the site.
                        </p>
                      </div>
                      <button
                        onClick={handleConnect}
                        style={{
                          marginTop: 8,
                          padding: "10px 28px",
                          borderRadius: 12,
                          background:
                            "linear-gradient(135deg, #a78bfa, #818cf8)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 14,
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 4px 20px rgba(167,139,250,0.3)",
                        }}
                      >
                        Start Chat
                      </button>
                    </div>
                  )}

                  {stage === "connecting" && (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                        color: "#9ca3af",
                      }}
                    >
                      <ConnectingDots />
                      <p style={{ fontSize: 13 }}>
                        Connecting you to an agent…
                      </p>
                      <p style={{ fontSize: 12, color: "#4b5563" }}>
                        Estimated wait: {Math.floor(connectTimer / 60)}m {connectTimer % 60}s
                      </p>
                    </div>
                  )}

                  {stage === "chat" && (
                    <>
                      <AnimatePresence>
                        {transferring && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(10,10,14,0.85)",
                              backdropFilter: "blur(6px)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 12,
                              zIndex: 10,
                            }}
                          >
                            <ArrowRightLeft
                              style={{
                                width: 28,
                                height: 28,
                                color: "#facc15",
                                animation: "spin 1.5s linear infinite",
                              }}
                            />
                            <p
                              style={{
                                color: "#f1f1f1",
                                fontWeight: 700,
                                fontSize: 15,
                              }}
                            >
                              Transferring to{" "}
                              {transferToPersona
                                ? PERSONA_NAMES[transferToPersona]
                                : "another agent"}
                              …
                            </p>
                            <p
                              style={{
                                color: "#6b7280",
                                fontSize: 12,
                              }}
                            >
                              Please hold, this will only take a moment.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {visibleMessages.map(msg => (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          personaColor={
                            msg.persona
                              ? PERSONA_COLORS[msg.persona]
                              : "#a78bfa"
                          }
                          currentPersonaName={
                            stage === "chat"
                              ? PERSONA_NAMES[chatState.persona]
                              : undefined
                          }
                          currentPersonaColor={currentPersonaColor}
                        />
                      ))}

                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 10,
                              flexShrink: 0,
                              background: `${currentPersonaColor}22`,
                              border: `1px solid ${currentPersonaColor}44`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              color: currentPersonaColor,
                              fontWeight: 700,
                            }}
                          >
                            {PERSONA_AVATARS[chatState.persona]}
                          </div>
                          <div
                            style={{
                              background: "#1a1a22",
                              border: "1px solid #ffffff0d",
                              borderRadius: "4px 14px 14px 14px",
                              padding: "10px 14px",
                              display: "flex",
                              gap: 5,
                              alignItems: "center",
                            }}
                          >
                            {[0, 1, 2].map(i => (
                              <span
                                key={i}
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: currentPersonaColor,
                                  display: "block",
                                  opacity: 0.7,
                                  animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                                }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                {stage === "chat" && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderTop: "1px solid #ffffff0d",
                      background: "#0a0a0e",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={e => {
                        setInput(e.target.value);
                        resetIdle();
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          sendMessage();
                          resetIdle();
                        } else {
                          resetIdle();
                        }
                      }}
                      onFocus={resetIdle}
                      placeholder="Type a message…"
                      disabled={isTyping || transferring}
                      style={{
                        flex: 1,
                        background: "#15151e",
                        border: "1px solid #ffffff0d",
                        borderRadius: 12,
                        padding: "9px 14px",
                        fontSize: 13,
                        color: "#e5e7eb",
                        outline: "none",
                        transition: "border-color 0.2s",
                      }}
                      onFocusCapture={e => {
                        (e.target as HTMLInputElement).style.borderColor = `${currentPersonaColor}66`;
                      }}
                      onBlurCapture={e => {
                        (e.target as HTMLInputElement).style.borderColor =
                          "#ffffff0d";
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isTyping || transferring || !input.trim()}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        flexShrink: 0,
                        background: input.trim()
                          ? `linear-gradient(135deg, ${currentPersonaColor}, ${currentPersonaColor}99)`
                          : "#1f1f2e",
                        border: "none",
                        cursor: input.trim() ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        opacity: isTyping || transferring ? 0.5 : 1,
                      }}
                    >
                      <Send style={{ width: 15, height: 15, color: "#fff" }} />
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
      `}</style>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   SUB‑COMPONENTS
═══════════════════════════════════════════════════════════ */
const ConnectingDots = () => (
  <div style={{ display: "flex", gap: 6 }}>
    {[0, 1, 2, 3].map(i => (
      <span
        key={i}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#a78bfa",
          animation: `typingBounce 1.2s ${i * 0.15}s ease-in-out infinite`,
          display: "block",
        }}
      />
    ))}
  </div>
);

const MessageBubble = ({
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
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "4px 0",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#6b7280",
            background: "#111118",
            padding: "4px 14px",
            borderRadius: 10,
            fontWeight: 500,
            textAlign: "center",
            maxWidth: "85%",
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
            width: 28,
            height: 28,
            borderRadius: 10,
            flexShrink: 0,
            background: `${personaColor}22`,
            border: `1px solid ${personaColor}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: personaColor,
            fontWeight: 700,
            marginBottom: 2,
          }}
        >
          {msg.persona
            ? { nancy: "N", emily: "E", tech: "⚙", george: "G" }[msg.persona]
            : "?"}
        </div>
      )}

      <div
        style={{
          maxWidth: "75%",
          display: "flex",
          flexDirection: "column",
          alignItems: isUser ? "flex-end" : "flex-start",
          gap: 3,
        }}
      >
        {!isUser && msg.persona && (
          <span
            style={{
              fontSize: 10,
              color: personaColor,
              fontWeight: 700,
              paddingLeft: 4,
            }}
          >
            {{ nancy: "Nancy", emily: "Emily", tech: "tECH", george: "George" }[
              msg.persona
            ] ?? "Unknown"}
          </span>
        )}

        <div
          style={{
            padding: "9px 13px",
            borderRadius: isUser
              ? "14px 14px 4px 14px"
              : "4px 14px 14px 14px",
            background: isUser
              ? `linear-gradient(135deg, ${personaColor}cc, ${personaColor}99)`
              : "#1a1a22",
            border: isUser ? "none" : "1px solid #ffffff0d",
            color: isUser ? "#fff" : "#d1d5db",
            fontSize: 13,
            lineHeight: 1.55,
            boxShadow: isUser ? `0 4px 12px ${personaColor}33` : "none",
          }}
        >
          {msg.text}
        </div>

        <span
          style={{ fontSize: 10, color: "#4b5563", paddingInline: 4 }}
        >
          {formatTime(msg.timestamp)}
        </span>

        {isUser && msg.status && currentPersonaName && (
          <div
            style={{
              fontSize: 10,
              color: currentPersonaColor || "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: 4,
              paddingRight: 4,
            }}
          >
            {msg.status === "seen" && (
              <>
                <span>{currentPersonaName} seen</span>
                <span style={{ fontWeight: 700 }}>✓</span>
              </>
            )}
            {msg.status === "typing" && (
              <span style={{ opacity: 0.6 }}>typing…</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CustomerCare;