import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useCallback } from "react";
import {
  Zap, MessageSquare, TrendingUp, AlertCircle,
  BarChart2, ArrowRight, RefreshCw, ShieldCheck, X, ChevronRight,
} from "lucide-react";
import Layout from "@/components/Layout";
import { PATTERN_ANIMALS } from "@/lib/patternAnimals";
import AnimalIcon from "@/components/AnimalIcon";

type PatternAnimal = (typeof PATTERN_ANIMALS)[number];

// ─── Animal images (same high‑quality set) ────────────────────────────────────
const ANIMAL_IMG: Record<string, string> = {
  Lion:     "https://images.pexels.com/photos/36714661/pexels-photo-36714661.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Eagle:    "https://images.pexels.com/photos/29186242/pexels-photo-29186242.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Bear:     "https://images.pexels.com/photos/162368/bear-zoo-wildlife-animal-162368.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Bull:     "https://images.pexels.com/photos/28410820/pexels-photo-28410820.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Horse:    "https://images.pexels.com/photos/13340069/pexels-photo-13340069.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Rhino:    "https://images.pexels.com/photos/6156855/pexels-photo-6156855.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Fox:      "https://images.pexels.com/photos/35192767/pexels-photo-35192767.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Owl:      "https://images.pexels.com/photos/17404870/pexels-photo-17404870.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Squirrel: "https://images.pexels.com/photos/34613710/pexels-photo-34613710.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Deer:     "https://images.pexels.com/photos/18149113/pexels-photo-18149113.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Frog:     "https://images.pexels.com/photos/8465220/pexels-photo-8465220.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Mole:     "https://images.pexels.com/photos/88512/mole-nature-animals-molehills-88512.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Rabbit:   "https://images.pexels.com/photos/6546550/pexels-photo-6546550.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Hamster:  "https://images.pexels.com/photos/4520484/pexels-photo-4520484.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Turtle:   "https://images.pexels.com/photos/38452/pexels-photo-38452.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Mouse:    "https://images.pexels.com/photos/301448/pexels-photo-301448.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Ant:      "https://images.pexels.com/photos/36498258/pexels-photo-36498258.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Worm:     "https://cdn.pixabay.com/photo/2019/06/08/22/46/fishing-4261191_1280.jpg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
};

// ─── Tier classification ──────────────────────────────────────────────────────
function getTier(pa: PatternAnimal) {
  const c = (pa.confidence ?? "").toLowerCase();
  const e = (pa.evType ?? "").toLowerCase();
  const hiC = c.includes("high");
  const hiE = e.includes("high") || e.includes("positive");
  const loC = c.includes("low");
  const loE = e.includes("low") || e.includes("negative");
  if (hiC && hiE) return { label: "ELITE",    color: "#f5a623", dim: "rgba(245,166,35,0.15)",  ring: "rgba(245,166,35,0.35)" };
  if (hiC)        return { label: "STRONG",   color: "#22c55e", dim: "rgba(34,197,94,0.12)",   ring: "rgba(34,197,94,0.32)" };
  if (hiE)        return { label: "VALUE",    color: "#3b82f6", dim: "rgba(59,130,246,0.12)",  ring: "rgba(59,130,246,0.32)" };
  if (loC && loE) return { label: "WEAK",     color: "#ef4444", dim: "rgba(239,68,68,0.12)",   ring: "rgba(239,68,68,0.3)" };
  return                  { label: "MODERATE",color: "#a855f7", dim: "rgba(168,85,247,0.12)",  ring: "rgba(168,85,247,0.3)" };
}

const EASE: number[] = [0.16, 1, 0.3, 1];
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// ─── Modal ────────────────────────────────────────────────────────────────────
function AnimalModal({ pa, onClose }: { pa: PatternAnimal | null; onClose: () => void }) {
  if (!pa) return null;
  const tier = getTier(pa);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/92 backdrop-blur-xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 24 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="relative z-10 w-full max-w-[760px] rounded-3xl overflow-hidden flex flex-col md:flex-row"
          style={{
            background: "#0a0a0d",
            border: `1px solid ${tier.ring}`,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.7), 0 0 80px ${tier.dim}`,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Left photo */}
          <div className="relative w-full md:w-5/12 min-h-[260px] md:min-h-[460px] overflow-hidden bg-gray-950">
            <img
              src={ANIMAL_IMG[pa.animal] ?? ANIMAL_IMG.Fox}
              alt={pa.animal}
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 45%, #0a0a0d 100%), linear-gradient(to top, #0a0a0d 0%, transparent 50%)" }} />
            <div className="absolute top-4 left-4">
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black font-mono tracking-[0.15em] text-black" style={{ background: tier.color }}>
                {tier.label}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-[9px] font-mono tracking-[0.2em] uppercase mb-1" style={{ color: tier.color }}>{pa.originalLabel}</p>
              <h2 className="text-[2.2rem] font-black text-white leading-none" style={{ fontFamily: "Georgia, serif", textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
                The {pa.animal}
              </h2>
            </div>
          </div>
          {/* Right info */}
          <div className="relative flex-1 p-6 md:p-7 flex flex-col bg-[#0a0a0d]">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 hover:text-white transition-all hover:border-white/30"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
            >
              <X size={14} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: tier.dim, borderColor: tier.ring }}>
                <AnimalIcon animal={pa.animal} size={20} style={{ color: tier.color }} />
              </div>
              <div>
                <p className="text-base font-black text-white" style={{ fontFamily: "Georgia, serif" }}>The {pa.animal}</p>
                <p className="text-[10px] font-mono text-gray-600 mt-0.5">Pattern {PATTERN_ANIMALS.indexOf(pa) + 1} of {PATTERN_ANIMALS.length}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "CONFIDENCE", value: pa.confidence },
                { label: "EXP. VALUE", value: pa.evType },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 border" style={{ background: `${tier.color}08`, borderColor: `${tier.color}22` }}>
                  <p className="text-[9px] font-mono tracking-widest text-gray-600 mb-1">{s.label}</p>
                  <p className="text-sm font-bold" style={{ color: tier.color }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="h-px mb-4" style={{ background: "rgba(255,255,255,0.05)" }} />
            <p className="text-sm leading-relaxed text-gray-400 flex-1">{pa.description}</p>
            <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[9px] font-mono tracking-widest text-gray-700">UPDATED DAILY</span>
              <Link
                to="/patterns"
                onClick={onClose}
                className="text-[11px] font-bold font-mono tracking-wide flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                style={{ color: tier.color }}
              >
                VIEW ANALYSER <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Animal card (exactly the same design as before but with refined shadows) ──
function AnimalCard({ pa, index, onClick }: { pa: PatternAnimal; index: number; onClick: () => void }) {
  const tier = getTier(pa);
  const img  = ANIMAL_IMG[pa.animal];
  const [hover, setHover] = useState(false);

  return (
    <motion.button
      variants={fadeUp}
      custom={index}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-2xl overflow-hidden cursor-pointer text-left w-full"
      style={{
        background: "#111116",
        border: hover ? `1px solid ${tier.ring}` : "1px solid rgba(255,255,255,0.06)",
        boxShadow: hover ? `0 16px 40px rgba(0,0,0,0.5), 0 0 24px ${tier.dim}` : "none",
        transition: "border 0.25s, box-shadow 0.25s",
      }}
    >
      <div className="relative h-28 overflow-hidden bg-gray-950">
        {img ? (
          <img
            src={img}
            alt={pa.animal}
            loading="lazy"
            className="w-full h-full object-cover object-center"
            style={{ transform: hover ? "scale(1.1)" : "scale(1)", transition: "transform 0.6s ease" }}
            onError={(e) => (e.currentTarget.style.opacity = "0")}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <AnimalIcon animal={pa.animal} size={38} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #111116 0%, transparent 55%)" }} />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-black font-mono tracking-widest text-black" style={{ background: tier.color }}>
          {tier.label}
        </div>
        <div className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center border" style={{ background: "rgba(0,0,0,0.6)", borderColor: tier.ring }}>
          <AnimalIcon animal={pa.animal} size={12} style={{ color: tier.color }} />
        </div>
      </div>
      <div className="p-3">
        <p className="text-[14px] font-bold text-white leading-tight mb-0.5" style={{ fontFamily: "Georgia, serif" }}>{pa.animal}</p>
        <p className="text-[9px] font-mono tracking-widest text-gray-700 mb-2">{pa.originalLabel}</p>
        <div className="flex gap-1 mb-2 flex-wrap">
          <span className="text-[8px] font-mono bg-white/5 border border-white/8 px-1.5 py-0.5 rounded text-gray-500">{pa.confidence}</span>
          <span className="text-[8px] font-mono bg-white/5 border border-white/8 px-1.5 py-0.5 rounded text-gray-500">{pa.evType}</span>
        </div>
        <p className="text-[10px] leading-relaxed text-gray-600 line-clamp-2">{pa.description}</p>
        <div className="mt-2 text-[10px] font-bold font-mono tracking-wide flex items-center gap-1" style={{ color: tier.color, opacity: hover ? 1 : 0, transition: "opacity 0.2s" }}>
          EXPAND <ArrowRight size={10} />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Section wrapper with decorative left bar + watermark ─────────────────────
function GuideSection({
  num, icon: Icon, iconColor, badge, title, children,
}: {
  num: string; icon: React.ElementType; iconColor: string;
  badge: string; title: string; children: React.ReactNode;
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={stagger}
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: "linear-gradient(160deg, #0f0f14 0%, #0a0a0d 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 4px 40px rgba(0,0,0,0.3)",
      }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-8 bottom-8 w-[3px] rounded-full" style={{ background: `linear-gradient(to bottom, transparent, ${iconColor}, transparent)` }} />
      {/* Watermark number */}
      <div
        className="absolute top-4 right-6 text-[5rem] font-black font-mono leading-none select-none pointer-events-none"
        style={{ color: "rgba(255,255,255,0.02)" }}
      >
        {num}
      </div>

      <div className="p-6 md:p-8">
        <motion.div variants={fadeUp} className="flex items-center gap-4 mb-7">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${iconColor}14`, border: `1px solid ${iconColor}30` }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <div>
            <p className="text-[9px] font-mono tracking-[0.22em] uppercase mb-1.5" style={{ color: iconColor }}>{badge}</p>
            <h2 className="text-lg md:text-xl font-black text-white leading-tight" style={{ fontFamily: "Georgia, serif" }}>{title}</h2>
          </div>
        </motion.div>

        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </motion.section>
  );
}

// ─── Callout box ──────────────────────────────────────────────────────────────
function Callout({ icon: Icon, color, children }: { icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <div
      className="flex gap-3 rounded-2xl p-4"
      style={{ background: `${color}0d`, border: `1px solid ${color}28` }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}18` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: `${color}cc` }}>{children}</p>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({ num, title, desc, color }: { num: string; title: string; desc: string; color: string }) {
  return (
    <div className="relative rounded-2xl p-4 overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-[2.5rem] font-black font-mono leading-none mb-3 select-none" style={{ color: `${color}30` }}>{num}</div>
      <p className="text-[10px] font-mono tracking-widest mb-1.5" style={{ color }}>{title.toUpperCase()}</p>
      <p className="text-xs leading-relaxed text-gray-500">{desc}</p>
    </div>
  );
}

// ─── Table of contents pill ───────────────────────────────────────────────────
function TocPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wide text-gray-500 bg-white/[0.04] border border-white/8 px-3 py-1.5 rounded-full">
      <ChevronRight size={10} className="text-gray-700" />
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const GuidePage = () => {
  const [selected, setSelected] = useState<PatternAnimal | null>(null);
  const close = useCallback(() => setSelected(null), []);

  return (
    <Layout>
      <AnimalModal pa={selected} onClose={close} />

      <div className="relative min-h-screen" style={{ background: "#080810" }}>
        {/* Subtle radial glow at top */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] opacity-30" style={{ background: "radial-gradient(ellipse at center top, rgba(245,166,35,0.12) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-16">

          {/* ── HERO ─────────────────────────────────────────────────────────── */}
          <motion.div initial="hidden" animate="visible" variants={stagger} className="mb-14">
            <motion.div variants={fadeUp} className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-amber-400 bg-amber-400/8 border border-amber-400/20 px-4 py-2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Beginner's Field Guide
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-center text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-5"
              style={{ fontFamily: "Georgia, serif" }}
            >
              How to Read{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
                MK-806
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-center text-base md:text-lg text-gray-500 max-w-xl mx-auto mb-8 leading-relaxed">
              Plain‑English patterns, predictions, and what <strong className="text-gray-300 font-semibold">_806</strong> is actually telling you. No jargon. No maths. Just the good stuff.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2">
              {[
                "01 — What is a Pattern",
                "02 — Who is _806",
                "03 — How to Use Insights",
                "04 — Two Minds",
                "05 — The Cast",
              ].map(l => <TocPill key={l} label={l} />)}
            </motion.div>
            <motion.div variants={fadeUp} className="mt-10 flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08))" }} />
              <span className="text-[9px] font-mono tracking-widest text-gray-700">START READING</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(255,255,255,0.08))" }} />
            </motion.div>
          </motion.div>

          {/* ── SECTIONS ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* SECTION 01 */}
            <GuideSection num="01" icon={TrendingUp} iconColor="#f5a623" badge="Section 01" title="What is a Pattern?">
              <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
                Every prediction MK‑806 makes carries two hidden qualities: how <strong className="text-white/85 font-semibold">confident</strong> it was, and how much <strong className="text-white/85 font-semibold">expected value</strong> it spotted in the odds. A <strong className="text-white/85 font-semibold">pattern</strong> is simply that combination — and each one gets a memorable animal name. MK‑806 tracks <strong className="text-white/85 font-semibold">18 distinct patterns</strong> in total.
              </motion.p>

              <motion.div variants={fadeUp}>
                <div className="rounded-2xl p-5" style={{ background: "rgba(245,166,35,0.05)", border: "1px solid rgba(245,166,35,0.14)" }}>
                  <p className="text-[9px] font-mono tracking-[0.18em] text-amber-600/70 mb-3">QUICK EXAMPLE</p>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
                      <AnimalIcon animal="Lion" size={18} style={{ color: "#f5a623" }} />
                    </div>
                    <p className="text-sm leading-relaxed text-gray-400">
                      A prediction labeled <strong className="text-amber-400">Lion</strong> means MK‑806 was highly confident <em>and</em> spotted strong value. Historically these patterns perform well — but nothing is guaranteed.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
                Patterns are <strong className="text-white/85 font-semibold">not fixed in stone</strong>. One delivering wins for months can start losing — and vice versa. That flexibility keeps the advice honest and grounded in what is actually happening right now.
              </motion.p>

              <motion.div variants={fadeUp}>
                <img
                  src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/pta.png"
                  alt="Pattern Analyser"
                  className="w-full rounded-2xl border border-white/10"
                />
                <p className="text-[9px] font-mono text-gray-700 text-center mt-2.5 tracking-widest">THE PATTERN ANALYSER — ALL 18 PATTERNS AND THEIR LIVE WIN/LOSS RECORDS</p>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Callout icon={TrendingUp} color="#22c55e">
                  Live performance for every pattern lives on the{" "}
                  <Link to="/patterns" className="font-bold underline text-emerald-400">Pattern Analyser page</Link>. Green = winning. Red = losing. Numbers update with every settled result.
                </Callout>
              </motion.div>
            </GuideSection>

            {/* SECTION 02 */}
            <GuideSection num="02" icon={MessageSquare} iconColor="#3b82f6" badge="Section 02" title="Who is _806?">
              <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
                Tap any prediction — on{" "}
                <Link to="/status" className="text-amber-400 font-semibold underline">Active Predictions</Link> or{" "}
                <Link to="/previous" className="text-amber-400 font-semibold underline">Previous</Link> — and you'll see a message from <strong className="text-white/85 font-semibold">_806</strong>, the pattern advisor. It is a completely separate entity from MK‑806. While MK‑806 simulates thousands of possible futures, _806 only looks <em>backwards</em> at the track record of the attached pattern.
              </motion.p>

              <motion.div variants={fadeUp}>
                <div className="rounded-2xl p-5" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black font-mono shrink-0" style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                      806
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>_806</span>
                        <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>PATTERN ADVISOR</span>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-400">
                        "Looking back, this prediction falls under the <strong className="text-white">Lion</strong> pattern — historically strong, but always subject to change."
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <img
                  src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/06.png"
                  alt="_806 popup"
                  className="w-full rounded-2xl border border-white/10"
                />
                <p className="text-[9px] font-mono text-gray-700 text-center mt-2.5 tracking-widest">THE PREDICTION POPUP — MK‑806'S PICK ALONGSIDE _806'S PATTERN ADVICE</p>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Callout icon={AlertCircle} color="#f59e0b">
                  Because _806 only uses the past, it can be wrong about the present. If it says a pattern has struggled, that doesn't mean this pick will lose — MK‑806 may have spotted something the historical data hasn't caught yet. The decision is always yours.
                </Callout>
              </motion.div>
            </GuideSection>

            {/* SECTION 03 */}
            <GuideSection num="03" icon={BarChart2} iconColor="#22c55e" badge="Section 03" title="How to Use Pattern Insights">
              <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
                Pattern advice works best as one ingredient — not the final word. Here's the three‑step method:
              </motion.p>

              <motion.div variants={fadeUp}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StepCard num="01" title="Read the message" desc='What does _806 say? Winning pattern, losing, or "insufficient data"?' color="#f5a623" />
                  <StepCard num="02" title="Check the numbers" desc="Go to Pattern Analyser — find that animal, check the real win rate and sample size." color="#22c55e" />
                  <StepCard num="03" title="Add your judgment" desc="Combine pattern data with form, context, and what you know. Trust yourself." color="#3b82f6" />
                </div>
              </motion.div>

              <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
                Patterns with fewer than 5 results are marked{" "}
                <code className="text-xs font-mono px-1.5 py-0.5 rounded-lg text-gray-300 bg-white/10 border border-white/10">
                  INSUFFICIENT DATA
                </code>
                . Treat those as placeholders — there's simply not enough history to draw conclusions.
              </motion.p>

              <motion.div variants={fadeUp}>
                <Callout icon={ShieldCheck} color="#22c55e">
                  Patterns never override MK‑806's prediction. They exist alongside it — as context, not commands.
                </Callout>
              </motion.div>
            </GuideSection>

            {/* SECTION 04 */}
            <GuideSection num="04" icon={Zap} iconColor="#f5a623" badge="Section 04" title="MK‑806 vs _806 — Two Minds">
              <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
                Same name. Completely different thinking. Here's the clearest way to tell them apart:
              </motion.p>

              <motion.div variants={fadeUp}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: "MK‑806", subtitle: "God of Time", color: "#f5a623",
                      icon: <Zap size={15} />,
                      pts: [
                        <><strong className="text-white">Looks forward</strong> — simulates thousands of futures</>,
                        <>Decides <strong className="text-white">which bet to pick</strong></>,
                        <>Runs every morning before fixtures</>,
                      ],
                    },
                    {
                      id: "_806", subtitle: "The Historian", color: "#3b82f6",
                      icon: <span className="text-[10px] font-black font-mono">806</span>,
                      pts: [
                        <><strong className="text-white">Looks backward</strong> — reviews pattern history</>,
                        <>Tracks win/loss across <strong className="text-white">all 18 patterns</strong></>,
                        <>Provides <strong className="text-white">context</strong>, not predictions</>,
                      ],
                    },
                  ].map(side => (
                    <div
                      key={side.id}
                      className="rounded-2xl p-5"
                      style={{ background: `${side.color}06`, border: `1px solid ${side.color}22` }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: `${side.color}18`, borderColor: `${side.color}35`, color: side.color }}>
                          {side.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{side.id}</p>
                          <p className="text-[9px] font-mono tracking-widest opacity-70" style={{ color: side.color }}>{side.subtitle}</p>
                        </div>
                      </div>
                      <ul className="space-y-2.5">
                        {side.pts.map((pt, i) => (
                          <li key={i} className="flex gap-2 items-start">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: side.color }} />
                            <span className="text-xs text-gray-400 leading-relaxed">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
                When both align — MK‑806 picks a bet and _806 confirms the pattern is historically strong — that's your clearest signal. When they diverge, that's also valuable information.
              </motion.p>

              <motion.div variants={fadeUp}>
                <Callout icon={RefreshCw} color="#3b82f6">
                  Patterns update daily as predictions resolve. A pattern on a hot streak can shift — that's not a flaw, it's the system being honest about how markets change.
                </Callout>
              </motion.div>
            </GuideSection>

            {/* SECTION 05 — Animal Cast */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={stagger}
              className="relative overflow-hidden rounded-3xl"
              style={{
                background: "linear-gradient(160deg, #0f0f14 0%, #0a0a0d 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="absolute left-0 top-8 bottom-8 w-[3px] rounded-full" style={{ background: "linear-gradient(to bottom, transparent, #f5a623, transparent)" }} />
              <div className="absolute top-4 right-6 text-[5rem] font-black font-mono leading-none select-none pointer-events-none" style={{ color: "rgba(255,255,255,0.02)" }}>05</div>

              <div className="p-6 md:p-8">
                <motion.div variants={fadeUp} className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.28)" }}>
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono tracking-[0.22em] uppercase mb-1.5 text-amber-500">Section 05</p>
                    <h2 className="text-lg md:text-xl font-black text-white leading-tight" style={{ fontFamily: "Georgia, serif" }}>Pattern Animals — Meet the Cast</h2>
                  </div>
                </motion.div>

                <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400 mb-6">
                  All 18 patterns, each with its own animal identity. <strong className="text-gray-300">Tap any card</strong> for a full breakdown — photo, tier, confidence, expected value, and description.
                </motion.p>

                <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {PATTERN_ANIMALS.map((pa, i) => (
                    <AnimalCard key={pa.animal} pa={pa} index={i} onClick={() => setSelected(pa)} />
                  ))}
                </motion.div>

                <motion.p variants={fadeUp} className="text-[9px] font-mono text-gray-700 text-center mt-6 tracking-widest">
                  LIVE PERFORMANCE ON THE{" "}
                  <Link to="/patterns" className="text-amber-400 font-bold underline">PATTERN ANALYSER</Link>. PATTERNS EVOLVE — CHECK BACK REGULARLY.
                </motion.p>
              </div>
            </motion.section>

            {/* ── DISCLAIMER ─────────────────────────────────────────────────── */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-3xl p-6"
              style={{
                background: "linear-gradient(135deg, rgba(239,68,68,0.04) 0%, rgba(239,68,68,0.02) 100%)",
                border: "1px solid rgba(239,68,68,0.14)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-sm font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>A reminder</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                10 Odds is for informational purposes only. Neither MK‑806 nor _806 constitutes financial or betting advice. Patterns reflect past performance, which does not guarantee future results. Always bet responsibly — only stake what you can afford to lose, and make your own decisions.
              </p>
              <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: "1px solid rgba(239,68,68,0.1)" }}>
                {[["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"], ["About 10 Odds", "/about"]].map(([l, to]) => (
                  <Link key={to} to={to} className="text-[10px] font-mono font-bold tracking-wide text-amber-400 hover:opacity-70 transition-opacity flex items-center gap-1">
                    {l} <ArrowRight size={10} />
                  </Link>
                ))}
              </div>
            </motion.div>

          </div>{/* end sections */}
        </div>{/* end container */}
      </div>{/* end page */}
    </Layout>
  );
};

export default GuidePage;