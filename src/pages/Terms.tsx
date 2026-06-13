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
  const lastUpdated = "6 June 2026"; // change DATE HERE when updating the TOS

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
              Our prediction engine, <strong className="text-foreground">MK-808</strong>,
              analyses statistical data from football matches across the{" "}
              <strong className="text-foreground">
                Premier League, La Liga, Serie A, Bundesliga, Ligue 1, UEFA Champions
                League, and the FIFA World Cup
              </strong>{" "}
              to generate daily match predictions and accumulator slips. We also operate{" "}
              <strong className="text-foreground">Hippo AI</strong>, a secondary
              intelligence that provides alternative betting market suggestions for
              each fixture.
            </p>
            <p>
              Tournament competitions (UEFA Champions League and FIFA World Cup) are
              covered using specialised prediction logic that accounts for neutral
              venues, international team dynamics, and knockout-round structures.
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
              analysis, expected goals (xG) data, Elo rating comparisons, curated
              daily accumulator slips, and alternative market suggestions via Hippo AI.
              All content is produced by automated models and is made available for{" "}
              <strong className="text-foreground">
                informational and entertainment purposes only
              </strong>
              .
            </p>
            <p>
              Coverage spans seven competitions:{" "}
              <strong className="text-foreground">
                Premier League, La Liga, Serie A, Bundesliga, Ligue 1, UEFA Champions
                League, and the FIFA World Cup.
              </strong>{" "}
              Domestic league predictions use venue-split statistical models.
              Tournament predictions (UCL and WC) use specialised logic: UEFA Champions
              League predictions account for home-leg advantage, while FIFA World Cup
              predictions apply neutral-venue modelling with international team Elo
              ratings.
            </p>
            <p>
              The Site also offers a <strong className="text-foreground">Customer Care chat</strong>{" "}
              for support inquiries. This chat is a support tool only — it is not an
              emergency service, and any information provided through it is for
              assistance with the Site's features.
            </p>
            <p>
              The Site does not operate as a bookmaker, betting exchange, or gambling
              operator. We do not accept bets, hold funds, or facilitate any financial
              transactions related to gambling.
            </p>
          </Section>

          <Section index={4} number="04" title="AI‑Generated Content">
            <p>
              Predictions produced by <strong className="text-foreground">MK-808</strong> and{" "}
              <strong className="text-foreground">Hippo AI</strong> are generated by
              artificial intelligence models. These models process historical data,
              team statistics, and match conditions to produce probabilistic estimates.
              They do not constitute financial advice, betting advice, or a guarantee
              of any outcome.
            </p>
            <p>
              For UEFA Champions League and FIFA World Cup fixtures, predictions are
              generated using tournament-specific models that differ from the domestic
              league approach. UCL predictions incorporate home-leg psychological
              factors and club Elo ratings. WC predictions apply neutral-venue logic,
              international squad data, and adjusted scoring-rate assumptions. These
              differences in methodology do not increase the certainty of any outcome.
            </p>
            <p>
              The Customer Care chat may also use AI-assisted responses to provide
              faster support. All AI-generated replies are based on pre‑defined
              knowledge about the Site and are intended to help you navigate our
              features.
            </p>
            <p>
              You acknowledge that any decision to place a bet based on content from
              this Site (including Hippo AI's alternative market suggestions) is made
              entirely at your own risk and discretion. We expressly disclaim all
              liability for any financial losses incurred.
            </p>
          </Section>

          <Section index={5} number="05" title="No Guarantee of Accuracy">
            <p>
              Football is inherently unpredictable. While our models apply advanced
              statistical techniques, predictions are estimates, not certainties.
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
          </Section>

          <Section index={6} number="06" title="Responsible Gambling">
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

          <Section index={7} number="07" title="Customer Care Chat — Acceptable Use">
            <p>
              The Customer Care chat is provided for genuine support inquiries related
              to the Site. By using the chat, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Communicate respectfully and refrain from abusive, offensive, or unlawful language.</li>
              <li>Not use the chat for spam, solicitation, or any purpose unrelated to 10 Odds.</li>
              <li>
                Understand that repeated violations may result in a temporary or permanent
                ban from the chat feature.
              </li>
            </ul>
            <p>
              We reserve the right to terminate or restrict access to the chat at our
              sole discretion, without prior notice, for any breach of these terms.
            </p>
          </Section>

          <Section index={8} number="08" title="Live Market Monitor">
  <p>
    The <strong className="text-foreground">Live Market Monitor</strong> displays real‑time probability estimates 
    for selected betting markets. These estimates are generated by automated models using live match statistics 
    and are provided for <strong className="text-foreground">informational and entertainment purposes only</strong>. 
    They do not constitute financial or betting advice.
  </p>
  <p>
    Market charts may be based on data from third‑party providers and may be subject to delays, inaccuracies, 
    or interruptions. We do not guarantee the timeliness, accuracy, or completeness of any live data or 
    probability estimate displayed on the Site.
  </p>
  <p>
    When you request a market to be tracked, the system generates a historical chart using artificial intelligence. 
    This process is automated and the resulting chart is an approximation based on available data — it may not 
    perfectly reflect actual in‑play events.
  </p>
</Section>

          <Section index={9} number="09" title="Intellectual Property">
            <p>
              All content on the Site — including but not limited to text, graphics,
              prediction data, algorithm outputs, the MK-808 and Hippo AI brands, and
              the 10 Odds name and logo — is the exclusive intellectual property of
              10 Odds and is protected by applicable copyright and trademark laws.
            </p>
            <p>
              Prediction outputs covering all seven competitions (Premier League, La
              Liga, Serie A, Bundesliga, Ligue 1, UEFA Champions League, and FIFA World
              Cup), including tournament-specific model outputs, are original works
              produced by our systems and may not be reproduced or redistributed without
              prior written consent.
            </p>
            <p>
              You may not reproduce, distribute, publicly display, modify, or create
              derivative works from any content on this Site without our prior written
              consent. Personal, non-commercial use for reference purposes is
              permitted provided attribution is given.
            </p>
          </Section>

          <Section index={10} number="10" title="Third‑Party Services">
            <p>
              The Site integrates with third‑party services to deliver its features:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>
                <strong className="text-foreground">Football-Data.org</strong> —
                provides fixture schedules, match results, team data, and competition
                information for all seven covered competitions, including the UEFA
                Champions League and FIFA World Cup.
              </li>
              <li>
                <strong className="text-foreground">The Odds API</strong> —
                provides bookmaker odds data used by MK-808 to calculate fair-value
                probabilities and expected value across all covered competitions.
              </li>
              <li>
                <strong className="text-foreground">Bzzoiro Sports Data (BSD)</strong> —
                provides live and historical match data, team statistics, and odds
                used by the Live Market Monitor.
              </li>
              <li>
                <strong className="text-foreground">Groq</strong> — a cloud‑based AI
                inference platform used to power Hippo AI's market analysis and the
                Customer Care chat.
              </li>
              <li>
                <strong className="text-foreground">Supabase</strong> — provides database
                hosting, authentication, and backend services for the Site's operation,
                including storage of all match, prediction, and result data.
              </li>
            </ul>
            <p>
              10 Odds is not responsible for the availability, accuracy, or privacy
              practices of these third‑party services. Your use of them is subject to
              their respective terms and policies. Tournament data (UCL, WC) is subject
              to the same third‑party availability constraints as domestic league data.
            </p>
          </Section>

          <Section index={11} number="11" title="Limitation of Liability">
            <p>
              To the fullest extent permitted by applicable law, 10 Odds, its founders,
              employees, and licensors shall not be liable for any direct, indirect,
              incidental, consequential, or punitive damages arising from:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Your use of, or inability to use, the Site or any of its features.</li>
              <li>Any reliance on predictions, analysis, or alternative market suggestions — including those covering the UEFA Champions League or FIFA World Cup.</li>
              <li>Financial losses incurred from betting decisions based on any content from the Site.</li>
              <li>Errors, inaccuracies, or interruptions in the Site's operation, including those caused by the specialised modelling used for tournament competitions.</li>
              <li>Downtime or failures of third‑party APIs (Football-Data.org, The Odds API, BSD, Groq, Supabase).</li>
              <li>Differences in prediction methodology between domestic leagues and tournament competitions (UCL, WC).</li>
            </ul>
            <p>
              In jurisdictions that do not allow the exclusion of certain warranties or
              limitations on liability, our liability shall be limited to the maximum
              extent permitted by law.
            </p>
          </Section>

          <Section index={12} number="12" title="Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. Changes will be
              posted on this page with an updated "last updated" date. It is your
              responsibility to review these Terms periodically. Continued use of the
              Site after changes are posted constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section index={13} number="13" title="Contact Information">
            <p>
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-muted/40 rounded-lg p-4 space-y-1">
              <p>
                <span className="text-foreground font-medium">Email:</span>{" "}
                legal@hpbooks.uk
              </p>
              <p>
                <span className="text-foreground font-medium">Website:</span>{" "}
                Domain change coming soon stay tuned!
              </p>
            </div>
          </Section>
        </div>
      </div>
    </Layout>
  );
};

export default TermsPage;