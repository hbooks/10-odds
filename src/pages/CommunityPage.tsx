import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Banned word list (150+ terms) ────────────────────────────────────────────
const BANNED_WORDS = [
  "fuck","fucker","fucked","fucking","fucks","fuk","fck",
  "shit","shits","shitting","shitter","bullshit",
  "ass","asses","asshole","arse","arsehole",
  "bitch","bitches","bitching",
  "cunt","cunts",
  "dick","dicks","dickhead",
  "cock","cocks","cockhead",
  "pussy","pussies",
  "bastard","bastards",
  "prick","pricks",
  "twat","twats",
  "wank","wanker","wankers","wanking",
  "slut","sluts",
  "whore","whores",
  "nigger","niggers","nigga","niggas",
  "faggot","faggots","fag","fags",
  "kike","kikes",
  "spic","spics",
  "chink","chinks",
  "gook","gooks",
  "wetback","wetbacks",
  "cracker","crackers",
  "honky","honkies",
  "tranny","trannies",
  "retard","retards","retarded",
  "spaz","spastic",
  "moron","morons",
  "idiot","idiots",
  "imbecile","imbeciles",
  "crap","craps",
  "piss","pisses","pissing","pissed","pisser",
  "jerk","jerks",
  "dumbass",
  "loser","losers",
  "freak","freaks",
  "pervert","perverts","perv",
  "creep","creeps",
  "rape","rapes","rapist","rapists",
  "murder","murderer",
  "terrorist","terrorists",
  "jihad",
  "nazi","nazis",
  "hitler",
  "porn","porno","pornography",
  "dildo","dildos",
  "masturbate","masturbation",
  "ejaculate","ejaculation",
  "orgasm","orgasms",
  "boob","boobs","boobies",
  "tits","tit","titty","titties",
  "nipple","nipples",
  "penis","penises",
  "vagina","vaginas",
  "clitoris",
  "anus","anuses",
  "testicle","testicles",
  "scrotum",
  "blowjob","blowjobs","handjob","handjobs",
  "hooker","hookers","prostitute","prostitutes",
  "pimp","pimps",
  "cocaine","heroin","meth","methamphetamine",
  "stfu","gtfo",
  "motherf","motherfucker",
  "admin","administrator","moderator","staff","official","support",
  "10odds","10-odds","tenodds",
];

const containsBannedWord = (str: string): boolean => {
  const lower = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return BANNED_WORDS.some((w) => lower.includes(w.replace(/[^a-z0-9]/g, "")));
};

const LS_FAIL_KEY      = "10odds_cm_fails";
const LS_BAN_KEY       = "10odds_cm_banned";
const LS_SUBMITTED_KEY = "10odds_cm_submitted";
const MAX_FAILS        = 3;

const getFailCount      = () => parseInt(localStorage.getItem(LS_FAIL_KEY) ?? "0", 10);
const incrementFail     = () => localStorage.setItem(LS_FAIL_KEY, String(getFailCount() + 1));
const isBrowserBanned   = () => localStorage.getItem(LS_BAN_KEY) === "true";
const banBrowser        = () => localStorage.setItem(LS_BAN_KEY, "true");
const hasSubmitted      = () => localStorage.getItem(LS_SUBMITTED_KEY) === "true";
const markSubmitted     = () => localStorage.setItem(LS_SUBMITTED_KEY, "true");

interface Member { id: number; username: string; avatar: string; created_at: string; }
interface Team   { id: number; name: string; crest_url: string; }

// ─── Accent colours for card borders (cycles) ─────────────────────────────────
const ACCENTS = [
  "#e63946","#f4a261","#2a9d8f","#457b9d","#e9c46a",
  "#8338ec","#06d6a0","#ef476f","#ffd166","#118ab2",
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

// ─── Rhythmic diagonal stripe background ──────────────────────────────────────
const RhythmicBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
    {/* Animated diagonal stripes */}
    <motion.div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(245,158,11,0.08) 0px, rgba(245,158,11,0.08) 2px, transparent 2px, transparent 20px, rgba(16,185,129,0.06) 20px, rgba(16,185,129,0.06) 22px, transparent 22px, transparent 40px)",
      }}
      animate={{ backgroundPosition: ["0px 0px", "40px 40px"] }}
      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
    />
    {/* Rotating soft glow orb */}
    <motion.div
      className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-amber-400/8 blur-3xl"
      animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
      transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-1/3 -right-20 w-80 h-80 rounded-full bg-emerald-500/8 blur-3xl"
      animate={{ x: [0, -60, 0], y: [0, -30, 0] }}
      transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
    />
    {/* Centre subtle glow */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-gradient-to-br from-amber-400/5 via-emerald-400/3 to-transparent blur-3xl" />
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const CommunityPage = () => {
  const [banned, setBanned]                = useState(isBrowserBanned());
  const [alreadySubmitted, setAlreadySubmitted] = useState(hasSubmitted());
  const [members, setMembers]              = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [modalOpen, setModalOpen]          = useState(false);
  const [teams, setTeams]                  = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams]    = useState(false);

  const [realName, setRealName]            = useState("");
  const [username, setUsername]            = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isSupporter, setIsSupporter]      = useState(false);
  const [termsAgreed, setTermsAgreed]      = useState(false);
  const [fieldError, setFieldError]        = useState("");
  const [submitting, setSubmitting]        = useState(false);
  const [submitted, setSubmitted]          = useState(false);

  // ── Confirmation popup state ─────────────────────────────────────────────
  const [showConfirm, setShowConfirm]      = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  useEffect(() => {
    if (banned) return;
    (async () => {
      setLoadingMembers(true);
      const { data } = await supabase
        .from("community_members")
        .select("id, username, avatar, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      setMembers((data as Member[]) ?? []);
      setLoadingMembers(false);
    })();
  }, [banned]);

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
    if (!cleanName)       { setFieldError("Please enter your full name."); return false; }
    if (!cleanUser)       { setFieldError("Please enter a username."); return false; }
    if (cleanUser.length < 2) { setFieldError("Username must be at least 2 characters."); return false; }
    if (!selectedAvatar)  { setFieldError("Please select a team avatar."); return false; }
    if (!isSupporter)     { setFieldError("Please confirm you have supported the project."); return false; }
    if (!termsAgreed)     { setFieldError("Please agree to the community terms."); return false; }

    if (containsBannedWord(cleanUser)) {
      const fails = getFailCount() + 1;
      incrementFail();
      if (fails >= MAX_FAILS) { banBrowser(); setBanned(true); return false; }
      setFieldError(`That username isn't allowed, please choose another. (Warning ${fails}/${MAX_FAILS})`);
      return false;
    }
    return true;
  };

  // ── Open confirmation popup ──────────────────────────────────────────────
  const handleInitialSubmit = () => {
    if (handleFormValidation()) {
      setShowConfirm(true);
    }
  };

  // ── Final submission from confirmation ───────────────────────────────────
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
      setFieldError("Something went wrong. Please try again.");
      setShowConfirm(false);
      return;
    }
    setSubmitted(true);
    setShowConfirm(false);
    setConfirmChecked(false);
    markSubmitted();
    setAlreadySubmitted(true);
  };

  if (banned) return <BannedScreen />;

  const canSubmit = realName.trim() && username.trim() && selectedAvatar && isSupporter && termsAgreed;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0f1a] text-white">
      {/* ── Rhythmic background ────────────────────────────────────────────── */}
      <RhythmicBackground />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">

        {/* ── Back button ─────────────────────────────────────────────────── */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>

        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="inline-flex items-center justify-center h-20 w-20 rounded-3xl mb-5"
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
          >
            <Trophy className="h-10 w-10 text-white drop-shadow-lg" />
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-3">
            Our Amazing{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Supporters
            </span>{" "}
            🏆
          </h1>
          <p className="text-white/50 text-base max-w-md mx-auto leading-relaxed">
            A hall of fame for the people who keep 10 Odds running. Hand-verified, forever celebrated.
          </p>

          {!loadingMembers && members.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {members.length} supporter{members.length !== 1 ? "s" : ""} on the board
            </motion.div>
          )}
        </motion.div>

        {/* ── Member grid ─────────────────────────────────────────────────── */}
        {loadingMembers ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : members.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 text-white/30 text-sm"
          >
            <Star className="h-10 w-10 mx-auto mb-3 opacity-20" />
            No approved members yet — be the first to join!
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-32"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          >
            {members.map((m, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <motion.div
                  key={m.id}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.85, rotate: -2 },
                    show:   { opacity: 1, y: 0,  scale: 1,    rotate: 0  },
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  whileHover={{ y: -6, scale: 1.05, rotate: 1 }}
                  className="relative flex flex-col items-center gap-3 rounded-2xl p-4 cursor-default"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${accent}40`,
                    boxShadow: `0 4px 24px ${accent}20, inset 0 1px 0 rgba(255,255,255,0.06)`,
                  }}
                >
                  <div
                    className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                  />
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
                  <Sparkles
                    className="absolute top-2 right-2 h-3 w-3 opacity-30"
                    style={{ color: accent }}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ── Floating join button OR "already submitted" message ────────────── */}
      {alreadySubmitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2 text-xs font-semibold text-white/70 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-md shadow-lg"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          You're already on the board! One profile per person.
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          onClick={openModal}
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2 text-sm font-bold px-5 py-3.5 rounded-2xl shadow-2xl"
          style={{
            background: "linear-gradient(135deg,#f59e0b,#ea580c)",
            boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
            color: "#fff",
          }}
        >
          <Plus className="h-4 w-4" />
          Join the Board
        </motion.button>
      )}

      {/* ── Join Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 24 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl"
                style={{ background: "rgba(12,18,32,0.97)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {submitted ? (
                  <div className="flex flex-col items-center gap-4 p-8 text-center">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    >
                      <CheckCircle className="h-14 w-14 text-emerald-400" />
                    </motion.div>
                    <h2 className="text-xl font-black">Request submitted! 🎉</h2>
                    <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                      Your request is being reviewed. If approved, it'll appear within 1–2 business
                      days. If it doesn't show up after that, it means your submission wasn't accepted.
                    </p>
                    <button
                      onClick={closeModal}
                      className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-black">Join the Board</h2>
                        <p className="text-xs text-white/40 mt-0.5">All fields are required</p>
                      </div>
                      <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/70 uppercase tracking-wide">Full Name</label>
                      <p className="text-[11px] text-white/30">Never displayed – for verification only.</p>
                      <input
                        type="text"
                        value={realName}
                        onChange={(e) => setRealName(e.target.value)}
                        placeholder="Your real name"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/70 uppercase tracking-wide">Username</label>
                      <p className="text-[11px] text-white/30">Displayed on the board. Max 30 chars.</p>
                      <input
                        type="text"
                        value={username}
                        maxLength={30}
                        onChange={(e) => setUsername(e.target.value.replace(/<[^>]*>/g, "").slice(0, 30))}
                        placeholder="e.g. GoalMaster99"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/70 uppercase tracking-wide">Team Avatar</label>
                      <p className="text-[11px] text-white/30">Pick the crest you'd like on your card.</p>
                      {loadingTeams ? (
                        <div className="flex justify-center py-6">
                          <RefreshCw className="h-4 w-4 animate-spin text-white/30" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {teams.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSelectedAvatar(t.crest_url)}
                              title={t.name}
                              className={`relative flex items-center justify-center aspect-square rounded-xl border-2 transition-all duration-150 ${
                                selectedAvatar === t.crest_url
                                  ? "border-amber-400 bg-amber-400/15 scale-110 shadow-lg shadow-amber-400/20"
                                  : "border-white/10 bg-white/5 hover:border-white/25"
                              }`}
                            >
                              <img
                                src={t.crest_url}
                                alt={t.name}
                                className="w-6 h-6 object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isSupporter}
                        onChange={(e) => setIsSupporter(e.target.checked)}
                        className="mt-0.5 accent-amber-400 h-4 w-4 cursor-pointer"
                      />
                      <span className="text-xs text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
                        I have supported the 10 Odds project (via Ko‑fi, PayPal, or similar).
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="mt-0.5 accent-amber-400 h-4 w-4 cursor-pointer"
                      />
                      <span className="text-xs text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
                        I agree to the{" "}
                        <a
                          href="/community-terms"
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 underline underline-offset-2 hover:text-amber-300 inline-flex items-center gap-0.5"
                        >
                          community terms <ChevronRight className="h-3 w-3" />
                        </a>
                      </span>
                    </label>

                    {fieldError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5"
                      >
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-400">{fieldError}</p>
                      </motion.div>
                    )}

                    <button
                      onClick={handleInitialSubmit}
                      disabled={!canSubmit || submitting}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}
                    >
                      {submitting
                        ? <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</>
                        : <>Review Submission</>
                      }
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── Confirmation Popup ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowConfirm(false); setConfirmChecked(false); }}
              className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md"
            />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 24 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-6 space-y-5"
                style={{ background: "rgba(12,18,32,0.99)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-400/15 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-black">Confirm your details</h2>
                    <p className="text-xs text-white/40">Double-check everything before submitting.</p>
                  </div>
                </div>

                {/* Summary list */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Username</span>
                    <span className="font-semibold text-white">{sanitise(username)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Avatar</span>
                    <span className="font-semibold text-white">
                      {selectedAvatar ? <img src={selectedAvatar} alt="" className="h-5 w-5 inline-block object-contain" /> : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Supporter</span>
                    <span className="font-semibold text-white">{isSupporter ? "Yes" : " No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Terms Agreed</span>
                    <span className="font-semibold text-white">{termsAgreed ? " Yes" : " No"}</span>
                  </div>
                </div>

                {/* Confirmation checkbox */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    className="mt-0.5 accent-amber-400 h-4 w-4 cursor-pointer"
                  />
                  <span className="text-xs text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
                    I have checked everything and it's correct.
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowConfirm(false); setConfirmChecked(false); }}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={!confirmChecked || submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
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