import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import footballImg from "@/assets/football.png";

// ── Timing constants ────────────────────────────────────────────────────────
const BOUNCE_DURATION = 0.72;
const BOUNCE_HEIGHT   = 36;
const SPIN_DEG        = 22;

// ── CAPTIONS ─────────────────────────────────────────────────────────────────
const CAPTIONS = [
  // Original (30)
  "Simulating futures…",
  "Scanning the odds…",
  "Crunching the data…",
  "Aligning with reality…",
  "Reading past patterns…",
  "Checking team form…",
  "Evaluating expected value…",
  "Consulting the tape…",
  "Warming up the engine…",
  "Polishing the crystal ball…",
  "Decoding market signals…",
  "Bending time a little…",
  "Running deep simulations…",
  "Balancing probabilities…",
  "Tuning the antenna…",
  "Reading the script…",
  "Gathering whispers from the pitch…",
  "Weighing every outcome…",
  "Sharpening the insight…",
  "Connecting historical dots…",
  "Interpreting crowd noise…",
  "Breathing life into numbers…",
  "Forecasting the vibe…",
  "Scanning for value…",
  "Listening to past results…",
  "Drawing invisible lines…",
  "Looking through the noise…",
  "Peeking at the unplayed minutes…",
  "Distilling the data…",
  "Preparing something special…",
  "Calculating xG variance…",
  "Tracking live momentum shifts…",
  "Mapping heat zones…",
  "Comparing head‑to‑head ghosts…",
  "Factoring in referee bias…",
  "Checking travel distance…",
  "Analysing rest days…",
  "Injecting recent morale data…",
  "Weighing market liquidity…",
  "Bridging expected vs actual…",
  "Listening to the crowd's pulse…",
  "Adjusting for injuries…",
  "Factoring weather whispers…",
  "Running Monte Carlo folds…",
  "Tuning the regression…",
  "Smoothing the noise floor…",
  "Calibrating confidence intervals…",
  "Extracting pattern signatures…",
  "Fusing statistical models…",
  "Questioning the obvious…",
  "Looking for hidden value…",
  "Poking the odds with a stick…",
  "Double‑checking the script…",
  "Reading between the stats…",
  "Finding the edge…",
  "Weighing the narrative…",
  "Comparing price to probability…",
  "Scanning for market overreaction…",
  "Running a sanity check…",
  "Feeding the oracle…",
  "Waiting for the game to breathe…",
  "Analysing set‑piece threat…",
  "Factoring in card tendencies…",
  "Tracking off‑ball movements…",
  "Measuring transition speed…",
  "Checking defensive line height…",
  "Estimating pressing intensity…",
  "Looking at half‑time rituals…",
  "Consulting the form curve…",
  "Accounting for derby factor…",
  "Factoring in travel fatigue…",
  "Weighing squad rotation risk…",
  "Checking disciplinary records…",
  "Simulating 10,000 endings…",
  "Aligning with the unseen…",
  "Decrypting the coach's mind…",
  "Listening to post‑game echoes…",
  "Forecasting second‑half swings…",
  "Bending probability curves…",
  "Loading the final layer…"
];

function getRandomIndexExcluding(max: number, excludeIndex: number) {
  if (max <= 1) return 0;
  let idx = Math.floor(Math.random() * (max - 1));
  if (idx >= excludeIndex) idx++;
  return idx;
}

// ── Sub-components ────────────────────────────────────────────────────────────
const Ball = () => (
  <div className="relative flex items-end justify-center" style={{ height: BOUNCE_HEIGHT + 88 }}>
    <motion.div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full"
      style={{ width: 80, height: 80, background: "radial-gradient(circle, rgba(245,166,35,0.18) 0%, transparent 70%)" }}
      animate={{ scale: [0.6, 1.4, 0.6], opacity: [0, 0.7, 0] }}
      transition={{ duration: BOUNCE_DURATION, repeat: Infinity, ease: "easeOut", times: [0, 0.18, 0.5] }}
    />
    <motion.div
      className="relative z-10"
      style={{ width: 88, height: 88 }}
      animate={{ y: [0, -BOUNCE_HEIGHT, 0], rotate: [0, -SPIN_DEG, 0] }}
      transition={{ duration: BOUNCE_DURATION, repeat: Infinity, ease: [0.33, 0, 0.66, 1] }}
    >
      <img
        src={footballImg} alt="Loading" draggable={false}
        style={{
          width: "100%", height: "100%", objectFit: "contain",
          mixBlendMode: "screen", userSelect: "none", pointerEvents: "none",
          filter: "drop-shadow(0 8px 24px rgba(245,166,35,0.35)) drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
        }}
      />
    </motion.div>
    <motion.div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full"
      style={{ width: 52, height: 10, background: "radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 80%)" }}
      animate={{ scaleX: [1, 0.42, 1], scaleY: [1, 0.5, 1], opacity: [0.55, 0.12, 0.55] }}
      transition={{ duration: BOUNCE_DURATION, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

const ShimmerText = () => (
  <div className="relative overflow-hidden">
    <motion.p
      className="font-heading font-black text-xl tracking-widest text-foreground uppercase select-none"
      initial={{ opacity: 0, letterSpacing: "0.3em" }}
      animate={{ opacity: 1, letterSpacing: "0.22em" }}
      transition={{ duration: 0.7, delay: 0.25 }}
    >
      10 ODDS
    </motion.p>
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{ background: "linear-gradient(105deg, transparent 30%, rgba(245,166,35,0.55) 50%, transparent 70%)", mixBlendMode: "overlay" }}
      initial={{ x: "-100%" }}
      animate={{ x: "200%" }}
      transition={{ duration: 1.1, delay: 0.6, repeat: Infinity, repeatDelay: 2.8, ease: "easeInOut" }}
    />
  </div>
);

const LoadingDots = () => (
  <div className="flex items-center gap-2">
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.span
        key={i} className="rounded-full"
        style={{ width: i === 2 ? 7 : 5, height: i === 2 ? 7 : 5, background: "hsl(var(--gold, 38 95% 54%))" }}
        animate={{ opacity: [0.15, 1, 0.15], scaleY: [0.7, 1.3, 0.7] }}
        transition={{ duration: 1.0, repeat: Infinity, delay: i * 0.13, ease: "easeInOut" }}
      />
    ))}
  </div>
);

const CyclingCaption = () => {
  const [caption, setCaption] = useState<string>(() => CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)]);
  const lastIndexRef = useRef(CAPTIONS.indexOf(caption));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const tick = () => {
      const nextIndex = getRandomIndexExcluding(CAPTIONS.length, lastIndexRef.current);
      lastIndexRef.current = nextIndex;
      setCaption(CAPTIONS[nextIndex]);
      timeoutId = setTimeout(tick, 1000 + Math.random() * 1000);
    };
    timeoutId = setTimeout(tick, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <motion.p
      key={caption}
      className="text-xs text-muted-foreground/70 tracking-wide font-medium"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {caption}
    </motion.p>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
interface GlobalLoaderProps {
  minLoadTime?: number;
  onReady?: () => void;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ minLoadTime = 1500, onReady }) => {
  const finishedRef = useRef(false);

  useEffect(() => {
    // Simply fire onReady after minLoadTime — no DevTools logic here at all.
    // DevTools detection and redirect is handled entirely by useDevToolsProtection
    // in App.tsx. Mixing detection here caused sessionStorage to permanently
    // block onReady() from firing, resulting in an infinite loader.
    const timer = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onReady?.();
      }
    }, minLoadTime);

    return () => clearTimeout(timer);
  }, [minLoadTime, onReady]);

  return (
    <motion.div
      key="global-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
      style={{
        background: "hsl(var(--background) / 0.92)",
        backdropFilter: "blur(14px) saturate(1.4)",
        WebkitBackdropFilter: "blur(14px) saturate(1.4)",
      }}
    >
      <motion.div
        className="absolute pointer-events-none"
        style={{ width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.09) 0%, transparent 70%)" }}
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <Ball />
      <motion.div
        className="flex flex-col items-center gap-3 mt-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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