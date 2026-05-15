import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { RefreshCw, AlertCircle, MessageCircle, BadgeCheck } from "lucide-react";
import Layout from "@/components/Layout";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewsMessage {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TECH_AVATAR = "https://api.dicebear.com/9.x/lorelei/svg?seed=Amie?backgroundColor=ffmfkf";

function formatTime(iso: string): string {
  const d   = new Date(iso);
  const now = new Date();
  const diffMs  = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  const diffD   = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24)   return `${diffH}h ago`;
  if (diffD === 1)  return `Yesterday at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    ` at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function isNew(iso: string, lastReadIso: string | null): boolean {
  if (!lastReadIso) return true;
  return new Date(iso) > new Date(lastReadIso);
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  message,
  highlight,
}: {
  message: NewsMessage;
  highlight: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3 max-w-[90%] md:max-w-[70%]"
    >
      <div className="relative shrink-0">
        <img
          src={TECH_AVATAR}
          alt="tECH"
          className="h-9 w-9 rounded-full border-2 border-border bg-muted"
        />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-background" />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">tECH</span>
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
            Admin
          </span>
        </div>

        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
            ${highlight
              ? "bg-gold/15 border border-gold/30 text-foreground"
              : "bg-card border border-border text-foreground"
            }`}
        >
          {message.content}
          {highlight && (
            <span className="ml-2 text-[10px] text-gold font-semibold uppercase tracking-wide">
              NEW
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground/60 pl-1">
          {formatTime(message.created_at)}
          {message.updated_at !== message.created_at && (
            <span className="ml-1.5 italic">(edited)</span>
          )}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const NewsPage = () => {
  const [messages, setMessages] = useState<NewsMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("news_messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (err) throw err;
      setMessages((data as NewsMessage[]) ?? []);
    } catch {
      setError("Could not load messages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prev = localStorage.getItem("news_last_read");
    setLastRead(prev);

    fetchMessages().then(() => {
      localStorage.setItem("news_last_read", new Date().toISOString());
      window.dispatchEvent(new Event("news_read"));
    });

    // ── Real‑time subscription for new messages ─────────────────────────────
    const channel = supabase
      .channel("news_page")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "news_messages" },
        (payload) => {
          const newMsg = payload.new as NewsMessage;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto‑scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
            <MessageCircle className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-heading font-semibold text-sm text-foreground">
              # announcements
            </p>
            <p className="text-[11px] text-muted-foreground">
              Updates from tECH · {messages.length} message{messages.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="ml-auto p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 py-6 space-y-5"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 40px, hsl(var(--border)/0.3) 40px, hsl(var(--border)/0.3) 41px)",
          }}
        >
          {loading && (
            <div className="flex justify-center py-20">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <button onClick={fetchMessages} className="text-sm text-gold hover:underline">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 opacity-40" />
              <p className="text-sm">No messages yet. Check back soon.</p>
            </div>
          )}

          <AnimatePresence>
            {!loading && messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                highlight={isNew(msg.created_at, lastRead)}
              />
            ))}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>
    </Layout>
  );
};

export default NewsPage;