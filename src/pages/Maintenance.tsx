import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.2, ease: "easeOut" } },
};

const slideUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (delay: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay },
  }),
};

const pulseRing = {
  animate: {
    scale:   [1, 1.18, 1],
    opacity: [0.6, 0.15, 0.6],
    transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ensure video plays even if browser defers autoplay
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {
      // Autoplay blocked — video stays as a static poster, which is fine
    });
  }, []);

  return (
<motion.div
  className="relative min-h-screen w-full flex flex-col items-center overflow-hidden bg-black"
  initial="hidden"
  animate="visible"
  variants={fadeIn}
>
  {/* ── Video background ─────────────────────────────────────────────────── */}
  <video
    ref={videoRef}
    autoPlay
    muted
    loop
    playsInline
    className="absolute inset-0 h-full w-full object-cover"
    style={{ filter: "brightness(0.30) saturate(0.9)" }}
  >
    <source
      src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/bk.mp4"
      type="video/mp4"
    />
  </video>

  {/* ── Layered overlays ─────────────────────────────────────────────────── */}
  {/* Base darkening */}
  <div className="absolute inset-0 bg-black/50" />

  {/* Gold radial glow */}
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      background:
        "radial-gradient(ellipse 65% 55% at 50% 48%, rgba(212,175,55,0.08) 0%, transparent 70%)",
    }}
  />

  {/* Noise grain */}
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.035]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: "200px 200px",
    }}
  />

  {/* Bottom vignette */}
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      background:
        "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.7) 100%)",
    }}
  />

  {/* ── Content card – moved down via mt-[30vh] ──────────────────────────── */}
  <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto mt-[30vh]">
    {/* Site label */}
    <motion.p
      custom={0.2}
      variants={slideUp}
      className="text-[11px] font-mono uppercase tracking-[0.28em] mb-5"
      style={{ color: "rgba(212,175,55,0.65)" }}
    >
      10 Odds · Status
    </motion.p>

    {/* Headline */}
    <motion.h1
      custom={0.35}
      variants={slideUp}
      className="text-[clamp(2.8rem,7vw,5.5rem)] font-black leading-[0.95] tracking-[-0.02em] mb-6"
      style={{
        fontFamily: "'Bebas Neue', 'Impact', sans-serif",
        backgroundImage:
          "linear-gradient(135deg, #F5E27A 0%, #D4AF37 35%, #b8922a 65%, #F5E27A 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      We’ll be right<br />Back.
    </motion.h1>

    {/* Divider */}
    <motion.div
      custom={0.45}
      variants={slideUp}
      className="h-px w-24 mb-7 rounded-full"
      style={{
        background:
          "linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)",
      }}
    />

    {/* Subtext */}
    <motion.p
      custom={0.55}
      variants={slideUp}
      className="text-base leading-relaxed max-w-md"
      style={{ color: "rgba(255,255,255,0.42)", fontWeight: 300 }}
    >
      We’re rolling out scheduled improvements to make your experience sharper.
      Predictions, analytics, and live markets will be back momentarily.
    </motion.p>

    {/* Status indicator */}
    <motion.div
      custom={0.7}
      variants={slideUp}
      className="mt-10 flex flex-col items-center gap-4"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "rgba(212,175,55,0.5)", borderTopColor: "transparent" }}
        />
        <span
          className="text-[12px] font-mono uppercase tracking-[0.18em]"
          style={{ color: "rgba(212,175,55,0.55)" }}
        >
          Checking for new updates…
        </span>
      </div>
    </motion.div>
  </div>

  {/* ── Footer — absolutely positioned near the bottom ────────────────────── */}
  <div className="absolute bottom-16 left-0 right-5 text-center z-10">
    <p
      className="text-[9px] font-mono tracking-wide"
      style={{ color: "rgba(255, 255, 255, 0.69)" }}
    >
      © 10 Odds · Powered by tECH
    </p>
  </div>
</motion.div>
  );
}