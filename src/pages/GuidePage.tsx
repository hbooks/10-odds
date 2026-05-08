import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useCallback } from "react";
import {
  Zap, MessageSquare, TrendingUp, BookOpen, AlertCircle,
  BarChart2, ArrowRight, RefreshCw, ShieldCheck, X,
} from "lucide-react";
import Layout from "@/components/Layout";
import { PATTERN_ANIMALS } from "@/lib/patternAnimals";
import AnimalIcon from "@/components/AnimalIcon";

// ─── Types ────────────────────────────────────────────────────────────────────
type PatternAnimal = (typeof PATTERN_ANIMALS)[number];

// ─── Verified Unsplash photo IDs — each one tested & unique ──────────────────
// Format: https://images.unsplash.com/photo-{ID}?w=800&h=600&fit=crop&auto=format
const ANIMAL_IMG: Record<string, string> = {
  // Apex predators — all big cats
  Lion:     "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800&h=600&fit=crop&auto=format",
  Tiger:    "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800&h=600&fit=crop&auto=format",
  Panther:  "https://images.unsplash.com/photo-1590447591754-24c0b7f8a1c2?w=800&h=600&fit=crop&auto=format",
  Cheetah:  "https://images.unsplash.com/photo-1549366021-9f761d450615?w=800&h=600&fit=crop&auto=format",
  Leopard:  "https://images.unsplash.com/photo-1551972873-b7e8754603ae?w=800&h=600&fit=crop&auto=format",
  Jaguar:   "https://images.unsplash.com/photo-1612160609504-334b88480a0c?w=800&h=600&fit=crop&auto=format",
  // Birds
  Eagle:    "https://images.unsplash.com/photo-1611689342806-0863700f1aa3?w=800&h=600&fit=crop&auto=format",
  Falcon:   "https://images.unsplash.com/photo-1590212151175-e58edd96185b?w=800&h=600&fit=crop&auto=format",
  // Land carnivores
  Wolf:     "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&auto=format",
  Bear:     "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800&h=600&fit=crop&auto=format",
  Hyena:    "https://images.unsplash.com/photo-1544985361-b420d7a77043?w=800&h=600&fit=crop&auto=format",
  // Ocean
  Shark:    "https://images.unsplash.com/photo-1560275619-4cc5fa59d3ae?w=800&h=600&fit=crop&auto=format",
  Crab:     "https://images.unsplash.com/photo-1550680888-5fc7c3ec565a?w=800&h=600&fit=crop&auto=format",
  // Steadfast
  Ox:       "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800&h=600&fit=crop&auto=format",
  Mule:     "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&h=600&fit=crop&auto=format",
  // Slow movers
  Tortoise: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&h=600&fit=crop&auto=format",
  Sloth:    "https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=800&h=600&fit=crop&auto=format",
  Worm:     "https://images.unsplash.com/photo-1581595219315-a187dd40c322?w=800&h=600&fit=crop&auto=format",
};

// ─── Tier by confidence + EV ──────────────────────────────────────────────────
function getTier(pa: PatternAnimal) {
  const c = (pa.confidence ?? "").toLowerCase();
  const e = (pa.evType ?? "").toLowerCase();
  const hiC = c.includes("high");
  const hiE = e.includes("high") || e.includes("positive");
  const loC = c.includes("low");
  const loE = e.includes("low") || e.includes("negative");
  if (hiC && hiE)  return { label: "ELITE",    color: "#f5a623", dim: "rgba(245,166,35,0.18)", ring: "rgba(245,166,35,0.4)" };
  if (hiC)         return { label: "STRONG",   color: "#22c55e", dim: "rgba(34,197,94,0.15)",  ring: "rgba(34,197,94,0.38)" };
  if (hiE)         return { label: "VALUE",    color: "#3b82f6", dim: "rgba(59,130,246,0.15)", ring: "rgba(59,130,246,0.38)" };
  if (loC && loE)  return { label: "WEAK",     color: "#ef4444", dim: "rgba(239,68,68,0.15)",  ring: "rgba(239,68,68,0.35)" };
  return                  { label: "MODERATE", color: "#a855f7", dim: "rgba(168,85,247,0.15)", ring: "rgba(168,85,247,0.35)" };
}

// ─── Motion ───────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

// ─── MODAL ────────────────────────────────────────────────────────────────────
function AnimalModal({ pa, onClose }: { pa: PatternAnimal | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {pa && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ opacity: 0, scale: 0.87, y: 48 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 28 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "relative", zIndex: 1,
              width: "100%", maxWidth: 740,
              borderRadius: 26, overflow: "hidden",
              background: "#0d0d10",
              border: `1px solid ${getTier(pa).ring}`,
              boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 50px 120px rgba(0,0,0,0.9), 0 0 80px ${getTier(pa).dim}`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "row" }}>

              {/* LEFT — photo */}
              <div style={{ position: "relative", width: "43%", minHeight: 440, flexShrink: 0, overflow: "hidden" }}>
                <img
                  src={ANIMAL_IMG[pa.animal] ?? ANIMAL_IMG.Wolf}
                  alt={pa.animal}
                  style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: "100%",
                    objectFit: "cover", objectPosition: "center 20%",
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {/* Dual gradient: right-blend + bottom-darken */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to right, transparent 45%, #0d0d10 100%), linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 45%)",
                }} />

                {/* Tier pill */}
                <div style={{
                  position: "absolute", top: 18, left: 16,
                  fontSize: 10, fontWeight: 900, fontFamily: "monospace",
                  letterSpacing: "0.15em",
                  background: getTier(pa).color,
                  color: "#000", padding: "4px 11px", borderRadius: 999,
                }}>
                  {getTier(pa).label}
                </div>

                {/* Name */}
                <div style={{ position: "absolute", bottom: 22, left: 18 }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.2em", color: getTier(pa).color, marginBottom: 5, opacity: 0.9 }}>
                    {pa.originalLabel}
                  </div>
                  <div style={{
                    fontSize: 38, fontWeight: 900, lineHeight: 1,
                    color: "#fff", fontFamily: "'Georgia','Times New Roman',serif",
                    letterSpacing: "-0.02em",
                    textShadow: "0 3px 24px rgba(0,0,0,0.95)",
                  }}>
                    {pa.animal}
                  </div>
                </div>
              </div>

              {/* RIGHT — info */}
              <div style={{ flex: 1, padding: "28px 26px 24px 22px", display: "flex", flexDirection: "column", position: "relative" }}>

                {/* Close btn */}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  style={{
                    position: "absolute", top: 14, right: 14,
                    width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "#666", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={14} />
                </button>

                {/* Icon + heading */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    background: getTier(pa).dim,
                    border: `1px solid ${getTier(pa).ring}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <AnimalIcon animal={pa.animal} size={22} style={{ color: getTier(pa).color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 21, fontWeight: 900, color: "#fff", fontFamily: "'Georgia',serif", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                      The {pa.animal}
                    </div>
                    <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace", letterSpacing: "0.07em", marginTop: 3 }}>
                      Pattern {(PATTERN_ANIMALS as PatternAnimal[]).indexOf(pa) + 1} / {PATTERN_ANIMALS.length}
                    </div>
                  </div>
                </div>

                {/* Stat chips */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                  {[
                    { lbl: "CONFIDENCE", val: pa.confidence },
                    { lbl: "EXP. VALUE", val: pa.evType },
                  ].map(({ lbl, val }) => (
                    <div key={lbl} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 11, padding: "9px 15px",
                    }}>
                      <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.15em", color: "#444", marginBottom: 4 }}>{lbl}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: getTier(pa).color }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 18 }} />

                {/* Description */}
                <p style={{ fontSize: 13.5, lineHeight: 1.78, color: "rgba(255,255,255,0.5)", margin: 0, flex: 1 }}>
                  {pa.description}
                </p>

                {/* Footer */}
                <div style={{
                  marginTop: 22, paddingTop: 16,
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 11, color: "#3a3a3a", fontFamily: "monospace" }}>
                    Updated daily
                  </span>
                  <Link
                    to="/patterns"
                    onClick={onClose}
                    style={{
                      fontSize: 12, fontWeight: 800, fontFamily: "monospace",
                      color: getTier(pa).color,
                      textDecoration: "none", letterSpacing: "0.06em",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    VIEW ANALYSER <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── ANIMAL CARD ──────────────────────────────────────────────────────────────
function AnimalCard({ pa, index, onClick }: { pa: PatternAnimal; index: number; onClick: () => void }) {
  const tier = getTier(pa);
  const img  = ANIMAL_IMG[pa.animal];
  const [hover, setHover] = useState(false);

  return (
    <motion.button
      variants={fadeUp}
      custom={index}
      animate={{ y: hover ? -6 : 0, transition: { duration: 0.22 } }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileTap={{ scale: 0.965 }}
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: 18, overflow: "hidden",
        border: `1px solid ${hover ? tier.ring : "rgba(255,255,255,0.055)"}`,
        background: "#111115",
        cursor: "pointer",
        textAlign: "left", padding: 0, width: "100%",
        boxShadow: hover ? `0 20px 48px rgba(0,0,0,0.45), 0 0 32px ${tier.dim}` : "none",
        transition: "border-color 0.22s, box-shadow 0.22s",
      }}
    >
      {/* Photo strip */}
      <div style={{ position: "relative", height: 124, overflow: "hidden" }}>
        {img ? (
          <img
            src={img}
            alt={pa.animal}
            loading="lazy"
            style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center 20%",
              display: "block",
              transform: hover ? "scale(1.07)" : "scale(1)",
              transition: "transform 0.5s ease",
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg,#1a1a2e,#16213e)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AnimalIcon animal={pa.animal} size={42} />
          </div>
        )}
        {/* Fade to card bg */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "70%",
          background: "linear-gradient(to top, #111115 0%, transparent 100%)",
        }} />

        {/* Tier badge */}
        <div style={{
          position: "absolute", top: 9, left: 9,
          fontSize: 9, fontWeight: 900, fontFamily: "monospace",
          letterSpacing: "0.14em",
          background: tier.color, color: "#000",
          padding: "3px 8px", borderRadius: 999,
        }}>
          {tier.label}
        </div>

        {/* Icon chip */}
        <div style={{
          position: "absolute", top: 9, right: 9,
          width: 30, height: 30, borderRadius: 9,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${tier.ring}`,
        }}>
          <AnimalIcon animal={pa.animal} size={15} style={{ color: tier.color }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 14px 15px" }}>
        <div style={{
          fontSize: 15, fontWeight: 900, color: "#fff",
          fontFamily: "'Georgia',serif", letterSpacing: "-0.01em",
          lineHeight: 1.1, marginBottom: 2,
        }}>
          {pa.animal}
        </div>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#444", letterSpacing: "0.08em", marginBottom: 9 }}>
          {pa.originalLabel}
        </div>

        <div style={{ display: "flex", gap: 5, marginBottom: 9, flexWrap: "wrap" }}>
          {[pa.confidence, pa.evType].map((v, i) => (
            <span key={i} style={{
              fontSize: 9.5, fontFamily: "monospace", letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "2px 7px", borderRadius: 6,
            }}>
              {v}
            </span>
          ))}
        </div>

        <p style={{
          fontSize: 11, lineHeight: 1.6,
          color: "rgba(255,255,255,0.35)",
          margin: 0,
          display: "-webkit-box" as any,
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as any,
          overflow: "hidden",
        }}>
          {pa.description}
        </p>

        <div style={{
          marginTop: 10, fontSize: 11, fontWeight: 700,
          fontFamily: "monospace", letterSpacing: "0.06em",
          color: tier.color, display: "flex", alignItems: "center", gap: 4,
          opacity: hover ? 1 : 0,
          transition: "opacity 0.2s",
        }}>
          EXPAND <ArrowRight size={11} />
        </div>
      </div>
    </motion.button>
  );
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function GuideSection({ icon: Icon, iconColor, badge, title, children }: {
  index: number; icon: React.ElementType; iconColor: string;
  iconBg?: string; badge: string; title: string; children: React.ReactNode;
}) {
  return (
    <motion.section
      initial="hidden" whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.055)",
        background: "rgba(255,255,255,0.018)",
      }}
    >
      <motion.div variants={fadeUp} style={{ padding: "28px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: `${iconColor}12`,
            border: `1px solid ${iconColor}28`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ color: iconColor, width: 19, height: 19 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: "#3a3a3a", marginBottom: 3, textTransform: "uppercase" as const }}>
              {badge}
            </div>
            <h2 style={{
              fontSize: 20, fontWeight: 900, color: "#fff", margin: 0,
              fontFamily: "'Georgia','Times New Roman',serif",
              letterSpacing: "-0.01em", lineHeight: 1.15,
            }}>
              {title}
            </h2>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
      </motion.div>
    </motion.section>
  );
}

// ─── CALLOUT ──────────────────────────────────────────────────────────────────
function Callout({ icon: Icon, color, children }: { icon: React.ElementType; color: string; bg?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", gap: 11, borderRadius: 13, padding: "14px 16px",
      background: `${color}0b`, border: `1px solid ${color}26`,
    }}>
      <Icon style={{ width: 14, height: 14, color, marginTop: 2, flexShrink: 0 }} />
      <p style={{ fontSize: 13, lineHeight: 1.72, color: `${color}bb`, margin: 0 }}>{children}</p>
    </div>
  );
}

const prose: React.CSSProperties = { fontSize: 14, lineHeight: 1.82, color: "rgba(255,255,255,0.48)", margin: 0 };
const hi: React.CSSProperties = { color: "rgba(255,255,255,0.82)", fontWeight: 600 };

// ─── PAGE ─────────────────────────────────────────────────────────────────────
const GuidePage = () => {
  const [selected, setSelected] = useState<PatternAnimal | null>(null);
  const close = useCallback(() => setSelected(null), []);

  return (
    <Layout>
      <AnimalModal pa={selected} onClose={close} />

      {/* Ambient top glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 300, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.08) 0%, transparent 70%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "52px 20px 90px" }}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <motion.div initial="hidden" animate="visible" variants={stagger} style={{ textAlign: "center", marginBottom: 68 }}>

          <motion.div variants={fadeUp} style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
            <div style={{
              width: 66, height: 66, borderRadius: 22,
              background: "linear-gradient(145deg, #f5a623 0%, #b87411 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 48px rgba(245,166,35,0.4), 0 10px 40px rgba(0,0,0,0.6)",
            }}>
              <BookOpen style={{ width: 30, height: 30, color: "#000" }} />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} style={{ marginBottom: 18 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              fontSize: 10, fontFamily: "monospace", letterSpacing: "0.22em",
              textTransform: "uppercase" as const,
              color: "#f5a623",
              background: "rgba(245,166,35,0.07)",
              border: "1px solid rgba(245,166,35,0.18)",
              padding: "6px 15px", borderRadius: 999,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%", background: "#f5a623",
                animation: "mk-pulse 2.2s ease-in-out infinite", flexShrink: 0,
              }} />
              Beginner's Field Guide
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} style={{
            fontSize: "clamp(38px, 7vw, 60px)",
            fontWeight: 900, lineHeight: 1.02, letterSpacing: "-0.035em",
            fontFamily: "'Georgia','Times New Roman',serif",
            color: "#fff", margin: "0 0 18px",
          }}>
            How to Read{" "}
            <span style={{
              background: "linear-gradient(88deg, #f5a623 0%, #ffd166 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              MK‑806
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} style={{
            fontSize: 16, lineHeight: 1.75,
            color: "rgba(255,255,255,0.38)",
            maxWidth: 460, margin: "0 auto 30px",
          }}>
            Plain-English patterns, predictions, and what _806 is actually telling you.
            No jargon. No math. Just the good stuff.
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 7 }}>
            {["01 — Patterns", "02 — _806", "03 — How to use", "04 — Two Minds", "05 — The Cast"].map((l) => (
              <span key={l} style={{
                fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "5px 13px", borderRadius: 999,
              }}>
                {l}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <style>{`
          @keyframes mk-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.85)} }
        `}</style>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── SECTION 1 ─────────────────────────────────────────────── */}
          <GuideSection index={1} icon={TrendingUp} iconColor="#f5a623" badge="Section 01" title="What is a Pattern?">
            <motion.p variants={fadeUp} style={prose}>
              Every prediction MK-806 makes has two hidden qualities: how{" "}
              <strong style={hi}>confident</strong> it was, and how much{" "}
              <strong style={hi}>expected value</strong> it spotted in the available odds.
              A <strong style={hi}>pattern</strong> is simply that combination — and each
              one gets a memorable animal name. MK-806 tracks{" "}
              <strong style={hi}>18 distinct patterns</strong> in total.
            </motion.p>

            <motion.div variants={fadeUp}>
              <div style={{ borderRadius: 13, background: "rgba(245,166,35,0.05)", border: "1px solid rgba(245,166,35,0.13)", padding: "15px 17px" }}>
                <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.16em", color: "#4a4a4a", marginBottom: 8 }}>QUICK EXAMPLE</div>
                <p style={{ ...prose, margin: 0 }}>
                  A prediction labeled{" "}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#f5a623", fontWeight: 800 }}>
                    <AnimalIcon animal="Lion" size={16} /> Lion
                  </span>{" "}
                  means MK-806 was highly confident <em>and</em> spotted strong value. Historically these patterns perform well — but nothing is guaranteed.
                </p>
              </div>
            </motion.div>

            <motion.p variants={fadeUp} style={prose}>
              Patterns are <strong style={hi}>not fixed in stone</strong>. One delivering wins for months can start losing — and vice versa. That flexibility keeps the advice honest and grounded in what is actually happening right now.
            </motion.p>

            <motion.div variants={fadeUp}>
              <img
                src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/pta.png"
                alt="Pattern Analyser showing all 18 patterns"
                style={{ width: "100%", borderRadius: 13, border: "1px solid rgba(255,255,255,0.06)", display: "block" }}
              />
              <p style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.18)", textAlign: "center", margin: "8px 0 0", letterSpacing: "0.04em" }}>
                THE PATTERN ANALYSER — ALL 18 PATTERNS AND THEIR LIVE WIN/LOSS RECORDS
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={TrendingUp} color="#22c55e">
                Live performance for every pattern lives on the{" "}
                <Link to="/patterns" style={{ color: "#22c55e", fontWeight: 700 }}>Pattern Analyser page</Link>.
                Green = winning. Red = losing. Numbers update with every settled result.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── SECTION 2 ─────────────────────────────────────────────── */}
          <GuideSection index={2} icon={MessageSquare} iconColor="#3b82f6" badge="Section 02" title="Who is _806?">
            <motion.p variants={fadeUp} style={prose}>
              Tap any prediction — on{" "}
              <Link to="/status" style={{ color: "#f5a623", fontWeight: 600 }}>Active Predictions</Link> or{" "}
              <Link to="/previous" style={{ color: "#f5a623", fontWeight: 600 }}>Previous</Link> — and you'll see a message from{" "}
              <strong style={hi}>_806</strong>, the pattern advisor.
              It is a completely separate entity from MK-806. While MK-806 simulates
              thousands of possible futures, _806 only looks <em>backwards</em> at the track record of the attached pattern.
            </motion.p>

            <motion.div variants={fadeUp}>
              <div style={{ display: "flex", gap: 13, borderRadius: 13, padding: "15px 17px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.13)" }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 900, color: "#fff", fontFamily: "monospace",
                }}>
                  806
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>_806</span>
                    <span style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.1em", background: "rgba(59,130,246,0.14)", color: "#60a5fa", padding: "2px 8px", borderRadius: 999 }}>
                      PATTERN ADVISOR
                    </span>
                  </div>
                  <p style={{ ...prose, fontSize: 13, margin: 0 }}>
                    "Looking back, this prediction falls under the <strong style={{ color: "#fff" }}>Lion</strong> pattern — historically strong, but always subject to change."
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <img
                src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/06.png"
                alt="_806 pattern advisor in prediction popup"
                style={{ width: "100%", borderRadius: 13, border: "1px solid rgba(255,255,255,0.06)", display: "block" }}
              />
              <p style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.18)", textAlign: "center", margin: "8px 0 0", letterSpacing: "0.04em" }}>
                THE PREDICTION POPUP — MK-806'S PICK ALONGSIDE _806'S PATTERN ADVICE
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={AlertCircle} color="#f59e0b">
                Because _806 only uses the past, it can be wrong about the present. If it says a pattern has struggled, that doesn't mean this pick will lose — MK-806 may have spotted something the historical data hasn't caught yet. The decision is always yours.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── SECTION 3 ─────────────────────────────────────────────── */}
          <GuideSection index={3} icon={BarChart2} iconColor="#22c55e" badge="Section 03" title="How to Use Pattern Insights">
            <motion.p variants={fadeUp} style={prose}>
              Pattern advice works best as one ingredient — not the final word. Here's the three-step method:
            </motion.p>

            <motion.div variants={fadeUp}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[
                  { n: "01", title: "Read the message", desc: 'What does _806 say? Winning pattern, losing, or "insufficient data"?', color: "#f5a623" },
                  { n: "02", title: "Check the numbers", desc: "Go to Pattern Analyser — find that animal, check the real win rate and sample size.", color: "#22c55e" },
                  { n: "03", title: "Add your judgment", desc: "Combine pattern data with form, context, and what you know. Trust yourself.", color: "#3b82f6" },
                ].map((s) => (
                  <div key={s.n} style={{ borderRadius: 13, padding: "15px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.055)" }}>
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: s.color, letterSpacing: "0.14em", marginBottom: 9 }}>{s.n}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
                    <p style={{ ...prose, fontSize: 11.5, margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.p variants={fadeUp} style={prose}>
              Patterns with fewer than 5 results are marked{" "}
              <code style={{ fontSize: 11, fontFamily: "monospace", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.68)", padding: "2px 8px", borderRadius: 6 }}>
                INSUFFICIENT DATA
              </code>
              . Treat those as placeholders — there's simply not enough history to draw conclusions.
            </motion.p>

            <motion.div variants={fadeUp}>
              <Callout icon={ShieldCheck} color="#22c55e">
                Patterns never override MK-806's prediction. They exist alongside it — as context, not commands.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── SECTION 4 ─────────────────────────────────────────────── */}
          <GuideSection index={4} icon={Zap} iconColor="#f5a623" badge="Section 04" title="MK-806 vs _806 — Two Minds">
            <motion.p variants={fadeUp} style={prose}>
              Same name. Completely different thinking. Here's the clearest way to tell them apart:
            </motion.p>

            <motion.div variants={fadeUp}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  {
                    id: "MK-806", subtitle: "God of Time", color: "#f5a623",
                    iconEl: <Zap size={15} />,
                    pts: [
                      <><strong style={{ color: "#fff" }}>Looks forward</strong> — simulates thousands of futures</>,
                      <>Decides <strong style={{ color: "#fff" }}>which bet to pick</strong></>,
                      <>Runs every morning before fixtures</>,
                    ],
                  },
                  {
                    id: "_806", subtitle: "The Historian", color: "#3b82f6",
                    iconEl: <span style={{ fontSize: 10, fontWeight: 900, fontFamily: "monospace" }}>806</span>,
                    pts: [
                      <><strong style={{ color: "#fff" }}>Looks backward</strong> — reviews pattern history</>,
                      <>Tracks win/loss across <strong style={{ color: "#fff" }}>all 18 patterns</strong></>,
                      <>Provides <strong style={{ color: "#fff" }}>context</strong>, not predictions</>,
                    ],
                  },
                ].map((side) => (
                  <div key={side.id} style={{ borderRadius: 15, padding: "18px", background: `${side.color}05`, border: `1px solid ${side.color}20` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${side.color}18`, border: `1px solid ${side.color}35`, display: "flex", alignItems: "center", justifyContent: "center", color: side.color }}>
                        {side.iconEl}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{side.id}</div>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: `${side.color}70`, letterSpacing: "0.12em" }}>{side.subtitle}</div>
                      </div>
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      {side.pts.map((pt, i) => (
                        <li key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                          <ArrowRight style={{ width: 11, height: 11, color: side.color, marginTop: 3, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", lineHeight: 1.65 }}>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.p variants={fadeUp} style={prose}>
              When both align — MK-806 picks a bet and _806 confirms the pattern is historically strong — that's your clearest signal. When they diverge, that's also valuable information.
            </motion.p>

            <motion.div variants={fadeUp}>
              <Callout icon={RefreshCw} color="#3b82f6">
                Patterns update daily as predictions resolve. A pattern on a hot streak can shift — that's not a flaw, it's the system being honest about how markets change.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── SECTION 5 — Pattern Animals ────────────────────────────── */}
          <motion.section
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.055)", background: "rgba(255,255,255,0.018)" }}
          >
            <motion.div variants={fadeUp} style={{ padding: "28px 30px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 6 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                  background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.24)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <TrendingUp style={{ color: "#f5a623", width: 19, height: 19 }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: "#3a3a3a", marginBottom: 3 }}>SECTION 05</div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "'Georgia',serif", letterSpacing: "-0.01em" }}>
                    Pattern Animals — Meet the Cast
                  </h2>
                </div>
              </div>

              <p style={{ ...prose, marginBottom: 22 }}>
                All 18 patterns, each with its own animal identity.{" "}
                <strong style={{ color: "rgba(255,255,255,0.6)" }}>Tap any card</strong> for a full breakdown —
                photo, tier, confidence, expected value, and description.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(198px, 1fr))", gap: 13 }}>
                {PATTERN_ANIMALS.map((pa, i) => (
                  <AnimalCard key={pa.animal} pa={pa} index={i} onClick={() => setSelected(pa)} />
                ))}
              </div>

              <p style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: 22, letterSpacing: "0.06em" }}>
                LIVE PERFORMANCE ON THE{" "}
                <Link to="/patterns" style={{ color: "#f5a623", fontWeight: 800, textDecoration: "none" }}>PATTERN ANALYSER</Link>.
                PATTERNS EVOLVE — CHECK BACK REGULARLY.
              </p>
            </motion.div>
          </motion.section>

          {/* ── DISCLAIMER ─────────────────────────────────────────────── */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ borderRadius: 20, border: "1px solid rgba(239,68,68,0.13)", background: "rgba(239,68,68,0.025)", padding: "24px 28px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
              <AlertCircle style={{ width: 17, height: 17, color: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "'Georgia',serif" }}>A reminder</span>
            </div>
            <p style={{ ...prose, fontSize: 13 }}>
              10 Odds is for informational purposes only. Neither MK-806 nor _806 constitutes financial or betting advice. Patterns reflect past performance, which does not guarantee future results. Always bet responsibly — only stake what you can afford to lose, and make your own decisions.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 16 }}>
              {[["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"], ["About 10 Odds", "/about"]].map(([l, to]) => (
                <Link key={to} to={to} style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.07em", color: "#f5a623", textDecoration: "none", fontWeight: 700 }}>
                  {l} →
                </Link>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </Layout>
  );
};

export default GuidePage;