import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const NotFound = () => {
  // ── Background style (abstract football pitch) ─────────────────
  const backgroundStyle = {
    background: `
      radial-gradient(circle at 50% 120%, rgba(212,175,55,0.12) 0%, transparent 45%),
      linear-gradient(180deg, #0a0a0e 0%, #12121a 100%)
    `,
    backgroundSize: "cover",
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={backgroundStyle}
    >
      {/* ── Subtle grid overlay ──────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 80px, rgba(255,255,255,0.03) 81px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 80px, rgba(255,255,255,0.03) 81px)",
        }}
      />

      {/* ── Pitch lines suggestion ────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5 opacity-[0.04]">
        <div className="absolute bottom-0 left-[10%] right-[10%] h-px bg-white" />
        <div className="absolute bottom-[25%] left-[10%] right-[10%] h-px bg-white" />
        <div className="absolute bottom-[50%] left-1/2 h-1/3 w-px -translate-x-1/2 bg-white" />
        <div className="absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-white" />
      </div>

      {/* ─── Animated content ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        {/* 404 digit */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          <h1
            className="text-[8rem] font-black leading-none tracking-tighter md:text-[10rem]"
            style={{
              color: "#D4AF37",
              textShadow: "0 0 60px rgba(212,175,55,0.35)",
            }}
          >
            404
          </h1>
        </motion.div>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-2 text-xl font-semibold text-white/80 md:text-2xl"
        >
          Lost your way?
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="mt-1.5 max-w-md text-sm text-white/45"
        >
          Hmmm... this page doesn't exist – but the predictions do. Let’s get you back to
          the action.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-8"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-black shadow-xl shadow-[#D4AF37]/25 transition-all hover:brightness-110"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Return Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
