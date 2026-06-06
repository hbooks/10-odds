import { motion } from "framer-motion";
import { Lock } from "lucide-react";
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
const PrivacyPage = () => {
  const lastUpdated = "6 June 2026";

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
              <Lock className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-3xl font-heading font-bold">
              Privacy <span className="text-gold">Policy</span>
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
            At <span className="font-semibold text-gold">10 Odds</span>, your privacy
            matters. This policy explains what data we collect, why we collect it, and
            how we protect it.{" "}
            <strong className="text-white">
              We do not collect personal data for advertising or sell your information to anyone.
            </strong>
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          <Section index={1} number="01" title="Introduction">
            <p>
              This Privacy Policy describes how <strong className="text-foreground">10 Odds</strong>{" "}
              ("we", "us", or "our") collects, uses, and shares information when you
              visit or use our website at 10odds.com (the "Site").
            </p>
            <p>
              This policy applies to all visitors and users of the Site. By using the
              Site, you consent to the data practices described in this policy. If you
              do not agree, please discontinue use of the Site.
            </p>
          </Section>

          <Section index={2} number="02" title="Information We Collect">
            <p>
              We collect only the minimum information necessary to operate the Site and
              improve your experience. We do <strong className="text-foreground">NOT</strong> collect
              financial details, government IDs, or sensitive personal data.
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-foreground font-medium mb-1.5">
                  Information You Provide Directly
                </h3>
                <ul className="list-disc list-inside space-y-1.5 pl-2">
                  <li>
                    Email address (only if you choose to subscribe to updates or
                    create an account).
                  </li>
                  <li>
                    <strong className="text-foreground">Customer Care chat:</strong> When you
                    report a technical issue via the chat, the description of the
                    problem is saved to our <em>reported Issues</em> database so we can
                    investigate and fix it. No other chat history is stored or linked to
                    your identity.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-foreground font-medium mb-1.5">
                  Information Collected Automatically
                </h3>
                <ul className="list-disc list-inside space-y-1.5 pl-2">
                  <li>
                    IP address and general geographic location (country/city level).
                  </li>
                  <li>
                    Browser type, operating system, and device information.
                  </li>
                  <li>
                    Pages visited, time spent on the Site, and referring URLs.
                  </li>
                  <li>
                    Cookie data (see Section 7).
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          <Section index={3} number="03" title="How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>
                Deliver and improve the Site's prediction content and features across all
                seven covered competitions — Premier League, La Liga, Serie A, Bundesliga,
                Ligue 1, UEFA Champions League, and FIFA World Cup.
              </li>
              <li>
                Send you prediction updates, slip notifications, or service
                announcements (only if you have opted in).
              </li>
              <li>
                Analyse usage patterns to improve performance, fix bugs, and enhance
                user experience.
              </li>
              <li>
                Investigate and resolve technical issues reported through the
                Customer Care chat.
              </li>
              <li>Comply with applicable legal obligations.</li>
            </ul>
            <p>
              We will never use your data for automated individual decision-making that
              produces legal or similarly significant effects.
            </p>
          </Section>

          <Section index={4} number="04" title="Live Market Requests">
  <p>
    When you use the Live Market Monitor to track a betting market, we store the match identifier, market type, 
    and your selected outcome in our database. This information is used solely to generate and update the 
    probability chart you requested.
  </p>
  <p>
    <strong className="text-foreground">This data is not linked to your personal identity.</strong> No 
    account is required to use the feature, and we do not associate market requests with your device, IP address, 
    or any other identifiable information.
  </p>
  <p>
    Once the match ends and the market is settled, the data remains in our system for analytical purposes 
    but is no longer actively updated.
  </p>
</Section>

<Section index={5} number="05" title="Data Processors for Live Features">
  <p>
    To provide the Live Market Monitor and our expanded prediction coverage, we share limited match
    information with the following data processors:
  </p>
  <ul className="list-disc list-inside space-y-1.5 pl-2">
    <li>
      <strong className="text-foreground">Football-Data.org</strong> — receives date-range queries
      to return fixture schedules, match results, and team data for all seven covered competitions,
      including the UEFA Champions League and FIFA World Cup. No personal data
      is shared; only date parameters and competition identifiers are sent.
    </li>
    <li>
      <strong className="text-foreground">The Odds API</strong> — receives sport-key identifiers
      to return bookmaker odds used for fair-value probability calculations. No personal data is
      shared.
    </li>
    <li>
      <strong className="text-foreground">Bzzoiro Sports Data (BSD)</strong> – receives match identifiers to
      return live statistics and incidents for the Live Market Monitor. No personal data is shared.
    </li>
    <li>
      <strong className="text-foreground">Groq</strong> – receives match statistics and incident data to
      generate probability charts. No user‑identifiable information is included in these requests.
    </li>
  </ul>
  <p>
    These processors are used only for the purpose of delivering the Site's prediction and live
    market features and do not have access to your personal information.
  </p>
</Section>

          <Section index={6} number="06" title="Sharing Your Information">
            <p>
              We do not sell, rent, or trade your personal information. We may share
              limited data only in the following circumstances:
            </p>
            <div className="space-y-3">
              <div className="bg-muted/40 rounded-lg p-3.5">
                <p className="text-foreground font-medium mb-1">Service Providers</p>
                <p>
                  We use <strong className="text-foreground">Supabase</strong> as our
                  database and backend platform. All data you provide (including
                  reported issues) is stored on Supabase's secure infrastructure.
                  Supabase processes data on our behalf under strict data processing
                  agreements. See{" "}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:underline"
                  >
                    Supabase Privacy Policy
                  </a>
                  .
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3.5">
                <p className="text-foreground font-medium mb-1">Match Data Providers</p>
                <p>
                  To deliver predictions across all seven competitions, our pipeline
                  queries <strong className="text-foreground">Football-Data.org</strong> for
                  fixture and results data, and{" "}
                  <strong className="text-foreground">The Odds API</strong> for
                  bookmaker odds. These requests contain only competition identifiers,
                  date ranges, and sport keys — no personal data is ever transmitted
                  to these providers.
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3.5">
                <p className="text-foreground font-medium mb-1">AI Processing</p>
                <p>
                  To provide Hippo AI's alternative market suggestions and the
                  Customer Care chat, we use{" "}
                  <strong className="text-foreground">Groq</strong>, a cloud‑based AI
                  inference provider, and{" "}
                  <strong className="text-foreground">Bzzoiro Sports Data</strong> for
                  match statistics. These services receive only the data necessary for
                  each request (match details, chat messages) and do not have access to
                  your personal identity. No user‑identifiable information is stored by
                  these providers.
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3.5">
                <p className="text-foreground font-medium mb-1">Legal Requirements</p>
                <p>
                  We may disclose information if required by law, court order, or to
                  protect the safety and rights of our users and the public.
                </p>
              </div>
            </div>
          </Section>

          <Section index={7} number="07" title="Data Security">
            <p>
              We implement appropriate technical and organisational measures to
              protect your information:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>All data in transit is encrypted using TLS (HTTPS).</li>
              <li>
                Database access is protected by row‑level security policies and
                strict access controls.
              </li>
              <li>
                Service credentials (API keys, database passwords) are stored as
                encrypted environment variables and are never exposed publicly.
              </li>
              <li>
                Access to production systems is restricted to authorised personnel only.
              </li>
            </ul>
            <p>
              While we strive to protect your data, no method of transmission over the
              internet is 100% secure. We cannot guarantee absolute security and
              encourage you to use strong, unique passwords for any accounts.
            </p>
          </Section>

          <Section index={8} number="08" title="Your Rights">
            <p>
              Depending on your location, you may have the following rights regarding
              your personal data:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>
                <strong className="text-foreground">Access:</strong> Request a copy of
                the personal data we hold about you.
              </li>
              <li>
                <strong className="text-foreground">Correction:</strong> Request
                correction of inaccurate or incomplete data.
              </li>
              <li>
                <strong className="text-foreground">Deletion:</strong> Request
                deletion of your personal data, subject to legal obligations.
              </li>
              <li>
                <strong className="text-foreground">Opt-out:</strong> Unsubscribe from
                marketing communications at any time via the unsubscribe link in
                emails.
              </li>
              <li>
                <strong className="text-foreground">Portability:</strong> Request your
                data in a structured, machine-readable format.
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{" "}
              <span className="text-gold">privacy@10odds.com</span>. We will respond
              within 30 days.
            </p>
          </Section>

          <Section index={9} number="09" title="Cookies and Tracking">
            <p>
              We use cookies and similar tracking technologies to enhance your
              experience on the Site. Cookies are small files stored on your device.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2">
                <span className="text-foreground font-medium text-xs uppercase tracking-wide">
                  Essential
                </span>
                <span>
                  Required for the Site to function (e.g., session management).
                  Cannot be disabled.
                </span>
                <span className="text-foreground font-medium text-xs uppercase tracking-wide">
                  Analytics
                </span>
                <span>
                  Help us understand how visitors interact with the Site
                  (page views, session duration). Anonymised.
                </span>
                <span className="text-foreground font-medium text-xs uppercase tracking-wide">
                  Preferences
                </span>
                <span>
                  Remember your display preferences (e.g., theme, league filters).
                </span>
              </div>
            </div>
            <p>
              You can manage or disable cookies through your browser settings. Note that
              disabling some cookies may affect Site functionality.
            </p>
          </Section>

          <Section index={10} number="10" title="Children's Privacy">
            <p>
              10 Odds is not directed at individuals under the age of 18. We do not
              knowingly collect personal information from anyone under 18. Football
              betting content is intended solely for adults of legal gambling age.
            </p>
            <p>
              If you believe we have inadvertently collected information from a minor,
              please contact us immediately at{" "}
              <span className="text-gold">privacy@10odds.com</span> and we will take
              prompt action to delete it.
            </p>
          </Section>

          <Section index={11} number="11" title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in
              our practices or applicable law. The "last updated" date at the top of
              this page will always indicate when the most recent revision was made.
            </p>
            <p>
              For material changes, we will provide notice via the Site or by email
              (if you have subscribed). We encourage you to review this policy
              periodically.
            </p>
          </Section>

          <Section index={12} number="12" title="Contact Us">
            <p>
              If you have questions, concerns, or requests regarding this Privacy
              Policy or your personal data, please reach out:
            </p>
            <div className="bg-muted/40 rounded-lg p-4 space-y-1">
              <p>
                <span className="text-foreground font-medium">Privacy enquiries:</span>{" "}
                privacy@10odds.com
              </p>
              <p>
                <span className="text-foreground font-medium">General contact:</span>{" "}
                hello@10odds.com
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

export default PrivacyPage;