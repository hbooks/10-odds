/**
 * GlobalLoader.tsx
 * ─────────────────
 * Full-screen branded loading overlay.
 * Render it from App.tsx whenever a global loading state is active.
 *
 * Usage:
 *   import { LoadingProvider, useLoading } from "@/context/LoadingContext";
 *   // Or simply: {isLoading && <GlobalLoader />}
 */

import { motion } from "framer-motion";

// ── Football SVG (classic black pentagon on white) ────────────────────────────
const FootballSVG = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* White ball */}
    <circle cx="32" cy="32" r="30" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
    {/* Centre pentagon */}
    <polygon
      points="32,18 43,26 39,39 25,39 21,26"
      fill="#111827"
    />
    {/* Surrounding pentagons (5 outer) */}
    <polygon points="32,4 38,10 35,18 29,18 26,10"       fill="#111827" opacity="0.85" />
    <polygon points="52,16 54,24 47,28 43,22 46,14"       fill="#111827" opacity="0.85" />
    <polygon points="56,40 51,46 44,42 45,35 52,32"       fill="#111827" opacity="0.85" />
    <polygon points="20,56 16,48 22,43 29,47 28,55"       fill="#111827" opacity="0.85" />
    <polygon points="10,28 12,20 20,20 23,27 16,33"       fill="#111827" opacity="0.85" />
    <polygon points="44,54 36,58 33,50 39,45 47,48"       fill="#111827" opacity="0.85" />
  </svg>
);

// ── Shadow that squishes when ball is at top of bounce ────────────────────────
const ShadowAnimation = () => (
  <motion.div
    className="w-10 h-2 bg-black/20 rounded-full mx-auto mt-1"
    animate={{ scaleX: [1, 0.5, 1], opacity: [0.4, 0.15, 0.4] }}
    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
  />
);

// ── Main loader ───────────────────────────────────────────────────────────────
const GlobalLoader = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md"
    >
      {/* Animated football */}
      <div className="flex flex-col items-center gap-0">
        <motion.div
          className="w-16 h-16 drop-shadow-2xl"
          animate={{ y: [0, -32, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: [0.45, 0, 0.55, 1], // fast up, fast down — realistic bounce
          }}
        >
          <FootballSVG />
        </motion.div>
        <ShadowAnimation />
      </div>

      {/* Pulsing label */}
      <motion.div
        className="mt-8 flex flex-col items-center gap-1.5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="font-heading text-sm font-semibold text-foreground tracking-wide">
          MK-806 is calculating…
        </p>
        {/* Ellipsis dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-gold"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GlobalLoader;