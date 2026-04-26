import { motion } from "framer-motion";
import { ScrollText, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";

const CommunityTermsPage = () => {
  const navigate = useNavigate();

  const rules = [
    {
      title: "Appropriate Usernames",
      body: "Your displayed username must be respectful and free from offensive, hateful, or explicit language. Impersonating other users, real people, or official accounts is strictly forbidden.",
    },
    {
      title: "Supporters Only",
      body: "The board is reserved for people who have genuinely supported the 10 Odds project — financially or through meaningful contribution. Falsely claiming supporter status may lead to rejection or removal.",
    },
    {
      title: "One Account Per Person",
      body: "Each person may submit only one community board entry. Duplicate submissions will be rejected, and any attempt to circumvent this rule may result in all associated entries being removed.",
    },
    {
      title: "Approval at Our Discretion",
      body: "10 Odds reserves the right to approve, reject, or remove any submission at any time without providing a reason. Approval is not guaranteed and being on the board does not confer any membership rights or privileges.",
    },
    {
      title: "No Harmful Content",
      body: "Any submission that contains or implies hateful, discriminatory, or politically inflammatory language will be immediately rejected. This applies to usernames, team selection intent, or any associated meaning.",
    },
    {
      title: "Removal",
      body: "Entries may be removed at any time if we determine they no longer meet our community standards, or at the member's own request. Removed entries will not be reinstated.",
    },
    {
        title: "Changes to Terms",
        body: "These terms may be updated at any time. We will notify members of any significant changes.",
    },
    {
        title: "Only Users who supported the project submissions will be accepted",
        body: "We reserve the right to verify supporter status and reject any submission that does not meet this criterion.",
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold">
            <ScrollText className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Community Board Terms</h1>
            <p className="text-xs text-muted-foreground">Last updated: 2025</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          By submitting a request to join the 10 Odds Community Board, you agree to the following
          terms. Please read them carefully.
        </p>

        <motion.div
          className="space-y-5"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {rules.map((rule, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, x: -12 },
                show:   { opacity: 1, x: 0 },
              }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full gradient-gold text-[11px] font-bold text-accent-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{rule.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rule.body}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <p className="mt-10 text-xs text-muted-foreground/60 text-center">
          Questions? Contact us through the usual channels. These terms may be updated at any time.
        </p>
      </div>
    </Layout>
  );
};

export default CommunityTermsPage;