import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useCallback, useRef } from "react";
import {
  Zap, MessageSquare, TrendingUp, AlertCircle, BarChart2, ArrowRight,
  RefreshCw, ShieldCheck, X, ChevronRight, Sparkles, Sun, Moon, Brain, Database, Target,
} from "lucide-react";
import AnimalIcon from "@/components/AnimalIcon";
import { PATTERN_ANIMALS } from "@/lib/patternAnimals";   
import Layout from "@/components/Layout";

type PatternAnimal = (typeof PATTERN_ANIMALS)[number];

// ─── Correct animal images (the ones we already know work) ────────────────────
const ANIMAL_IMG: Record<string, string> = {
  Lion:     "https://images.pexels.com/photos/36714661/pexels-photo-36714661.jpeg?auto=compress&cs=tinysrgb&w=800",
  Eagle:    "https://images.pexels.com/photos/29186242/pexels-photo-29186242.jpeg?auto=compress&cs=tinysrgb&w=800",
  Bear:     "https://images.pexels.com/photos/162368/bear-zoo-wildlife-animal-162368.jpeg?auto=compress&cs=tinysrgb&w=800",
  Bull:     "https://images.pexels.com/photos/28410820/pexels-photo-28410820.jpeg?auto=compress&cs=tinysrgb&w=800",
  Horse:    "https://images.pexels.com/photos/13340069/pexels-photo-13340069.jpeg?auto=compress&cs=tinysrgb&w=800",
  Rhino:    "https://images.pexels.com/photos/6156855/pexels-photo-6156855.jpeg?auto=compress&cs=tinysrgb&w=800",
  Fox:      "https://images.pexels.com/photos/35192767/pexels-photo-35192767.jpeg?auto=compress&cs=tinysrgb&w=800",
  Owl:      "https://images.pexels.com/photos/17404870/pexels-photo-17404870.jpeg?auto=compress&cs=tinysrgb&w=800",
  Squirrel: "https://images.pexels.com/photos/34613710/pexels-photo-34613710.jpeg?auto=compress&cs=tinysrgb&w=800",
  Deer:     "https://images.pexels.com/photos/18149113/pexels-photo-18149113.jpeg?auto=compress&cs=tinysrgb&w=800",
  Frog:     "https://images.pexels.com/photos/8465220/pexels-photo-8465220.jpeg?auto=compress&cs=tinysrgb&w=800",
  Mole:     "https://images.pexels.com/photos/88512/mole-nature-animals-molehills-88512.jpeg?auto=compress&cs=tinysrgb&w=800",
  Rabbit:   "https://images.pexels.com/photos/6546550/pexels-photo-6546550.jpeg?auto=compress&cs=tinysrgb&w=800",
  Hamster:  "https://images.pexels.com/photos/4520484/pexels-photo-4520484.jpeg?auto=compress&cs=tinysrgb&w=800",
  Turtle:   "https://images.pexels.com/photos/38452/pexels-photo-38452.jpeg?auto=compress&cs=tinysrgb&w=800",
  Mouse:    "https://images.pexels.com/photos/301448/pexels-photo-301448.jpeg?auto=compress&cs=tinysrgb&w=800",
  Ant:      "https://images.pexels.com/photos/36498258/pexels-photo-36498258.jpeg?auto=compress&cs=tinysrgb&w=800",
  Worm:     "https://cdn.pixabay.com/photo/2019/06/08/22/46/fishing-4261191_1280.jpg",
};

// ─── Tier classification (unchanged) ────────────────────────────────────────
function getTier(pa: PatternAnimal) {
  const c = pa.confidence.toLowerCase();
  const e = pa.evType.toLowerCase();
  const hiC = c.includes("high"), hiE = e.includes("high") || e.includes("positive");
  const loC = c.includes("low"),  loE = e.includes("low") || e.includes("negative");
  if (hiC && hiE) return { label: "ELITE",    color: "#f5a623", dim: "rgba(245,166,35,0.15)", ring: "rgba(245,166,35,0.4)" };
  if (hiC)        return { label: "STRONG",   color: "#34d399", dim: "rgba(52,211,153,0.12)", ring: "rgba(52,211,153,0.35)" };
  if (hiE)        return { label: "VALUE",    color: "#60a5fa", dim: "rgba(96,165,250,0.12)", ring: "rgba(96,165,250,0.35)" };
  if (loC && loE) return { label: "WEAK",     color: "#f87171", dim: "rgba(248,113,113,0.12)", ring: "rgba(248,113,113,0.32)" };
  return            { label: "MODERATE", color: "#c084fc", dim: "rgba(192,132,252,0.12)", ring: "rgba(192,132,252,0.32)" };
}

const EASE = [0.16, 1, 0.3, 1] as const;
const fadeUp = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

const CHAPTERS = [
  { num: "01", title: "What is a Pattern", id: "ch-01" },
  { num: "02", title: "Who is _806", id: "ch-02" },
  { num: "03", title: "Using Insights", id: "ch-03" },
  { num: "04", title: "Two Minds", id: "ch-04" },
  { num: "05", title: "The Cast", id: "ch-05" },
];

// ─── Modal ───────────────────────────────────────────────────────────────────
function AnimalModal({ pa, onClose }: { pa: PatternAnimal | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {pa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }} onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="relative z-10 w-full max-w-[820px] rounded-[28px] overflow-hidden flex flex-col md:flex-row"
            style={{
              background: "#0a0a0d",
              border: `1px solid ${getTier(pa).ring}`,
              boxShadow: `0 50px 100px rgba(0,0,0,0.8), 0 0 120px ${getTier(pa).dim}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <ModalBody pa={pa} onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ModalBody({ pa, onClose }: { pa: PatternAnimal; onClose: () => void }) {
  const tier = getTier(pa);
  return (
    <>
      <div className="relative w-full md:w-1/2 min-h-[300px] md:min-h-[520px] overflow-hidden bg-zinc-950">
        <img src={ANIMAL_IMG[pa.animal] ?? ANIMAL_IMG.Lion} alt={pa.animal} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, transparent 40%, #0a0a0d 100%), linear-gradient(to top, #0a0a0d 0%, transparent 45%)" }} />
        <div className="absolute top-5 left-5">
          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-[0.18em] text-black" style={{ background: tier.color, fontFamily: "ui-monospace, monospace" }}>
            {tier.label}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-7">
          <p className="text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: tier.color, fontFamily: "ui-monospace, monospace" }}>{pa.originalLabel}</p>
          <h2 className="text-5xl md:text-6xl font-black text-white leading-[0.9] tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            The<br />{pa.animal}
          </h2>
        </div>
      </div>
      <div className="relative flex-1 p-7 md:p-8 flex flex-col">
        <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/30 transition">
          <X size={15} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center border" style={{ background: tier.dim, borderColor: tier.ring }}>
            <AnimalIcon animal={pa.animal} size={20} style={{ color: tier.color }} />
          </div>
          <div>
            <p className="text-[11px] tracking-[0.2em] text-zinc-500" style={{ fontFamily: "ui-monospace, monospace" }}>PATTERN {PATTERN_ANIMALS.indexOf(pa) + 1} / {PATTERN_ANIMALS.length}</p>
            <p className="text-base font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>The {pa.animal}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[{ label: "CONFIDENCE", value: pa.confidence }, { label: "EXP. VALUE", value: pa.evType }].map(s => (
            <div key={s.label} className="rounded-2xl p-3.5 border" style={{ background: `${tier.color}0a`, borderColor: `${tier.color}25` }}>
              <p className="text-[9px] tracking-[0.2em] text-zinc-500 mb-1.5" style={{ fontFamily: "ui-monospace, monospace" }}>{s.label}</p>
              <p className="text-sm font-bold" style={{ color: tier.color }}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="h-px bg-white/5 mb-5" />
        <p className="text-[15px] leading-relaxed text-zinc-400 flex-1">{pa.description}</p>
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] tracking-[0.22em] text-zinc-600" style={{ fontFamily: "ui-monospace, monospace" }}>UPDATED DAILY</span>
          <button onClick={onClose} className="text-[11px] font-bold tracking-wide flex items-center gap-1.5 hover:opacity-70 transition" style={{ color: tier.color, fontFamily: "ui-monospace, monospace" }}>
            VIEW ANALYSER <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Animal card (all data now from official library) ─────────────────────────
function AnimalCard({ pa, index, onClick }: { pa: PatternAnimal; index: number; onClick: () => void }) {
  const tier = getTier(pa);
  const [hover, setHover] = useState(false);

  return (
    <motion.button
      variants={fadeUp} custom={index}
      whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="group relative rounded-2xl overflow-hidden cursor-pointer text-left w-full"
      style={{
        background: "#101015",
        border: `1px solid ${hover ? tier.ring : "rgba(255,255,255,0.06)"}`,
        boxShadow: hover ? `0 20px 50px rgba(0,0,0,0.55), 0 0 40px ${tier.dim}` : "0 1px 0 rgba(255,255,255,0.02) inset",
        transition: "border-color .3s, box-shadow .3s",
      }}
    >
      <div className="relative h-36 overflow-hidden bg-zinc-950">
        <img src={ANIMAL_IMG[pa.animal] ?? ANIMAL_IMG.Lion} alt={pa.animal} loading="lazy"
          className="w-full h-full object-cover transition-transform duration-[900ms]"
          style={{ transform: hover ? "scale(1.12)" : "scale(1.02)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #101015 5%, rgba(16,16,21,0.2) 50%, transparent 80%)" }} />
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-[0.18em] text-black" style={{ background: tier.color, fontFamily: "ui-monospace, monospace" }}>
          {tier.label}
        </div>
        <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center border backdrop-blur" style={{ background: "rgba(0,0,0,0.55)", borderColor: tier.ring }}>
          <AnimalIcon animal={pa.animal} size={13} style={{ color: tier.color }} />
        </div>
      </div>
      <div className="p-4">
        <p className="text-lg font-bold text-white leading-none mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{pa.animal}</p>
        <p className="text-[9px] tracking-[0.22em] text-zinc-600 mb-3" style={{ fontFamily: "ui-monospace, monospace" }}>{pa.originalLabel}</p>
        <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-2 mb-3">{pa.description}</p>
        <div className="text-[10px] font-bold tracking-wider flex items-center gap-1.5"
          style={{ color: tier.color, opacity: hover ? 1 : 0.5, fontFamily: "ui-monospace, monospace", transition: "opacity .25s" }}>
          OPEN PROFILE <ArrowRight size={10} />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Chapter({ id, num, icon: Icon, color, kicker, title, children }: {
  id: string; num: string; icon: React.ElementType; color: string;
  kicker: string; title: string; children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
      className="relative scroll-mt-24"
    >
      <motion.div variants={fadeUp} className="grid grid-cols-12 gap-6 mb-10 items-end">
        <div className="col-span-12 md:col-span-3">
          <div className="text-[7rem] md:text-[9rem] font-black leading-[0.85] tracking-tighter select-none"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              background: `linear-gradient(180deg, ${color} 0%, transparent 130%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              opacity: 0.9,
            }}>
            {num}
          </div>
        </div>
        <div className="col-span-12 md:col-span-9">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: `${color}14`, borderColor: `${color}33` }}>
              <Icon className="w-4.5 h-4.5" style={{ color }} />
            </div>
            <span className="text-[10px] tracking-[0.28em] uppercase" style={{ color, fontFamily: "ui-monospace, monospace" }}>{kicker}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.05] tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {title}
          </h2>
        </div>
      </motion.div>
      <div className="grid grid-cols-12 gap-6">
        <div className="hidden md:block col-span-3">
          <div className="sticky top-24 h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${color}55, transparent)` }} />
        </div>
        <div className="col-span-12 md:col-span-9 flex flex-col gap-6">{children}</div>
      </div>
    </motion.section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <motion.p variants={fadeUp} className="text-base md:text-[17px] leading-[1.75] text-zinc-400">{children}</motion.p>;
}

function Callout({ icon: Icon, color, children }: { icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="flex gap-4 rounded-2xl p-5"
      style={{ background: `${color}0a`, border: `1px solid ${color}28` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}1a` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-[14px] md:text-[15px] leading-relaxed pt-1" style={{ color: `${color}d0` }}>{children}</p>
    </motion.div>
  );
}

function StepCard({ num, title, desc, color }: { num: string; title: string; desc: string; color: string }) {
  return (
    <motion.div variants={fadeUp} className="relative rounded-2xl p-5 overflow-hidden border border-white/[0.07] bg-white/[0.025]">
      <div className="text-[3rem] font-black leading-none mb-3 select-none" style={{ color: `${color}33`, fontFamily: "'Playfair Display', Georgia, serif" }}>{num}</div>
      <p className="text-[10px] tracking-[0.22em] mb-2" style={{ color, fontFamily: "ui-monospace, monospace" }}>{title.toUpperCase()}</p>
      <p className="text-[13px] leading-relaxed text-zinc-500">{desc}</p>
    </motion.div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
const GuidePage = () => {
  const [selected, setSelected] = useState<PatternAnimal | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");  // default light theme, can be toggled by user if they figure out where the button is :D
  const close = useCallback(() => setSelected(null), []);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  const featured = ["Lion", "Eagle", "Rabbit", "Owl"].map(n => PATTERN_ANIMALS.find(p => p.animal === n)!);
  const isDark = theme === "dark";

  return (
    <Layout>
      <AnimalModal pa={selected} onClose={close} />

      {/* Display fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <div data-theme={theme} className="guide-root relative min-h-screen overflow-x-hidden">
        <style>{`
          .guide-root { background: var(--g-bg); color: var(--g-text); transition: background-color .35s ease, color .35s ease; }
          .guide-root[data-theme="light"] {
            --g-bg: #f7f5ef;
            --g-surface: #ffffff;
            --g-text: #0d0d10;
            --g-muted: #4b4b55;
            --g-faint: #8a8a94;
            --g-border: rgba(0,0,0,0.08);
            --g-border-strong: rgba(0,0,0,0.18);
            --g-header-bg: rgba(247,245,239,0.75);
            --g-glow-opacity: 0.55;
            --g-code-bg: rgba(0,0,0,0.06);
            --g-code-border: rgba(0,0,0,0.1);
          }
          .guide-root[data-theme="dark"] {
            --g-bg: #070709;
            --g-surface: #101015;
            --g-text: #ffffff;
            --g-muted: #a1a1aa;
            --g-faint: #52525b;
            --g-border: rgba(255,255,255,0.08);
            --g-border-strong: rgba(255,255,255,0.18);
            --g-header-bg: rgba(0,0,0,0.45);
            --g-glow-opacity: 1;
            --g-code-bg: rgba(255,255,255,0.08);
            --g-code-border: rgba(255,255,255,0.1);
          }
          .guide-root .text-white,
          .guide-root .text-zinc-200 { color: var(--g-text) !important; }
          .guide-root .text-zinc-300,
          .guide-root .text-zinc-400 { color: var(--g-muted) !important; }
          .guide-root .text-zinc-500,
          .guide-root .text-zinc-600 { color: var(--g-faint) !important; }
          .guide-root .border-white\\/\\[0\\.06\\],
          .guide-root .border-white\\/5 { border-color: var(--g-border) !important; }
          .guide-root .border-white\\/15 { border-color: var(--g-border-strong) !important; }
          .guide-root .bg-black\\/40,
          .guide-root .bg-black\\/45 { background-color: var(--g-header-bg) !important; }
          .guide-root .bg-white\\/\\[0\\.025\\] { background-color: color-mix(in oklab, var(--g-text) 4%, transparent) !important; }
          .guide-root .border-white\\/\\[0\\.07\\] { border-color: var(--g-border) !important; }
          .guide-root .bg-white\\/10 { background-color: var(--g-code-bg) !important; }
          .guide-root .border-white\\/10 { border-color: var(--g-code-border) !important; }
          .guide-root .ambient-glow { opacity: var(--g-glow-opacity); }
          .guide-root .text-white\\/85,
          .guide-root .text-white\\/90 { color: var(--g-text) !important; opacity: 0.92; }
          .guide-root strong.text-zinc-200,
          .guide-root strong.text-zinc-300 { color: var(--g-text) !important; }
        `}</style>

        {/* Ambient gradient field */}
        <div className="ambient-glow pointer-events-none fixed inset-0 -z-0">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] opacity-40" style={{ background: "radial-gradient(ellipse at center, rgba(245,166,35,0.18), transparent 65%)" }} />
          <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] opacity-25" style={{ background: "radial-gradient(circle, rgba(96,165,250,0.18), transparent 70%)" }} />
          <div className="absolute bottom-0 -right-40 w-[600px] h-[600px] opacity-25" style={{ background: "radial-gradient(circle, rgba(192,132,252,0.18), transparent 70%)" }} />
        </div>

        {/* Top nav strip */}
        <header className="relative z-20 border-b border-white/[0.06] backdrop-blur-xl bg-black/40">
          <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="text-sm font-bold tracking-wide text-white">10 Odds</span>
              <span className="text-[10px] tracking-[0.2em] text-zinc-500 ml-2 hidden sm:inline" style={{ fontFamily: "JetBrains Mono, monospace" }}>FIELD GUIDE</span>
            </Link>
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center gap-1">
                {CHAPTERS.map(c => (
                  <a key={c.id} href={`#${c.id}`} className="text-[11px] tracking-[0.18em] text-zinc-500 hover:text-amber-400 transition px-3 py-1.5" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {c.num} · {c.title.toUpperCase()}
                  </a>
                ))}
              </nav>

              {/* Theme switch */}
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
                className="relative w-[64px] h-[32px] rounded-full border border-white/15 flex items-center px-1 transition-colors"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                }}
              >
                <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Sun size={12} style={{ color: !isDark ? "#f5a623" : "#71717a" }} />
                </span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Moon size={12} style={{ color: isDark ? "#fde68a" : "#a1a1aa" }} />
                </span>
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className="absolute top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full shadow-md"
                  style={{
                    left: isDark ? "calc(100% - 29px)" : "3px",
                    background: isDark
                      ? "linear-gradient(135deg, #1e1e26, #0a0a0d)"
                      : "linear-gradient(135deg, #ffffff, #f3efe4)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.1)"}`,
                  }}
                />
              </button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section ref={heroRef} className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-24 md:pb-36">
          <motion.div style={{ y: heroY, opacity: heroOpacity }}>
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-8">
                <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] text-amber-400 bg-amber-400/10 border border-amber-400/25 px-3 py-1.5 rounded-full" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  ISSUE 01 · BEGINNER'S FIELD GUIDE
                </span>
                <span className="hidden sm:inline text-[10px] tracking-[0.22em] text-zinc-600" style={{ fontFamily: "JetBrains Mono, monospace" }}>EST. 2024 · 18 PATTERNS · 5 CHAPTERS</span>
              </motion.div>

              <motion.h1 variants={fadeUp}
                className="text-[clamp(3rem,9vw,8.5rem)] font-black text-white leading-[0.88] tracking-[-0.03em] mb-8"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                How to read<br />
                <span className="italic font-normal text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(110deg, #f5a623 10%, #fde68a 50%, #f5a623 90%)" }}>
                  MK&#8239;-&#8239;806
                </span>
              </motion.h1>

              <motion.div variants={fadeUp} className="grid grid-cols-12 gap-6 mb-14">
                <div className="col-span-12 md:col-span-7">
                  <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl">
                    Plain-English patterns, predictions, and what <strong className="text-zinc-200 font-semibold">_806</strong> is actually telling you. No jargon. No maths. Just the wild things hiding inside the data.
                  </p>
                </div>
                <div className="col-span-12 md:col-span-5 flex md:justify-end items-end">
                  <div className="flex flex-wrap gap-2">
                    <a href="#ch-01" className="inline-flex items-center gap-2 bg-amber-400 text-black text-xs font-bold tracking-wider px-5 py-3 rounded-full hover:bg-amber-300 transition" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      START READING <ArrowRight size={13} />
                    </a>
                    <a href="#ch-05" className="inline-flex items-center gap-2 border border-white/15 text-zinc-200 text-xs font-bold tracking-wider px-5 py-3 rounded-full hover:bg-white/5 transition" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      MEET THE CAST
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* Featured animal collage */}
              <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {featured.map((pa, i) => {
                  const tier = getTier(pa);
                  return (
                    <motion.button key={pa.animal} onClick={() => setSelected(pa)}
                      whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 280, damping: 20 }}
                      className={`group relative rounded-3xl overflow-hidden aspect-[3/4] ${i === 1 ? "md:translate-y-8" : ""} ${i === 2 ? "md:-translate-y-4" : ""} ${i === 3 ? "md:translate-y-12" : ""}`}
                      style={{ border: `1px solid ${tier.ring}` }}>
                      <img src={ANIMAL_IMG[pa.animal] ?? ANIMAL_IMG.Lion} alt={pa.animal} className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] text-black" style={{ background: tier.color, fontFamily: "JetBrains Mono, monospace" }}>
                          {tier.label}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                        <p className="text-[9px] tracking-[0.22em] mb-1" style={{ color: tier.color, fontFamily: "JetBrains Mono, monospace" }}>{pa.originalLabel}</p>
                        <p className="text-2xl font-black text-white leading-none" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>The {pa.animal}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* MAIN BODY */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-24 flex flex-col gap-28 md:gap-36">

          <Chapter id="ch-01" num="01" icon={TrendingUp} color="#f5a623" kicker="Chapter One" title="What is a Pattern?">
            <Prose>
              Every prediction MK-806 makes carries two hidden qualities: how <strong className="text-white/90 font-semibold">confident</strong> it was, and how much <strong className="text-white/90 font-semibold">expected value</strong> it spotted in the odds. A <strong className="text-white/90 font-semibold">pattern</strong> is simply that combination — and each one wears the name of an animal. MK-806 tracks <strong className="text-white/90 font-semibold">eighteen</strong> in total.
            </Prose>
            <motion.div variants={fadeUp} className="rounded-3xl p-6 md:p-7 border border-amber-400/20" style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.06), rgba(245,166,35,0.01))" }}>
              <p className="text-[10px] tracking-[0.22em] text-amber-400/80 mb-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>QUICK EXAMPLE</p>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <AnimalIcon animal="Lion" size={20} style={{ color: "#f5a623" }} />
                </div>
                <p className="text-[15px] md:text-base leading-relaxed text-zinc-300">
                  A prediction labelled <strong className="text-amber-400">Lion</strong> means MK-806 was highly confident <em>and</em> spotted strong value. Historically, these are the apex signal — but nothing is guaranteed.
                </p>
              </div>
            </motion.div>
            <Prose>
              Patterns are <strong className="text-white/90 font-semibold">not fixed in stone</strong>. One delivering wins for months can start losing — and vice versa. That flexibility keeps the advice honest and grounded in what is actually happening right now.
            </Prose>
            <Callout icon={TrendingUp} color="#34d399">
              Live performance for every pattern lives on the Pattern Analyser page. Green = winning. Red = losing. Numbers update with every settled result.
            </Callout>
          </Chapter>

          <Chapter id="ch-02" num="02" icon={MessageSquare} color="#60a5fa" kicker="Chapter Two" title="Who is _806?">
            <Prose>
              Tap any prediction and you'll see a message from <strong className="text-white/90 font-semibold">_806</strong>, the pattern advisor. It is a completely separate entity from MK-806. While MK-806 simulates thousands of possible futures, _806 only looks <em>backwards</em> at the track record of the attached pattern.
            </Prose>
            <motion.div variants={fadeUp} className="rounded-3xl p-6 border border-blue-400/20" style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.06), rgba(96,165,250,0.01))" }}>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: "linear-gradient(135deg, #60a5fa, #1d4ed8)", fontFamily: "JetBrains Mono, monospace" }}>
                  806
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>_806</span>
                    <span className="text-[10px] tracking-[0.18em] px-2 py-0.5 rounded-full bg-blue-400/15 text-blue-300" style={{ fontFamily: "JetBrains Mono, monospace" }}>PATTERN ADVISOR</span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-zinc-300">
                    "Looking back, this prediction falls under the <strong className="text-white">Lion</strong> pattern — historically strong, but always subject to change."
                  </p>
                </div>
              </div>
            </motion.div>
            <Callout icon={AlertCircle} color="#f59e0b">
              Because _806 only uses the past, it can be wrong about the present. If it says a pattern has struggled, that doesn't mean this pick will lose — MK-806 may have spotted something the historical data hasn't caught yet. The decision is always yours.
            </Callout>
          </Chapter>

          <Chapter id="ch-03" num="03" icon={BarChart2} color="#34d399" kicker="Chapter Three" title="Using Pattern Insights">
            <Prose>
              Pattern advice works best as one ingredient — not the final word. Here's the three-step method:
            </Prose>
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StepCard num="01" title="Read the message" desc='What does _806 say? Winning pattern, losing, or "insufficient data"?' color="#f5a623" />
              <StepCard num="02" title="Check the numbers" desc="Open the Pattern Analyser — find the animal, check real win rate and sample size." color="#34d399" />
              <StepCard num="03" title="Add your judgment" desc="Combine pattern data with form, context, and what you know. Trust yourself." color="#60a5fa" />
            </motion.div>
            <Prose>
              Patterns with fewer than five results are marked{" "}
              <code className="text-xs px-2 py-1 rounded-md text-zinc-200 bg-white/10 border border-white/10" style={{ fontFamily: "JetBrains Mono, monospace" }}>INSUFFICIENT DATA</code>
              . Treat those as placeholders — there's simply not enough history to draw conclusions.
            </Prose>
            <Callout icon={ShieldCheck} color="#34d399">
              Patterns never override MK-806's prediction. They exist alongside it — as context, not commands.
            </Callout>
          </Chapter>

          <Chapter id="ch-04" num="04" icon={Zap} color="#c084fc" kicker="Chapter Four" title="Two Minds, One Name">
            <Prose>Same name. Completely different thinking. Here's the clearest way to tell them apart:</Prose>
            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { id: "MK-806", subtitle: "God of Time", color: "#f5a623", icon: <Zap size={16} />,
                  pts: ["Looks forward — simulates thousands of futures", "Decides which bet to pick", "Runs every morning before fixtures"] },
                { id: "_806", subtitle: "The Historian", color: "#60a5fa", icon: <span className="text-[11px] font-black" style={{ fontFamily: "JetBrains Mono, monospace" }}>806</span>,
                  pts: ["Looks backward — reviews pattern history", "Tracks win/loss across all 18 patterns", "Provides context, not predictions"] },
              ].map(side => (
                <motion.div key={side.id} variants={fadeUp} className="rounded-3xl p-6 border" style={{ background: `${side.color}07`, borderColor: `${side.color}25` }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center border" style={{ background: `${side.color}1a`, borderColor: `${side.color}40`, color: side.color }}>
                      {side.icon}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white leading-none" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{side.id}</p>
                      <p className="text-[10px] tracking-[0.22em] mt-1.5" style={{ color: side.color, fontFamily: "JetBrains Mono, monospace" }}>{side.subtitle.toUpperCase()}</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {side.pts.map((pt, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: side.color }} />
                        <span className="text-sm text-zinc-400 leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>
            <Callout icon={RefreshCw} color="#60a5fa">
              Patterns update daily as predictions resolve. A pattern on a hot streak can shift — that's not a flaw, it's the system being honest about how markets change.
            </Callout>
          </Chapter>

          <Chapter id="ch-05" num="05" icon={ArrowRight} color="#f5a623" kicker="Chapter Five" title="The Cast — All 18 Patterns">
            <Prose>
              Each pattern is an animal. <strong className="text-white/90">Tap any card</strong> for the full profile — photo, tier, confidence, expected value, and field notes.
            </Prose>
            <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {PATTERN_ANIMALS.map((pa, i) => (
                <AnimalCard key={pa.animal} pa={pa} index={i} onClick={() => setSelected(pa)} />
              ))}
            </motion.div>
            <motion.p variants={fadeUp} className="text-[10px] tracking-[0.25em] text-zinc-600 text-center mt-6" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              LIVE PERFORMANCE ON THE PATTERN ANALYSER · PATTERNS EVOLVE — CHECK BACK REGULARLY.
            </motion.p>
          </Chapter>     
          
          {/* More chapters */}
        
         <Chapter id="ch-06" num="06" icon={Brain} color="#3b82f6" kicker="Chapter Six" title="Hippo AI — Your Second Opinion">
  <Prose>
    Hippo AI is a second intelligence that works alongside MK-806. While MK-806 makes one primary prediction per match, Hippo AI selects <strong className="text-white/90 font-semibold">four additional betting markets</strong> it believes are the safest and most reliable for that same fixture. It's like having another analyst cross‑checking every game.
  </Prose>

  <motion.div variants={fadeUp} className="rounded-3xl p-6 border border-blue-400/20" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.01))" }}>
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center shrink-0">
        <Brain className="h-5 w-5 text-blue-400" />
      </div>
      <p className="text-[15px] leading-relaxed text-zinc-300">
        Hippo AI doesn't replace MK-806. It offers <strong className="text-blue-400">alternative markets</strong> — such as Over/Under goals, Both Teams to Score, Asian Handicap, and many more — that you can use if you want a safer bet or just another angle on the match.
      </p>
    </div>
  </motion.div>

  <Prose>
    Hippo AI works in two modes, depending on whether detailed team statistics are available for a match:
  </Prose>

  <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-5">
    {[
      {
        label: "With BSD Data",
        color: "#34d399",
        icon: <Database size={16} />,
        desc: "When Bzzoiro Sports Data (BSD) is available, Hippo AI analyses head‑to‑head records, recent form, xG, and dozens of other stats. Confidence for each market is shown as a percentage between <strong>60% and 100%</strong> — these are highly confident picks based on real numbers.",
      },
      {
        label: "Without BSD Data",
        color: "#f59e0b",
        icon: <AlertCircle size={16} />,
        desc: "When BSD data isn't available, Hippo AI relies on its general knowledge of the teams and competition. Because the data is less complete, confidence is capped at <strong>60% and below</strong>. This tells you the pick is worth considering, but with extra caution.",
      },
    ].map((mode) => (
      <motion.div key={mode.label} variants={fadeUp} className="rounded-3xl p-6 border" style={{ background: `${mode.color}07`, borderColor: `${mode.color}25` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center border" style={{ background: `${mode.color}1a`, borderColor: `${mode.color}40`, color: mode.color }}>
            {mode.icon}
          </div>
          <span className="text-base font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{mode.label}</span>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: mode.desc }} />
      </motion.div>
    ))}
  </motion.div>

  <Callout icon={Target} color="#3b82f6">
    The confidence percentage is <strong>specific to each market</strong> — it's Hippo AI's exact assessment of how likely that particular selection is to win, not a generic rating. When you see "85%" next to "Over 2.5 Goals", it means Hippo AI is 85% confident that pick will land.
  </Callout>

  <Prose>
    To see Hippo AI's picks, open any active prediction and tap the <strong className="text-white/90 font-semibold">Explore Alternative Markets</strong> button. The four best markets will appear, each with its own confidence score. The highest‑confidence option is highlighted so you can spot it instantly.
  </Prose>

  <Callout icon={ShieldCheck} color="#34d399">
    Hippo AI's suggestions are independent of MK-806's main pick. Use them together to build a more balanced bet slip — or stick with one if it matches your style. You're always in control.
  </Callout>
    <motion.p variants={fadeUp} className="text-[10px] tracking-[0.25em] text-zinc-600 text-center mt-6" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              TO STUDY HIPPO AI'S MARKET PICKS PERFORMANCE GO ON THE ANALYTICS PAGE · CHECK REGULARLY TO SEE IT'S PROGRESS.
            </motion.p>
</Chapter>

          {/* DISCLAIMER */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="rounded-3xl p-7 md:p-8 border border-red-400/15"
            style={{ background: "linear-gradient(135deg, rgba(248,113,113,0.05), rgba(248,113,113,0.01))" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-400/12 flex items-center justify-center">
                <AlertCircle className="w-4.5 h-4.5 text-red-400" />
              </div>
              <span className="text-base font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>A REMINDER</span>
            </div>
            <p className="text-[15px] leading-relaxed text-zinc-400 max-w-3xl">
              10 Odds is for informational purposes only. Neither MK-806, _806 nor Hippo AI constitutes financial or betting advice. Patterns reflect past performance, which does not guarantee future results. Always bet responsibly — only stake what you can afford to lose, and make your own decisions.
            </p>
            <div className="flex flex-wrap gap-5 mt-5 pt-5 border-t border-red-400/10">
              {[["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"], ["About 10 Odds", "/about"]].map(([l, to]) => (
                <Link key={to} to={to} className="text-[10px] font-bold tracking-wider text-amber-400 hover:opacity-70 transition flex items-center gap-1.5 cursor-pointer" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {l} <ArrowRight size={11} />
                </Link>
              ))}
            </div>
          </motion.div>
        </main>
      </div>
    </Layout>
  );
};

export default GuidePage;