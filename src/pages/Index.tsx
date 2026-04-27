import { useEffect, useRef, useState } from "react";
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
  Zap,
  TrendingUp,
  Ticket,
  Activity,
  BarChart2,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Globe2,
  Shield,
  Users,
  Star,
  Trophy,
  Target,
  BrainCircuit,
  Flame,
  Eye,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Layout from "@/components/Layout";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView) mv.set(value);
  }, [isInView, value, mv]);

  useEffect(() => {
    return spring.on("change", (v) => setDisplay(Math.round(v).toString()));
  }, [spring]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Ticker / marquee ─────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  "⚽ Premier League",
  "🏆 La Liga",
  "🇩🇪 Bundesliga",
  "🇮🇹 Serie A",
  "🇫🇷 Ligue 1",
  "📊 18+ Bet Types",
  "🤖 MK-806 Engine",
  "🔥 Daily Accumulators",
  "📈 Value Betting",
  "✅ Free Forever",
];

const Ticker = () => {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop
  return (
    <div className="overflow-hidden py-3.5 border-y border-white/6 bg-white/[0.02]">
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {items.map((item, i) => (
          <span key={i} className="text-xs font-mono font-semibold tracking-widest text-muted-foreground uppercase shrink-0">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

// ─── Bento feature data ───────────────────────────────────────────────────────
const BENTO = [
  {
    icon: BrainCircuit,
    title: "MK-806 AI Engine",
    desc: "Thousands of match simulations daily — Poisson, Elo, xG, and market edge signals blended into one confident pick.",
    accent: "#f59e0b",
    span: "md:col-span-2",
    big: true,
    link: "/about",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  },
  {
    icon: Target,
    title: "Daily 10-Odds Slip",
    desc: "One curated 10-leg accumulator every morning. Only the highest-value picks make the cut.",
    accent: "#10b981",
    span: "md:col-span-1",
    link: "/ten-odds",
  },
  {
    icon: Activity,
    title: "Live Scoreboard",
    desc: "Real-time match status from kick-off to final whistle.",
    accent: "#ef4444",
    span: "md:col-span-1",
    link: "/scoreboard",
  },
  {
    icon: BarChart2,
    title: "Deep Analytics",
    desc: "Win rates, ROI charts, and confidence calibration across all five leagues.",
    accent: "#3b82f6",
    span: "md:col-span-1",
    link: "/analytics",
  },
  {
    icon: TrendingUp,
    title: "Pattern Recognition",
    desc: "18 distinct bet-type patterns — MK-806 learns from every resolved prediction.",
    accent: "#8b5cf6",
    span: "md:col-span-2",
    big: true,
    link: "/pattern-analyser",
    img: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&q=80",
  },
];

// ─── How it works steps ───────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Globe2,
    title: "Data Ingestion",
    desc: "Live fixtures, Elo ratings, xG averages, bookmaker odds, and head-to-head records across all five major European leagues — collected daily.",
    color: "#f59e0b",
  },
  {
    step: "02",
    icon: BrainCircuit,
    title: "The Engine Thinks",
    desc: "MK-806 runs thousands of future simulations per match, blending Poisson models, Elo signals, and market edge detection into a single probability.",
    color: "#3b82f6",
  },
  {
    step: "03",
    icon: Trophy,
    title: "You Get the Pick",
    desc: "Only bets that pass strict value criteria make the slip. Each comes with full reasoning, a confidence score, and the pattern advisor's verdict.",
    color: "#10b981",
  },
];

// ─── Trust pills ──────────────────────────────────────────────────────────────
const TRUST = [
  { icon: Shield,     label: "Free forever" },
  { icon: Eye,        label: "No login required" },
  { icon: Flame,      label: "Updated every morning" },
  { icon: Globe2,     label: "5 leagues covered" },
  { icon: Star,       label: "Transparent data" },
  { icon: Users,      label: "Growing community" },
];

// ─── Leagues strip ────────────────────────────────────────────────────────────
const LEAGUES = [
  { name: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "La Liga",        flag: "🇪🇸" },
  { name: "Bundesliga",     flag: "🇩🇪" },
  { name: "Serie A",        flag: "🇮🇹" },
  { name: "Ligue 1",        flag: "🇫🇷" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const IndexPage = () => {
  const [avgWinRate,  setAvgWinRate]  = useState<number | null>(null);
  const [winPatterns, setWinPatterns] = useState<number | null>(null);

  // Parallax
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const imgY   = useTransform(scrollY, [0, 700], [0, 160]);
  const textY  = useTransform(scrollY, [0, 500], [0, 60]);
  const opac   = useTransform(scrollY, [0, 380], [1, 0]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pattern_analysis")
        .select("win_rate, total_predictions")
        .eq("pattern_type", "WIN");
      if (data && data.length > 0) {
        const total    = data.reduce((s, r) => s + r.total_predictions, 0);
        const weighted = data.reduce((s, r) => s + r.win_rate * r.total_predictions, 0);
        setAvgWinRate(total > 0 ? Math.round(weighted / total) : null);
        setWinPatterns(data.length);
      }
    })();
  }, []);

  // Mouse-tracking glow for hero
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const glowX  = useSpring(useTransform(mouseX, [0, 1], ["-20%", "120%"]), { stiffness: 80, damping: 20 });
  const glowY  = useSpring(useTransform(mouseY, [0, 1], ["-20%", "120%"]), { stiffness: 80, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top)  / rect.height);
  };

  return (
    <Layout>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — cinematic full-viewport
      ══════════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* Stadium background with parallax */}
        <motion.div className="absolute inset-0 z-0" style={{ y: imgY, scale: 1.15 }}>
          <img
            src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1800&q=90"
            alt="Stadium"
            className="w-full h-full object-cover object-center"
            loading="eager"
          />
          {/* Layered overlays for cinematic depth */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.48) 40%, rgba(0,0,0,0.88) 100%)"
          }} />
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,158,11,0.10) 0%, transparent 70%)"
          }} />
        </motion.div>

        {/* Mouse-tracking interactive glow */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none z-[1]"
          style={{
            left: glowX, top: glowY,
            background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
            transform: "translate(-50%,-50%)",
          }}
        />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 z-[1] opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Hero content */}
        <motion.div
          className="relative z-10 container mx-auto px-4 max-w-6xl flex flex-col items-center text-center gap-7"
          style={{ y: textY, opacity: opac }}
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Badge */}
          <motion.div variants={fadeUp}>
            <motion.span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-mono font-bold tracking-widest uppercase text-gold border border-gold/30"
              style={{ background: "rgba(245,158,11,0.08)", backdropFilter: "blur(12px)" }}
              animate={{ boxShadow: ["0 0 0px rgba(245,158,11,0)", "0 0 24px rgba(245,158,11,0.3)", "0 0 0px rgba(245,158,11,0)"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Zap className="h-3 w-3" /> Powered by MK-806 · AI Football Intelligence
            </motion.span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-8xl font-heading font-black text-white leading-[1.0] tracking-tight"
          >
            The God of{" "}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text" style={{
                backgroundImage: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #fb923c 100%)"
              }}>
                Time
              </span>
              <motion.span
                className="absolute -bottom-1 left-0 h-[3px] rounded-full"
                style={{ background: "linear-gradient(90deg, #f59e0b, #fb923c)" }}
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
            <br />
            <span className="text-white/90">has spoken</span>{" "}
            <span className="text-white">your picks.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={fadeUp}
            className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed font-light"
          >
            MK-806 runs thousands of future simulations every day across the top 5
            European leagues — then distils them into a single, high-value
            accumulator slip you can trust.
          </motion.p>

          {/* League flags */}
          <motion.div variants={fadeUp} className="flex items-center gap-3 flex-wrap justify-center">
            {LEAGUES.map((l) => (
              <span
                key={l.name}
                className="flex items-center gap-1.5 text-xs font-medium text-white/50 px-3 py-1.5 rounded-full border border-white/10"
                style={{ backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.04)" }}
              >
                <span>{l.flag}</span> {l.name}
              </span>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/ten-odds">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 60px rgba(245,158,11,0.4)" }}
                whileTap={{ scale: 0.97 }}
                className="gradient-gold text-accent-foreground font-heading font-black px-9 py-4 rounded-2xl flex items-center gap-2.5 shadow-xl shadow-gold/25 text-base"
              >
                Today's Slip <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
            <Link to="/about">
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)" }}
                whileTap={{ scale: 0.97 }}
                className="text-white/80 hover:text-white font-semibold px-7 py-4 rounded-2xl border border-white/15 transition-colors text-sm"
                style={{ backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.04)" }}
              >
                How it works
              </motion.button>
            </Link>
          </motion.div>

          {/* Live win-rate quick stat */}
          {avgWinRate !== null && (
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-emerald-500/20"
              style={{ background: "rgba(16,185,129,0.08)", backdropFilter: "blur(12px)" }}
            >
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white/70">
                Current WIN-pattern avg win rate:{" "}
                <strong className="text-emerald-400 font-bold">{avgWinRate}%</strong>
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/30 z-10"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[10px] font-mono uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TICKER
      ══════════════════════════════════════════════════════════════════ */}
      <Ticker />

      {/* ══════════════════════════════════════════════════════════════════
          LIVE STATS BAR
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 70%)" }} />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="container mx-auto px-4 max-w-5xl"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-3xl overflow-hidden border border-border">
            {[
              { label: "Avg Win Rate",     value: avgWinRate  ?? 0, suffix: "%",  live: true,  accent: "#f59e0b" },
              { label: "Active Patterns",  value: winPatterns ?? 0, suffix: "",   live: true,  accent: "#10b981" },
              { label: "Leagues Tracked",  value: 5,                suffix: "",   live: false, accent: "#3b82f6" },
              { label: "Bet Types",        value: 18,               suffix: "+",  live: false, accent: "#8b5cf6" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="bg-card flex flex-col items-center justify-center gap-2 py-10 px-4 text-center group hover:bg-muted/40 transition-colors"
              >
                <p className="text-4xl font-heading font-black tabular-nums" style={{ color: stat.accent }}>
                  {stat.live && (stat.value === 0)
                    ? "—"
                    : <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  }
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{stat.label}</p>
                {stat.live && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          BENTO FEATURE GRID
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 container mx-auto px-4 max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-xs font-mono uppercase tracking-widest text-gold mb-3">Platform</p>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-foreground">
              Everything in one place.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-base">
              10 Odds isn't a tipster. It's a data platform built on the same
              statistical foundations professional traders use.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[240px]">
            {BENTO.map((card, i) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                whileHover={{ y: -5, scale: 1.012 }}
                className={`group relative rounded-3xl border border-border bg-card overflow-hidden cursor-pointer ${card.span ?? ""}`}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <Link to={card.link} className="absolute inset-0 z-20" />

                {/* Background image for big cards */}
                {card.img && (
                  <>
                    <img
                      src={card.img}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500 scale-110 group-hover:scale-100"
                      style={{ transition: "opacity 0.5s, transform 0.8s" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
                  </>
                )}

                {/* Accent glow */}
                <div
                  className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
                  style={{ background: card.accent }}
                />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
                    style={{ background: `${card.accent}20`, border: `1px solid ${card.accent}30` }}
                  >
                    <card.icon className="h-5 w-5" style={{ color: card.accent }} />
                  </div>
                  <h3 className="font-heading font-black text-foreground text-lg mb-1.5">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: card.accent }}>
                    Explore <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS — sticky scroll steps
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 70%)" }} />

        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-20">
              <p className="text-xs font-mono uppercase tracking-widest text-gold mb-3">The process</p>
              <h2 className="text-4xl md:text-5xl font-heading font-black text-foreground">
                From raw data to your pick.
              </h2>
            </motion.div>

            <div className="relative">
              {/* Vertical connector */}
              <div className="absolute left-[27px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent hidden sm:block" style={{ transform: "translateX(-50%)" }} />

              <div className="flex flex-col gap-16">
                {HOW_IT_WORKS.map((step, i) => (
                  <motion.div
                    key={step.step}
                    variants={fadeUp}
                    className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
                  >
                    {/* Step circle */}
                    <div className="relative z-10 shrink-0">
                      <motion.div
                        whileInView={{ scale: [0.6, 1.1, 1] }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 bg-card shadow-xl"
                        style={{ borderColor: step.color, boxShadow: `0 0 30px ${step.color}25` }}
                      >
                        <step.icon className="h-7 w-7" style={{ color: step.color }} />
                      </motion.div>
                      {/* Step number */}
                      <span
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full text-[11px] font-black flex items-center justify-center text-white"
                        style={{ background: step.color }}
                      >
                        {step.step}
                      </span>
                    </div>

                    {/* Text */}
                    <div className={`flex-1 ${i % 2 === 1 ? "md:text-right" : ""}`}>
                      <h3 className="text-2xl font-heading font-black text-foreground mb-2">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>

                    {/* Spacer for opposite side */}
                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="py-10 border-y border-border bg-muted/20"
      >
        <div className="container mx-auto px-4">
          <motion.div
            variants={fadeIn}
            className="flex flex-wrap items-center justify-center gap-4 md:gap-8"
          >
            {TRUST.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Icon className="h-4 w-4 text-gold shrink-0" />
                <span className="font-medium">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════════════
          COMMUNITY CALL-OUT
      ══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="py-20 container mx-auto px-4 max-w-5xl"
      >
        <motion.div
          variants={fadeUp}
          whileHover={{ scale: 1.01 }}
          className="relative rounded-3xl overflow-hidden border border-gold/20 p-10 md:p-14"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(251,146,60,0.04) 100%)" }}
        >
          {/* Glow blobs */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-orange-500/6 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Icon */}
            <motion.div
              animate={{ rotate: [-4, 4, -4], y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.5 }}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl"
              style={{ background: "linear-gradient(135deg,#f59e0b,#b45309)", boxShadow: "0 20px 60px rgba(245,158,11,0.35)" }}
            >
              <Trophy className="h-10 w-10 text-white" />
            </motion.div>

            <div className="text-center md:text-left">
              <p className="text-xs font-mono uppercase tracking-widest text-gold mb-2">Community</p>
              <h2 className="text-3xl md:text-4xl font-heading font-black text-foreground mb-3">
                Support the project.<br />Get your name on the board.
              </h2>
              <p className="text-muted-foreground max-w-lg leading-relaxed mb-6">
                Every supporter who helps keep 10 Odds running gets their name permanently displayed
                on our Community Board. Your support is what makes this free for everyone.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Link to="/community">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="gradient-gold text-accent-foreground font-heading font-bold px-7 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-gold/20"
                  >
                    <Users className="h-4 w-4" /> View the Board
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════════════
          FINAL CTA — full-bleed cinematic
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-36 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1800&q=80"
            alt="Football stadium night"
            className="w-full h-full object-cover object-center opacity-25"
          />
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, var(--background) 0%, transparent 20%, transparent 80%, var(--background) 100%)"
          }} />
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(245,158,11,0.12) 0%, transparent 70%)"
          }} />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="relative z-10 container mx-auto px-4 max-w-4xl text-center"
        >
          <motion.div variants={fadeUp}>
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-gold shadow-2xl shadow-gold/30 mb-6"
            >
              <Zap className="h-8 w-8 text-accent-foreground" />
            </motion.div>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-6xl font-heading font-black text-foreground mb-5 leading-tight"
          >
            Ready to see what
            <br />
            <span className="text-transparent bg-clip-text" style={{
              backgroundImage: "linear-gradient(135deg,#fbbf24,#fb923c)"
            }}>
              MK-806 picked today?
            </span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto mb-10 text-lg leading-relaxed">
            The daily accumulator is live. No subscription, no login —
            just the picks, the reasoning, and the data behind every decision.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center mb-10">
            <Link to="/ten-odds">
              <motion.button
                whileHover={{ scale: 1.06, boxShadow: "0 24px 60px rgba(245,158,11,0.4)" }}
                whileTap={{ scale: 0.97 }}
                className="gradient-gold text-accent-foreground font-heading font-black px-10 py-4 rounded-2xl flex items-center gap-2.5 shadow-xl shadow-gold/20 text-base"
              >
                View Today's Slip <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
            <Link to="/status">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="text-muted-foreground hover:text-foreground font-semibold px-7 py-4 rounded-2xl border border-border hover:border-gold/30 transition-colors text-sm"
              >
                Active Predictions
              </motion.button>
            </Link>
          </motion.div>

          {/* Trust bullets */}
          <motion.div
            variants={fadeIn}
            className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-xs text-muted-foreground"
          >
            {["Free forever", "No login required", "Updated every morning", "5 leagues covered"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-gold/70 shrink-0" /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

    </Layout>
  );
};

export default IndexPage;