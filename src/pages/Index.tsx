import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import {
  Zap, TrendingUp, Activity, BarChart2, ArrowRight, CheckCircle,
  ChevronDown, Globe2, Shield, Users, Star, Trophy, Target,
  BrainCircuit, Flame, Eye, Play, Calendar, MapPin, Ticket,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Layout from "@/components/Layout";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Variants ────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };
const fadeIn  = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.7 } } };

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref     = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const mv      = useMotionValue(0);
  const spring  = useSpring(mv, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState("0");
  useEffect(() => { if (isInView) mv.set(value); }, [isInView, value, mv]);
  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v).toString())), [spring]);
  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Ticker ───────────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  "⚽ Premier League","🏆 La Liga","Bundesliga","Serie A","Ligue 1",
  "📊 18+ Bet Types","🤖 MK-806 Engine","🔥 Daily Accumulators","📈 Value Betting",
  "🎯 High Confidence Picks","🧠 Pattern Analysis","💎 Both Teams to Score",
  "⚡ Over 2.5 Goals","📋 10-Odds Slip","🔮 Simulated Futures","📉 Under 2.5 Goals",
  "👤 _806 Advisor","🏟️ Home Advantage","📅 Today's Fixtures","✨ Hand-Picked Selections",
  "🚀 Boosting Bankrolls","🎲 Risk Management","📋 Multi-Bet Slips","🔄 Daily Updates",
];

const Ticker = () => {
  const shuffled = useMemo(() => {
    const arr = [...TICKER_ITEMS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);
  const items = [...shuffled, ...shuffled];
  return (
    <div className="overflow-hidden py-4 border-y border-white/8 bg-blue/[0.015]">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {items.map((item, i) => (
          <span key={i} className="text-[11px] font-mono font-bold tracking-[0.2em] text-black/60 uppercase shrink-0">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const LEAGUES = [
  { name: "Premier League", flagSrc: "https://flagcdn.com/24x18/gb-eng.png" },
  { name: "La Liga",        flagSrc: "https://flagcdn.com/24x18/es.png" },
  { name: "Bundesliga",     flagSrc: "https://flagcdn.com/24x18/de.png" },
  { name: "Serie A",        flagSrc: "https://flagcdn.com/24x18/it.png" },
  { name: "Ligue 1",        flagSrc: "https://flagcdn.com/24x18/fr.png" },
];

// Gallery photos — football action shots
const GALLERY = [
  "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&q=85",
  "https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=600&q=85",
  "https://images.pexels.com/photos/3999307/pexels-photo-3999307.jpeg",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=85",
  "https://images.pexels.com/photos/6059695/pexels-photo-6059695.jpeg",
  "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=600&q=85",
  "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=600&q=85",
  "https://images.pexels.com/photos/39856/play-card-game-poker-poker-chips-39856.jpeg",
];

// Feature cards (replaces bento)
const FEATURES = [
  {
icon: BrainCircuit,
tag: "Market Intelligence",
title: "Live Market Monitor",
desc: "Watch betting markets move in real‑time — just like a stock chart. Time your bets with confidence, not guesswork.",
    accent: "#f59e0b",
    link: "/market",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80",
    wide: true,
  },
  {
    icon: Target,
    tag: "Daily",
    title: "10 Odds Slip",
    desc: "One curated accumulator. Only the sharpest picks make the cut.",
    accent: "#10b981",
    link: "/status",
    img: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&q=80",
  },
  {
    icon: Activity,
    tag: "Real-time",
    title: "Live Scoreboard",
    desc: "Match status from kick-off to final whistle.",
    accent: "#ef4444",
    link: "/scoreboard",
    img: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80",
  },
  {
    icon: BarChart2,
    tag: "Analytics",
    title: "Deep Analytics",
    desc: "Win rates, ROI charts, and confidence calibration across all five leagues.",
    accent: "#3b82f6",
    link: "/analytics",
    img: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600&q=80",
    wide: true,
  },
  {
    icon: TrendingUp,
    tag: "AI",
    title: "Pattern Recognition",
    desc: "18 distinct bet-type patterns — MK-806 learns from every resolved prediction.",
    accent: "#8b5cf6",
    link: "/patterns",
    img: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600&q=80",
  },
];



const HOW_IT_WORKS = [
  {
    step: "01", icon: Globe2, title: "Data Ingestion", color: "#f59e0b",
    desc: "Live fixtures, Elo ratings, xG averages, bookmaker odds, and head-to-head records across all five major European leagues — collected daily.",
  },
  {
    step: "02", icon: BrainCircuit, title: "The Engine Thinks", color: "#3b82f6",
    desc: "MK-806 runs thousands of future simulations per match, blending Poisson models, Elo signals, and market edge detection into a single probability.",
  },
  {
    step: "03", icon: Trophy, title: "You Get the Pick", color: "#10b981",
    desc: "Only bets that pass strict value criteria make the slip. Each comes with full reasoning, a confidence score, and the pattern advisor's verdict.",
  },
];

const TRUST = [
  { icon: Shield, label: "Safe & Secure" },
  { icon: Eye,    label: "No login required" },
  { icon: Flame,  label: "Updated every Day" },
  { icon: Globe2, label: "5 leagues covered" },
  { icon: Star,   label: "Transparent data" },
  { icon: Users,  label: "Growing community" },
];


// ─── Fixtures list component (fetch tomorrow & day‑after‑tomorrow from Supabase) ───
function FixturesList() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFixtures = async () => {
      setLoading(true);
      setError(null);
      try {
        // ── Compute Kenya date boundaries ──────────────────────────────────
        const nowKenya = new Date(Date.now() + 3 * 60 * 60 * 1000); // Kenya now
        const tomorrowStartKenya = new Date(
          nowKenya.getFullYear(),
          nowKenya.getMonth(),
          nowKenya.getDate() + 1
        );
        const dayAfterStartKenya = new Date(
          nowKenya.getFullYear(),
          nowKenya.getMonth(),
          nowKenya.getDate() + 2
        );
        const dayAfterEndKenya = new Date(
          nowKenya.getFullYear(),
          nowKenya.getMonth(),
          nowKenya.getDate() + 3
        );

        // Convert Kenya midnight boundaries back to UTC
        const lowerUTC = new Date(tomorrowStartKenya.getTime() - 3 * 60 * 60 * 1000);
        const upperUTC = new Date(dayAfterEndKenya.getTime() - 3 * 60 * 60 * 1000);

        // Fetch matches in the window, exclude finished/cancelled
        const { data, error: dbErr } = await supabase
          .from("matches")
          .select(`
            id, utc_date, status, competition_id,
            home:home_team_id ( name ),
            away:away_team_id ( name ),
            competition:competition_id ( name )
          `)
          .gte("utc_date", lowerUTC.toISOString())
          .lt("utc_date", upperUTC.toISOString())
          .not("status", "in", '("FINISHED","CANCELLED","POSTPONED","SUSPENDED")')
          .order("utc_date", { ascending: true })
          .limit(8);

        if (dbErr) throw dbErr;
        setFixtures(data ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load fixtures");
      } finally {
        setLoading(false);
      }
    };

    fetchFixtures();
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.05]"
          />
        ))}
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-10 text-white/40">
        <p>Couldn’t load fixtures.</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-[#D4AF37] hover:underline mt-2 inline-block"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (fixtures.length === 0) {
    return (
      <div className="text-center py-10 text-white/30">
        <p className="text-lg font-medium">No upcoming fixtures</p>
        <p className="text-sm mt-1">Check back when dates are closer to matchday.</p>
      </div>
    );
  }

  // ── Render fixture cards ─────────────────────────────────────────
  return (
    <div className="space-y-3">
      {fixtures.map((fixture, idx) => {
        // Convert UTC to Kenya time (UTC+3)
        const kickoffUTC = new Date(fixture.utc_date);
        const kickoffKenya = new Date(kickoffUTC.getTime() + 3 * 60 * 60 * 1000);

        const dateStr = kickoffKenya.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        const timeStr = kickoffKenya.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        const homeName = fixture.home?.name ?? "Home";
        const awayName = fixture.away?.name ?? "Away";
        const competition = fixture.competition?.name ?? "Unknown";
        const statusLabel = fixture.status === "PENDING" ? "Predicted" : "Coming";

        return (
          <motion.div
            key={fixture.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05, duration: 0.35 }}
            className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm hover:border-white/[0.13] transition-colors group"
          >
            {/* Teams + competition */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-white font-semibold text-sm md:text-base leading-tight">
                  {homeName}
                </span>
                <span className="text-white/25 text-xs font-mono">vs</span>
                <span className="text-white font-semibold text-sm md:text-base leading-tight">
                  {awayName}
                </span>
              </div>
              <p className="text-[11px] text-white/30 mt-1">{competition}</p>
            </div>

            {/* Date & time */}
            <div className="text-right shrink-0">
              <p className="text-white/70 text-xs font-mono">{dateStr}</p>
              <p className="text-white/40 text-[11px]">{timeStr} EAT</p>
            </div>

            {/* Status badge */}
            <div className="shrink-0 hidden sm:block">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  statusLabel === "Predicted"
                    ? "text-[#D4AF37] border-[#D4AF37]/40 bg-[#D4AF37]/8"
                    : "text-white/50 border-white/15 bg-white/[0.04]"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};


// ─── Page ─────────────────────────────────────────────────────────────────────
const IndexPage = () => {
  const [avgWinRate,  setAvgWinRate]  = useState<number | null>(null);
  const [winPatterns, setWinPatterns] = useState<number | null>(null);

  const { scrollY } = useScroll();
  const textY = useTransform(scrollY, [0, 600], [0, 80]);
  const opac  = useTransform(scrollY, [0, 400], [1, 0]);

  // Mouse glow
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const glowX  = useSpring(useTransform(mouseX, [0, 1], ["-20%", "120%"]), { stiffness: 60, damping: 20 });
  const glowY  = useSpring(useTransform(mouseY, [0, 1], ["-20%", "120%"]), { stiffness: 60, damping: 20 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pattern_analysis")
        .select("win_rate, total_predictions")
        .eq("pattern_type", "WIN");
      if (data?.length) {
        const total    = data.reduce((s, r) => s + r.total_predictions, 0);
        const weighted = data.reduce((s, r) => s + r.win_rate * r.total_predictions, 0);
        setAvgWinRate(total > 0 ? Math.round(weighted / total) : null);
        setWinPatterns(data.length);
      }
    })();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top)  / rect.height);
  };

  return (
    <Layout>

      {/* ══════════════════════════════════════════════════════
          HERO — full-viewport video background (Sonorx style)
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden bg-black"
        onMouseMove={handleMouseMove}
      >
        {/* Video background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay muted loop playsInline
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.38) saturate(1.1)" }}
          >
            <source src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/vd.mp4" type="video/mp4" />
            {/* Fallback stadium image */}
            <img
              src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1800&q=90"
              alt="Stadium"
              className="w-full h-full object-cover"
            />
          </video>
          {/* Bottom vignette fade to black */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.85) 85%, #000 100%)"
          }} />
          {/* Warm gold radial on centre */}
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(245,158,11,0.08) 0%, transparent 65%)"
          }} />
        </div>

        {/* Interactive mouse glow */}
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full pointer-events-none z-[1]"
          style={{
            left: glowX, top: glowY,
            background: "radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 65%)",
            transform: "translate(-50%,-50%)",
          }}
        />

        {/* Noise grain overlay */}
        <div className="absolute inset-0 z-[1] opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }}
        />

        {/* Hero content */}
        <motion.div
          className="relative z-10 container mx-auto px-6 max-w-6xl flex flex-col items-center text-center gap-8"
          style={{ y: textY, opacity: opac }}
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
   {/* ────── LEFT COLUMN — Text + CTAs ────── */}
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6 md:space-y-8 text-left"
    >
       <h1 className="text-[clamp(2.8rem,6vw,4.5rem)] font-heading font-black leading-[0.95] tracking-tight text-white">
        The Future is
        <br />
        <span
          className="text-transparent bg-clip-text"
          style={{
            backgroundImage: "linear-gradient(135deg, #D4AF37 0%, #f5d878 50%, #D4AF37 100%)",
          }}
        >
          Already Decided.
        </span>
      </h1>

      <p
        className="text-base md:text-lg text-white/50 max-w-lg leading-relaxed font-light"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        MK‑806 runs thousands of match simulations every day across 5 European
        leagues. Hippo AI finds the safest alternative markets. And our new
        <span className="text-white/70 font-medium"> Live Market Monitor</span>{" "}
        lets you watch probability shift minute‑by‑minute — just like a stock
        terminal.
      </p>

      {/* League pills */}
      <div className="flex flex-wrap items-center gap-2">
        {LEAGUES.map((l) => (
          <span
            key={l.name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-white/50 border border-white/8"
            style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(6px)" }}
          >
            <img src={l.flagSrc} alt={l.name} className="h-3 w-4 object-cover rounded-[2px]" />
            {l.name}
          </span>
        ))}
      </div>
      </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 z-10"
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[9px] font-mono uppercase tracking-[0.3em]">Scroll</span>
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </section>
      

      {/* ══════════════════════════════════════════════════════
          TICKER
      ══════════════════════════════════════════════════════ */}
      <Ticker />


      {/* ══════════════════════════════════════════════════════
          PHOTO GALLERY STRIP (Sonorx band photos)
      ══════════════════════════════════════════════════════ */}
      <section className="py-6 bg-black overflow-hidden">
        <motion.div
          className="flex gap-3"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ width: "max-content" }}
        >
          {[...GALLERY, ...GALLERY].map((src, i) => (
            <div
              key={i}
              className="relative shrink-0 rounded-2xl overflow-hidden"
              style={{ width: 280, height: 190 }}
            >
              <img
                src={src}
                alt="Football"
                className="w-full h-full object-cover"
                style={{ filter: "saturate(0.8) brightness(0.85)" }}
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.2) 0%, transparent 60%)" }} />
            </div>
          ))}
        </motion.div>
      </section>

         {/* ═══════════════════════════════════════════════════════════
   FIXTURES — Live from Supabase
═══════════════════════════════════════════════════════════ */}
<section className="py-28 relative overflow-hidden" style={{ background: "#050505" }}>
  {/* Ambient "FIXTURES" text behind */}
  <div
    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
    aria-hidden
  >
    <span
      className="text-[22vw] font-black text-white/[0.018] tracking-tighter whitespace-nowrap"
      style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
    >
      FIXTURES
    </span>
  </div>

  <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
    {/* Section header */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="text-center mb-12"
    >
      <h2 className="text-3xl md:text-4xl font-heading font-black text-white tracking-tight">
        Upcoming{" "}
        <span
          className="text-transparent bg-clip-text"
          style={{
            backgroundImage: "linear-gradient(135deg, #D4AF37 0%, #f5d878 50%, #D4AF37 100%)",
          }}
        >
          Fixtures
        </span>
      </h2>
      <p className="text-white/40 mt-2 max-w-md mx-auto text-sm">
        Matches we’re tracking across the top leagues. Predictions land the morning of each matchday.
      </p>
    </motion.div>
    <FixturesList />
  </div>
</section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS — sticky scroll steps
      ══════════════════════════════════════════════════════════════════ */}
<section className="py-28 relative overflow-hidden bg-black">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 70%)" }} />
 
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-20">
              <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-amber-400/70 mb-3">The Process</p>
              <h2 className="text-[clamp(2.4rem,5vw,4rem)] font-black text-white leading-none tracking-tight"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                From raw data to your pick.
              </h2>
            </motion.div>
 
            <div className="relative flex flex-col gap-16">
              {/* Vertical line */}
              <div className="absolute left-[27px] md:left-1/2 top-0 bottom-0 w-px hidden sm:block"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)", transform: "translateX(-50%)" }} />
 
              {HOW_IT_WORKS.map((step, i) => (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
                >
                  <div className="relative z-10 shrink-0">
                    <motion.div
                      whileInView={{ scale: [0.6, 1.1, 1] }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-black"
                      style={{ borderColor: step.color, boxShadow: `0 0 35px ${step.color}20` }}
                    >
                      <step.icon className="h-7 w-7" style={{ color: step.color }} />
                    </motion.div>
                    <span
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center text-black"
                      style={{ background: step.color }}
                    >
                      {step.step}
                    </span>
                  </div>
 
                  <div className={`flex-1 ${i % 2 === 1 ? "md:text-right" : ""}`}>
                    <h3 className="text-2xl font-black text-white mb-2"
                      style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                      {step.title}
                    </h3>
                    <p className="text-white/40 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════════════ */}
      <motion.section
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        className="py-10 border-y border-white/5"
        style={{ background: "#050505ff" }}
      >
        <div className="container mx-auto px-6">
          <motion.div variants={fadeIn} className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {TRUST.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="flex items-center gap-2 text-sm text-white/30 hover:text-white/55 transition-colors"
              >
                <Icon className="h-4 w-4 text-amber-400/60 shrink-0" />
                <span className="font-mono text-[12px] tracking-wide">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════
          COMMUNITY CALLOUT
      ══════════════════════════════════════════════════════ */}
      <section className="py-28 container mx-auto px-6 max-w-5xl">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            whileHover={{ scale: 1.008 }}
            className="relative rounded-3xl overflow-hidden border border-amber-400/12 p-10 md:p-16"
            style={{ background: "linear-gradient(135deg, rgba(24, 84, 93, 0.49) 0%, rgba(127, 82, 30, 0.65) 60%)" }}
          >
            <div className="absolute -top-28 -right-28 w-80 h-80 rounded-full bg-amber-400/8 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <motion.div
                animate={{ rotate: [-4, 4, -4], y: [0, -7, 0] }}
                transition={{ repeat: Infinity, duration: 3.8 }}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl"
                style={{ background: "linear-gradient(135deg,#f59e0b,#b45309)", boxShadow: "0 20px 60px rgba(245,158,11,0.30)" }}
              >
                <Trophy className="h-10 w-10 text-black" />
              </motion.div>

              <div className="text-center md:text-left">
                <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-amber-400/70 mb-3">Community</p>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  Support the project.<br />Get your name on the board.
                </h2>
                <p className="text-white/40 max-w-lg leading-relaxed mb-7 text-sm">
                  Every supporter who helps keep 10 Odds running gets their name permanently displayed
                  on our Community Board. Your support is what makes this project accessible for everyone.
                </p>
                <Link to="/community">
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm text-black"
                    style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", boxShadow: "0 12px 40px rgba(245,158,11,0.25)" }}
                  >
                    <Users className="h-4 w-4" /> View the Board
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FINAL CTA — full-bleed cinematic
      ══════════════════════════════════════════════════════ */}
      <section className="relative py-40 overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1800&q=80"
            alt="Stadium"
            className="w-full h-full object-cover object-center opacity-20"
            style={{ filter: "saturate(0.6)" }}
          />
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, #000 0%, transparent 25%, transparent 75%, #000 100%)"
          }} />
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(245,158,11,0.10) 0%, transparent 65%)"
          }} />
        </div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}
          className="relative z-10 container mx-auto px-6 max-w-4xl text-center"
        >
          <motion.div variants={fadeUp} className="mb-6">
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2.8, repeat: Infinity }}
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl"
              style={{ background: "linear-gradient(135deg,#fbbf24,#fb923c)", boxShadow: "0 20px 60px rgba(245,158,11,0.35)" }}
            >
              <Zap className="h-8 w-8 text-black" />
            </motion.div>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[clamp(2.8rem,7vw,6rem)] font-black text-white mb-5 leading-[0.95] tracking-tight"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            Ready to see what
            <br />
            <span className="text-transparent bg-clip-text" style={{
              backgroundImage: "linear-gradient(135deg,#fbbf24,#fb923c)"
            }}>
              MK-806 picked today?
            </span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-white/40 max-w-xl mx-auto mb-10 text-base leading-relaxed">
            The daily accumulator is live. No subscription, no login —
            just the picks, the reasoning, and the data behind every decision.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center mb-10">
            <Link to="/status">
              <motion.button
                whileHover={{ scale: 1.06, boxShadow: "0 24px 60px rgba(245,158,11,0.40)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 px-10 py-4 rounded-full font-black text-black text-sm tracking-wide"
                style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b,#fb923c)", boxShadow: "0 12px 40px rgba(245,158,11,0.28)" }}
              >
                View Today's Slip <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
            <Link to="/previous">
              <motion.button
                whileHover={{ scale: 1.03, borderColor: "rgba(255,255,255,0.25)" }}
                whileTap={{ scale: 0.97 }}
                className="text-white/40 hover:text-white/70 font-semibold px-7 py-4 rounded-full border border-white/10 transition-colors text-sm"
              >
                Previous Predictions
              </motion.button>
            </Link>
          </motion.div>

          <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[11px] text-white/25 font-mono">
            {["Safe & Secure", "No login required", "Updated Daily", "5 leagues covered"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-amber-400/40 shrink-0" /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

    </Layout>
  );
};

export default IndexPage;
