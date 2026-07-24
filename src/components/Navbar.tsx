import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, ChevronDown, LogOut, Settings, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { useUser, useClerk } from "@clerk/react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

const navLinks = [
  { to: "/news", label: "News & Updates", hasBadge: true },
  { to: "/guide", label: "Guide" },
  { to: "/games", label: "Fixtures" },
  { to: "/scoreboard", label: "Live Matches" },
  { to: "/status", label: "Predictions" },
  { to: "/previous", label: "Previous Bets" },
  { to: "/analytics", label: "Analytics" },
  { to: "/markets", label: "Monitor" },
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

// ─── Profile Button (page‑based) ──────────────────────────────────────
function ProfileButton() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => setIsOpen(false), [location]);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const handleLogout = async () => {
    await signOut();
    setIsOpen(false);
  };

  // Get user initials for fallback avatar
  const getInitials = (): string => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user.emailAddresses?.[0]?.emailAddress) {
      return user.emailAddresses[0].emailAddress[0].toUpperCase();
    }
    return "U";
  };

  if (!isLoaded) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Profile"
      >
        {isSignedIn && user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt="Avatar"
            className="h-8 w-8 rounded-full object-cover border border-white/10"
          />
        ) : isSignedIn ? (
          // Fallback: show initials
          <div className="h-8 w-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold border border-white/10">
            {getInitials()}
          </div>
        ) : (
          <User className="h-6 w-6" />
        )}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-background/90 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden z-50"
          >
            {isSignedIn ? (
              // ── Logged in ──
              <div className="py-1">
                <div className="px-4 py-2 text-xs text-muted-foreground border-b border-white/5 truncate">
                  {user?.emailAddresses?.[0]?.emailAddress || "User"}
                </div>
                <Link
                  to="/analytics"
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-white/5 transition-colors flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <a
                  href={`https://accounts.hpbooks.uk/user`}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-white/5 transition-colors flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </a>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2 border-t border-white/5"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              // ── Logged out ──
              <div className="py-1">
                <a
                  href={`https://accounts.hpbooks.uk/sign-in`}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-white/5 transition-colors flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <span>Log in</span>
                </a>
                <a
                  href={`https://accounts.hpbooks.uk/sign-up`}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-white/5 transition-colors flex items-center gap-2 border-t border-white/5"
                  onClick={() => setIsOpen(false)}
                >
                  <span>Sign up</span>
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────
const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const { pathname } = useLocation();

  // ── Scroll hide/show logic ─────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        setAtTop(currentY < 12);

        if (currentY < 60) {
          setHidden(false);
        } else if (currentY > lastScrollY.current + 6) {
          setHidden(true);
          setOpen(false);
        } else if (currentY < lastScrollY.current - 4) {
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
      animate={{
        y: hidden ? "-110%" : "0%",
        opacity: hidden ? 0 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 32,
        mass: 0.8,
      }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{ willChange: "transform" }}
    >
      <div
        className={`mx-auto transition-all duration-500 ${atTop
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
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
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

          {/* Right side: Profile + Hamburger */}
          <div className="flex items-center gap-2">
            <ProfileButton />
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
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile menu (unchanged) */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
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
                        className={`relative flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
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