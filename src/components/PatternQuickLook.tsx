import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  X, RefreshCw, Crown, Skull, TrendingUp, TrendingDown, Minus, HelpCircle, ArrowRight,
} from "lucide-react";
import { PATTERN_ANIMALS, getAnimalByLabel } from "@/lib/patternAnimals";
import AnimalIcon from "@/components/AnimalIcon";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

type PatternType = "WIN" | "LOSS" | "NEUTRAL" | "INSUFFICIENT_DATA";

interface PatternData {
  id: number;
  pattern_label: string;
  total_predictions: number;
  wins: number;
  losses: number;
  win_rate: number;
  pattern_type: PatternType;
  avg_odds: number;
  updated_at: string;
}

// ─── Animal images (same as Guide Page) ──────────────────────────────────────
const ANIMAL_IMG: Record<string, string> = {
  Lion:    "https://images.pexels.com/photos/36714661/pexels-photo-36714661.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Eagle:   "https://images.pexels.com/photos/29186242/pexels-photo-29186242.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Bear:    "https://images.pexels.com/photos/162368/bear-zoo-wildlife-animal-162368.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Bull:    "https://images.pexels.com/photos/28410820/pexels-photo-28410820.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Horse:   "https://images.pexels.com/photos/13340069/pexels-photo-13340069.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Rhino:   "https://images.pexels.com/photos/6156855/pexels-photo-6156855.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Fox:     "https://images.pexels.com/photos/35192767/pexels-photo-35192767.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Owl:     "https://images.pexels.com/photos/17404870/pexels-photo-17404870.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Squirrel:"https://images.pexels.com/photos/34613710/pexels-photo-34613710.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Deer:    "https://images.pexels.com/photos/18149113/pexels-photo-18149113.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Frog:    "https://images.pexels.com/photos/8465220/pexels-photo-8465220.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Mole:    "https://images.pexels.com/photos/88512/mole-nature-animals-molehills-88512.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Rabbit:  "https://images.pexels.com/photos/6546550/pexels-photo-6546550.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Hamster: "https://images.pexels.com/photos/4520484/pexels-photo-4520484.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Turtle:  "https://images.pexels.com/photos/38452/pexels-photo-38452.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Mouse:   "https://images.pexels.com/photos/301448/pexels-photo-301448.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Ant:     "https://images.pexels.com/photos/36498258/pexels-photo-36498258.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  Worm:    "https://cdn.pixabay.com/photo/2019/06/08/22/46/fishing-4261191_1280.jpg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
};

// ─── Random descriptive phrases ──────────────────────────────────────────────
const WIN_PHRASES = [
  "This pattern is currently performing well historically.",
  "Past results show this pattern has a strong edge.",
  "When this pattern appears, it's been a reliable signal.",
  "Statistically, this pattern has delivered more wins than losses.",
  "The data leans in favour of this being a high‑value pattern.",
];
const LOSS_PHRASES = [
  "Historically, this pattern has struggled to convert.",
  "Past data suggests this pattern is less dependable.",
  "This pattern has shown below‑average results.",
  "The numbers point toward cautious expectations here.",
  "This pattern hasn't provided a consistent edge yet.",
];
const NEUTRAL_PHRASES = [
  "This pattern is sitting in the middle — no strong trend.",
  "Mixed results keep this pattern in neutral territory.",
  "There isn't enough of a lean to call it either way.",
  "The pattern hasn't carved out a clear identity yet.",
  "Expect inconsistency from this combination.",
];
const INSUFFICIENT_PHRASES = [
  "Not enough predictions to draw conclusions.",
  "This pattern is still too new to judge.",
  "We're waiting for more data before we can read it.",
  "Insufficient history — the jury is still out.",
  "A few more results will help define this pattern.",
];

function randomPhrase(type: PatternType): string {
  const arr =
    type === "WIN" ? WIN_PHRASES
    : type === "LOSS" ? LOSS_PHRASES
    : type === "NEUTRAL" ? NEUTRAL_PHRASES
    : INSUFFICIENT_PHRASES;
  return arr[Math.floor(Math.random() * arr.length)];
}

const PATTERN_CONFIG: Record<PatternType, { icon: React.ElementType; color: string; label: string }> = {
  WIN: { icon: TrendingUp, color: "#34d399", label: "WIN" },
  LOSS: { icon: TrendingDown, color: "#fb7185", label: "LOSS" },
  NEUTRAL: { icon: Minus, color: "#fbbf24", label: "NEUTRAL" },
  INSUFFICIENT_DATA: { icon: HelpCircle, color: "#9ca3af", label: "INSUFFICIENT" },
};

// ─── Tier logic (same as Guide Page) ─────────────────────────────────────────
function getTier(confidence: string, evType: string) {
  const c = confidence.toLowerCase();
  const e = evType.toLowerCase();
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

// ─── Animal card (exactly like Guide Page, badges outside) ──────────────────
function AnimalCard({
  animalName,
  onClick,
  isBest,
  isWorst,
}: {
  animalName: string;
  onClick: () => void;
  isBest: boolean;
  isWorst: boolean;
}) {
  const animal = PATTERN_ANIMALS.find((a) => a.animal === animalName);
  if (!animal) return null;
  const img = ANIMAL_IMG[animalName];
  const [hover, setHover] = useState(false);
  const tier = getTier(animal.confidence, animal.evType);

  return (
    <div className="relative">
      {/* Crown / Skull placed outside the card, above */}
      {isBest && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Crown className="h-6 w-6 text-amber-400 drop-shadow-md" />
        </motion.div>
      )}
      {isWorst && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Skull className="h-6 w-6 text-red-400 drop-shadow-md" />
        </motion.div>
      )}

      <motion.button
        whileHover={{ scale: 1.03, y: -4 }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className="relative rounded-2xl overflow-hidden border bg-[#111115] cursor-pointer text-left w-full transition-shadow duration-300"
        style={{
          borderColor: hover ? tier.ring : 'rgba(255,255,255,0.06)',
          boxShadow: hover
            ? `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 25px ${tier.dim}`
            : isBest
            ? `0 0 15px rgba(245,158,11,0.25)`
            : 'none',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="relative h-32 overflow-hidden bg-gray-900">
          {img ? (
            <img
              src={img}
              alt={animalName}
              loading="lazy"
              className="w-full h-full object-cover object-center transition-transform duration-700"
              style={{ transform: hover ? 'scale(1.08)' : 'scale(1)' }}
              onError={(e) => (e.currentTarget.style.opacity = '0')}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <AnimalIcon animal={animalName} size={42} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111115] to-transparent" />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black font-mono tracking-widest text-black" style={{ background: tier.color }}>
            {tier.label}
          </div>
          <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm border flex items-center justify-center" style={{ borderColor: tier.ring }}>
            <AnimalIcon animal={animalName} size={14} style={{ color: tier.color }} />
          </div>
        </div>

        <div className="p-3.5">
          <div className="text-[15px] font-bold font-serif text-white leading-tight mb-0.5">{animalName}</div>
          <div className="text-[10px] font-mono tracking-widest text-gray-700 mb-2">{animal.originalLabel}</div>
          <div className="flex gap-1.5 mb-2">
            <span className="text-[9px] font-mono tracking-wide bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-gray-400">{animal.confidence}</span>
            <span className="text-[9px] font-mono tracking-wide bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-gray-400">{animal.evType}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500 line-clamp-2">{animal.description}</p>
          <div className="mt-2 text-[11px] font-bold font-mono tracking-wide flex items-center gap-1 opacity-0 transition-opacity" style={{ color: tier.color, opacity: hover ? 1 : 0 }}>
            EXPAND <ArrowRight size={11} />
          </div>
        </div>
      </motion.button>
    </div>
  );
}

// ─── Detail pop‑up ──────────────────────────────────────────────────────────
function AnimalDetailModal({
  label,
  onClose,
  row,
}: {
  label: string;
  onClose: () => void;
  row?: PatternData;
}) {
  const animal = PATTERN_ANIMALS.find((a) => a.originalLabel === label);
  if (!animal) return null;

  const tier = getTier(animal.confidence, animal.evType);
  const type = row?.pattern_type ?? "INSUFFICIENT_DATA";
  const cfg = PATTERN_CONFIG[type];
  const Icon = cfg.icon;
  const phrase = randomPhrase(type);

  return (
    <AnimatePresence>
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
          style={{ borderColor: tier.ring, boxShadow: `0 0 80px ${tier.dim}` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left – photo */}
          <div className="relative w-full md:w-5/12 min-h-[280px] md:min-h-[440px] bg-gray-900 overflow-hidden">
            <img
              src={ANIMAL_IMG[animal.animal] ?? ANIMAL_IMG.Fox}
              alt={animal.animal}
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0d0d10] md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#0d0d10] bg-gradient-to-t from-[#0d0d10]/80 to-transparent" />
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-widest text-black" style={{ background: tier.color }}>
              {tier.label}
            </div>
            <div className="absolute bottom-5 left-5">
              <div className="text-[10px] font-mono tracking-widest uppercase opacity-70" style={{ color: tier.color }}>{animal.originalLabel}</div>
              <h2 className="text-4xl font-black font-serif text-white leading-none mt-1 drop-shadow-lg">{animal.animal}</h2>
            </div>
          </div>

          {/* Right – info */}
          <div className="relative flex-1 p-6 md:p-8 flex flex-col">
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition">
              <X size={14} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center border" style={{ background: tier.dim, borderColor: tier.ring }}>
                <AnimalIcon animal={animal.animal} size={22} style={{ color: tier.color }} />
              </div>
              <div>
                <div className="text-xl font-black font-serif text-white leading-tight">The {animal.animal}</div>
                <div className="text-[11px] font-mono tracking-wide text-gray-600 mt-0.5">Pattern {PATTERN_ANIMALS.indexOf(animal) + 1} / {PATTERN_ANIMALS.length}</div>
              </div>
            </div>

            {/* Live stats + phrase */}
            {row ? (
              <>
                <div className="flex gap-2 mb-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex-1">
                    <div className="text-[9px] font-mono tracking-widest text-gray-600 mb-1">WIN RATE</div>
                    <div className="text-sm font-bold" style={{ color: cfg.color }}>{row.win_rate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex-1">
                    <div className="text-[9px] font-mono tracking-widest text-gray-600 mb-1">PATTERN TYPE</div>
                    <div className="flex items-center gap-1 text-sm font-bold" style={{ color: cfg.color }}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </div>
                  </div>
                </div>
                <div className="h-px bg-white/5 mb-4" />
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
                  <p className="text-sm leading-relaxed text-gray-300">{phrase}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-400">No live data yet for this pattern.</div>
            )}

            <p className="text-sm leading-relaxed text-gray-400 flex-1">{animal.description}</p>

            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-700">UPDATED DAILY</span>
              <button onClick={onClose} className="text-xs font-bold font-mono tracking-wide flex items-center gap-1" style={{ color: tier.color }}>
                CLOSE <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
const PatternQuickLook = () => {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [patternData, setPatternData] = useState<PatternData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("pattern_analysis").select("*");
    setPatternData((data as PatternData[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const { bestLabel, worstLabel } = useMemo(() => {
    const eligible = patternData.filter((p) => p.total_predictions >= 5);
    if (eligible.length === 0) return { bestLabel: null, worstLabel: null };
    const sorted = [...eligible].sort((a, b) => b.win_rate - a.win_rate);
    return {
      bestLabel: sorted[0]?.pattern_label ?? null,
      worstLabel: sorted[sorted.length - 1]?.pattern_label ?? null,
    };
  }, [patternData]);

  const getPatternRow = (label: string) => patternData.find((p) => p.pattern_label === label) ?? undefined;

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-32 right-6 z-40 flex items-center gap-2 text-sm font-bold px-5 py-3.5 rounded-2xl shadow-2xl"
        style={{
          background: "linear-gradient(135deg,#6366f1,#4f46e5)",
          boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
          color: "#fff",
        }}
      >
        <TrendingUp className="h-4 w-4" />
        Patterns
      </motion.button>

      {/* Main grid modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg"
            />
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 30 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="w-full max-w-5xl bg-[#0d0d10] border border-white/10 rounded-2xl shadow-2xl p-6 my-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white font-serif">All Pattern Animals</h2>
                    <p className="text-sm text-gray-400 mt-1">Tap any card for live stats</p>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-20">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {PATTERN_ANIMALS.map((pa) => (
                      <AnimalCard
                        key={pa.animal}
                        animalName={pa.animal}
                        isBest={pa.originalLabel === bestLabel}
                        isWorst={pa.originalLabel === worstLabel}
                        onClick={() => setSelectedLabel(pa.originalLabel)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      {selectedLabel && (
        <AnimalDetailModal
          label={selectedLabel}
          onClose={() => setSelectedLabel(null)}
          row={getPatternRow(selectedLabel)}
        />
      )}
    </>
  );
};

export default PatternQuickLook;