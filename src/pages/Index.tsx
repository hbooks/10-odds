import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Zap,
  TrendingUp,
  Ticket,
  Activity,
  BarChart2,
  ArrowRight,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Layout from "@/components/Layout";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Animation presets ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

// ─── Feature cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: TrendingUp,
    title: "Smart Pattern Recognition",
    desc: "MK-806 tracks 18 distinct confidence-and-value patterns, learning from every resolved prediction to sharpen its edge.",
    accent: "#10b981",
  },
  {
    icon: Ticket,
    title: "Daily 10-Odds Slip",
    desc: "Every morning, MK-806 assembles a curated 10-leg accumulator from the day's highest-value opportunities across five leagues.",
    accent: "#f5a623",
  },
  {
    icon: Activity,
    title: "Live Match Scoreboard",
    desc: "Real-time match status updates — from kick-off through final whistle — so you always know where your picks stand.",
    accent: "#ef4444",
  },
  {
    icon: BarChart2,
    title: "Deep Analytics",
    desc: "League-by-league win rates, cumulative ROI charts, confidence calibration — all the numbers behind every pick.",
    accent: "#3b82f6",
  },
];

// ─── How it works ─────────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Data Ingestion",
    desc: "Live fixtures, Elo ratings, xG averages, bookmaker odds, and head-to-head records are collected daily across all five major European leagues.",
  },
  {
    step: "02",
    title: "The Engine Thinks",
    desc: "MK-806 runs thousands of future simulations per match, blending Poisson models, Elo signals, and market edge detection into a single probability.",
  },
  {
    step: "03",
    title: "You Get the Pick",
    desc: "Only bets that pass strict value criteria make the slip. Each comes with full reasoning, a confidence score, and the pattern advisor's verdict.",
  },
];

// ─── Stats bar ────────────────────────────────────────────────────────────────
const STATIC_STATS = [
  { label: "Leagues Tracked",     value: "5"   },
  { label: "Bet Types Analysed",  value: "18+" },
  { label: "Daily Updates",       value: "3"   },
];

// ─────────────────────────────────────────────────────────────────────────────
// HOMEPAGE
// ─────────────────────────────────────────────────────────────────────────────

const IndexPage = () => {
  const [winPatterns, setWinPatterns] = useState<number | null>(null);
  const [avgWinRate,  setAvgWinRate]  = useState<number | null>(null);

  // Fetch live stats from pattern_analysis
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from("pattern_analysis")
        .select("win_rate, total_predictions")
        .eq("pattern_type", "WIN");

      if (data && data.length > 0) {
        const totalPreds  = data.reduce((s, r) => s + r.total_predictions, 0);
        const weightedSum = data.reduce((s, r) => s + r.win_rate * r.total_predictions, 0);
        setAvgWinRate(totalPreds > 0 ? Math.round(weightedSum / totalPreds) : null);
        setWinPatterns(data.length);
      }
    };
    fetchStats();
  }, []);

  // Parallax effect for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 120]);

  return (
    <Layout>
      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background image with parallax */}
        <motion.div
          className="absolute inset-0 z-0"
          style={{ y: heroY }}
        >
          <img
            src="https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
            alt="Stadium"
            className="w-full h-full object-cover object-center scale-110"
          />
          {/* Multi-layer overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-24 max-w-5xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="flex flex-col items-center text-center gap-6"
          >
            {/* Pill badge */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-semibold tracking-widest uppercase text-gold bg-gold/10 border border-gold/30">
                <Zap className="h-3 w-3" /> Powered by MK-806
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl md:text-7xl font-heading font-black text-white leading-[1.05] tracking-tight"
            >
              The God of{" "}
              <span className="text-gold relative">
                Time
                {/* Underline accent */}
                <motion.span
                  className="absolute -bottom-1 left-0 h-0.5 bg-gold/60 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.9, duration: 0.6 }}
                />
              </span>
              {" "}has{" "}
              <br className="hidden sm:block" />
              spoken your picks.
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed"
            >
              MK-806 runs thousands of future simulations every day across the top 5
              European leagues — then distils them into a single, high-value
              accumulator slip you can trust.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4 mt-2">
              <Link to="/ten-odds">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="gradient-gold text-accent-foreground font-heading font-bold px-8 py-3.5 rounded-xl flex items-center gap-2 shadow-xl shadow-gold/20 text-base"
                >
                  Today's Slip <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <Link to="/about">
                <button className="text-white/80 hover:text-white font-medium px-6 py-3.5 rounded-xl border border-white/20 hover:border-white/40 transition-colors text-sm">
                  How it works
                </button>
              </Link>
            </motion.div>

            {/* Floating MK icon */}
            <motion.div
              variants={fadeUp}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-gold shadow-2xl shadow-gold/30"
            >
              <Zap className="h-7 w-7 text-accent-foreground" />
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 flex flex-col items-center gap-1"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          LIVE STATS BAR
      ════════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
        className="bg-card border-y border-border py-5"
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-16 divide-x divide-border">
            {/* Dynamic win rate stat */}
            <div className="px-6 text-center">
              <p className="text-3xl font-heading font-black text-gold tabular-nums">
                {avgWinRate !== null ? `${avgWinRate}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">
                Avg Win Rate (WIN Patterns)
              </p>
            </div>
            {winPatterns !== null && (
              <div className="px-6 text-center">
                <p className="text-3xl font-heading font-black text-foreground tabular-nums">
                  {winPatterns}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">
                  Active WIN Patterns
                </p>
              </div>
            )}
            {STATIC_STATS.map((s) => (
              <div key={s.label} className="px-6 text-center">
                <p className="text-3xl font-heading font-black text-foreground tabular-nums">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 container mx-auto px-4 max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-xs font-mono uppercase tracking-widest text-gold mb-3">
              Platform features
            </p>
            <h2 className="text-4xl font-heading font-black text-foreground">
              Everything you need to bet smarter.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              10 Odds isn't a tipster. It's a data platform built on the same
              statistical foundations professional traders use.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="group rounded-2xl border border-border bg-card p-6 flex flex-col gap-4 hover:border-gold/40 transition-colors"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: `${f.accent}20` }}
                >
                  <f.icon className="h-5 w-5" style={{ color: f.accent }} />
                </div>
                <div>
                  <p className="font-heading font-bold text-foreground mb-1.5">{f.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-16">
              <p className="text-xs font-mono uppercase tracking-widest text-gold mb-3">
                The process
              </p>
              <h2 className="text-4xl font-heading font-black text-foreground">
                From raw data to your pick.
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connector line */}
              <div className="absolute top-10 left-[16.5%] right-[16.5%] h-px bg-border hidden md:block" />

              {HOW_IT_WORKS.map((step, i) => (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  className="flex flex-col items-center text-center gap-4"
                >
                  {/* Step circle */}
                  <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-card border-2 border-gold/40 shadow-lg shadow-gold/10">
                    <span className="text-2xl font-heading font-black text-gold">{step.step}</span>
                  </div>
                  <div>
                    <p className="font-heading font-bold text-foreground text-lg mb-1.5">
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          PROOF / TRUST SECTION
      ════════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="py-24 container mx-auto px-4 max-w-4xl"
      >
        <motion.div
          variants={fadeUp}
          className="rounded-3xl gradient-navy p-10 md:p-14 text-center relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <motion.div variants={fadeUp}>
              <Zap className="h-10 w-10 text-gold mx-auto mb-4" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl font-heading font-black text-primary-foreground mb-4"
            >
              Ready to see what MK-806 picked today?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-primary-foreground/70 max-w-xl mx-auto mb-8"
            >
              The daily accumulator is live. No subscription, no login — just
              the picks, the reasoning, and the data behind every decision.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center">
              <Link to="/ten-odds">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="gradient-gold text-accent-foreground font-heading font-bold px-8 py-3.5 rounded-xl flex items-center gap-2 shadow-xl shadow-gold/20"
                >
                  View Today's Slip <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <Link to="/status">
                <button className="text-primary-foreground/80 hover:text-primary-foreground font-medium px-6 py-3.5 rounded-xl border border-white/20 hover:border-white/40 transition-colors text-sm">
                  Active Predictions
                </button>
              </Link>
            </motion.div>

            {/* Trust bullets */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-xs text-primary-foreground/50"
            >
              {["Free forever", "No login required", "Updated every morning", "5 leagues covered"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-gold/70" />{t}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </motion.section>
    </Layout>
  );
};

export default IndexPage;