import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Your existing navigation links + News ─────────────────────────────────────
const navLinks = [
  { to: "/news", label: "News & Updates", hasBadge: true },
  { to: "/guide", label: "Guide"},
  ,
  { to: "/games", label: "Fixtures" },
  { to: "/scoreboard", label: "Live Matches" },
  { to: "/status", label: "Predictions" },
  { to: "/previous", label: "Previous Bets" },
  { to: "/analytics", label: "Analytics" },
  
];

// ─── Unread count fetcher ─────────────────────────────────────────────────────
async function fetchUnreadCount(): Promise<number> {
  const lastRead = localStorage.getItem("news_last_read") ?? "1970-01-01T00:00:00Z";
  const { count, error } = await supabase
    .from("news_messages")
    .select("*", { count: "exact", head: true })
    .gt("created_at", lastRead);
  return error || count === null ? 0 : count;
}

// ─── Badge component ──────────────────────────────────────────────────────────
function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums"
    >
      {count > 9 ? "9+" : count}
    </motion.span>
  );
}

// ─── Navbar Component ─────────────────────────────────────────────────────────
const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { pathname } = useLocation();

  // ── Initial fetch & "news_read" event listener ───────────────────────────
  useEffect(() => {
    const refresh = () => fetchUnreadCount().then(setUnreadCount);
    refresh();
    window.addEventListener("news_read", refresh);
    return () => window.removeEventListener("news_read", refresh);
  }, []);

  // ── Real‑time subscription for new messages ─────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("navbar_badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "news_messages" },
        (payload) => {
          const newMsg = payload.new as { created_at: string };
          const lastRead = localStorage.getItem("news_last_read") ?? "1970-01-01T00:00:00Z";
          // Only increment if the new message was created after the last read
          if (newMsg.created_at > lastRead) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Re‑fetch when pathname changes (e.g., user navigated to /news)
  useEffect(() => {
    fetchUnreadCount().then(setUnreadCount);
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/assets/o.png"
            alt="10 Odds Logo"
            className="h-10 w-10 object-contain"
          />
          <span className="text-xl font-heading font-bold text-foreground">
            10 <span className="text-gold">Odds</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent/20 text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
                {link.hasBadge && <UnreadBadge count={unreadCount} />}
              </Link>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-muted"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border"
          >
            <div className="container mx-auto px-4 py-2 flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent/20 text-accent-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.label}
                    {link.hasBadge && <UnreadBadge count={unreadCount} />}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;