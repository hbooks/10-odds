import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

const navLinks = [
  { to: "/news",      label: "News & Updates", hasBadge: true },
  { to: "/guide",     label: "Guide" },
  { to: "/games",     label: "Fixtures" },
  // basketball is currently disabled, but we want to keep the nav item for it
  { to: "/scoreboard",label: "Live Matches" },
  { to: "/status",    label: "Predictions" },
  { to: "/live-markets", label: "Watch Markets" },
  { to: "/previous",  label: "Previous Bets" },
  { to: "/analytics", label: "Analytics" },
];

async function fetchUnreadCount(): Promise<number> {
  const lastRead = localStorage.getItem("news_last_read") ?? "1970-01-01T00:00:00Z";
  const { count, error } = await supabase
    .from("news_messages")
    .select("*", { count: "exact", head: true })
    .gt("created_at", lastRead);
  return error || count === null ? 0 : count;
}

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

const Navbar = () => {
  const [open, setOpen]             = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hidden, setHidden]         = useState(false);
  const [atTop, setAtTop]           = useState(true);
  const lastScrollY                 = useRef(0);
  const ticking                     = useRef(false);
  const { pathname }                = useLocation();

  // ── Scroll hide/show logic ─────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        setAtTop(currentY < 12);

        if (currentY < 60) {
          // Always show near top
          setHidden(false);
        } else if (currentY > lastScrollY.current + 6) {
          // Scrolling DOWN — hide
          setHidden(true);
          setOpen(false);
        } else if (currentY < lastScrollY.current - 4) {
          // Scrolling UP — show
          setHidden(false);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── News badge ─────────────────────────────────────────────────────────
  useEffect(() => {
    const refresh = () => fetchUnreadCount().then(setUnreadCount);
    refresh();
    window.addEventListener("news_read", refresh);
    return () => window.removeEventListener("news_read", refresh);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("navbar_badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "news_messages" }, (payload) => {
        const newMsg = payload.new as { created_at: string };
        const lastRead = localStorage.getItem("news_last_read") ?? "1970-01-01T00:00:00Z";
        if (newMsg.created_at > lastRead) setUnreadCount((p) => p + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { fetchUnreadCount().then(setUnreadCount); }, [pathname]);
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <motion.nav
      // Slide up when hidden, slide back down when visible
      animate={{
        y:       hidden ? "-110%" : "0%",
        opacity: hidden ? 0 : 1,
      }}
      transition={{
        type:      "spring",
        stiffness: 280,
        damping:   32,
        mass:      0.8,
      }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{ willChange: "transform" }}
    >
      {/* Glass pill that floats with backdrop blur */}
      <div
        className={`mx-auto transition-all duration-500 ${
          atTop
            ? "rounded-none border-b border-border/40 bg-background/80 backdrop-blur-xl max-w-full"
            : "mt-3 mx-4 rounded-2xl border border-white/8 shadow-2xl shadow-black/30 bg-background/75 backdrop-blur-2xl max-w-7xl"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <motion.img
              src="/assets/00.png"
              alt="10 Odds Logo"
              className="h-10 w-10 object-contain"
              whileHover={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.5 }}
            />
            <span className="text-xl font-heading font-black" style={{ color: "#4A5BA8" }}>
              10 <span className="text-gold">Odds</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-gold font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg bg-gold/10 border border-gold/20"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                  {link.hasBadge && <UnreadBadge count={unreadCount} />}
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="md:hidden p-2 rounded-xl hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={open ? "close" : "open"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0,   opacity: 1 }}
                exit={{   rotate:  90,  opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{   height: 0,    opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden overflow-hidden border-t border-border/40"
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {navLinks.map((link, i) => {
                  const isActive = pathname === link.to;
                  return (
                    <motion.div
                      key={link.to}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        to={link.to}
                        className={`relative flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-gold/10 text-gold border border-gold/20 font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        {link.label}
                        {link.hasBadge && <UnreadBadge count={unreadCount} />}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;