import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Zap,
  MessageSquare,
  TrendingUp,
  BookOpen,
  AlertCircle,
  BarChart2,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  X,
  ChevronRight,
} from "lucide-react";
import Layout from "@/components/Layout";
import { PATTERN_ANIMALS } from "@/lib/patternAnimals";
import AnimalIcon from "@/components/AnimalIcon";

// ─── Types ────────────────────────────────────────────────────────────────────
type PatternAnimal = (typeof PATTERN_ANIMALS)[number];

// ─── Animal image map (Unsplash, matched to animal names) ─────────────────────
const ANIMAL_IMAGES: Record<string, string> = {
  Lion: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&q=80&fit=crop",
  Tiger: "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=600&q=80&fit=crop",
  Eagle: "https://images.unsplash.com/photo-1611689342806-0863700f1aa3?w=600&q=80&fit=crop",
  Wolf: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&q=80&fit=crop",
  Bear: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=600&q=80&fit=crop",
  Shark: "https://images.unsplash.com/photo-1559583985-c80d8ad9b29f?w=600&q=80&fit=crop",
  Falcon: "https://images.unsplash.com/photo-1590212151175-e58edd96185b?w=600&q=80&fit=crop",
  Panther: "https://images.unsplash.com/photo-1518887668165-f02f29cc1238?w=600&q=80&fit=crop",
  Cheetah: "https://images.unsplash.com/photo-1549366021-9f761d450615?w=600&q=80&fit=crop",
  Leopard: "https://images.unsplash.com/photo-1551972873-b7e8754603ae?w=600&q=80&fit=crop",
  Jaguar: "https://images.unsplash.com/photo-1526438229446-b04a9f7b70b8?w=600&q=80&fit=crop",
  Ox: "https://images.unsplash.com/photo-1585246038745-25b7f5dce8b0?w=600&q=80&fit=crop",
  Hyena: "https://images.unsplash.com/photo-1544985361-b420d7a77043?w=600&q=80&fit=crop",
  Mule: "https://images.unsplash.com/photo-1597793052932-09b50ccd6eee?w=600&q=80&fit=crop",
  Tortoise: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=600&q=80&fit=crop",
  Sloth: "https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=600&q=80&fit=crop",
  Worm: "https://images.unsplash.com/photo-1559827291-72f05c28b5b2?w=600&q=80&fit=crop",
  Crab: "https://images.unsplash.com/photo-1550677272-1c88b5e6f4e6?w=600&q=80&fit=crop",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&q=80&fit=crop";

// ─── Confidence badge colour ──────────────────────────────────────────────────
function confidenceColor(conf: string) {
  const c = conf?.toLowerCase() ?? "";
  if (c.includes("high")) return { bg: "#22c55e20", text: "#22c55e", border: "#22c55e40" };
  if (c.includes("medium")) return { bg: "#f59e0b20", text: "#f59e0b", border: "#f59e0b40" };
  return { bg: "#ef444420", text: "#ef4444", border: "#ef444440" };
}

function evColor(ev: string) {
  const e = ev?.toLowerCase() ?? "";
  if (e.includes("high") || e.includes("positive")) return { bg: "#3b82f620", text: "#3b82f6", border: "#3b82f640" };
  if (e.includes("medium") || e.includes("moderate")) return { bg: "#a855f720", text: "#a855f7", border: "#a855f740" };
  return { bg: "#6b728020", text: "#9ca3af", border: "#6b728040" };
}

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.09 } },
};

// ─── Animal Detail Modal ──────────────────────────────────────────────────────
function AnimalModal({
  animal,
  onClose,
}: {
  animal: PatternAnimal | null;
  onClose: () => void;
}) {
  if (!animal) return null;
  const imgSrc = ANIMAL_IMAGES[animal.animal] ?? FALLBACK_IMAGE;
  const conf = confidenceColor(animal.confidence);
  const ev = evColor(animal.evType);

  return (
    <AnimatePresence>
      {animal && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: "var(--color-card, #111)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,166,35,0.08)",
              }}
            >
              {/* ── Two-column layout ── */}
              <div className="flex flex-col sm:flex-row min-h-[360px]">

                {/* LEFT – Animal photo */}
                <div className="relative sm:w-5/12 min-h-[220px] sm:min-h-0 overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={animal.animal}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: "center 20%" }}
                  />
                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to right, transparent 60%, var(--color-card, #111) 100%), linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)",
                    }}
                  />
                  {/* Animal name over image */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <span
                      className="text-xs font-mono uppercase tracking-widest"
                      style={{ color: "#f5a623", opacity: 0.85 }}
                    >
                      {animal.originalLabel}
                    </span>
                    <h2
                      className="text-3xl font-black leading-none mt-0.5"
                      style={{
                        fontFamily: "'Georgia', serif",
                        color: "#ffffff",
                        textShadow: "0 2px 12px rgba(0,0,0,0.7)",
                      }}
                    >
                      {animal.animal}
                    </h2>
                  </div>
                </div>

                {/* RIGHT – Pattern description */}
                <div className="flex-1 flex flex-col p-6 sm:p-7 relative">
                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "var(--color-muted-foreground, #888)",
                    }}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* AnimalIcon */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl mb-5"
                    style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.2)" }}
                  >
                    <AnimalIcon animal={animal.animal} size={26} className="text-gold" />
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: conf.bg,
                        color: conf.text,
                        border: `1px solid ${conf.border}`,
                      }}
                    >
                      Confidence: {animal.confidence}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: ev.bg,
                        color: ev.text,
                        border: `1px solid ${ev.border}`,
                      }}
                    >
                      EV: {animal.evType}
                    </span>
                  </div>

                  {/* Description */}
                  <p
                    className="text-sm leading-relaxed flex-1"
                    style={{ color: "var(--color-muted-foreground, #aaa)" }}
                  >
                    {animal.description}
                  </p>

                  {/* Divider */}
                  <div
                    className="my-4"
                    style={{ height: "1px", background: "rgba(255,255,255,0.06)" }}
                  />

                  {/* Footer note */}
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--color-muted-foreground, #666)" }}
                  >
                    Pattern performance updates daily on the{" "}
                    <Link
                      to="/patterns"
                      className="underline underline-offset-2"
                      style={{ color: "#f5a623" }}
                      onClick={onClose}
                    >
                      Pattern Analyser
                    </Link>
                    . Past performance does not guarantee future results.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function GuideSection({
  icon: Icon,
  iconColor,
  iconBg,
  badge,
  title,
  children,
}: {
  index: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  badge: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.12)" }}
    >
      <motion.div variants={fadeUp} className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
            style={{ background: iconBg, border: `1px solid ${iconColor}30` }}
          >
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">
              {badge}
            </p>
            <h2 className="text-xl font-heading font-bold text-foreground leading-tight">
              {title}
            </h2>
          </div>
        </div>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </motion.div>
    </motion.section>
  );
}

// ─── Callout box ──────────────────────────────────────────────────────────────
function Callout({
  icon: Icon,
  color,
  bg,
  children,
}: {
  icon: React.ElementType;
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex gap-3 rounded-xl p-4 border"
      style={{ background: bg, borderColor: `${color}30` }}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
      <p className="text-sm leading-relaxed" style={{ color }}>
        {children}
      </p>
    </div>
  );
}

// ─── Animal Card ──────────────────────────────────────────────────────────────
function AnimalCard({
  pa,
  index,
  onClick,
}: {
  pa: PatternAnimal;
  index: number;
  onClick: () => void;
}) {
  const conf = confidenceColor(pa.confidence);
  const ev = evColor(pa.evType);
  const imgSrc = ANIMAL_IMAGES[pa.animal] ?? FALLBACK_IMAGE;

  return (
    <motion.button
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -5, boxShadow: "0 16px 40px rgba(0,0,0,0.3)" }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="rounded-2xl overflow-hidden text-left w-full group cursor-pointer"
      style={{
        background: "var(--color-card, #111)",
        border: "1px solid rgba(255,255,255,0.07)",
        transition: "box-shadow 0.25s ease",
      }}
    >
      {/* Animal photo strip */}
      <div className="relative h-28 overflow-hidden">
        <img
          src={imgSrc}
          alt={pa.animal}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: "center 25%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--color-card, #111) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
          }}
        />
        {/* Icon chip over image */}
        <div
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "rgba(245,166,35,0.18)", backdropFilter: "blur(6px)" }}
        >
          <AnimalIcon animal={pa.animal} size={20} className="text-gold" />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-end justify-between mb-2">
          <div>
            <h3 className="font-heading font-bold text-foreground text-base leading-tight">
              {pa.animal}
            </h3>
            <code className="text-[10px] text-muted-foreground font-mono opacity-60">
              {pa.originalLabel}
            </code>
          </div>
          <ChevronRight
            className="h-4 w-4 shrink-0 opacity-30 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all"
            style={{ color: "#f5a623" }}
          />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: conf.bg, color: conf.text, border: `1px solid ${conf.border}` }}
          >
            {pa.confidence}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: ev.bg, color: ev.text, border: `1px solid ${ev.border}` }}
          >
            {pa.evType}
          </span>
        </div>

        {/* Description preview */}
        <p
          className="text-[11px] leading-relaxed line-clamp-2"
          style={{ color: "var(--color-muted-foreground, #888)" }}
        >
          {pa.description}
        </p>

        {/* Tap hint */}
        <p
          className="text-[10px] mt-2.5 font-medium opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ color: "#f5a623" }}
        >
          Tap to learn more →
        </p>
      </div>
    </motion.button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const GuidePage = () => {
  const [selected, setSelected] = useState<PatternAnimal | null>(null);

  return (
    <Layout>
      <AnimalModal animal={selected} onClose={() => setSelected(null)} />

      <div className="container mx-auto px-4 py-10 max-w-3xl">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.div variants={fadeUp} className="flex justify-center mb-5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl"
              style={{
                background: "linear-gradient(135deg, #f5a623, #e08c12)",
                boxShadow: "0 8px 32px rgba(245,166,35,0.3)",
              }}
            >
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4 text-[11px] font-mono uppercase tracking-widest"
            style={{
              background: "rgba(245,166,35,0.08)",
              border: "1px solid rgba(245,166,35,0.2)",
              color: "#f5a623",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            Beginner Friendly Guide
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-heading font-black text-foreground mb-4 leading-tight"
          >
            How to Read{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #f5a623, #fcd34d)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              MK-806
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed"
          >
            A plain-English walkthrough of predictions, patterns, and what _806 is
            actually telling you. No jargon, no math — just the good stuff.
          </motion.p>

          {/* Quick nav pills */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-2 mt-6"
          >
            {[
              "Patterns",
              "Who is _806?",
              "How to Use",
              "MK-806 vs _806",
              "All Animals",
            ].map((label, i) => (
              <span
                key={label}
                className="text-[11px] px-3 py-1 rounded-full font-medium"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--color-muted-foreground, #888)",
                }}
              >
                {String(i + 1).padStart(2, "0")} {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <div className="space-y-5">

          {/* ── Section 1 ─────────────────────────────────────────────────── */}
          <GuideSection
            index={1}
            icon={TrendingUp}
            iconColor="#f5a623"
            iconBg="#f5a62318"
            badge="Section 01"
            title="What is a Pattern?"
          >
            <motion.div variants={fadeUp}>
              <p>
                Every prediction MK-806 makes has two hidden qualities attached to it:
                how <strong className="text-foreground">confident</strong> MK-806 was,
                and how much <strong className="text-foreground">expected value</strong> it
                spotted in the available odds.
              </p>
              <p className="mt-3">
                A <strong className="text-foreground">pattern</strong> is simply the
                combination of those two qualities. We've given each pattern a friendly
                animal name to make them easy to remember. MK-806 tracks{" "}
                <strong className="text-foreground">18 distinct patterns</strong> in total,
                from the confident King of the Jungle down to the cautious Worm.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div
                className="rounded-xl p-4 mt-2"
                style={{
                  background: "rgba(245,166,35,0.05)",
                  border: "1px solid rgba(245,166,35,0.15)",
                }}
              >
                <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
                  Quick example
                </p>
                <p className="text-foreground text-sm">
                  A prediction labeled as{" "}
                  <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "#f5a623" }}>
                    <AnimalIcon animal="Lion" size={18} />
                    Lion
                  </span>{" "}
                  means MK-806 was highly confident AND spotted strong value in the market.
                  Historically, patterns like this have delivered strong results — but they
                  don't guarantee anything.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <p>
                Crucially, patterns are{" "}
                <strong className="text-foreground">not fixed in stone.</strong> A pattern
                that has been delivering wins for months can start losing — and vice versa.
                This flexibility keeps the advice honest and grounded in what is actually
                happening.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="my-6">
              <img
                src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/pta.png"
                alt="Pattern Analyser page showing all 18 patterns and their win rates"
                className="w-full rounded-xl border border-border shadow-lg"
              />
              <p className="text-xs text-muted-foreground/50 text-center mt-2">
                The Pattern Analyser — showing all 18 patterns and their actual win/loss records
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={TrendingUp} color="#10b981" bg="#10b98110">
                You can see the live performance of every pattern on the{" "}
                <Link to="/patterns" className="underline font-medium">
                  Pattern Analyser page
                </Link>
                . Green patterns are winning, red are losing — and the numbers update
                as new results come in.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── Section 2 ─────────────────────────────────────────────────── */}
          <GuideSection
            index={2}
            icon={MessageSquare}
            iconColor="#3b82f6"
            iconBg="#3b82f618"
            badge="Section 02"
            title="Who is _806?"
          >
            <motion.div variants={fadeUp}>
              <p>
                When you tap on a prediction — whether it's live on the{" "}
                <Link to="/status" className="text-gold hover:underline">Active Predictions</Link> page
                or settled on the{" "}
                <Link to="/previous" className="text-gold hover:underline">Previous</Link> page
                — you'll see a short message from <strong className="text-foreground">_806</strong>.
              </p>
              <p className="mt-3">
                <strong className="text-foreground">_806 is the pattern advisor.</strong> It is a
                completely different entity from MK-806. While MK-806 looks forward and
                simulates thousands of possible futures to decide what to predict, _806 only
                looks <em>backwards</em> — at the track record of the pattern attached to
                that specific prediction.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div
                className="flex items-start gap-4 rounded-xl p-4 mt-2"
                style={{
                  background: "rgba(59,130,246,0.05)",
                  border: "1px solid rgba(59,130,246,0.15)",
                }}
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  806
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold text-foreground">_806</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
                    >
                      Pattern Advisor
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    "Looking back at this prediction, it falls under the{" "}
                    <strong className="text-foreground">Lion</strong> pattern —
                    historically strong, but always subject to change."
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/50 mt-2 text-center italic">
                This is what an _806 message looks like in the prediction popup.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="my-6">
              <img
                src="https://vbxcfpdijgxzqcbpzljw.supabase.co/storage/v1/object/public/assets/06.png"
                alt="Status page modal showing the _806 advisor message"
                className="w-full rounded-xl border border-border shadow-lg"
              />
              <p className="text-xs text-muted-foreground/50 text-center mt-2">
                The prediction popup — showing MK-806's pick and _806's pattern advice
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={AlertCircle} color="#f59e0b" bg="#f59e0b10">
                Because _806 only uses the past, it can be wrong about the present.
                If _806 says a pattern has struggled historically, that doesn't mean
                this specific prediction will lose. MK-806 might have spotted something
                the historical data hasn't caught up with yet. The decision is always yours.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── Section 3 ─────────────────────────────────────────────────── */}
          <GuideSection
            index={3}
            icon={BarChart2}
            iconColor="#10b981"
            iconBg="#10b98118"
            badge="Section 03"
            title="How to Use the Pattern Insights"
          >
            <motion.div variants={fadeUp}>
              <p>
                Pattern advice is most useful when you use it as one ingredient in a
                bigger picture — not as the final word. Here's a simple way to think
                about it:
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="grid sm:grid-cols-3 gap-3 mt-2">
                {[
                  {
                    step: "1",
                    title: "Check the message",
                    desc: 'Read what _806 says in the prediction popup. Is it a "win" pattern, "loss" pattern, or not enough data yet?',
                    color: "#f5a623",
                  },
                  {
                    step: "2",
                    title: "Look at the numbers",
                    desc: "Jump to the Pattern Analyser page and find that specific animal. How many predictions does it have? What's the actual win rate?",
                    color: "#10b981",
                  },
                  {
                    step: "3",
                    title: "Add your judgment",
                    desc: "Combine the pattern data with what you know about the teams, the form, and the context. You know football — trust that too.",
                    color: "#3b82f6",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold mb-3"
                      style={{ background: item.color }}
                    >
                      {item.step}
                    </div>
                    <p className="font-semibold text-foreground text-sm mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <p>
                Patterns with fewer than 5 completed predictions are marked as{" "}
                <code
                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--color-foreground)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  INSUFFICIENT DATA
                </code>
                . When you see this, treat the advice as a placeholder — there simply
                isn't enough history to say anything meaningful.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={ShieldCheck} color="#10b981" bg="#10b98110">
                Patterns never override MK-806's prediction. They exist alongside it,
                as context — not as instructions.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── Section 4 ─────────────────────────────────────────────────── */}
          <GuideSection
            index={4}
            icon={Zap}
            iconColor="#f5a623"
            iconBg="#f5a62318"
            badge="Section 04"
            title="MK-806 vs _806 — Two Different Minds"
          >
            <motion.div variants={fadeUp}>
              <p>
                They share a name, but they think completely differently. Here's the
                simplest way to tell them apart:
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="grid sm:grid-cols-2 gap-4 mt-2">
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(245,166,35,0.04)",
                    border: "1px solid rgba(245,166,35,0.2)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #f5a623, #e08c12)" }}
                    >
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-foreground text-sm">MK-806</p>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: "#f5a62399" }}>
                        God of Time
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {[
                      <>Looks <strong className="text-foreground">forward</strong> — simulates thousands of possible futures</>,
                      <>Decides <strong className="text-foreground">which bet to pick</strong></>,
                      <>Runs every morning before the day's fixtures</>,
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "#f5a623" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(59,130,246,0.04)",
                    border: "1px solid rgba(59,130,246,0.2)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold">
                      806
                    </div>
                    <div>
                      <p className="font-heading font-bold text-foreground text-sm">_806</p>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: "#60a5fa99" }}>
                        The Historian
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {[
                      <>Looks <strong className="text-foreground">backward</strong> — reviews how similar patterns performed</>,
                      <>Tracks win/loss history across all 18 pattern combinations</>,
                      <>Provides <strong className="text-foreground">context</strong>, not predictions</>,
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "#60a5fa" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <p>
                When these two align — when MK-806 picks a bet and _806 confirms the
                pattern has historically done well — that's when you have the strongest
                overall signal. When they point in different directions, that's valuable
                information too.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Callout icon={RefreshCw} color="#3b82f6" bg="#3b82f610">
                Patterns update daily as more predictions resolve. A pattern that's been
                on a winning run for weeks can shift. That's not a flaw — it's the system
                being honest about how things change.
              </Callout>
            </motion.div>
          </GuideSection>

          {/* ── Section 5: Pattern Animals ────────────────────────────────── */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="rounded-2xl border border-border bg-card overflow-hidden"
            style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.12)" }}
          >
            <motion.div variants={fadeUp} className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                  style={{
                    background: "rgba(245,166,35,0.1)",
                    border: "1px solid rgba(245,166,35,0.2)",
                  }}
                >
                  <TrendingUp className="h-5 w-5" style={{ color: "#f5a623" }} />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">
                    Section 05
                  </p>
                  <h2 className="text-xl font-heading font-bold text-foreground leading-tight">
                    Pattern Animals — Meet the Cast
                  </h2>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Each card represents one of the 18 patterns MK-806 uses.{" "}
                <strong className="text-foreground">Tap any card</strong> to see a detailed
                breakdown of that pattern and what it means.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PATTERN_ANIMALS.map((pa, i) => (
                  <AnimalCard
                    key={pa.animal}
                    pa={pa}
                    index={i}
                    onClick={() => setSelected(pa)}
                  />
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-6 text-center">
                Historical performance is tracked on the{" "}
                <Link to="/patterns" className="text-gold hover:underline font-medium">
                  Pattern Analyser page
                </Link>{" "}
                — check back regularly as patterns evolve.
              </p>
            </motion.div>
          </motion.section>

          {/* ── Responsible use reminder ──────────────────────────────────── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-2xl p-6"
            style={{
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.15)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="font-heading font-semibold text-foreground">A reminder</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              10 Odds is for informational purposes only. Neither MK-806 nor _806
              constitutes financial or betting advice. Patterns reflect past performance,
              which does not guarantee future results. Always bet responsibly, only stake
              what you can afford to lose, and make your own decisions.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link to="/terms" className="text-xs text-gold hover:underline">Terms of Service</Link>
              <Link to="/privacy" className="text-xs text-gold hover:underline">Privacy Policy</Link>
              <Link to="/about" className="text-xs text-gold hover:underline">About 10 Odds</Link>
            </div>
          </motion.div>

        </div>
      </div>
    </Layout>
  );
};

export default GuidePage;