import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, User, Bot, Loader2 } from "lucide-react";

const PERSONS = ["nancy", "emily"]; // first line agents
const PERSONS_TECH = "tech";
const PERSON_GEORGE = "george";

interface Message {
  sender: "user" | "agent";
  text: string;
  persona?: string;
}

const CustomerCare = () => {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"idle" | "connecting" | "waiting" | "chat">("idle");
  const [agentPersona, setAgentPersona] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [warningCount, setWarningCount] = useState(0);
  const [banned, setBanned] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectTime, setConnectTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedBanned = localStorage.getItem("cc_banned") === "true";
    const savedWarnings = parseInt(localStorage.getItem("cc_warnings") || "0", 10);
    if (savedBanned) setBanned(true);
    setWarningCount(savedWarnings);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Save warning count and banned status
  const updateWarnings = (count: number) => {
    setWarningCount(count);
    localStorage.setItem("cc_warnings", String(count));
  };

  const handleBanned = () => {
    setBanned(true);
    localStorage.setItem("cc_banned", "true");
  };

  // Start connection
  const handleConnect = () => {
    setStage("connecting");
    const randomAgent = PERSONS[Math.floor(Math.random() * PERSONS.length)];
    setAgentPersona(randomAgent);
    // Simulate "connecting to agent..." delay
    setTimeout(() => {
      setStage("waiting");
      const waitTime = Math.floor(Math.random() * 19) + 1;
      setConnectTime(waitTime);
      // Countdown
      let remaining = waitTime;
      const timer = setInterval(() => {
        remaining--;
        setConnectTime(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
          setStage("chat");
          setMessages([{
            sender: "agent",
            text: "Hello! You've been connected to " + (randomAgent === "nancy" ? "Nancy" : "Emily") + ". How can I help?",
            persona: randomAgent,
          }]);
        }
      }, 1000);
    }, 2000 + Math.random() * 2000);
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setIsTyping(true);

    // Simulate typing delay (10-37 seconds)
    const delay = 10000 + Math.floor(Math.random() * 27000);
    setTimeout(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-care`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMsg,
            persona: agentPersona,
            warningCount,
            banned,
            history: messages.map(m => ({ sender: m.sender, text: m.text })),
          }),
        });
        const data = await res.json();
        if (data.banned) {
          handleBanned();
          setMessages(prev => [...prev, { sender: "agent", text: data.response, persona: data.persona }]);
          setIsTyping(false);
          return;
        }
        if (data.warningCount !== undefined) updateWarnings(data.warningCount);
        setAgentPersona(data.persona);
        setMessages(prev => [...prev, { sender: "agent", text: data.response, persona: data.persona }]);
      } catch {
        setMessages(prev => [...prev, { sender: "agent", text: "Sorry, I'm having trouble connecting. Please try again.", persona: agentPersona }]);
      } finally {
        setIsTyping(false);
      }
    }, delay);
  };

  // Banned screen
  if (banned) {
    return (
      <div className="fixed bottom-24 right-6 z-40">
        <div className="w-80 rounded-2xl bg-red-950 border border-red-800 p-5 text-white text-sm">
          <p className="font-bold text-lg mb-2">🚫 Access Denied</p>
          <p>You have been banned from customer support.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating button – bottom-left to avoid support button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 left-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </motion.button>

      {/* Chat portal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-0 left-0 z-50 w-full sm:w-96 h-[600px] max-h-[90vh] sm:bottom-24 sm:left-20 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "#0d0d10", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-sm">Customer Support</h3>
                <p className="text-[10px] text-gray-400">We typically reply in under a minute</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: "calc(100% - 120px)" }}>
              {stage === "idle" && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-4">
                  <p className="text-lg font-bold mb-2">Welcome to 10 Odds Support</p>
                  <p className="text-sm mb-4">Our online agents are ready to help.</p>
                  <button onClick={handleConnect} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition">
                    Connect Me
                  </button>
                </div>
              )}
              {stage === "connecting" && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p>Connecting to online agent...</p>
                </div>
              )}
              {stage === "waiting" && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p>All agents are currently busy.</p>
                  <p>Estimated wait time: {connectTime} second{connectTime !== 1 ? "s" : ""}</p>
                </div>
              )}
              {stage === "chat" && (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.sender === "user" ? "bg-indigo-600 text-white" : "bg-white/5 border border-white/10 text-gray-200"
                      }`}>
                        {msg.sender === "agent" && msg.persona && (
                          <p className="text-[10px] font-bold mb-1 text-indigo-400">
                            {msg.persona === "nancy" ? "Nancy" : msg.persona === "emily" ? "Emily" : msg.persona === "tech" ? "tECH" : "George"}
                          </p>
                        )}
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            {stage === "chat" && (
              <div className="p-3 border-t border-white/10 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button onClick={sendMessage} disabled={isTyping} className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CustomerCare;