import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import Layout from "@/components/Layout";

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: "easeOut" },
  }),
};

// ─── Reusable section block ───────────────────────────────────────────────────
function Section({
  index,
  number,
  title,
  children,
}: {
  index: number;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      custom={index}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="border-b border-border pb-8 last:border-0 last:pb-0"
    >
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-xs font-mono text-gold/60 select-none">{number}</span>
        <h2 className="text-lg font-heading font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed pl-7">
        {children}
      </div>
    </motion.section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const TermsPage = () => {
  const lastUpdated = "18 April 2025";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
              <Shield className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-3xl font-heading font-bold">
              Terms of <span className="text-gold">Service</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground pl-[52px]">
            Last updated: <span className="text-foreground font-medium">{lastUpdated}</span>
          </p>
        </motion.div>

        {/* Intro callout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="rounded-xl gradient-navy p-5 mb-10"
        >
          <p className="text-sm text-primary-foreground/80 leading-relaxed">
            Please read these Terms of Service carefully before using{" "}
            <span className="font-semibold text-gold">10 Odds</span>. By accessing or
            using our website, you agree to be bound by these terms. If you do not
            agree, please discontinue use immediately.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          <Section index={1} number="01" title="Introduction">
            <p>
              Welcome to <strong className="text-foreground">10 Odds</strong> ("the
              Site", "we", "us", or "our"), operated at 10odds.com. The Site is an
              AI-powered football prediction and analysis platform designed to provide
              informational insights to football enthusiasts.
            </p>
            <p>
              Our prediction engine, <strong className="text-foreground">MK-806</strong>,
              analyses statistical data from football matches across the Premier League,
              La Liga, Serie A, Bundesliga, and Ligue 1 to generate daily match
              predictions and accumulator slips.
            </p>
          </Section>

          <Section index={2} number="02" title="Acceptance of Terms">
            <p>
              By accessing or using the Site, you confirm that you are at least 18 years
              of age (or the legal gambling age in your jurisdiction, whichever is
              higher), and that you have the legal capacity to enter into this agreement.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and 10 Odds.
              Your continued use of the Site after any modifications to these Terms
              constitutes acceptance of those changes.
            </p>
          </Section>

          <Section index={3} number="03" title="Description of Service">
            <p>
              10 Odds provides AI-generated football match predictions, statistical
              analysis, expected goals (xG) data, Elo rating comparisons, and curated
              daily accumulator slips. All content is produced by the MK-806 prediction
              engine and is made available for{" "}
              <strong className="text-foreground">
                informational and entertainment purposes only
              </strong>
              .
            </p>
            <p>
              The Site does not operate as a bookmaker, betting exchange, or gambling
              operator. We do not accept bets, hold funds, or facilitate any financial
              transactions related to gambling.
            </p>
          </Section>

          <Section index={4} number="04" title="No Guarantee of Accuracy">
            <p>
              Football is inherently unpredictable. While MK-806 applies advanced
              statistical modelling — including Dixon-Coles Poisson distributions, Elo
              ratings, Understat xG data, and head-to-head analysis — predictions are
              probabilistic estimates, not certainties.
            </p>
            <p>
              <strong className="text-foreground">
                Past performance of any prediction model does not guarantee future
                results.
              </strong>{" "}
              We make no representations or warranties, express or implied, about the
              accuracy, completeness, or reliability of any prediction, analysis, or
              data displayed on the Site.
            </p>
            <p>
              You acknowledge that any decision to place a bet based on content from
              this Site is made entirely at your own risk and discretion.
            </p>
          </Section>

          <Section index={5} number="05" title="Responsible Gambling">
            <p>
              We are committed to promoting responsible gambling. Football betting
              should be treated as entertainment, not as a source of income.
            </p>
            <p>If you choose to bet, please:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Only bet money you can afford to lose.</li>
              <li>Set strict deposit and loss limits with your bookmaker.</li>
              <li>Take regular breaks and never chase losses.</li>
              <li>
                Seek help if gambling is causing harm to you or those around you.
              </li>
            </ul>
            <p>
              If you or someone you know has a gambling problem, contact the{" "}
              <strong className="text-foreground">National Gambling Helpline</strong> at{" "}
              <span className="text-gold">0808 8020 133</span> (UK, free, 24/7), or
              visit{" "}
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
          </Section>

          <Section index={6} number="06" title="Intellectual Property">
            <p>
              All content on the Site — including but not limited to text, graphics,
              prediction data, algorithm outputs, the MK-806 brand, and the 10 Odds
              name and logo — is the exclusive intellectual property of 10 Odds and is
              protected by applicable copyright and trademark laws.
            </p>
            <p>
              You may not reproduce, distribute, publicly display, modify, or create
              derivative works from any content on this Site without our prior written
              consent. Personal, non-commercial use for reference purposes is
              permitted provided attribution is given.
            </p>
          </Section>

          <Section index={7} number="07" title="Limitation of Liability">
            <p>
              To the fullest extent permitted by applicable law, 10 Odds, its founders,
              employees, and licensors shall not be liable for any direct, indirect,
              incidental, consequential, or punitive damages arising from:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Your use of, or inability to use, the Site.</li>
              <li>Any reliance on predictions, analysis, or data provided.</li>
              <li>Financial losses incurred from betting decisions.</li>
              <li>
                Errors, inaccuracies, or interruptions in the Site's operation.
              </li>
            </ul>
            <p>
              In jurisdictions that do not allow the exclusion of certain warranties or
              limitations on liability, our liability shall be limited to the maximum
              extent permitted by law.
            </p>
          </Section>

          <Section index={8} number="08" title="Third-Party Links">
            <p>
              The Site may contain links to third-party websites including bookmakers,
              data providers, and regulatory bodies. These links are provided for
              convenience only. 10 Odds does not endorse, control, or accept
              responsibility for the content, privacy practices, or terms of any
              third-party site.
            </p>
            <p>
              We encourage you to review the terms and privacy policies of any
              third-party service you access via our Site.
            </p>
          </Section>

          <Section index={9} number="09" title="Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. Changes will be
              posted on this page with an updated "last updated" date. It is your
              responsibility to review these Terms periodically. Continued use of the
              Site after changes are posted constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section index={10} number="10" title="Contact Information">
            <p>
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-muted/40 rounded-lg p-4 space-y-1">
              <p>
                <span className="text-foreground font-medium">Email:</span>{" "}
                legal@10odds.com
              </p>
              <p>
                <span className="text-foreground font-medium">Website:</span>{" "}
                10odds.com
              </p>
            </div>
          </Section>
        </div>
      </div>
    </Layout>
  );
};

export default TermsPage;