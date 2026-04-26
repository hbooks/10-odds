import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  Trophy,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Star,
  Sparkles,
  ShieldCheck,
  Eye,
  Crown,
  Flame,
  Heart,
  Zap,
} from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Banned words ─────────────────────────────────────────────────────────────
const BANNED_WORDS = [
  "fuck","fucker","fucked","fucking","fucks","fuk","fck",
  "shit","shits","shitting","shitter","bullshit",
  "ass","asses","asshole","arse","arsehole",
  "bitch","bitches","bitching","cunt","cunts","dick","dicks","dickhead",
  "cock","cocks","cockhead","pussy","pussies","bastard","bastards",
  "prick","pricks","twat","twats","wank","wanker","wankers","wanking",
  "slut","sluts","whore","whores","nigger","niggers","nigga","niggas",
  "faggot","faggots","fag","fags","kike","kikes","spic","spics",
  "chink","chinks","gook","gooks","wetback","wetbacks","cracker","crackers",
  "honky","honkies","tranny","trannies","retard","retards","retarded",
  "spaz","spastic","moron","morons","idiot","idiots","imbecile","imbeciles",
  "crap","craps","piss","pisses","pissing","pissed","pisser","jerk","jerks",
  "dumbass","loser","losers","freak","freaks","pervert","perverts","perv",
  "creep","creeps","rape","rapes","rapist","rapists","murder","murderer",
  "terrorist","terrorists","jihad","nazi","nazis","hitler",
  "porn","porno","pornography","dildo","dildos","masturbate","masturbation",
  "ejaculate","ejaculation","orgasm","orgasms","boob","boobs","boobies",
  "tits","tit","titty","titties","nipple","nipples","penis","penises",
  "vagina","vaginas","clitoris","anus","anuses","testicle","testicles","scrotum",
  "blowjob","blowjobs","handjob","handjobs","hooker","hookers","prostitute","prostitutes",
  "pimp","pimps","cocaine","heroin","meth","methamphetamine","stfu","gtfo",
  "motherf","motherfucker",
  "admin","administrator","moderator","staff","official","support",
  "10odds","10-odds","tenodds",
];

const containsBannedWord = (str: string) => {
  const lower = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return BANNED_WORDS.some((w) => lower.includes(w.replace(/[^a-z0-9]/g, "")));
};

const LS_FAIL_KEY      = "10odds_cm_fails";
const LS_BAN_KEY       = "10odds_cm_banned";
const LS_SUBMITTED_KEY = "10odds_cm_submitted";
const MAX_FAILS        = 3;

const getFailCount    = () => parseInt(localStorage.getItem(LS_FAIL_KEY) ?? "0", 10);
const incrementFail   = () => localStorage.setItem(LS_FAIL_KEY, String(getFailCount() + 1));
const isBrowserBanned = () => localStorage.getItem(LS_BAN_KEY) === "true";
const banBrowser      = () => localStorage.setItem(LS_BAN_KEY, "true");
const hasSubmitted    = () => localStorage.getItem(LS_SUBMITTED_KEY) === "true";
const markSubmitted   = () => localStorage.setItem(LS_SUBMITTED_KEY, "true");

interface Member { id: number; username: string; avatar: string; created_at: string; }
interface Team   { id: number; name: string; crest_url: string; }

// ─── HBOOKS hardcoded VIP profile ─────────────────────────────────────────────
const HBOOKS_MEMBER: Member = {
  id: -1,
  username: "HBOOKS",
  avatar: "", // no crest – uses a custom render
  created_at: "2024-01-01T00:00:00Z",
};

const ACCENTS = [
  "#f4a261","#2a9d8f","#457b9d","#e9c46a",
  "#8338ec","#06d6a0","#ef476f","#ffd166","#118ab2","#e63946",
];

// ─── BannedScreen ─────────────────────────────────────────────────────────────
const BannedScreen = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-red-950 text-white">
    <div className="text-8xl mb-6">⛔</div>
    <h1 className="text-3xl font-bold tracking-tight mb-2">YOU HAVE BEEN BANNED</h1>
    <p className="text-red-300 text-sm max-w-xs text-center">
      This browser has been blocked from the community board due to repeated policy violations.
    </p>
  </div>
);

// ─── Animated background ──────────────────────────────────────────────────────
const Background = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Base dark gradient */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 120% 80% at 50% -10%, #0d2137 0%, #060d18 60%, #020508 100%)"
      }} />

      {/* Animated mesh orbs */}
      <motion.div
        className="absolute rounded-full blur-[120px]"
        style={{ width: 700, height: 500, top: -100, left: "20%", background: "radial-gradient(circle, rgba(16,100,60,0.25) 0%, transparent 70%)" }}
        animate={{ x: [0, 60, -30, 0], y: [0, 40, -20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-[100px]"
        style={{ width: 500, height: 400, bottom: "10%", right: "-5%", background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)" }}
        animate={{ x: [0, -50, 30, 0], y: [0, -30, 20, 0], scale: [1, 0.9, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-[80px]"
        style={{ width: 350, height: 350, top: "40%", left: "-8%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
        animate={{ y: [0, 60, -40, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      />

      {/* Diagonal pitch-line pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
          <pattern id="center-circle" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
            <circle cx="200" cy="200" r="80" fill="none" stroke="white" strokeWidth="0.6" />
            <line x1="0" y1="200" x2="400" y2="200" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#center-circle)" />
      </svg>

      {/* Animated floating particles */}
      {[...Array(18)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#10b981" : "#818cf8",
            opacity: 0.5,
          }}
          animate={{
            y: [0, -40 - Math.random() * 60, 0],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{
            repeat: Infinity,
            duration: 5 + Math.random() * 8,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Bottom green pitch glow */}
      <div className="absolute bottom-0 left-0 right-0 h-48" style={{
        background: "linear-gradient(to top, rgba(5,46,22,0.35) 0%, transparent 100%)"
      }} />
    </div>
  );
};

// ─── HBOOKS VIP Card ──────────────────────────────────────────────────────────
const HBooksCard = () => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -10, scale: 1.06 }}
      className="relative flex flex-col items-center gap-3 rounded-2xl p-4 cursor-default col-span-1"
      style={{
        background: "linear-gradient(135deg, rgba(234,179,8,0.18) 0%, rgba(234,179,8,0.06) 50%, rgba(251,146,60,0.12) 100%)",
        border: "1.5px solid rgba(234,179,8,0.55)",
        boxShadow: hovered
          ? "0 0 40px rgba(234,179,8,0.5), 0 8px 32px rgba(234,179,8,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
          : "0 0 20px rgba(234,179,8,0.25), 0 4px 20px rgba(234,179,8,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Animated gold shimmer line at top */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: "linear-gradient(90deg, transparent, #fbbf24, #f59e0b, #fbbf24, transparent)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />

      {/* Crown badge */}
      <motion.div
        className="absolute -top-3 -right-2 h-6 w-6 rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#f59e0b,#dc2626)", boxShadow: "0 2px 8px rgba(245,158,11,0.6)" }}
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
      >
        <Crown className="h-3.5 w-3.5 text-white" />
      </motion.div>

      {/* Avatar – custom gold "H" monogram */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg,#f59e0b,#b45309)",
          boxShadow: "0 0 0 2.5px rgba(251,191,36,0.8), 0 0 16px rgba(245,158,11,0.4)",
        }}
      >
        <motion.span
          className="text-xl font-black text-white drop-shadow-md"
          animate={{ scale: hovered ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 0.4 }}
        >
          H
        </motion.span>
        {/* Inner shimmer */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)" }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 leading-tight">
          HBOOKS
        </p>
        <p className="text-[9px] text-amber-400/60 font-semibold mt-0.5 uppercase tracking-widest">
          Founding Supporter
        </p>
      </div>

      {/* Bottom sparkle row */}
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}>
            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
          </motion.div>
        ))}
      </div>

      {/* Corner sparkles */}
      <Sparkles className="absolute bottom-2 left-2 h-3 w-3 text-amber-400/40" />
    </motion.div>
  );
};

// ─── Regular member card ──────────────────────────────────────────────────────
const MemberCard = ({ m, index }: { m: Member; index: number }) => {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.82, rotate: -3 },
        show:   { opacity: 1, y: 0,  scale: 1,    rotate: 0 },
      }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      whileHover={{ y: -7, scale: 1.06, rotate: 1 }}
      className="relative flex flex-col items-center gap-3 rounded-2xl p-4 cursor-default"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1.5px solid ${accent}45`,
        boxShadow: `0 4px 24px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* Avatar ring */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.06)",
          boxShadow: `0 0 0 2px ${accent}60`,
        }}
      >
        <img
          src={m.avatar}
          alt=""
          className="w-10 h-10 object-contain drop-shadow-md"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
        />
      </div>

      <p className="text-xs font-bold text-center text-white/90 leading-tight break-all">
        {m.username}
      </p>

      <Sparkles className="absolute top-2 right-2 h-3 w-3 opacity-25" style={{ color: accent }} />
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const CommunityPage = () => {
  const [banned, setBanned]                   = useState(isBrowserBanned());
  const [alreadySubmitted, setAlreadySubmitted] = useState(hasSubmitted());
  const [members, setMembers]                 = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers]   = useState(true);
  const [modalOpen, setModalOpen]             = useState(false);
  const [teams, setTeams]                     = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams]       = useState(false);

  // form
  const [realName, setRealName]               = useState("");
  const [username, setUsername]               = useState("");
  const [selectedAvatar, setSelectedAvatar]   = useState("");
  const [isSupporter, setIsSupporter]         = useState(false);
  const [termsAgreed, setTermsAgreed]         = useState(false);
  const [fieldError, setFieldError]           = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [submitted, setSubmitted]             = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [confirmChecked, setConfirmChecked]   = useState(false);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  const fetchMembers = async () => {
    setLoadingMembers(true);
    const { data } = await supabase
      .from("community_members")
      .select("id, username, avatar, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    setMembers((data as Member[]) ?? []);
    setLoadingMembers(false);
  };

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (banned) return;

    fetchMembers();

    const channel = supabase
      .channel("community-board-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        (payload) => {
          const row = payload.new as (Member & { status: string }) | null;
          const oldRow = payload.old as (Member & { status?: string }) | null;

          if (payload.eventType === "UPDATE") {
            if (row?.status === "approved") {
              // Add to board if newly approved
              setMembers((prev) => {
                const exists = prev.find((m) => m.id === row.id);
                if (exists) return prev;
                const newMember: Member = { id: row.id, username: row.username, avatar: row.avatar, created_at: row.created_at };
                return [newMember, ...prev];
              });
            } else if (row?.status === "banned" || row?.status === "rejected") {
              // Remove from board if banned/rejected
              setMembers((prev) => prev.filter((m) => m.id !== row.id));
            }
          } else if (payload.eventType === "DELETE") {
            setMembers((prev) => prev.filter((m) => m.id !== (oldRow?.id ?? -999)));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [banned]);

  // ── Teams fetch on modal open ──────────────────────────────────────────────
  const openModal = async () => {
    if (banned || alreadySubmitted) return;
    setModalOpen(true);
    if (teams.length === 0) {
      setLoadingTeams(true);
      const { data } = await supabase.from("teams").select("id, name, crest_url").order("name");
      setTeams((data as Team[]) ?? []);
      setLoadingTeams(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setFieldError("");
    setSubmitted(false);
    setShowConfirm(false);
    setConfirmChecked(false);
    setRealName(""); setUsername(""); setSelectedAvatar("");
    setIsSupporter(false); setTermsAgreed(false);
  };

  const sanitise = (raw: string) => raw.replace(/<[^>]*>/g, "").trim().slice(0, 30);

  const handleFormValidation = (): boolean => {
    setFieldError("");
    const cleanName = realName.trim();
    const cleanUser = sanitise(username);
    if (!cleanName)           { setFieldError("Please enter your full name."); return false; }
    if (!cleanUser)           { setFieldError("Please enter a username."); return false; }
    if (cleanUser.length < 2) { setFieldError("Username must be at least 2 characters."); return false; }
    if (!selectedAvatar)      { setFieldError("Please select a team avatar."); return false; }
    if (!isSupporter)         { setFieldError("Please confirm you have supported the project."); return false; }
    if (!termsAgreed)         { setFieldError("Please agree to the community terms."); return false; }
    if (containsBannedWord(cleanUser)) {
      const fails = getFailCount() + 1;
      incrementFail();
      if (fails >= MAX_FAILS) { banBrowser(); setBanned(true); return false; }
      setFieldError(`That username isn't allowed, please choose another. (Warning ${fails}/${MAX_FAILS})`);
      return false;
    }
    return true;
  };

  const handleInitialSubmit = () => {
    if (handleFormValidation()) setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    const cleanName = realName.trim();
    const cleanUser = sanitise(username);
    const { error } = await supabase.from("community_members").insert({
      real_name: cleanName, username: cleanUser, avatar: selectedAvatar,
      is_supporter: isSupporter, terms_agreed: termsAgreed, status: "pending",
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") { setFieldError("That username is already taken."); setShowConfirm(false); return; }
      setFieldError("Something went wrong. Please try again."); setShowConfirm(false); return;
    }
    setSubmitted(true); setShowConfirm(false); setConfirmChecked(false);
    markSubmitted(); setAlreadySubmitted(true);
  };

  if (banned) return <BannedScreen />;

  const canSubmit = realName.trim() && username.trim() && selectedAvatar && isSupporter && termsAgreed;
  const totalCount = members.length + 1; // +1 for HBOOKS

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Background />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">

        {/* ── Back button ─────────────────────────────────────────────────── */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/90 transition-colors mb-10 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Back to Home
        </Link>

        {/* ══════════════════════════════════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          {/* Animated trophy icon */}
          <div className="relative inline-block mb-5">
            <motion.div
              animate={{ rotate: [-4, 4, -4], y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="inline-flex items-center justify-center h-24 w-24 rounded-3xl"
              style={{
                background: "linear-gradient(135deg,#f59e0b,#d97706,#b45309)",
                boxShadow: "0 0 0 8px rgba(245,158,11,0.12), 0 20px 60px rgba(245,158,11,0.35)",
              }}
            >
              <Trophy className="h-12 w-12 text-white drop-shadow-lg" />
            </motion.div>
            {/* Orbiting sparkles */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  top: "50%", left: "50%",
                  transformOrigin: "0 0",
                }}
                animate={{ rotate: [deg, deg + 360] }}
                transition={{ repeat: Infinity, duration: 8 + i, ease: "linear" }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{
                    marginLeft: 52,
                    background: i % 2 === 0 ? "#f59e0b" : "#10b981",
                    boxShadow: `0 0 6px ${i % 2 === 0 ? "#f59e0b" : "#10b981"}`,
                  }}
                />
              </motion.div>
            ))}
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight mb-4">
            <span className="text-white">Our </span>
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #fbbf24, #f59e0b, #fb923c, #ef4444)" }}
            >
              Amazing
            </span>
            <br />
            <span className="text-white">Supporters </span>
            <motion.span
              animate={{ scale: [1, 1.3, 1], rotate: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block"
            >
              🏆
            </motion.span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-4">
            These legends keep 10 Odds alive. Each name here represents a{" "}
            <span className="text-amber-400 font-semibold">real person</span> who believed
            in this project and helped make it happen.
          </p>

          {/* CTA banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.15))",
              border: "1px solid rgba(245,158,11,0.35)",
              boxShadow: "0 0 30px rgba(245,158,11,0.15)",
            }}
          >
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-white/80">Support the project → Get your name on the board forever</span>
            <Heart className="h-4 w-4 text-red-400" />
          </motion.div>

          {/* Stats row */}
          {!loadingMembers && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/12 border border-emerald-500/25 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {totalCount} supporter{totalCount !== 1 ? "s" : ""} on the board
              </div>
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-500/12 border border-amber-500/25 text-amber-400">
                <Zap className="h-3 w-3" />
                Live · Updates in real time
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════
            HOW IT WORKS STRIP
        ══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-3 mb-12 max-w-2xl mx-auto"
        >
          {[
            { icon: "💸", label: "Support the project", sub: "Ko-fi, PayPal or any way" },
            { icon: "📝", label: "Submit your profile", sub: "Takes 30 seconds" },
            { icon: "✨", label: "Appear on the board", sub: "Forever recognised" },
          ].map((step, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -3, scale: 1.03 }}
              className="flex flex-col items-center gap-1.5 p-4 rounded-2xl text-center"
              style={{
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-2xl">{step.icon}</span>
              <p className="text-xs font-bold text-white/80">{step.label}</p>
              <p className="text-[10px] text-white/35">{step.sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════
            MEMBER GRID
        ══════════════════════════════════════════════════════════════════ */}
        {loadingMembers ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-amber-400/60" />
            <p className="text-white/30 text-sm">Loading supporters…</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-36"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          >
            {/* HBOOKS always first */}
            <HBooksCard />

            {/* Live member cards */}
            <AnimatePresence>
              {members.map((m, i) => (
                <MemberCard key={m.id} m={m} index={i} />
              ))}
            </AnimatePresence>

            {/* Empty state when no other members */}
            {members.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full mt-8 text-center"
              >
                <Star className="h-8 w-8 mx-auto mb-2 text-white/15" />
                <p className="text-white/25 text-sm">Be the next one on the board!</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Floating join button ───────────────────────────────────────────── */}
      {alreadySubmitted ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2 text-xs font-semibold text-white/70 px-4 py-3 rounded-2xl backdrop-blur-md shadow-lg"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Submission Sent! Once approved, you'll appear on the board within 1–2 business days.
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.96 }}
          onClick={openModal}
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2 text-sm font-black px-6 py-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#f59e0b,#ea580c)",
            boxShadow: "0 8px 40px rgba(245,158,11,0.45), 0 2px 8px rgba(0,0,0,0.3)",
            color: "#fff",
          }}
        >
          <Plus className="h-5 w-5" />
          Join the Board
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            ✨
          </motion.span>
        </motion.button>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          JOIN MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 z-40 bg-black/85 backdrop-blur-lg"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.86, y: 30 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{ opacity: 0, scale: 0.86, y: 30 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
                style={{ background: "rgba(8,14,26,0.98)", border: "1px solid rgba(245,158,11,0.2)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Thin gold header bar */}
                <div className="h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg,#f59e0b,#ea580c,#f59e0b)" }} />

                {submitted ? (
                  <div className="flex flex-col items-center gap-4 p-8 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                      <CheckCircle className="h-16 w-16 text-emerald-400" />
                    </motion.div>
                    <h2 className="text-2xl font-black">Request submitted! 🎉</h2>
                    <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                      Your request is being reviewed. If approved, you'll appear on the board within 1–2 business days.
                      If it doesn't show up after that, it means the submission wasn't accepted.
                    </p>
                    <button
                      onClick={closeModal}
                      className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}
                    >
                      Awesome, close
                    </button>
                  </div>
                ) : (
                  <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-black">Join the Board</h2>
                        <p className="text-xs text-white/35 mt-0.5">All fields required · One submission per person</p>
                      </div>
                      <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-white/8 text-white/35 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Full name */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Full Name</label>
                      <p className="text-[11px] text-white/25">Never displayed – for internal verification only.</p>
                      <input
                        type="text"
                        value={realName}
                        onChange={(e) => setRealName(e.target.value)}
                        placeholder="Your real name"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition"
                      />
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Display Name</label>
                      <p className="text-[11px] text-white/25">Shown on the board. Max 30 characters.</p>
                      <input
                        type="text"
                        value={username}
                        maxLength={30}
                        onChange={(e) => setUsername(e.target.value.replace(/<[^>]*>/g, "").slice(0, 30))}
                        placeholder="e.g. GoalMaster99"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition"
                      />
                    </div>

                    {/* Avatar grid */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Team Avatar</label>
                      <p className="text-[11px] text-white/25">Pick the crest displayed on your card.</p>
                      {loadingTeams ? (
                        <div className="flex justify-center py-6"><RefreshCw className="h-4 w-4 animate-spin text-white/30" /></div>
                      ) : (
                        <div className="grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {teams.map((t) => (
                            <button
                              key={t.id} type="button"
                              onClick={() => setSelectedAvatar(t.crest_url)}
                              title={t.name}
                              className={`relative flex items-center justify-center aspect-square rounded-xl border-2 transition-all duration-150 ${
                                selectedAvatar === t.crest_url
                                  ? "border-amber-400 bg-amber-400/15 scale-110 shadow-lg shadow-amber-400/20"
                                  : "border-white/10 bg-white/5 hover:border-white/25"
                              }`}
                            >
                              <img src={t.crest_url} alt={t.name} className="w-6 h-6 object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Supporter checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={isSupporter} onChange={(e) => setIsSupporter(e.target.checked)}
                        className="mt-0.5 accent-amber-400 h-4 w-4 cursor-pointer" />
                      <span className="text-xs text-white/45 leading-relaxed group-hover:text-white/65 transition-colors">
                        I have supported the 10 Odds project (Ko‑fi, PayPal, or similar).
                      </span>
                    </label>

                    {/* Terms checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="mt-0.5 accent-amber-400 h-4 w-4 cursor-pointer" />
                      <span className="text-xs text-white/45 leading-relaxed group-hover:text-white/65 transition-colors">
                        I agree to the{" "}
                        <a href="/community-terms" target="_blank" rel="noreferrer"
                          className="text-amber-400 underline underline-offset-2 hover:text-amber-300 inline-flex items-center gap-0.5">
                          community terms <ChevronRight className="h-3 w-3" />
                        </a>
                      </span>
                    </label>

                    {fieldError && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-400">{fieldError}</p>
                      </motion.div>
                    )}

                    <button
                      onClick={handleInitialSubmit}
                      disabled={!canSubmit || submitting}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black text-white disabled:opacity-35 disabled:cursor-not-allowed transition-opacity"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)", boxShadow: "0 4px 20px rgba(245,158,11,0.3)" }}
                    >
                      {submitting
                        ? <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</>
                        : <>Review My Submission ✨</>
                      }
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          CONFIRMATION POPUP
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowConfirm(false); setConfirmChecked(false); }}
              className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md"
            />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 24 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="w-full max-w-sm rounded-2xl border shadow-2xl p-6 space-y-5"
                style={{ background: "rgba(8,14,26,0.99)", borderColor: "rgba(245,158,11,0.25)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-400/15 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-black">Confirm your details</h2>
                    <p className="text-xs text-white/35">Double-check before submitting.</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm rounded-xl bg-white/4 border border-white/8 p-4">
                  {[
                    ["Display Name", sanitise(username)],
                    ["Supporter", isSupporter ? "✅ Yes" : "❌ No"],
                    ["Terms Agreed", termsAgreed ? "✅ Yes" : "❌ No"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-white/40 text-xs">{label}</span>
                      <span className="font-bold text-white text-xs">{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 text-xs">Avatar</span>
                    {selectedAvatar
                      ? <img src={selectedAvatar} alt="" className="h-6 w-6 object-contain" />
                      : <span className="font-bold text-white text-xs">—</span>
                    }
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)}
                    className="mt-0.5 accent-amber-400 h-4 w-4 cursor-pointer" />
                  <span className="text-xs text-white/45 leading-relaxed group-hover:text-white/65 transition-colors">
                    I've checked everything and it's correct.
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowConfirm(false); setConfirmChecked(false); }}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={!confirmChecked || submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-35 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}
                  >
                    {submitting
                      ? <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</>
                      : <><CheckCircle className="h-4 w-4" /> Confirm & Submit</>
                    }
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityPage;