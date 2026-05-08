import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Zap,
  MessageSquare,
  TrendingUp,
  BookOpen,
  AlertCircle,
  BarChart2,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Layout from "@/components/Layout";
import { PATTERN_ANIMALS } from "@/lib/patternAnimals";
import AnimalIcon from "@/components/AnimalIcon";

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
function GuideSection({
  index,
  icon: Icon,
  iconColor,
  iconBg,
  badge,
  title,
  children,
}: {
  index: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  badge: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <motion.div variants={fadeUp} className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
            style={{ background: iconBg }}
          >
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {badge}
            </p>
            <h2 className="text-xl font-heading font-bold text-foreground leading-tight">
              {title}
            </h2>
          </div>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </motion.div>
    </motion.section>
  );
}

// ─── Callout box ──────────────────────────────────────────────────────────────
function Callout({
  icon: Icon,
  color,
  bg,
  children,
}: {
  icon: React.ElementType;
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex gap-3 rounded-xl p-4 border"
      style={{ background: bg, borderColor: `${color}30` }}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
      <p className="text-sm leading-relaxed" style={{ color }}>
        {children}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const GuidePage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="text-center mb-12"
        >
          <motion.div variants={fadeUp} className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-gold shadow-xl shadow-gold/20">
              <BookOpen className="h-7 w-7 text-accent-foreground" />
            </div>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl font-heading font-black text-foreground mb-3">
            How to Read <span className="text-gold">MK-806</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto">
            A plain-English walkthrough of predictions, patterns, and what _806 is
            actually telling you. No jargon, no math — just the good stuff.
          </motion.p>
        </motion.div>

        <div className="space-y-5">

          {/* ── Section 1: What is a Pattern? ─────────────────────────────── */}
          <GuideSection
            index={1}
            icon={TrendingUp}
            iconColor="#f5a623"
            iconBg="#f5a62320"
            badge="Section 01"
            title="What is a Pattern?"
          >
            <motion.div variants={fadeUp}>
              <p>
                Every prediction MK-806 makes has two hidden qualities attached to it:
                how <strong className="text-foreground">confident</strong> MK-806 was,
                and how much <strong className="text-foreground">expected value</strong> it
                spotted in the available odds.
              </p>
              <p className="mt-3">
                A <strong className="text-foreground">pattern</strong> is simply the
                combination of those two qualities. We’ve given each pattern a friendly
                animal name to make them easy to remember. MK-806 tracks{" "}
                <strong className="text-foreground">18 distinct patterns</strong> in total,
                from the confident King of the Jungle down to the cautious Worm.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="rounded-xl bg-muted/40 border border-border p-4 mt-2">
                <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
                  Quick example
                </p>
                <p className="text-foreground text-sm">
                  A prediction labeled as{" "}
                  <span className="inline-flex items-center gap-1 text-gold font-semibold">
                    <AnimalIcon animal="Lion" size={18} />
                    Lion
                  </span>{" "}
                  means MK-806 was highly confident AND spotted strong value in the market.
                  Historically, patterns like this have delivered strong results — but they
                  don't guarantee anything.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <p>
                Crucially, patterns are{" "}
                <strong className="text-foreground">not fixed in stone.</strong> A pattern
                that has been delivering wins for months can start losing — and vice versa.
                This flexibility keeps the advice honest and grounded in what is actually
                happening.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="my-6">
              <img
                src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/pta.png"
                alt="Pattern Analyser page showing all 18 patterns and their win rates"
                className="w-full rounded-xl border border-border shadow-lg"
              />
              <p className="text-xs text-muted-foreground/50 text-center mt-2">
                The Pattern Analyser page — showing all 18 patterns and their actual win/loss records
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={TrendingUp} color="#10b981" bg="#10b98110">
                You can see the live performance of every pattern on the{" "}
                <Link to="/patterns" className="underline font-medium">
                  Pattern Analyser page
                </Link>
                . Green patterns are winning, red are losing — and the numbers update
                as new results come in.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── Section 2: Who is _806? ───────────────────────────────────── */}
          <GuideSection
            index={2}
            icon={MessageSquare}
            iconColor="#3b82f6"
            iconBg="#3b82f620"
            badge="Section 02"
            title="Who is _806?"
          >
            <motion.div variants={fadeUp}>
              <p>
                When you tap on a prediction — whether it's live on the{" "}
                <Link to="/status" className="text-gold hover:underline">Active Predictions</Link> page
                or settled on the{" "}
                <Link to="/previous" className="text-gold hover:underline">Previous</Link> page
                — you'll see a short message from <strong className="text-foreground">_806</strong>.
              </p>
              <p className="mt-3">
                <strong className="text-foreground">_806 is the pattern advisor.</strong> It is a
                completely different entity from MK-806. While MK-806 looks forward and
                simulates thousands of possible futures to decide what to predict, _806 only
                looks <em>backwards</em> — at the track record of the pattern attached to
                that specific prediction.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="flex items-start gap-4 rounded-xl bg-muted/30 border border-border p-4 mt-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  806
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold text-foreground">_806</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">
                      Pattern Advisor
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    "Looking back at this prediction, it falls under the <strong>Lion</strong> pattern —
                    historically strong, but always subject to change."
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2 text-center italic">
                This is what an _806 message looks like in the prediction popup.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="my-6">
              <img
                src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/06.png"
                alt="Status page modal showing the _806 advisor message"
                className="w-full rounded-xl border border-border shadow-lg"
              />
              <p className="text-xs text-muted-foreground/50 text-center mt-2">
                The prediction popup — showing MK-806's pick and _806's pattern advice
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={AlertCircle} color="#f59e0b" bg="#f59e0b10">
                Because _806 only uses the past, it can be wrong about the present.
                If _806 says a pattern has struggled historically, that doesn't mean
                this specific prediction will lose. MK-806 might have spotted something
                the historical data hasn't caught up with yet. The decision is always yours.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── Section 3: How to Use It ──────────────────────────────────── */}
          <GuideSection
            index={3}
            icon={BarChart2}
            iconColor="#10b981"
            iconBg="#10b98120"
            badge="Section 03"
            title="How to Use the Pattern Insights"
          >
            <motion.div variants={fadeUp}>
              <p>
                Pattern advice is most useful when you use it as one ingredient in a
                bigger picture — not as the final word. Here's a simple way to think
                about it:
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="grid sm:grid-cols-3 gap-3 mt-2">
                {[
                  {
                    step: "1",
                    title: "Check the message",
                    desc: 'Read what _806 says in the prediction popup. Is it a "win" pattern, "loss" pattern, or not enough data yet?',
                    color: "#f5a623",
                  },
                  {
                    step: "2",
                    title: "Look at the numbers",
                    desc: "Jump to the Pattern Analyser page and find that specific animal. How many predictions does it have? What's the actual win rate?",
                    color: "#10b981",
                  },
                  {
                    step: "3",
                    title: "Add your own judgment",
                    desc: "Combine the pattern data with what you know about the teams, the form, and the context. You know football — trust that too.",
                    color: "#3b82f6",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold mb-3"
                      style={{ background: item.color }}
                    >
                      {item.step}
                    </div>
                    <p className="font-semibold text-foreground text-sm mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <p>
                Patterns with fewer than 5 completed predictions are marked as{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground font-mono">
                  INSUFFICIENT DATA
                </code>
                . When you see this, treat the advice as a placeholder — there simply
                isn't enough history to say anything meaningful.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={ShieldCheck} color="#10b981" bg="#10b98110">
                Patterns never override MK-806's prediction. They exist alongside it,
                as context — not as instructions.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── Section 4: MK-806 vs _806 ─────────────────────────────────── */}
          <GuideSection
            index={4}
            icon={Zap}
            iconColor="#f5a623"
            iconBg="#f5a62320"
            badge="Section 04"
            title="MK-806 vs _806 — Two Different Minds"
          >
            <motion.div variants={fadeUp}>
              <p>
                They share a name, but they think completely differently. Here's the
                simplest way to tell them apart:
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="grid sm:grid-cols-2 gap-4 mt-2">
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg gradient-gold flex items-center justify-center">
                      <Zap className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-foreground text-sm">MK-806</p>
                      <p className="text-[10px] text-gold/70 uppercase tracking-wide">God of Time</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                      <ArrowRight className="h-3 w-3 mt-0.5 text-gold shrink-0" />
                      Looks <strong className="text-foreground">forward</strong> — simulates thousands of possible futures
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ArrowRight className="h-3 w-3 mt-0.5 text-gold shrink-0" />
                      Decides <strong className="text-foreground">which bet to pick</strong>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ArrowRight className="h-3 w-3 mt-0.5 text-gold shrink-0" />
                      Runs every morning before the day's fixtures
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold">
                      806
                    </div>
                    <div>
                      <p className="font-heading font-bold text-foreground text-sm">_806</p>
                      <p className="text-[10px] text-blue-400/70 uppercase tracking-wide">The Historian</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                      <ArrowRight className="h-3 w-3 mt-0.5 text-blue-400 shrink-0" />
                      Looks <strong className="text-foreground">backward</strong> — reviews how similar patterns performed
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ArrowRight className="h-3 w-3 mt-0.5 text-blue-400 shrink-0" />
                      Tracks win/loss history across all 18 pattern combinations
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ArrowRight className="h-3 w-3 mt-0.5 text-blue-400 shrink-0" />
                      Provides <strong className="text-foreground">context</strong>, not predictions
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <p>
                When these two align — when MK-806 picks a bet and _806 confirms the
                pattern has historically done well — that's when you have the strongest
                overall signal. When they point in different directions, that's valuable
                information too.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={RefreshCw} color="#3b82f6" bg="#3b82f610">
                Patterns update daily as more predictions resolve. A pattern that's been
                on a winning run for weeks can shift. That's not a flaw — it's the system
                being honest about how things change.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── Section 5: Pattern Animals – Meet the Cast ─────────────────── */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <motion.div variants={fadeUp} className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                  style={{ background: "#f5a62320" }}
                >
                  <TrendingUp className="h-5 w-5" style={{ color: "#f5a623" }} />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Section 05
                  </p>
                  <h2 className="text-xl font-heading font-bold text-foreground leading-tight">
                    Pattern Animals — Meet the Cast
                  </h2>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                {PATTERN_ANIMALS.map((pa, i) => (
                  <motion.div
                    key={pa.animal}
                    variants={fadeUp}
                    custom={i}
                    whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
                    className="rounded-xl bg-muted/20 border border-border p-4 flex flex-col items-center text-center"
                  >
                    <AnimalIcon animal={pa.animal} size={40} className="text-gold mb-2" />
                    <h3 className="font-heading font-bold text-foreground text-sm">{pa.animal}</h3>
                    <code className="text-xs text-muted-foreground font-mono">{pa.originalLabel}</code>
                    <div className="flex gap-2 mt-1 text-[10px] font-medium">
                      <span className="px-1.5 py-0.5 rounded-full bg-muted/60 text-foreground">{pa.confidence}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-muted/60 text-foreground">{pa.evType}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                      {pa.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-6 text-center">
                Each animal represents a unique combination of confidence and expected value.
                Their historical performance is tracked on the{" "}
                <Link to="/patterns" className="text-gold hover:underline font-medium">
                  Pattern Analyser page
                </Link>{" "}
                — check back regularly as patterns evolve.
              </p>
            </motion.div>
          </motion.section>

          {/* ── Responsible use reminder ──────────────────────────────────── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="font-heading font-semibold text-foreground">A reminder</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              10 Odds is for informational purposes only. Neither MK-806 nor _806
              constitutes financial or betting advice. Patterns reflect past performance,
              which does not guarantee future results. Always bet responsibly, only stake
              what you can afford to lose, and make your own decisions.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link to="/terms" className="text-xs text-gold hover:underline">Terms of Service</Link>
              <Link to="/privacy" className="text-xs text-gold hover:underline">Privacy Policy</Link>
              <Link to="/about" className="text-xs text-gold hover:underline">About 10 Odds</Link>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default GuidePage;