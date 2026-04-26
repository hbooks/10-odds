import { motion } from "framer-motion";
import { ScrollText, ArrowLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";

const CommunityTermsPage = () => {
  const navigate = useNavigate();

  const rules = [
    {
      emoji: "✍️",
      title: "Respectful & Appropriate Usernames",
      body: "Your display name must be clean, respectful, and safe for all audiences. Names containing offensive, vulgar, hateful, or sexually explicit language will be immediately rejected without appeal. Impersonating another user, a real public figure, a sports personality, or any official account — including 10 Odds staff — is strictly prohibited and will result in a permanent ban.",
    },
    {
      emoji: "💛",
      title: "Genuine Supporters Only",
      body: "The Community Board is an exclusive space reserved for people who have meaningfully supported the 10 Odds project — whether through financial contribution (Ko-fi, PayPal, or similar) or other verified forms of substantial support. Falsely claiming supporter status is considered a serious breach of these terms and will result in your submission being rejected and your account being permanently removed from the board without notice.",
    },
    {
      emoji: "👤",
      title: "One Profile Per Person",
      body: "Each individual is permitted a single entry on the Community Board. Submitting duplicate profiles — whether under the same or a different name — is strictly forbidden. Any attempt to circumvent this rule, including using different devices, browsers, or identity details, will result in all associated entries being removed and the individual being permanently barred from the board.",
    },
    {
      emoji: "⚖️",
      title: "Approval & Removal at Our Discretion",
      body: "10 Odds reserves the full and unconditional right to approve, reject, demote, or permanently remove any submission or existing entry at any time, without obligation to provide a reason. Approval is not guaranteed under any circumstances, and appearing on the board does not confer membership, ownership rights, or any privileges beyond public recognition. All decisions made by 10 Odds are final.",
    },
    {
      emoji: "🚫",
      title: "Zero Tolerance for Harmful Content",
      body: "Any submission — including username, avatar selection, or implied meaning — that promotes, glorifies, or is associated with hatred, racism, discrimination, sexism, homophobia, political extremism, religious intolerance, or any form of harassment will be rejected instantly and permanently. We take community safety seriously and will not hesitate to act.",
    },
    {
      emoji: "🤝",
      title: "Respectful Community Spirit",
      body: "Being on the board implies you represent the 10 Odds community with dignity and good faith. Any member found to be engaging in toxic, abusive, or disruptive behaviour in connection with the 10 Odds project or its community — whether on the platform or externally — may have their entry removed without warning.",
    },
    {
      emoji: "🔒",
      title: "Privacy & Verification",
      body: "Your real name is collected solely for internal verification purposes and will never be displayed publicly, sold, or shared with third parties. By submitting your entry, you consent to 10 Odds storing this information securely for the purpose of verifying supporter status and maintaining the integrity of the board.",
    },
    {
      emoji: "🏅",
      title: "Verified Supporters Only — No Exceptions",
      body: "10 Odds reserves the right to request proof of support at any stage of the review process. If a submitted entry cannot be reasonably verified as having supported the project, it will be declined. Verification may take the form of a transaction reference, a screenshot, or any other reasonable evidence at the discretion of the reviewer.",
    },
    {
      emoji: "♻️",
      title: "Removal Is Permanent",
      body: "Once an entry is removed — whether by request, violation, or administrative decision — it will not be reinstated. If you wish to be removed from the board, you may contact us through the usual channels, and we will action your request within a reasonable timeframe.",
    },
    {
      emoji: "📋",
      title: "Updates to These Terms",
      body: "These terms may be revised at any time as the community grows and evolves. We will make reasonable efforts to notify existing members of any significant changes. Your continued presence on the board following a terms update constitutes acceptance of the revised terms. If you no longer agree, you may request removal at any time.",
    },
    {
      emoji: "🛡️",
      title: "No Liability",
      body: "10 Odds provides the Community Board as a goodwill feature and accepts no liability for any indirect loss, reputational damage, or inconvenience arising from the appearance, rejection, or removal of any entry. Participation in the board is entirely voluntary.",
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-2xl">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-gold shrink-0">
            <ScrollText className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold leading-tight">Community Board Terms</h1>
            <p className="text-xs text-muted-foreground">Last updated: 2025 · Applies to all submissions</p>
          </div>
        </div>

        {/* Intro block */}
        <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 mb-8 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-gold mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            By submitting a request to join the 10 Odds Community Board, you acknowledge that you
            have read, understood, and agreed to every term listed below. These terms exist to keep
            the board a safe, fair, and welcoming space for everyone in our community.
          </p>
        </div>

        {/* Rules */}
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        >
          {rules.map((rule, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, x: -16 },
                show:   { opacity: 1, x: 0 },
              }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              className="rounded-xl border border-border bg-card p-5 hover:border-gold/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-gold text-[11px] font-black text-accent-foreground">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1.5 flex items-center gap-2">
                    <span>{rule.emoji}</span>
                    {rule.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rule.body}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer note */}
        <div className="mt-10 rounded-xl border border-border bg-muted/20 px-5 py-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground/80 font-medium">
            These terms are governed by the policies of 10 Odds and are subject to change without prior notice.
          </p>
          <p className="text-xs text-muted-foreground/50">
            Questions or removal requests? Contact us through the usual channels.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityTermsPage;