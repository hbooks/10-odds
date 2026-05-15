import { motion } from "framer-motion";
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
} from "lucide-react";
import Layout from "@/components/Layout";
import DonationBanner from "@/components/DonationBanner";
import { Link } from "react-router-dom";

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  index,
  icon: Icon,
  title,
  children,
  accent = false,
}: {
  index: number;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className={`rounded-2xl border p-6 md:p-8 ${
        accent
          ? "border-gold/30 bg-gradient-to-br from-gold/5 to-transparent"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
          accent ? "gradient-gold" : "bg-muted"
        }`}>
          <Icon className={`h-4 w-4 ${accent ? "text-accent-foreground" : "text-foreground"}`} />
        </div>
        <h2 className="text-xl font-heading font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
}

// ─── Schedule table ───────────────────────────────────────────────────────────
const SCHEDULE = [
  { type: "Fixtures, Odds & Predictions", time: "03:00 UTC" },
  { type: "Match Results",                time: "01:00 UTC" },
  { type: "Pattern Analysis",             time: "03:30 UTC" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const AboutPage = () => {
  return (
    <Layout>
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="relative w-full h-64 md:h-80 overflow-hidden"
      >
        <img
          src="https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
          alt="Football stadium"
          className="w-full h-full object-cover object-center"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        {/* Hero text */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 md:px-8 container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold">
                <Zap className="h-5 w-5 text-accent-foreground" />
              </div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">
                About <span className="text-gold">10 Odds</span>
              </h1>
            </div>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl">
              Intelligent football predictions, powered by data and a relentless
              pursuit of accuracy.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Page body ────────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">

        {/* ── Our Mission ─────────────────────────────────────────────────── */}
        <Section index={1} icon={Heart} title="Our Mission">
          <p>
            We built <strong className="text-foreground">10 Odds</strong> to make
            sophisticated football analysis accessible to everyone — whether you're a
            casual fan who wants context before a big game, or a dedicated bettor
            seeking a smarter edge.
          </p>
          <p>
            Our goal is simple: deliver clear, data-driven insights without the noise.
            No hype, no vague tips, no promises we can't keep. Just structured, honest
            analysis from an engine designed to reason about football the way the best
            analysts do — rigorously and systematically.
          </p>
          <p>
            The platform covers the five major European leagues:{" "}
            <strong className="text-foreground">
              Premier League, La Liga, Serie A, Bundesliga, and Ligue 1 and also Champions League and Fifa World Cup (These two will be available in the near future).
            </strong>
          </p>
        </Section>

        {/* ── How MK-806 Works ─────────────────────────────────────────────── */}
        <Section index={2} icon={Zap} title="How MK‑806 Works" accent>
          <p>
            <strong className="text-foreground">MK-806</strong> is our proprietary
            prediction engine. It doesn't rely on gut feeling or simple league tables.
            Before every prediction, it runs countless simulations of each upcoming
            fixture, evaluating thousands of possible outcomes against each other.
          </p>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-3 gap-4 mt-5 not-prose">
            {[
              {
                icon: BarChart2,
                title: "Deep Analysis",
                desc: "MK-806 analyses team strength, historical performance, and contextual factors to identify the most probable futures for every match.",
              },
              {
                icon: RefreshCw,
                title: "Continuous Learning",
                desc: "Every resolved prediction feeds back into the engine. MK-806 tracks its own pattern performance and refines its approach over time.",
              },
              {
                icon: ShieldCheck,
                title: "Value Criteria",
                desc: "The engine aligns its projected futures with available betting markets, selecting only opportunities that meet strict value criteria before publishing a pick.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="rounded-xl bg-background/60 border border-border/60 p-4"
              >
                <f.icon className="h-5 w-5 text-gold mb-2" />
                <p className="font-heading font-semibold text-foreground text-sm mb-1.5">
                  {f.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <p className="mt-2 text-xs text-muted-foreground/70 italic">
            The specific mathematical and statistical methods used by MK-806 are
            proprietary. What we can tell you is that the engine has been built with
            rigorous academic foundations and is constantly evolving.
          </p>
        </Section>

        {/* ── Data & Schedule ──────────────────────────────────────────────── */}
        <Section index={3} icon={Clock} title="Data & Daily Schedule">
          <p>
            Fixtures, odds, and results are refreshed every day to keep everything
            current. You may occasionally notice a brief window where the latest data
            isn't yet available — this is completely normal and is part of our daily
            maintenance cycle.
          </p>
          <p>
            All updates and bug fixes are applied during the following scheduled
            windows <strong className="text-foreground">(times are UTC)</strong>:
          </p>

          {/* Schedule table */}
          <div className="rounded-xl border border-border overflow-hidden mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-heading font-semibold text-foreground text-xs uppercase tracking-wide">
                    Update Type
                  </th>
                  <th className="text-right px-4 py-3 font-heading font-semibold text-foreground text-xs uppercase tracking-wide">
                    UTC Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {SCHEDULE.map((row, i) => (
                  <tr
                    key={row.type}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gold">
                      {row.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground/70 mt-2">
            If the site appears to be showing outdated information, waiting until after
            these windows will resolve it. We appreciate your patience.
          </p>
        </Section>

        {/* ── Why Some Matches Aren't Predicted ────────────────────────────────── */}
<Section index={4} icon={AlertTriangle} title="Why Aren't All Matches Predicted?">
  <p>
    You may occasionally notice that certain fixtures appear on the{" "}
    <strong className="text-foreground">Games</strong> page but don't receive a
    prediction, or that odds are listed as <em>"unavailable"</em>. This isn't a
    bug — it's a deliberate part of how MK-806 operates, and it stems from a
    combination of data availability and our quality standards.
  </p>

  <div className="space-y-4 mt-4">
    <div>
      <h4 className="text-sm font-heading font-semibold text-foreground mb-1">
        Odds Availability
      </h4>
      <p className="text-xs text-muted-foreground leading-relaxed">
        The odds you see on 10 Odds are sourced in real‑time from third‑party
        bookmaker APIs. These services are subject to regional restrictions,
        market suspensions, and occasional technical delays. When a particular
        market (e.g., Over 2.5 Goals or Both Teams to Score) isn't offered by
        any available bookmaker for a given fixture, we simply can't display a
        price. We'd rather show <em>"Odds not available"</em> than fabricate a
        number.
      </p>
    </div>

    <div>
      <h4 className="text-sm font-heading font-semibold text-foreground mb-1">
         Prediction Coverage
      </h4>
      <p className="text-xs text-muted-foreground leading-relaxed">
        MK-806 only generates a prediction when it has access to a complete set
        of the data it needs to make a high‑confidence assessment. This includes
        reliable team Elo ratings, recent form statistics, and (where possible)
        Expected Goals (xG) metrics. If any of these core inputs are missing for
        a team — for example, a newly promoted side with limited historical
        data, or a match in a competition we're not yet fully tracking — the
        engine will deliberately skip that fixture rather than produce a
        low‑quality guess.
      </p>
    </div>

    <div>
      <h4 className="text-sm font-heading font-semibold text-foreground mb-1">
         Competition Coverage
      </h4>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Currently, 10dds focuses on the five major European leagues:{" "}
        <strong className="text-foreground">
          Premier League, La Liga, Serie A, Bundesliga, and Ligue 1
        </strong>
        . We're actively working on expanding coverage to include the{" "}
        <strong className="text-foreground">UEFA Champions League</strong> and
        the{" "}
        <strong className="text-foreground">FIFA World Cup</strong> — these
        competitions are technically available via our data sources, but they
        require additional configuration and testing before they can be reliably
        integrated. Expect to see them appear on the platform in the near future.
      </p>
    </div>
  </div>

  <p className="text-xs text-muted-foreground/70 italic mt-4">
    We believe it's better to be transparent about limitations than to pretend
    everything is perfect. As our data coverage expands, so will the number of
    predicted matches.
  </p>
</Section>

        {/* ── Pattern Insights ─────────────────────────────────────────────── */}
        <Section index={4} icon={MessageSquare} title="Understanding Pattern Insights and Hippo AI">
          <p>
            When you tap a prediction on the{" "}
            <strong className="text-foreground">Active Predictions</strong> page, you'll
            see a short message from{" "}
            <strong className="text-foreground">_806</strong> — our pattern advisor.
            Here's what those messages actually mean.
          </p>
          <p>
            MK-806 tracks the historical performance of every distinct combination of{" "}
            <em>confidence level</em> and <em>expected value (EV)</em> that it has ever
            produced. These combinations are called{" "}
            <strong className="text-foreground">patterns</strong>.
          </p>

          {/* Example callout */}
          <div className="rounded-xl bg-muted/40 border border-border p-4 mt-1">
            <p className="font-heading font-semibold text-foreground text-xs uppercase tracking-wide mb-2">
              Example
            </p>
            <p className="text-xs text-muted-foreground">
              A pattern labelled{" "}
              <code className="bg-background px-1.5 py-0.5 rounded text-foreground font-mono text-[11px]">
                HConf & H(+)EV
              </code>{" "}
              means the prediction has{" "}
              <strong className="text-foreground">high model confidence</strong> and a{" "}
              <strong className="text-foreground">high positive expected value</strong>{" "}
              — historically, this combination has shown above-average performance.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              When _806 says{" "}
              <em>
                "This pattern has historically aligned with winning outcomes"
              </em>
              , it is purely reporting what has happened in the past for similar
              setups. It is{" "}
              <strong className="text-foreground">
                a historical observation, not a guarantee.
              </strong>
            </p>
          </div>

          <p>
            We track 18 distinct patterns in total (3 confidence levels × 6 EV
            buckets). As more predictions resolve, the pattern data becomes more
            statistically reliable and the insights become sharper.
           </p>

<p>
  Alongside MK‑806, we built <strong>Hippo AI</strong> — a second intelligence that analyses every match from a different angle. 
  While MK‑806 delivers a primary prediction, Hippo AI selects <strong>four additional betting markets</strong> (such as Over/Under goals, Both Teams to Score, Asian Handicap, and more) that it considers the safest alternatives for that fixture. 
  It studies team form, head‑to‑head history, and deep statistics — including expected goals, possession data, and defensive records — to produce a <strong>confidence percentage</strong> for every market it suggests. 
  <strong>Detailed information about how Hippo AI works, how to interpret its confidence scores, and when to use it can be found on the </strong>
  <Link to="/guide" className="inline-flex items-center gap-1.5 text-gold hover:underline">
    <ExternalLink className="h-3.5 w-3.5" />
    Guide Page.
  </Link>
</p>
          <p className="text-xs italic text-muted-foreground/70">
            Pattern insights are strictly informational and do not constitute
            financial advice of any kind.
          </p>
        </Section>

        {/* ── Tactical image break ─────────────────────────────────────────── */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="rounded-2xl overflow-hidden h-44 md:h-56 relative"
        >
          <img
            src="https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
            alt="Football tactics board"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-xl md:text-2xl font-heading font-bold text-white/90 px-4">
              "Every pick is backed by evidence. Every insight is earned."
            </p>
          </div>
        </motion.div>

        {/* ── The Team ─────────────────────────────────────────────────────── */}
        <Section index={6} icon={Users} title="The Team & Partnership">
          <p>
            10 Odds is a project by{" "}
            <strong className="text-foreground">HBOOKS</strong> — an independent
            business dedicated to building thoughtful digital tools that combine
            technology with real-world utility.
          </p>
          <p>
            This is a one-person operation. Every line of code, every data pipeline,
            every design decision, and every prediction published on this platform
            is crafted with genuine care and attention. There is no team of dozens,
            no corporate backing — just a deep commitment to building something
            worth using.
          </p>
          <p>
            Your support, feedback, and engagement mean everything. When you share
            10 Odds with a friend or drop a message, it makes a real difference to
            a solo project like this one.
          </p>
        </Section>

        {/* ── Support the Project ───────────────────────────────────────────── */}
        <DonationBanner />

        {/* ── Contact & Legal ──────────────────────────────────────────────── */}
        <Section index={8} icon={AlertTriangle} title="Responsible Use & Legal">
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
            <p className="text-foreground font-medium text-sm mb-2">Important Disclaimer</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">10dds is for informational purposes only.</strong>{" "}
              We do not provide financial advice. All predictions are probabilistic
              estimates — not guarantees. Past performance of the MK-806 engine or Hippo AI does
              not guarantee future results.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              Gambling involves financial risk. Always bet only what you can afford
              to lose, set strict limits, and seek help if gambling is causing harm.
              If you need support, contact the{" "}
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
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-sm">
            <Link
              to="/terms"
              className="flex items-center gap-1.5 text-gold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="flex items-center gap-1.5 text-gold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Privacy Policy
            </Link>
            <a
              href="mailto:hello@10odds.com"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              hello@10odds.com
            </a>
          </div>
        </Section>

      </div>
    </Layout>
  );
};

export default AboutPage;
