import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Mail, ArrowLeft } from "lucide-react";

// ── Shared design tokens — kept in sync with ProfilePage.tsx ────────────
const C = {
    bg: "#0A0F0D",
    panel: "#0F1714",
    card: "rgba(255,255,255,0.03)",
    cardBorder: "rgba(244,239,228,0.07)",
    divider: "rgba(244,239,228,0.07)",
    text: "#F4EFE4",
    textMuted: "rgba(244,239,228,0.68)",
    textFaint: "rgba(244,239,228,0.48)",
    textGhost: "rgba(244,239,228,0.34)",
    gold: "#D4A85A",
    goldSoft: "rgba(212,175,55,0.12)",
    green: "#7FBF8F",
    greenSoft: "rgba(127,191,143,0.12)",
};

export default function AccountDeletionRequested() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: C.bg }}>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md rounded-2xl p-7 sm:p-9 text-center"
                style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                    className="h-16 w-16 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: C.greenSoft }}
                >
                    <motion.div
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
                    >
                        <CheckCircle2 className="h-8 w-8" style={{ color: C.green }} />
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="mt-5 space-y-2"
                >
                    <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.text }}>
                        Request submitted
                    </h1>
                    <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
                        Your account deletion request has been sent to our team for review.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.42 }}
                    className="mt-6 space-y-2.5 text-left"
                >
                    <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.divider}` }}>
                        <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.gold }} />
                        <p className="text-xs leading-relaxed" style={{ color: C.textFaint }}>
                            Review and permanent deletion typically takes{" "}
                            <span style={{ color: C.textMuted, fontWeight: 600 }}>1–3 business days</span>.
                            You can keep using your account as normal in the meantime — nothing changes until it's approved.
                        </p>
                    </div>
                    <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.divider}` }}>
                        <Mail className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.gold }} />
                        <p className="text-xs leading-relaxed" style={{ color: C.textFaint }}>
                            We'll send you an email confirmation the moment your request has been reviewed and your data has been deleted.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.54 }}
                >
                    <Link
                        to="/"
                        className="mt-7 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-transform hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={{
                            background: C.gold,
                            color: "#0A0F0D",
                            ["--tw-ring-color" as string]: C.gold,
                            ["--tw-ring-offset-color" as string]: C.bg,
                        }}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to homepage
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}