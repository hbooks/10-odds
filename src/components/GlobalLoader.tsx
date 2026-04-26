import { motion } from "framer-motion";

// ── Import the football asset ─────────────────────────────────────────────────
// Place football.png in src/assets/ and update this import path if needed
import footballImg from "@/assets/football.png";

// ── Timing constants — tweak here to change feel ──────────────────────────────
const BOUNCE_DURATION = 0.72;   // seconds per bounce cycle
const BOUNCE_HEIGHT   = 36;     // px the ball travels upward
const SPIN_DEG        = 22;     // degrees of rotation per bounce

// ─────────────────────────────────────────────────────────────────────────────

/** The ball itself — bounces, rotates, and glows */
const Ball = () => (
  <div className="relative flex items-end justify-center" style={{ height: BOUNCE_HEIGHT + 88 }}>

    {/* Gold impact ring — pulses on each ground hit */}
    <motion.div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full"
      style={{
        width: 80,
        height: 80,
        background: "radial-gradient(circle, rgba(245,166,35,0.18) 0%, transparent 70%)",
      }}
      animate={{
        scale:   [0.6, 1.4, 0.6],
        opacity: [0,   0.7,  0],
      }}
      transition={{
        duration: BOUNCE_DURATION,
        repeat:   Infinity,
        ease:     "easeOut",
        times:    [0, 0.18, 0.5],
      }}
    />

    {/* Ball — bounce + spin */}
    <motion.div
      className="relative z-10"
      style={{ width: 88, height: 88 }}
      animate={{
        y:      [0, -BOUNCE_HEIGHT, 0],
        rotate: [0, -SPIN_DEG,      0],
      }}
      transition={{
        duration: BOUNCE_DURATION,
        repeat:   Infinity,
        ease:     [0.33, 0, 0.66, 1],  // sharp deceleration → gravity feel
      }}
    >
      {/*
        mix-blend-mode: screen makes the black background invisible.
        The ball appears to float on any background.
      */}
      <img
        src={footballImg}
        alt="Loading"
        draggable={false}
        style={{
          width:         "100%",
          height:        "100%",
          objectFit:     "contain",
          mixBlendMode:  "screen",
          userSelect:    "none",
          pointerEvents: "none",
          // Slight drop-shadow matching the gold tones
          filter: "drop-shadow(0 8px 24px rgba(245,166,35,0.35)) drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
        }}
      />
    </motion.div>

    {/* Shadow on the ground — squishes as ball rises */}
    <motion.div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full"
      style={{
        width:      52,
        height:     10,
        background: "radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 80%)",
      }}
      animate={{
        scaleX:  [1,   0.42,  1],
        scaleY:  [1,   0.5,   1],
        opacity: [0.55, 0.12, 0.55],
      }}
      transition={{
        duration: BOUNCE_DURATION,
        repeat:   Infinity,
        ease:     "easeInOut",
      }}
    />
  </div>
);

/** Shimmer text that sweeps gold light across the brand name */
const ShimmerText = () => (
  <div className="relative overflow-hidden">
    <motion.p
      className="font-heading font-black text-xl tracking-widest text-foreground uppercase select-none"
      initial={{ opacity: 0, letterSpacing: "0.3em" }}
      animate={{ opacity: 1, letterSpacing: "0.22em" }}
      transition={{ duration: 0.7, delay: 0.25 }}
    >
      MK-806
    </motion.p>
    {/* Gold shimmer sweep */}
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "linear-gradient(105deg, transparent 30%, rgba(245,166,35,0.55) 50%, transparent 70%)",
        mixBlendMode: "overlay",
      }}
      initial={{ x: "-100%" }}
      animate={{ x: "200%" }}
      transition={{
        duration: 1.1,
        delay:    0.6,
        repeat:   Infinity,
        repeatDelay: 2.8,
        ease:     "easeInOut",
      }}
    />
  </div>
);

/** Staggered gold indicator dots */
const LoadingDots = () => (
  <div className="flex items-center gap-2">
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.span
        key={i}
        className="rounded-full"
        style={{
          width:      i === 2 ? 7 : 5,
          height:     i === 2 ? 7 : 5,
          background: "hsl(var(--gold, 38 95% 54%))",
        }}
        animate={{
          opacity:  [0.15, 1,    0.15],
          scaleY:   [0.7,  1.3,  0.7],
        }}
        transition={{
          duration:   1.0,
          repeat:     Infinity,
          delay:      i * 0.13,
          ease:       "easeInOut",
        }}
      />
    ))}
  </div>
);

/** Subtle caption that cycles through loading states */
const captions = [
  "Simulating futures…",
  "Scanning the odds…",
  "Crunching the data…",
  "Almost there…",
];

const CyclingCaption = () => (
  <motion.p
    key="caption"
    className="text-xs text-muted-foreground/70 tracking-wide font-medium"
    animate={{ opacity: [0, 1, 1, 0] }}
    transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.1, 0.85, 1] }}
  >
    {captions[Math.floor(Date.now() / 3500) % captions.length]}
  </motion.p>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const GlobalLoader = () => {
  return (
    <motion.div
      key="global-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
      style={{
        background: "hsl(var(--background) / 0.92)",
        backdropFilter: "blur(14px) saturate(1.4)",
        WebkitBackdropFilter: "blur(14px) saturate(1.4)",
      }}
    >
      {/* Soft radial glow behind the ball */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width:      280,
          height:     280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,166,35,0.09) 0%, transparent 70%)",
        }}
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ball stack */}
      <Ball />

      {/* Brand + loading text */}
      <motion.div
        className="flex flex-col items-center gap-3 mt-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.3, duration: 0.55 }}
      >
        <ShimmerText />

        <LoadingDots />

        <CyclingCaption />
      </motion.div>
    </motion.div>
  );
};

export default GlobalLoader;