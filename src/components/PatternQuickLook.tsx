import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  X, RefreshCw, Crown, Skull, TrendingUp, TrendingDown, Minus, HelpCircle, ArrowRight, Sparkles, Flame,
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

// ─── Animal images (unchanged) ────────────────────────────────────────────────
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

// ─── 50 WIN phrases ───────────────────────────────────────────────────────────
const WIN_PHRASES = [
  "This pattern is absolutely on fire — the data speaks volumes.",
  "When this signal hits, history has rewarded the bold.",
  "A track record that commands respect and confidence.",
  "The numbers behind this pattern are genuinely impressive.",
  "This one's been punching above its weight consistently.",
  "Elite-level performance backed by real statistical evidence.",
  "Every time this pattern surfaces, it's brought results.",
  "The data is singing — this pattern carries serious weight.",
  "A proven performer that keeps delivering across the board.",
  "Statistically, this is as clean an edge as you'll find.",
  "This pattern has quietly built a legacy of winning moments.",
  "The win rate here isn't luck — it's structured dominance.",
  "Historically, betting against this pattern has been costly.",
  "Sharp data, sharp results — this pattern earns its stripes.",
  "A signal worth watching every single time it appears.",
  "This pattern has outlasted the noise and stayed profitable.",
  "The trend is real, the data is solid, the edge is there.",
  "This one shows up and delivers — pattern of champions.",
  "Consistent. Reliable. Historically dominant. Enough said.",
  "The best patterns don't shout — they just keep winning.",
  "This signal has been on a remarkable run historically.",
  "When the data stacks up this cleanly, it's worth trusting.",
  "A pattern with the win rate to back up its reputation.",
  "The historical edge here is undeniable and well-earned.",
  "Patterns like this are why data-driven betting wins long term.",
  "This has proven its value time and time again.",
  "The signal is clean, the record is strong, the edge is real.",
  "High confidence backed by a history of positive returns.",
  "This pattern doesn't bluff — it delivers when it matters.",
  "Every metric points in the same direction: upward.",
  "The data on this one is as encouraging as it gets.",
  "This pattern carries momentum that the stats fully support.",
  "A record built on precision — not luck, not chance.",
  "The upside here has been validated over many predictions.",
  "This is the kind of pattern that sharpens your conviction.",
  "Strong edge, strong history, strong reason to take notice.",
  "This pattern has been one of the most rewarding signals.",
  "The numbers are aligned and the trend is distinctly upward.",
  "A standout performer in the full pattern landscape.",
  "This signal has a history of showing up exactly when it counts.",
  "Confidence is earned — and this pattern has earned it fully.",
  "The statistical case for this pattern is overwhelmingly positive.",
  "Disciplined tracking of this pattern has historically paid off.",
  "This is what a high-value signal looks like in practice.",
  "The win rate says it all — this pattern is a serious player.",
  "Sharp, consistent, and historically profitable — a rare combo.",
  "This pattern rewards patience and attention to detail.",
  "The data makes a compelling case, and the history backs it up.",
  "Few patterns carry this level of consistently positive evidence.",
  "Tracking this pattern has historically been worth every moment.",
];

// ─── 50 LOSS phrases ──────────────────────────────────────────────────────────
const LOSS_PHRASES = [
  "This pattern has tested patience more than it's rewarded it.",
  "The historical data here is sending cautious signals.",
  "A pattern that's struggled to find its footing consistently.",
  "The numbers haven't been kind to this one over time.",
  "This signal has underdelivered more often than not.",
  "Tread lightly — the history here is a little rough.",
  "This pattern's track record asks for serious caution.",
  "Not every pattern shines — this one is still finding its spark.",
  "The data here leans toward the challenging end of the spectrum.",
  "A pattern that's due for a reset before trust is rebuilt.",
  "The win side of this pattern's ledger looks a bit thin.",
  "This signal has had a tough run by the numbers.",
  "Historically, this pattern has delivered more doubt than delight.",
  "The data behind this one currently isn't doing it any favors.",
  "This pattern is still searching for its breakout moment.",
  "More losses than wins — the record reflects a rough patch.",
  "This one hasn't been able to establish a consistent edge.",
  "The statistics suggest this pattern needs time to recalibrate.",
  "A historically low win rate that deserves honest acknowledgment.",
  "This pattern's performance has been a work in progress at best.",
  "The numbers flag this as a proceed-with-care signal for now.",
  "This pattern hasn't quite cracked the code on consistency.",
  "The historical data paints a picture worth approaching carefully.",
  "This signal's record is a reminder that not all edges are equal.",
  "A pattern that's built more caution than confidence so far.",
  "Until the data turns, this one stays in the watchful zone.",
  "The win rate here is a signal to manage expectations carefully.",
  "This pattern is currently sitting in a challenging stretch.",
  "The stats are honest, and right now they're asking for patience.",
  "Historical performance suggests this signal needs more proof.",
  "This pattern hasn't found its rhythm in the data yet.",
  "A tough streak that the numbers are clear about — for now.",
  "This signal is worth tracking, but the trend isn't favoring it.",
  "The current data asks for restraint rather than confidence.",
  "This pattern is still in the process of building credibility.",
  "More red than green in the record — acknowledged and noted.",
  "A signal that's been more hindrance than help historically.",
  "The performance numbers here call for a careful approach.",
  "This pattern's history has been more inconsistent than ideal.",
  "The data is being transparent — this one's had a rough go.",
  "Not the edge we'd hope for, but the data doesn't lie.",
  "This pattern is in a rebuilding phase by any honest measure.",
  "The stats here point to a pattern still proving its worth.",
  "A signal that's underperformed but may be worth watching.",
  "Historical results here warrant a cautious, measured stance.",
  "This one's track record has been a consistent challenge.",
  "The pattern's numbers call for careful positioning right now.",
  "This signal is working through a difficult chapter historically.",
  "The data is clear — this pattern has room to improve.",
  "Not every signal fires — this one's been cooling for a while.",
];

// ─── 50 NEUTRAL phrases ───────────────────────────────────────────────────────
const NEUTRAL_PHRASES = [
  "This pattern is balanced — equally capable of either outcome.",
  "The data here is playing it straight down the middle.",
  "Neither strongly bullish nor bearish — a true 50/50 read.",
  "This signal is sitting in an interesting no-man's land.",
  "Mixed results have kept this pattern in neutral territory.",
  "The pattern is alive but hasn't committed to a direction yet.",
  "History here is a coin flip — fascinating but inconclusive.",
  "No dominant trend, but this pattern stays worth watching.",
  "The data is balanced and the signal is genuinely open-ended.",
  "This one could break either way — context will be key.",
  "Neutral doesn't mean boring — it means the story's still forming.",
  "A pattern in equilibrium, waiting for the next chapter.",
  "The win and loss columns are competing evenly here.",
  "This pattern hasn't tipped its hand to either side yet.",
  "Right in the middle of the performance spectrum — watch closely.",
  "The data is honest about this one's ambiguity — and that's fine.",
  "This signal is a blank canvas — results will define it.",
  "Neither a red flag nor a green light — a steady amber.",
  "Balanced history makes this a pattern to follow carefully.",
  "The numbers here are neutral, but the potential is real.",
  "This pattern is in a state of interesting equilibrium.",
  "There's no clear lean here, which makes it worth monitoring.",
  "The performance balance here is surprisingly even.",
  "This signal sits at the intersection of opportunity and uncertainty.",
  "A genuinely mixed record that keeps this pattern unpredictable.",
  "The data hasn't chosen a side — and that itself is useful info.",
  "This pattern is in development mode — neither rising nor falling.",
  "No strong directional bias yet, but the foundation is solid.",
  "Consistent inconsistency — this one is still finding its identity.",
  "The signal is present, the direction is still forming.",
  "This pattern is a fascinating watch — the verdict is still open.",
  "Neither pattern type owns this signal — it's genuinely balanced.",
  "The data reflects a pattern that hasn't committed either way.",
  "Neutral can be the start of something — stay tuned on this one.",
  "This pattern is steady in the middle — and that has its own value.",
  "History here is a shared story between wins and losses.",
  "The data is perfectly split, which makes this uniquely interesting.",
  "No dominant theme, but this pattern is very much alive.",
  "A neutral read that deserves attention without expectation.",
  "This one is in a genuinely open chapter — no conclusion yet.",
  "The signal is active but the trend hasn't crystallized.",
  "Balanced performance makes this pattern a thoughtful challenge.",
  "This pattern hasn't revealed its true face to the data yet.",
  "The equilibrium here is real — and could break either way.",
  "An intriguing middle ground — the data is still being written.",
  "No edge declared, no edge denied — a truly open pattern.",
  "The balanced record here invites patience and continued observation.",
  "This pattern is undeclared — its next chapter could go anywhere.",
  "A steady, centered signal still searching for its defining run.",
  "Right now this pattern is the calm before a clearer trend.",
];

// ─── 50 INSUFFICIENT_DATA phrases ─────────────────────────────────────────────
const INSUFFICIENT_PHRASES = [
  "The data is still building — this pattern's story is just beginning.",
  "A fresh signal with a bright future ahead of it.",
  "Not enough history yet, but every great pattern started here.",
  "Still early days — watch this space with genuine curiosity.",
  "The jury is out, but the potential is very much alive.",
  "This pattern is in its origin story — best is yet to come.",
  "Too new to judge, but worth watching from the very start.",
  "The data runway is short, but the signal is already interesting.",
  "Early-stage patterns are where the next big edges are born.",
  "Patience is key — this one needs more predictions to reveal itself.",
  "The clock is ticking and data is accumulating — stay close.",
  "This pattern hasn't had enough reps yet to show its true form.",
  "We're in discovery mode — more data will tell the full story.",
  "A pattern that's fresh out of the gate and gaining traction.",
  "Insufficient data doesn't mean uninspiring — it means wait and see.",
  "The sample size is small, but the signal is already on the board.",
  "This one is still warming up — give it the time it deserves.",
  "Data is the fuel and this pattern is still filling the tank.",
  "Every elite pattern once had too few predictions to judge.",
  "This signal is in its infancy — exciting times are ahead.",
  "The foundation is being laid right now — check back soon.",
  "A new entrant in the pattern landscape — watch it closely.",
  "We don't have enough calls yet to make a confident read.",
  "The pattern is live, the data is growing — more to come.",
  "Early signals can turn into legends — this one's on the list.",
  "It's too soon to score this signal, but too interesting to ignore.",
  "This pattern is still earning its data points — stay patient.",
  "New patterns deserve time to breathe and accumulate results.",
  "The first few predictions are in — the full picture is developing.",
  "Insufficient data is just another way of saying: watch this space.",
  "This signal is proving itself one prediction at a time.",
  "The data set is young but the curiosity it sparks is real.",
  "Not yet enough to judge, but absolutely enough to track.",
  "This pattern is in its opening act — the best may be ahead.",
  "A signal that's building momentum one result at a time.",
  "The record is short, but every entry in it matters.",
  "Give this one time — the best edges weren't built overnight.",
  "This pattern is accumulating history with every new prediction.",
  "Early-stage, eyes open — this signal has real promise.",
  "The data conversation on this pattern is just getting started.",
  "We're watching a pattern establish itself in real time.",
  "Every reliable signal began as an unproven one — exciting.",
  "This one's still in the lab, but the experiment looks promising.",
  "More predictions will help this pattern reveal its true character.",
  "A signal in the making — history is being written right now.",
  "Not enough data to draw lines, but enough to draw attention.",
  "This pattern is still calibrating — keep it on your radar.",
  "The data is incoming — this pattern is worth the wait.",
  "Emerging patterns are the future — and this one is emerging.",
  "A blank slate with real potential — the first chapter of many.",
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
  WIN:               { icon: TrendingUp,   color: "#34d399", label: "WIN" },
  LOSS:              { icon: TrendingDown, color: "#fb7185", label: "LOSS" },
  NEUTRAL:           { icon: Minus,        color: "#fbbf24", label: "NEUTRAL" },
  INSUFFICIENT_DATA: { icon: HelpCircle,   color: "#9ca3af", label: "INSUFFICIENT" },
};

function getTier(confidence: string, evType: string) {
  const c = confidence.toLowerCase();
  const e = evType.toLowerCase();
  const hiC = c.includes("high");
  const hiE = e.includes("high") || e.includes("positive");
  const loC = c.includes("low");
  const loE = e.includes("low") || e.includes("negative");
  if (hiC && hiE) return { label: "ELITE",    color: "#f5a623", dim: "rgba(245,166,35,0.18)",  ring: "rgba(245,166,35,0.4)" };
  if (hiC)        return { label: "STRONG",   color: "#22c55e", dim: "rgba(34,197,94,0.15)",   ring: "rgba(34,197,94,0.38)" };
  if (hiE)        return { label: "VALUE",    color: "#3b82f6", dim: "rgba(59,130,246,0.15)",  ring: "rgba(59,130,246,0.38)" };
  if (loC && loE) return { label: "WEAK",     color: "#ef4444", dim: "rgba(239,68,68,0.15)",   ring: "rgba(239,68,68,0.35)" };
  return                  { label: "MODERATE",color: "#a855f7", dim: "rgba(168,85,247,0.15)",  ring: "rgba(168,85,247,0.35)" };
}

// ─── Crown sparkle particles ──────────────────────────────────────────────────
function CrownParticles() {
  const particles = Array.from({ length: 6 }, (_, i) => i);
  return (
    <>
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4,
            height: 4,
            background: i % 2 === 0 ? "#fbbf24" : "#fde68a",
            top: "50%",
            left: "50%",
          }}
          animate={{
            x: [0, Math.cos((i / 6) * Math.PI * 2) * 18],
            y: [0, Math.sin((i / 6) * Math.PI * 2) * 18],
            opacity: [0, 1, 0],
            scale: [0, 1.4, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.8,
            delay: i * 0.3,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

// ─── Skull smoke particles ────────────────────────────────────────────────────
function SkullParticles() {
  const particles = Array.from({ length: 5 }, (_, i) => i);
  return (
    <>
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 5,
            height: 5,
            background: i % 2 === 0 ? "#f87171" : "#fca5a5",
            top: "50%",
            left: "50%",
          }}
          animate={{
            x: [0, (i - 2) * 7],
            y: [0, -(i * 5 + 8)],
            opacity: [0, 0.9, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            delay: i * 0.25,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

// ─── Animal card ──────────────────────────────────────────────────────────────
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
    <div className="relative pt-5">
      {/* ── BEST: Crown + golden halo + particles ── */}
      {isBest && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
          {/* Glow disc behind crown */}
          <motion.div
            className="absolute rounded-full"
            style={{ width: 44, height: 44, background: "radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)", top: -4 }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
          {/* Particles */}
          <div className="relative" style={{ width: 0, height: 0 }}>
            <CrownParticles />
          </div>
          {/* Crown icon */}
          <motion.div
            animate={{
              y: [0, -4, 0],
              rotate: [-6, 6, -6],
              filter: [
                "drop-shadow(0 0 6px #fbbf24)",
                "drop-shadow(0 0 14px #fde68a)",
                "drop-shadow(0 0 6px #fbbf24)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <Crown className="h-7 w-7 text-amber-400" />
          </motion.div>
          {/* #1 label */}
          <motion.span
            className="text-[8px] font-black font-mono tracking-widest mt-0.5 rounded-full px-1.5 py-0.5"
            style={{ background: "linear-gradient(90deg,#f59e0b,#fde68a)", color: "#000" }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            #1 BEST
          </motion.span>
        </div>
      )}

      {/* ── WORST: Skull + red smoke + dripping aura ── */}
      {isWorst && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
          {/* Pulsing red disc */}
          <motion.div
            className="absolute rounded-full"
            style={{ width: 44, height: 44, background: "radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 70%)", top: -4 }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          />
          {/* Particles */}
          <div className="relative" style={{ width: 0, height: 0 }}>
            <SkullParticles />
          </div>
          {/* Skull icon */}
          <motion.div
            animate={{
              y: [0, 2, 0],
              scale: [1, 1.15, 1],
              filter: [
                "drop-shadow(0 0 5px #ef4444)",
                "drop-shadow(0 0 14px #f87171)",
                "drop-shadow(0 0 5px #ef4444)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          >
            <Skull className="h-7 w-7 text-red-500" />
          </motion.div>
          {/* WORST label */}
          <motion.span
            className="text-[8px] font-black font-mono tracking-widest mt-0.5 rounded-full px-1.5 py-0.5"
            style={{ background: "linear-gradient(90deg,#ef4444,#fca5a5)", color: "#000" }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          >
            WORST
          </motion.span>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.04, y: -5 }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className="relative rounded-2xl overflow-hidden cursor-pointer text-left w-full"
        style={{
          background: isBest
            ? "linear-gradient(145deg, #1a1500, #111115)"
            : isWorst
            ? "linear-gradient(145deg, #1a0505, #111115)"
            : "#111115",
          border: isBest
            ? "1px solid rgba(251,191,36,0.45)"
            : isWorst
            ? "1px solid rgba(239,68,68,0.4)"
            : hover
            ? `1px solid ${tier.ring}`
            : "1px solid rgba(255,255,255,0.06)",
          boxShadow: isBest
            ? "0 0 28px rgba(251,191,36,0.22), 0 8px 30px rgba(0,0,0,0.5)"
            : isWorst
            ? "0 0 28px rgba(239,68,68,0.18), 0 8px 30px rgba(0,0,0,0.5)"
            : hover
            ? `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 25px ${tier.dim}`
            : "none",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Image area */}
        <div className="relative h-32 overflow-hidden bg-gray-900">
          {img ? (
            <img
              src={img}
              alt={animalName}
              loading="lazy"
              className="w-full h-full object-cover object-center transition-transform duration-700"
              style={{ transform: hover ? "scale(1.08)" : "scale(1)" }}
              onError={(e) => (e.currentTarget.style.opacity = "0")}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <AnimalIcon animal={animalName} size={42} />
            </div>
          )}
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: isBest
                ? "linear-gradient(to top, #1a1500 0%, transparent 60%)"
                : isWorst
                ? "linear-gradient(to top, #1a0505 0%, transparent 60%)"
                : "linear-gradient(to top, #111115 0%, transparent 60%)",
            }}
          />
          {/* Best golden shimmer overlay */}
          {isBest && (
            <motion.div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, transparent 60%)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
          {/* Worst red tint overlay */}
          {isWorst && (
            <motion.div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, transparent 60%)" }}
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            />
          )}

          {/* Tier badge */}
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black font-mono tracking-widest text-black"
            style={{ background: tier.color }}
          >
            {tier.label}
          </div>
          {/* Animal icon badge */}
          <div
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm border flex items-center justify-center"
            style={{ borderColor: tier.ring }}
          >
            <AnimalIcon animal={animalName} size={14} style={{ color: tier.color }} />
          </div>
        </div>

        {/* Card body */}
        <div className="p-3.5">
          <div className="text-[15px] font-bold font-serif text-white leading-tight mb-0.5">{animalName}</div>
          <div className="text-[10px] font-mono tracking-widest text-gray-600 mb-2">{animal.originalLabel}</div>
          <div className="flex gap-1.5 mb-2">
            <span className="text-[9px] font-mono tracking-wide bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-gray-400">{animal.confidence}</span>
            <span className="text-[9px] font-mono tracking-wide bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-gray-400">{animal.evType}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500 line-clamp-2">{animal.description}</p>
          <div
            className="mt-2 text-[11px] font-bold font-mono tracking-wide flex items-center gap-1 transition-opacity duration-200"
            style={{ color: tier.color, opacity: hover ? 1 : 0 }}
          >
            VIEW STATS <ArrowRight size={11} />
          </div>
        </div>
      </motion.button>
    </div>
  );
}

// ─── Detail pop‑up ────────────────────────────────────────────────────────────
function AnimalDetailModal({
  label,
  onClose,
  row,
  isBest,
  isWorst,
}: {
  label: string;
  onClose: () => void;
  row?: PatternData;
  isBest: boolean;
  isWorst: boolean;
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.87, y: 48 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 28 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[760px] rounded-3xl overflow-hidden flex flex-col md:flex-row"
          style={{
            background: "#0d0d10",
            border: isBest
              ? "1px solid rgba(251,191,36,0.5)"
              : isWorst
              ? "1px solid rgba(239,68,68,0.45)"
              : `1px solid ${tier.ring}`,
            boxShadow: isBest
              ? `0 0 80px rgba(251,191,36,0.2), 0 0 180px rgba(251,191,36,0.06)`
              : isWorst
              ? `0 0 80px rgba(239,68,68,0.18), 0 0 180px rgba(239,68,68,0.05)`
              : `0 0 80px ${tier.dim}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left – photo */}
          <div className="relative w-full md:w-5/12 min-h-[280px] md:min-h-[460px] bg-gray-900 overflow-hidden">
            <img
              src={ANIMAL_IMG[animal.animal] ?? ANIMAL_IMG.Fox}
              alt={animal.animal}
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: isBest
                  ? "linear-gradient(to right, transparent 0%, #1a1500 100%), linear-gradient(to top, #1a1500 0%, transparent 55%)"
                  : isWorst
                  ? "linear-gradient(to right, transparent 0%, #1a0505 100%), linear-gradient(to top, #1a0505 0%, transparent 55%)"
                  : "linear-gradient(to right, transparent 0%, #0d0d10 100%), linear-gradient(to top, #0d0d10 0%, transparent 55%)",
              }}
            />

            {/* Best crown in modal */}
            {isBest && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                <motion.div
                  animate={{ y: [0, -5, 0], filter: ["drop-shadow(0 0 8px #fbbf24)", "drop-shadow(0 0 20px #fde68a)", "drop-shadow(0 0 8px #fbbf24)"] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Crown className="h-10 w-10 text-amber-400" />
                </motion.div>
                <motion.div
                  className="text-[9px] font-black font-mono tracking-widest mt-1 rounded-full px-2 py-0.5"
                  style={{ background: "linear-gradient(90deg,#f59e0b,#fde68a)", color: "#000" }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  🏆 TOP PERFORMER
                </motion.div>
              </div>
            )}
            {/* Worst skull in modal */}
            {isWorst && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], filter: ["drop-shadow(0 0 6px #ef4444)", "drop-shadow(0 0 18px #f87171)", "drop-shadow(0 0 6px #ef4444)"] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                >
                  <Skull className="h-10 w-10 text-red-500" />
                </motion.div>
                <motion.div
                  className="text-[9px] font-black font-mono tracking-widest mt-1 rounded-full px-2 py-0.5"
                  style={{ background: "linear-gradient(90deg,#ef4444,#fca5a5)", color: "#000" }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                >
                  ⚠ LOWEST RATED
                </motion.div>
              </div>
            )}

            {/* Tier badge */}
            <div
              className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-widest text-black"
              style={{ background: tier.color, display: isBest || isWorst ? "none" : "block" }}
            >
              {tier.label}
            </div>

            {/* Name at bottom */}
            <div className="absolute bottom-5 left-5">
              <div className="text-[10px] font-mono tracking-widest uppercase opacity-70" style={{ color: tier.color }}>
                {animal.originalLabel}
              </div>
              <h2
                className="text-4xl font-black font-serif text-white leading-none mt-1 drop-shadow-lg"
                style={isBest ? { textShadow: "0 0 24px rgba(251,191,36,0.5)" } : isWorst ? { textShadow: "0 0 24px rgba(239,68,68,0.4)" } : {}}
              >
                The {animal.animal}
              </h2>
            </div>
          </div>

          {/* Right – info */}
          <div className="relative flex-1 p-6 md:p-8 flex flex-col">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition"
            >
              <X size={14} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center border"
                style={{ background: tier.dim, borderColor: tier.ring }}
              >
                <AnimalIcon animal={animal.animal} size={22} style={{ color: tier.color }} />
              </div>
              <div>
                <div className="text-xl font-black font-serif text-white leading-tight">The {animal.animal}</div>
                <div className="text-[11px] font-mono tracking-wide text-gray-600 mt-0.5">
                  Pattern {PATTERN_ANIMALS.indexOf(animal) + 1} / {PATTERN_ANIMALS.length}
                </div>
              </div>
            </div>

            {/* Live stats */}
            {row ? (
              <>
                <div className="flex gap-2 mb-4">
                  <div
                    className="rounded-xl px-4 py-3 flex-1 border"
                    style={{ background: `${cfg.color}10`, borderColor: `${cfg.color}30` }}
                  >
                    <div className="text-[9px] font-mono tracking-widest text-gray-500 mb-1">WIN RATE</div>
                    <div className="text-lg font-black" style={{ color: cfg.color }}>
                      {row.win_rate.toFixed(1)}%
                    </div>
                  </div>
                  <div
                    className="rounded-xl px-4 py-3 flex-1 border"
                    style={{ background: `${cfg.color}10`, borderColor: `${cfg.color}30` }}
                  >
                    <div className="text-[9px] font-mono tracking-widest text-gray-500 mb-1">PATTERN TYPE</div>
                    <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: cfg.color }}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </div>
                  </div>
                  <div className="rounded-xl px-4 py-3 flex-1 border border-white/10 bg-white/5">
                    <div className="text-[9px] font-mono tracking-widest text-gray-500 mb-1">PREDICTIONS</div>
                    <div className="text-sm font-bold text-white">{row.total_predictions}</div>
                  </div>
                </div>

                <div className="h-px bg-white/5 mb-4" />

                {/* Dynamic phrase */}
                <div
                  className="rounded-xl p-4 mb-4 border"
                  style={{
                    background: isBest
                      ? "rgba(251,191,36,0.06)"
                      : isWorst
                      ? "rgba(239,68,68,0.06)"
                      : "rgba(255,255,255,0.03)",
                    borderColor: isBest
                      ? "rgba(251,191,36,0.2)"
                      : isWorst
                      ? "rgba(239,68,68,0.2)"
                      : "rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {isBest ? (
                      <Flame className="h-3.5 w-3.5 text-amber-400" />
                    ) : isWorst ? (
                      <Skull className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-gray-500" />
                    )}
                    <span className="text-[9px] font-mono tracking-widest text-gray-600">INSIGHT</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-300">{phrase}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-500 text-sm">No live data yet for this pattern.</div>
            )}

            <p className="text-sm leading-relaxed text-gray-400 flex-1">{animal.description}</p>

            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-700">UPDATED DAILY</span>
              <button
                onClick={onClose}
                className="text-xs font-bold font-mono tracking-wide flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: tier.color }}
              >
                CLOSE <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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
      bestLabel:  sorted[0]?.pattern_label ?? null,
      worstLabel: sorted[sorted.length - 1]?.pattern_label ?? null,
    };
  }, [patternData]);

  const getPatternRow = (label: string) =>
    patternData.find((p) => p.pattern_label === label) ?? undefined;

  const selectedAnimal = selectedLabel
    ? PATTERN_ANIMALS.find((a) => a.originalLabel === selectedLabel)
    : null;

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.06, boxShadow: "0 12px 40px rgba(99,102,241,0.55)" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-12 z-41 flex items-center gap-2 text-sm font-bold px-5 py-3.5 rounded-2xl shadow-2xl"
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
                className="w-full max-w-5xl rounded-2xl shadow-2xl p-6 my-8"
                style={{
                  background: "#0d0d10",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-2xl font-bold text-white font-serif tracking-tight">All Pattern Animals</h2>
                    <p className="text-sm text-gray-500 mt-1">Tap any card to view live stats & insights</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={fetchData}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition"
                      title="Refresh"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Legend row */}
                {(bestLabel || worstLabel) && (
                  <div className="flex gap-3 mb-5 mt-3">
                    {bestLabel && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1">
                        <Crown className="h-3 w-3" />
                        Top performing pattern
                      </div>
                    )}
                    {worstLabel && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-3 py-1">
                        <Skull className="h-3 w-3" />
                        Lowest rated pattern
                      </div>
                    )}
                  </div>
                )}

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <RefreshCw className="h-7 w-7 animate-spin text-indigo-400" />
                    <p className="text-sm text-gray-600 font-mono">Loading pattern data…</p>
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
          isBest={selectedAnimal?.originalLabel === bestLabel}
          isWorst={selectedAnimal?.originalLabel === worstLabel}
        />
      )}
    </>
  );
};

export default PatternQuickLook;