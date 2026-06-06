import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Zap,
  RefreshCw,
  ShieldCheck,
  Users,
  Clock,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  Heart,
  BarChart2,
  Globe2,
  Trophy,
  TrendingUp,
  Database,
  Cpu,
} from "lucide-react";
import Layout from "@/components/Layout";
import DonationBanner from "@/components/DonationBanner";
import { Link } from "react-router-dom";

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7 } },
};

// ─── Animated section with inView trigger ────────────────────────────────────
function AnimatedSection({
  index,
  children,
  className = "",
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      custom={index}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Divider with section label ───────────────────────────────────────────────
function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <span className="text-[11px] font-mono font-bold text-gold/60 tracking-[0.25em] uppercase select-none shrink-0">
        {number}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
      <span className="text-[11px] font-mono text-muted-foreground/50 tracking-[0.2em] uppercase select-none shrink-0">
        {label}
      </span>
    </div>
  );
}

// ─── Competitions covered ─────────────────────────────────────────────────────
const COMPETITIONS = [
  { code: "PL",  name: "Premier League",          area: "England",  emblem: "https://cdn.freelogovectors.net/wp-content/uploads/2020/08/epl-premierleague-logo.png" },
  { code: "PD",  name: "La Liga",                 area: "Spain",    emblem: "https://www.freelogovectors.net/wp-content/uploads/2023/07/laliga-logo-02-freelogovectors.net_.png" },
  { code: "SA",  name: "Serie A",                 area: "Italy",    emblem: "https://www.freelogovectors.net/wp-content/uploads/2021/08/serie-a-logo-freelogovectors.net_.png" },
  { code: "BL1", name: "Bundesliga",              area: "Germany",  emblem: "https://www.freelogovectors.net/wp-content/uploads/2020/08/bundesliga_logo.png" },
  { code: "FL1", name: "Ligue 1",                 area: "France",   emblem: "https://www.freelogovectors.net/wp-content/uploads/2020/08/ligue1logo.png" },
  { code: "CL",  name: "Champions League",        area: "UEFA",     emblem: "https://www.freelogovectors.net/wp-content/uploads/2018/04/uefa_champions_league_logo-385x375.png" },
  { code: "WC",  name: "FIFA World Cup",          area: "Global",   emblem: "https://www.freelogovectors.net/wp-content/uploads/2025/07/fifa-world-cup-2026-freelogovectors.net_-478x480.png" },
];

// ─── Engine feature cards ─────────────────────────────────────────────────────
const ENGINE_FEATURES = [
  {
    icon: BarChart2,
    title: "Dixon-Coles Poisson",
    desc: "Venue-split attack and defence ratings feed a Dixon-Coles probability matrix, correcting for low-score correlation that standard Poisson misses.",
  },
  {
    icon: TrendingUp,
    title: "Elo + xG Blending",
    desc: "Club Elo ratings, Understat expected goals, market consensus, H2H history, and form momentum are blended with data-quality-adjusted weights.",
  },
  {
    icon: RefreshCw,
    title: "Isotonic Calibration",
    desc: "Every resolved prediction feeds back into an empirical calibration table. MK-808 monitors its own accuracy bucket-by-bucket and self-corrects.",
  },
  {
    icon: ShieldCheck,
    title: "Signal Agreement Gate",
    desc: "A pick only reaches the slip when at least two of three independent signals — Poisson model, xG model, and market consensus — agree on the outcome.",
  },
  {
    icon: Database,
    title: "Tournament Logic",
    desc: "UCL uses home-leg Elo with club ratings. World Cup applies neutral-venue modelling with international squad dynamics and adjusted scoring rates.",
  },
  {
    icon: Cpu,
    title: "Kelly Criterion Ranking",
    desc: "Slip picks are ranked by a composite of calibrated confidence, fractional Kelly stake size, and positive expected value — not just raw probability.",
  },
];

// ─── Schedule ────────────────────────────────────────────────────────────────
const SCHEDULE = [
  { type: "Fixtures, Odds & Predictions", time: "03:00 UTC", note: "All 7 competitions" },
  { type: "Match Results",                time: "01:00 UTC", note: "Auto WIN/LOSS resolution" },
  { type: "Pattern Analysis",             time: "03:30 UTC", note: "Calibration refresh"  },
];

// ─── Stats strip ─────────────────────────────────────────────────────────────
const STATS = [
  { value: "7",    label: "Competitions covered" },
  { value: "18",   label: "Prediction patterns tracked" },
  { value: "808",  label: "Engine generation" },
  { value: "24/7", label: "Live market monitoring" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const AboutPage = () => {
  return (
    <Layout>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="relative w-full h-72 md:h-96 overflow-hidden"
      >
        <img
          src="https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
          alt="Football stadium"
          className="w-full h-full object-cover object-center scale-105"
          style={{ filter: "brightness(0.55) saturate(0.8)" }}
        />
        {/* multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />

        {/* decorative gold line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        {/* Hero text */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-10 md:px-8 container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[11px] font-mono tracking-[0.3em] text-gold/70 uppercase mb-3 select-none">
              HBOOKS · Analytics Platform
            </p>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground leading-none mb-3">
              About{" "}
              <span className="text-gold relative">
                10 Odds
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-gold/60 to-transparent" />
              </span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground/80 max-w-lg leading-relaxed">
              Intelligent football predictions across seven competitions —
              powered by rigorous statistics, built by one person.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="border-y border-border bg-card/60">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="px-6 py-5 text-center"
              >
                <p className="text-2xl md:text-3xl font-heading font-bold text-gold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 tracking-wide">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE BODY
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-4 py-14 max-w-5xl space-y-20">

        {/* ── § 01 MISSION ──────────────────────────────────────────────────── */}
        <AnimatedSection index={1}>
          <SectionLabel number="01" label="Mission" />
          <div className="grid md:grid-cols-5 gap-8 md:gap-12 items-start">
            <div className="md:col-span-3 space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p className="text-base text-foreground font-medium leading-relaxed">
                We built <strong>10 Odds</strong> to make sophisticated football
                analysis genuinely accessible — whether you're a casual fan wanting
                context before a big game, or a serious bettor seeking a measurable edge.
              </p>
              <p>
                No hype, no vague tips, no promises we can't keep. Just structured,
                honest analysis from an engine designed to reason about football the way
                the best analysts do — rigorously, systematically, and with full
                transparency about what it knows and what it doesn't.
              </p>
              <p>
                Every prediction comes with a confidence score, expected value signal,
                signal-agreement rating, and calibrated reasoning — so you always know
                exactly how the engine arrived at its conclusion.
              </p>
            </div>
            <div className="md:col-span-2 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 via-transparent to-transparent p-6 space-y-4">
              {[
                { icon: Heart,    text: "Built for football fans, not just bettors" },
                { icon: ShieldCheck, text: "Transparent methodology, no black boxes" },
                { icon: Globe2,   text: "Seven competitions on one platform" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-gold" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ── § 02 COMPETITIONS ─────────────────────────────────────────────── */}
        <AnimatedSection index={2}>
          <SectionLabel number="02" label="Coverage" />
          <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
            MK-808 generates daily predictions across all seven competitions. Domestic
            leagues use venue-split Dixon-Coles modelling. Tournament competitions
            use dedicated logic built for their unique structures.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {COMPETITIONS.map((comp, i) => (
              <motion.div
                key={comp.code}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className={`group relative rounded-xl border p-4 flex flex-col items-center gap-3 transition-all duration-300 hover:shadow-lg cursor-default
                  ${comp.code === "CL"
                    ? "border-blue-500/30 bg-gradient-to-b from-blue-500/5 to-card hover:border-blue-400/50"
                    : comp.code === "WC"
                    ? "border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-card hover:border-yellow-400/50"
                    : "border-border bg-card hover:border-gold/30"
                  }`}
              >
                <img
                  src={comp.emblem}
                  alt={comp.name}
                  className="h-10 w-10 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="text-center">
                  <p className="text-[11px] font-heading font-semibold text-foreground leading-tight">
                    {comp.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{comp.area}</p>
                </div>
                {(comp.code === "CL" || comp.code === "WC") && (
                  <span className={`absolute -top-2 -right-2 text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full border
                    ${comp.code === "CL"
                      ? "bg-blue-500/20 text-blue-300 border-blue-400/30"
                      : "bg-yellow-500/20 text-yellow-300 border-yellow-400/30"
                    }`}>
                    {comp.code}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground/60">
            UCL uses club Elo with reduced home advantage. WC applies neutral-venue modelling
            with zeroed home advantage in the group stage.
          </p>
        </AnimatedSection>

        {/* ── § 03 ENGINE ───────────────────────────────────────────────────── */}
        <AnimatedSection index={3}>
          <SectionLabel number="03" label="The Engine" />

          {/* Engine identity block */}
          <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/5 via-card to-card p-6 md:p-8 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl gradient-gold flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">MK-808</h2>
                <p className="text-xs text-muted-foreground tracking-wide">
                  God of Football · Prediction Engine v8.1
                </p>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MK-808 does not rely on gut feeling or simple league tables. Before every
              prediction, it evaluates thousands of possible outcomes using a statistical
              pipeline that blends five independent data sources — each weighted dynamically
              based on data quality and availability for that specific fixture.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {ENGINE_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="rounded-xl border border-border/60 bg-card p-5 hover:border-gold/25 transition-colors duration-300"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <f.icon className="h-3.5 w-3.5 text-gold" />
                  </div>
                  <p className="font-heading font-semibold text-foreground text-sm">{f.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground/60 italic border-l-2 border-gold/20 pl-4">
            The specific mathematical parameters and calibration tables used by MK-808 are
            proprietary. The engine runs on rigorous academic foundations and has been
            continuously refined through thousands of resolved predictions.
          </p>
        </AnimatedSection>

        {/* ── § 04 DATA & SCHEDULE ──────────────────────────────────────────── */}
        <AnimatedSection index={4}>
          <SectionLabel number="04" label="Data & Schedule" />
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                Fixtures, odds, and results are refreshed every day across all seven
                competitions. The pipeline queries{" "}
                <strong className="text-foreground">Football-Data.org</strong> for
                fixture and result data, and{" "}
                <strong className="text-foreground">The Odds API</strong> for bookmaker
                odds used in fair-value calculations.
              </p>
              <p>
                You may occasionally notice a brief window where the latest data isn't
                yet available — this is normal and part of our nightly maintenance cycle.
                All updates run at fixed UTC windows below.
              </p>
              <p className="text-xs text-muted-foreground/60">
                If the site shows outdated information, waiting until after these windows
                will resolve it. We appreciate your patience.
              </p>
            </div>

            {/* Schedule table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-gold" />
                <span className="text-xs font-heading font-semibold text-foreground uppercase tracking-wide">
                  Daily Update Windows
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {SCHEDULE.map((row, i) => (
                    <tr key={row.type} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3.5">
                        <p className="text-foreground font-medium text-xs">{row.type}</p>
                        <p className="text-muted-foreground/60 text-[11px] mt-0.5">{row.note}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-gold text-sm whitespace-nowrap">
                        {row.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>

        {/* ── § 05 WHY NOT ALL PREDICTED ────────────────────────────────────── */}
        <AnimatedSection index={5}>
          <SectionLabel number="05" label="Coverage & Gaps" />
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              You may occasionally see fixtures on the Games page that don't receive a
              prediction, or odds listed as <em>unavailable</em>. This is deliberate —
              not a bug.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: Globe2,
                  title: "Odds Availability",
                  body: "Odds are sourced in real-time from bookmaker APIs subject to regional restrictions and market suspensions. We display \"unavailable\" rather than fabricate a price.",
                },
                {
                  icon: Database,
                  title: "Prediction Thresholds",
                  body: "MK-808 requires complete Elo ratings, recent form data, and (where possible) xG metrics before generating a prediction. Incomplete data → no prediction, never a low-quality guess.",
                },
                {
                  icon: Trophy,
                  title: "Tournament Coverage",
                  body: "UCL and WC are now fully live with dedicated modelling logic. Predictions for both competitions are generated daily alongside domestic leagues.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border bg-card p-5 space-y-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gold" />
                  </div>
                  <p className="font-heading font-semibold text-foreground text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 italic border-l-2 border-gold/20 pl-4">
              As data coverage grows, so will the volume of predicted matches. We prefer
              to be transparent about limitations rather than paper over them.
            </p>
          </div>
        </AnimatedSection>

        {/* ── full-bleed image break ─────────────────────────────────────────── */}
        <AnimatedSection index={6}>
          <div className="rounded-2xl overflow-hidden h-48 md:h-64 relative">
            <img
              src="https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
              alt="Football tactics"
              className="w-full h-full object-cover object-center"
              style={{ filter: "brightness(0.5) saturate(0.7)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center px-8">
              <div className="text-center max-w-xl">
                <p className="text-[11px] font-mono tracking-[0.3em] text-gold/60 uppercase mb-3 select-none">
                  Core Principle
                </p>
                <p className="text-xl md:text-2xl font-heading font-bold text-white/90 leading-snug">
                  "Every pick is backed by evidence.{" "}
                  <span className="text-gold">Every insight is earned."</span>
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ── § 06 PATTERN INSIGHTS & HIPPO AI ──────────────────────────────── */}
        <AnimatedSection index={7}>
          <SectionLabel number="06" label="Advisors & AI" />
          <div className="grid md:grid-cols-2 gap-6">

            {/* Pattern Insights */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground">Pattern Insights</h3>
                  <p className="text-xs text-muted-foreground">Powered by _808</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When you tap a prediction on the Active Predictions page, you'll see a
                short message from{" "}
                <strong className="text-foreground">_808</strong> — our pattern advisor.
                MK-808 tracks the historical performance of every distinct combination of{" "}
                <em>confidence level</em> and <em>expected value (EV)</em> — called{" "}
                <strong className="text-foreground">patterns</strong>.
              </p>

              {/* Example callout */}
              <div className="rounded-xl bg-muted/50 border border-border p-4">
                <p className="text-[10px] font-mono tracking-widest text-gold/70 uppercase mb-2 select-none">
                  Example Pattern
                </p>
                <code className="text-xs bg-background px-2 py-1 rounded font-mono text-foreground">
                  HConf &amp; H(+)EV
                </code>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  High model confidence + high positive expected value. Historically,
                  this combination has shown above-average hit rates. This is a{" "}
                  <strong className="text-foreground">historical observation, not a guarantee.</strong>
                </p>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                18 distinct patterns are tracked (3 confidence levels × 6 EV buckets).
                Pattern insights are informational only — not financial advice.
              </p>
            </div>

            {/* Hippo AI */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl gradient-gold flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground">Hippo AI</h3>
                  <p className="text-xs text-muted-foreground">Alternative market intelligence</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Alongside MK-808, we built{" "}
                <strong className="text-foreground">Hippo AI</strong> — a second
                intelligence that analyses every match from a different angle. While
                MK-808 delivers a primary prediction, Hippo AI selects{" "}
                <strong className="text-foreground">
                  four additional betting markets
                </strong>{" "}
                it considers the safest alternatives for that fixture.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                It studies team form, head-to-head history, and deep statistics —
                including expected goals, possession data, and defensive records — to
                produce a <strong className="text-foreground">confidence percentage</strong>{" "}
                for every market it suggests.
              </p>
              <Link
                to="/guide"
                className="inline-flex items-center gap-1.5 text-sm text-gold hover:underline mt-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Full Hippo AI guide
              </Link>
            </div>
          </div>
        </AnimatedSection>

        {/* ── § 07 THE TEAM ────────────────────────────────────────────────────── */}
        <AnimatedSection index={8}>
          <SectionLabel number="07" label="The Team" />
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="grid md:grid-cols-3">
              {/* Left accent */}
              <div className="md:col-span-1 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent p-8 flex flex-col justify-center items-center md:items-start gap-3 border-b md:border-b-0 md:border-r border-border">
                <div className="h-14 w-14 rounded-2xl gradient-gold flex items-center justify-center">
                  <Users className="h-7 w-7 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-heading font-bold text-foreground text-lg">HBOOKS</p>
                  <p className="text-xs text-muted-foreground mt-1">Independent digital studio</p>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <span className="text-xs text-muted-foreground">Solo-built project</span>
                </div>
              </div>

              {/* Right copy */}
              <div className="md:col-span-2 p-8 space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  10 Odds is a project by{" "}
                  <strong className="text-foreground">HBOOKS</strong> — an independent
                  digital studio dedicated to building thoughtful tools that combine
                  technology with real-world utility.
                </p>
                <p>
                  This is a one-person operation. Every line of code, every data pipeline,
                  every statistical model, every design decision, and every prediction
                  published on this platform is crafted with genuine care. There is no
                  team of dozens, no corporate backing — just a deep commitment to
                  building something worth using.
                </p>
                <p>
                  Your support, feedback, and engagement make a real difference to a
                  solo project. When you share 10 Odds or drop a message, it matters.
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ── § 08 DONATION ────────────────────────────────────────────────────── */}
        <DonationBanner />

        {/* ── § 09 LEGAL ───────────────────────────────────────────────────────── */}
        <AnimatedSection index={9}>
          <SectionLabel number="08" label="Responsible Use" />
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 md:p-8 space-y-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-heading font-semibold text-foreground mb-1">Important Disclaimer</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">10 Odds is for informational purposes only.</strong>{" "}
                  We do not provide financial advice. All predictions are probabilistic
                  estimates — not guarantees. Past performance of MK-808 or Hippo AI
                  does not guarantee future results.
                </p>
              </div>
            </div>

            <div className="pl-8 text-sm text-muted-foreground leading-relaxed border-t border-destructive/10 pt-5">
              Gambling involves financial risk. Only bet what you can afford to lose,
              set strict limits, and seek help if gambling is causing harm. Contact the{" "}
              <strong className="text-foreground">National Gambling Helpline</strong>{" "}
              at 0808 8020 133 (UK, free, 24/7) or visit{" "}
              <a
                href="https://www.begambleaware.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
              >
                BeGambleAware.org
              </a>
              .
            </div>

            <div className="pl-8 flex flex-wrap gap-5 pt-1 border-t border-destructive/10">
              <Link to="/terms" className="flex items-center gap-1.5 text-sm text-gold hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
                Terms of Service
              </Link>
              <Link to="/privacy" className="flex items-center gap-1.5 text-sm text-gold hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
                Privacy Policy
              </Link>
              <a href="mailto:hello@10odds.com" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                hello@10odds.com
              </a>
            </div>
          </div>
        </AnimatedSection>

      </div>
    </Layout>
  );
};

export default AboutPage;

