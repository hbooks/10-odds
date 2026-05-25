import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function NotFound() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Ensure muted autoplay
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  // Hide floating buttons on this page
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "no-float-404";
    style.textContent = `
      button[class*="z-[9998]"],
      a[class*="bottom-6"][class*="right-6"],
      a[class*="bottom-"] { display: none !important; }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("no-float-404")?.remove();
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* ── Full‑screen video background ────────────────────────── */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setVideoLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "brightness(0.35) saturate(0.9)" }}
      >
        <source
          src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/404.mp4"
          type="video/mp4"
        />
      </video>

      {/* Loading spinner while video loads */}
      {!videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(212,175,55,0.4)", borderTopColor: "transparent" }}
          />
        </div>
      )}

      {/* Dark overlay + gold radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%),
            radial-gradient(ellipse at 30% 50%, rgba(212,175,55,0.08) 0%, transparent 70%)
          `,
        }}
      />

      {/* ── Content (left‑aligned) ────────────────────────────────── */}
      <div className="relative z-10 flex min-h-screen items-center px-6 sm:px-12 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-lg space-y-6"
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-[#D4AF37] to-transparent" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]/70">
              10 Odds · Error
            </span>
          </div>

          {/* 404 */}
          <h1
            className="text-[clamp(5rem,15vw,10rem)] font-black leading-none tracking-tighter"
            style={{
              fontFamily: "'Bebas Neue', 'Impact', sans-serif",
              background: "linear-gradient(135deg, #F5E27A 0%, #D4AF37 40%, #9A7B1C 75%, #D4AF37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 30px rgba(212,175,55,0.35))",
            }}
          >
            404
          </h1>

          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Lost your way?
          </h2>

          {/* Body */}
          <p className="text-sm leading-relaxed text-white/50 max-w-xs">
            This page doesn't exist, but your winning picks do. Let's get you back to the action.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/games">
              <motion.button
                whileHover={{ scale: 1.03, borderColor: "rgba(212,175,55,0.4)" }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to a Working Page

              </motion.button>
            </Link>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4">
            {[
              { label: "Monitor", to: "/markets" },
              { label: "Analytics",    to: "/analytics" },
              { label: "Community",   to: "/community" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs font-medium text-[#D4AF37]/50 hover:text-[#D4AF37]/85 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Subtle bottom gradient for depth */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
};