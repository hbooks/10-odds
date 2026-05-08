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

type PatternAnimal = (typeof PATTERN_ANIMALS)[number];

// ─── Professional animal photography – each animal matches our 18 patterns ────
const ANIMAL_IMG: Record<string, string> = {
  Lion:    "https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=800&h=600&fit=crop&auto=format",
  Eagle:   "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop&auto=format",
  Bear:    "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=800&h=600&fit=crop&auto=format",
  Bull:    "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&h=600&fit=crop&auto=format",
  Horse:   "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&h=600&fit=crop&auto=format",
  Rhino:   "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=600&fit=crop&auto=format",
  Fox:     "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop&auto=format",
  Owl:     "https://images.unsplash.com/photo-1574085975024-e9cc8d9f28d3?w=800&h=600&fit=crop&auto=format",
  Squirrel:"https://images.unsplash.com/photo-1507666405895-5a3d4b3e46e1?w=800&h=600&fit=crop&auto=format",
  Deer:    "https://images.unsplash.com/photo-1484406565474-2d18b8c4a7a5?w=800&h=600&fit=crop&auto=format",
  Frog:    "https://images.unsplash.com/photo-1558174683-430cd4cfc2de?w=800&h=600&fit=crop&auto=format",
  Mole:    "https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=800&h=600&fit=crop&auto=format",
  Rabbit:  "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&h=600&fit=crop&auto=format",
  Hamster: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&h=600&fit=crop&auto=format",
  Turtle:  "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&h=600&fit=crop&auto=format",
  Mouse:   "https://images.unsplash.com/photo-1535241749838-299277b6305f?w=800&h=600&fit=crop&auto=format",
  Ant:     "https://images.unsplash.com/photo-1596616817185-7e8a7f3b9b1b?w=800&h=600&fit=crop&auto=format",
  Worm:    "https://images.unsplash.com/photo-1581595219315-a187dd40c322?w=800&h=600&fit=crop&auto=format",
};

// Tier classification based on confidence and EV
function getTier(pa: PatternAnimal) {
  const c = (pa.confidence ?? "").toLowerCase();
  const e = (pa.evType ?? "").toLowerCase();
  const hiC = c.includes("high");
  const hiE = e.includes("high") || e.includes("positive");
  const loC = c.includes("low");
  const loE = e.includes("low") || e.includes("negative");
  if (hiC && hiE) return { label: "ELITE", color: "#f5a623", dim: "rgba(245,166,35,0.18)", ring: "rgba(245,166,35,0.4)" };
  if (hiC)        return { label: "STRONG", color: "#22c55e", dim: "rgba(34,197,94,0.15)", ring: "rgba(34,197,94,0.38)" };
  if (hiE)        return { label: "VALUE", color: "#3b82f6", dim: "rgba(59,130,246,0.15)", ring: "rgba(59,130,246,0.38)" };
  if (loC && loE) return { label: "WEAK", color: "#ef4444", dim: "rgba(239,68,68,0.15)", ring: "rgba(239,68,68,0.35)" };
  return                 { label: "MODERATE", color: "#a855f7", dim: "rgba(168,85,247,0.15)", ring: "rgba(168,85,247,0.35)" };
}

const fadeUp = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

function AnimalModal({ pa, onClose }: { pa: PatternAnimal | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {pa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-lg"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.87, y: 48 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 28 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[740px] rounded-2xl overflow-hidden bg-[#0d0d10] border border-white/10 shadow-2xl flex flex-col md:flex-row"
            style={{ borderColor: getTier(pa).ring, boxShadow: `0 0 80px ${getTier(pa).dim}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="relative w-full md:w-5/12 min-h-[280px] md:min-h-[440px] bg-gray-900 overflow-hidden">
              <img
                src={ANIMAL_IMG[pa.animal] ?? ANIMAL_IMG.Fox}
                alt={pa.animal}
                className="absolute inset-0 w-full h-full object-cover object-center"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0d0d10] md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#0d0d10] bg-gradient-to-t from-[#0d0d10]/80 to-transparent" />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-widest text-black" style={{ background: getTier(pa).color }}>
                {getTier(pa).label}
              </div>
              <div className="absolute bottom-5 left-5">
                <div className="text-[10px] font-mono tracking-widest uppercase opacity-70" style={{ color: getTier(pa).color }}>{pa.originalLabel}</div>
                <h2 className="text-4xl font-black font-serif text-white leading-none mt-1 drop-shadow-lg">{pa.animal}</h2>
              </div>
            </div>
            <div className="relative flex-1 p-6 md:p-8 flex flex-col">
              <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition">
                <X size={14} />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center border" style={{ background: getTier(pa).dim, borderColor: getTier(pa).ring }}>
                  <AnimalIcon animal={pa.animal} size={22} style={{ color: getTier(pa).color }} />
                </div>
                <div>
                  <div className="text-xl font-black font-serif text-white leading-tight">The {pa.animal}</div>
                  <div className="text-[11px] font-mono tracking-wide text-gray-600 mt-0.5">Pattern {PATTERN_ANIMALS.indexOf(pa) + 1} / {PATTERN_ANIMALS.length}</div>
                </div>
              </div>
              <div className="flex gap-2 mb-5">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                  <div className="text-[9px] font-mono tracking-widest text-gray-600 mb-1">CONFIDENCE</div>
                  <div className="text-sm font-bold" style={{ color: getTier(pa).color }}>{pa.confidence}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                  <div className="text-[9px] font-mono tracking-widest text-gray-600 mb-1">EXP. VALUE</div>
                  <div className="text-sm font-bold" style={{ color: getTier(pa).color }}>{pa.evType}</div>
                </div>
              </div>
              <div className="h-px bg-white/5 mb-4" />
              <p className="text-sm leading-relaxed text-gray-400 flex-1">{pa.description}</p>
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-700">UPDATED DAILY</span>
                <Link to="/patterns" onClick={onClose} className="text-xs font-bold font-mono tracking-wide flex items-center gap-1" style={{ color: getTier(pa).color }}>
                  VIEW ANALYSER <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function AnimalCard({ pa, index, onClick }: { pa: PatternAnimal; index: number; onClick: () => void }) {
  const tier = getTier(pa);
  const img  = ANIMAL_IMG[pa.animal];
  const [hover, setHover] = useState(false);

  return (
    <motion.button
      variants={fadeUp}
      custom={index}
      animate={{ y: hover ? -4 : 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden border bg-[#111115] cursor-pointer text-left w-full transition-shadow duration-300"
      style={{
        borderColor: hover ? tier.ring : 'rgba(255,255,255,0.06)',
        boxShadow: hover ? `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 25px ${tier.dim}` : 'none',
      }}
    >
      <div className="relative h-32 overflow-hidden bg-gray-900">
        {img ? (
          <img
            src={img}
            alt={pa.animal}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-700"
            style={{ transform: hover ? 'scale(1.08)' : 'scale(1)' }}
            onError={(e) => (e.currentTarget.style.opacity = '0')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <AnimalIcon animal={pa.animal} size={42} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111115] to-transparent" />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black font-mono tracking-widest text-black" style={{ background: tier.color }}>
          {tier.label}
        </div>
        <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm border flex items-center justify-center" style={{ borderColor: tier.ring }}>
          <AnimalIcon animal={pa.animal} size={14} style={{ color: tier.color }} />
        </div>
      </div>
      <div className="p-3.5">
        <div className="text-[15px] font-bold font-serif text-white leading-tight mb-0.5">{pa.animal}</div>
        <div className="text-[10px] font-mono tracking-widest text-gray-700 mb-2">{pa.originalLabel}</div>
        <div className="flex gap-1.5 mb-2">
          <span className="text-[9px] font-mono tracking-wide bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-gray-400">{pa.confidence}</span>
          <span className="text-[9px] font-mono tracking-wide bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-gray-400">{pa.evType}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-500 line-clamp-2">{pa.description}</p>
        <div className="mt-2 text-[11px] font-bold font-mono tracking-wide flex items-center gap-1 opacity-0 transition-opacity" style={{ color: tier.color, opacity: hover ? 1 : 0 }}>
          EXPAND <ArrowRight size={11} />
        </div>
      </div>
    </motion.button>
  );
}

function GuideSection({ icon: Icon, iconColor, badge, title, children }: {
  index: number; icon: React.ElementType; iconColor: string;
  iconBg?: string; badge: string; title: string; children: React.ReactNode;
}) {
  return (
    <motion.section
      initial="hidden" whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden"
    >
      <motion.div variants={fadeUp} className="p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center border" style={{ background: `${iconColor}12`, borderColor: `${iconColor}28` }}>
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-[0.18em] uppercase text-gray-700 mb-1">{badge}</div>
            <h2 className="text-xl font-bold font-serif text-white leading-tight tracking-tight">{title}</h2>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {children}
        </div>
      </motion.div>
    </motion.section>
  );
}

function Callout({ icon: Icon, color, children }: { icon: React.ElementType; color: string; bg?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl p-4 border" style={{ background: `${color}0b`, borderColor: `${color}26` }}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
      <p className="text-[13px] leading-relaxed" style={{ color: `${color}bb` }}>{children}</p>
    </div>
  );
}

const GuidePage = () => {
  const [selected, setSelected] = useState<PatternAnimal | null>(null);
  const close = useCallback(() => setSelected(null), []);

  return (
    <Layout>
      <AnimalModal pa={selected} onClose={close} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-16">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center mb-16">
          <motion.div variants={fadeUp} className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/20">
              <BookOpen className="w-8 h-8 text-black" />
            </div>
          </motion.div>
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-amber-400 bg-amber-400/5 border border-amber-400/20 px-4 py-2 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Beginner's Field Guide
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black font-serif text-white leading-[1.05] tracking-tight mb-5">
            How to Read <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">MK-806</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-base md:text-lg text-gray-400 max-w-lg mx-auto mb-8 leading-relaxed">
            Plain-English patterns, predictions, and what _806 is actually telling you. No jargon. No math. Just the good stuff.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2">
            {["01 — Patterns", "02 — _806", "03 — How to use", "04 — Two Minds", "05 — The Cast"].map(l => (
              <span key={l} className="text-[10px] font-mono tracking-wider text-gray-600 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{l}</span>
            ))}
          </motion.div>
        </motion.div>

        <div className="flex flex-col gap-3">
          <GuideSection index={1} icon={TrendingUp} iconColor="#f5a623" badge="Section 01" title="What is a Pattern?">
            <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
              Every prediction MK-806 makes has two hidden qualities: how <strong className="text-white/80 font-semibold">confident</strong> it was, and how much <strong className="text-white/80 font-semibold">expected value</strong> it spotted in the available odds. A <strong className="text-white/80 font-semibold">pattern</strong> is simply that combination — and each one gets a memorable animal name. MK-806 tracks <strong className="text-white/80 font-semibold">18 distinct patterns</strong> in total.
            </motion.p>
            <motion.div variants={fadeUp}>
              <div className="rounded-xl bg-amber-400/5 border border-amber-400/10 p-4">
                <div className="text-[9px] font-mono tracking-[0.16em] text-gray-600 mb-2">QUICK EXAMPLE</div>
                <p className="text-sm leading-relaxed text-gray-400">
                  A prediction labeled{" "}
                  <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
                    <AnimalIcon animal="Lion" size={16} /> Lion
                  </span>{" "}
                  means MK-806 was highly confident <em>and</em> spotted strong value. Historically these patterns perform well — but nothing is guaranteed.
                </p>
              </div>
            </motion.div>
            <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
              Patterns are <strong className="text-white/80 font-semibold">not fixed in stone</strong>. One delivering wins for months can start losing — and vice versa. That flexibility keeps the advice honest and grounded in what is actually happening right now.
            </motion.p>
            <motion.div variants={fadeUp}>
              <img src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/pta.png" alt="Pattern Analyser" className="w-full rounded-xl border border-white/10" />
              <p className="text-[10px] font-mono text-gray-700 text-center mt-2 tracking-wide">THE PATTERN ANALYSER — ALL 18 PATTERNS AND THEIR LIVE WIN/LOSS RECORDS</p>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Callout icon={TrendingUp} color="#22c55e">
                Live performance for every pattern lives on the{" "}
                <Link to="/patterns" className="text-emerald-400 font-bold underline">Pattern Analyser page</Link>. Green = winning. Red = losing. Numbers update with every settled result.
              </Callout>
            </motion.div>
          </GuideSection>

          <GuideSection index={2} icon={MessageSquare} iconColor="#3b82f6" badge="Section 02" title="Who is _806?">
            <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
              Tap any prediction — on{" "}
              <Link to="/status" className="text-amber-400 font-semibold underline">Active Predictions</Link> or{" "}
              <Link to="/previous" className="text-amber-400 font-semibold underline">Previous</Link> — and you'll see a message from{" "}
              <strong className="text-white/80 font-semibold">_806</strong>, the pattern advisor. It is a completely separate entity from MK-806. While MK-806 simulates thousands of possible futures, _806 only looks <em>backwards</em> at the track record of the attached pattern.
            </motion.p>
            <motion.div variants={fadeUp}>
              <div className="flex gap-4 rounded-xl bg-blue-500/5 border border-blue-500/10 p-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold font-mono shrink-0">806</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">_806</span>
                    <span className="text-[9px] font-mono tracking-wider bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">PATTERN ADVISOR</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-400">
                    "Looking back, this prediction falls under the <strong className="text-white">Lion</strong> pattern — historically strong, but always subject to change."
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUp}>
              <img src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/06.png" alt="_806 popup" className="w-full rounded-xl border border-white/10" />
              <p className="text-[10px] font-mono text-gray-700 text-center mt-2 tracking-wide">THE PREDICTION POPUP — MK-806'S PICK ALONGSIDE _806'S PATTERN ADVICE</p>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Callout icon={AlertCircle} color="#f59e0b">
                Because _806 only uses the past, it can be wrong about the present. If it says a pattern has struggled, that doesn't mean this pick will lose — MK-806 may have spotted something the historical data hasn't caught yet. The decision is always yours.
              </Callout>
            </motion.div>
          </GuideSection>

          <GuideSection index={3} icon={BarChart2} iconColor="#22c55e" badge="Section 03" title="How to Use Pattern Insights">
            <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
              Pattern advice works best as one ingredient — not the final word. Here's the three-step method:
            </motion.p>
            <motion.div variants={fadeUp}>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { n: "01", title: "Read the message", desc: 'What does _806 say? Winning pattern, losing, or "insufficient data"?', color: "#f5a623" },
                  { n: "02", title: "Check the numbers", desc: "Go to Pattern Analyser — find that animal, check the real win rate and sample size.", color: "#22c55e" },
                  { n: "03", title: "Add your judgment", desc: "Combine pattern data with form, context, and what you know. Trust yourself.", color: "#3b82f6" },
                ].map(s => (
                  <div key={s.n} className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
                    <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: s.color }}>{s.n}</div>
                    <div className="text-xs font-bold text-white mb-1.5">{s.title}</div>
                    <p className="text-[11px] leading-relaxed text-gray-500">{s.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
              Patterns with fewer than 5 results are marked{" "}
              <code className="text-xs font-mono bg-white/5 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded-md">INSUFFICIENT DATA</code>. Treat those as placeholders — there's simply not enough history to draw conclusions.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Callout icon={ShieldCheck} color="#22c55e">
                Patterns never override MK-806's prediction. They exist alongside it — as context, not commands.
              </Callout>
            </motion.div>
          </GuideSection>

          <GuideSection index={4} icon={Zap} iconColor="#f5a623" badge="Section 04" title="MK-806 vs _806 — Two Minds">
            <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
              Same name. Completely different thinking. Here's the clearest way to tell them apart:
            </motion.p>
            <motion.div variants={fadeUp}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "MK-806", subtitle: "God of Time", color: "#f5a623", icon: <Zap size={15} />, pts: [<><strong className="text-white">Looks forward</strong> — simulates thousands of futures</>, <>Decides <strong className="text-white">which bet to pick</strong></>, <>Runs every morning before fixtures</>] },
                  { id: "_806", subtitle: "The Historian", color: "#3b82f6", icon: <span className="text-[10px] font-black font-mono">806</span>, pts: [<><strong className="text-white">Looks backward</strong> — reviews pattern history</>, <>Tracks win/loss across <strong className="text-white">all 18 patterns</strong></>, <>Provides <strong className="text-white">context</strong>, not predictions</>] },
                ].map(side => (
                  <div key={side.id} className="rounded-xl p-5 border" style={{ background: `${side.color}05`, borderColor: `${side.color}20` }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center border" style={{ background: `${side.color}18`, borderColor: `${side.color}35`, color: side.color }}>{side.icon}</div>
                      <div>
                        <div className="text-sm font-bold text-white">{side.id}</div>
                        <div className="text-[9px] font-mono tracking-widest opacity-70" style={{ color: side.color }}>{side.subtitle}</div>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {side.pts.map((pt, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <ArrowRight size={11} className="mt-1 shrink-0" style={{ color: side.color }} />
                          <span className="text-xs text-gray-400 leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.p variants={fadeUp} className="text-sm leading-relaxed text-gray-400">
              When both align — MK-806 picks a bet and _806 confirms the pattern is historically strong — that's your clearest signal. When they diverge, that's also valuable information.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Callout icon={RefreshCw} color="#3b82f6">
                Patterns update daily as predictions resolve. A pattern on a hot streak can shift — that's not a flaw, it's the system being honest about how markets change.
              </Callout>
            </motion.div>
          </GuideSection>

          <motion.section
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden"
          >
            <motion.div variants={fadeUp} className="p-6 md:p-8">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center border" style={{ background: "rgba(245,166,35,0.1)", borderColor: "rgba(245,166,35,0.24)" }}>
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-[0.18em] uppercase text-gray-700 mb-1">SECTION 05</div>
                  <h2 className="text-xl font-bold font-serif text-white leading-tight tracking-tight">Pattern Animals — Meet the Cast</h2>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-gray-400 mb-6">
                All 18 patterns, each with its own animal identity. <strong className="text-gray-300">Tap any card</strong> for a full breakdown — photo, tier, confidence, expected value, and description.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {PATTERN_ANIMALS.map((pa, i) => (
                  <AnimalCard key={pa.animal} pa={pa} index={i} onClick={() => setSelected(pa)} />
                ))}
              </div>
              <p className="text-[10px] font-mono text-gray-700 text-center mt-6 tracking-wide">
                LIVE PERFORMANCE ON THE{" "}
                <Link to="/patterns" className="text-amber-400 font-bold underline">PATTERN ANALYSER</Link>. PATTERNS EVOLVE — CHECK BACK REGULARLY.
              </p>
            </motion.div>
          </motion.section>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="rounded-2xl border border-red-500/10 bg-red-500/[0.025] p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm font-bold font-serif text-white">A reminder</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              10 Odds is for informational purposes only. Neither MK-806 nor _806 constitutes financial or betting advice. Patterns reflect past performance, which does not guarantee future results. Always bet responsibly — only stake what you can afford to lose, and make your own decisions.
            </p>
            <div className="flex gap-5 mt-4">
              {[["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"], ["About 10 Odds", "/about"]].map(([l, to]) => (
                <Link key={to} to={to} className="text-[11px] font-mono font-bold text-amber-400 hover:underline tracking-wide">{l} →</Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default GuidePage;