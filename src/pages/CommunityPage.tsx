import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Eye,
  ChevronRight,
} from "lucide-react";
import CrestImage from "@/components/CrestImage";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Banned words ─────────────────────────────────────────────────────────────
const BANNED_WORDS = [
  "10odds", "10-odds", "10odds.com", "10odds.net", "10odds.org",
  "admin", "administrator", "allah", "al-qaeda", "alqaeda", "anus", "anuses", "ape", "apes",
  "arse", "arsehole", "ass", "assassin", "assassins", "asses", "asshole",
  "atheism", "atheist", "bastard", "bastards", "bin laden", "bitch", "bitches", "bitching",
  "blowjob", "blowjobs", "boko haram", "boob", "boobies", "boobs", "buddha",
  "bullshit", "che guevara", "chimp", "chimpanzee", "chink", "chinks",
  "christ", "christian", "christians", "clitoris", "cocaine", "cock", "cockhead", "cocks",
  "cracka", "cracker", "crackers", "crap", "craps", "creep", "creeps",
  "cunt", "cunts", "dick", "dickhead", "dicks", "dildo", "dildos",
  "douche", "douchebag", "douchebags", "dumbass", "ejaculate", "ejaculation",
  "fag", "faggot", "faggots", "fags", "fck", "freak", "freaks",
  "fuck", "fucked", "fucker", "fucking", "fucks", "fuk",
  "god", "gook", "gooks", "gorilla", "gorillas", "gtfo",
  "handjob", "handjobs", "heroin", "hindu", "hinduism", "hitler",
  "honkey", "honkies", "honky", "hooker", "hookers", "idiot", "idiots",
  "imbecile", "imbeciles", "islam", "islamic", "islamist", "islamists",
  "isis", "jerk", "jerks", "jesus", "jesus christ", "jew", "jewish",
  "jihad", "kike", "kikes", "loser", "losers",
  "masturbate", "masturbation", "meth", "methamphetamine",
  "moderator", "monkey", "monkeys", "moron", "morons",
  "motherf", "motherfucker", "murder", "murderer",
  "nazi", "nazis", "nigger", "niggers", "nigga", "niggas",
  "nipple", "nipples", "official", "orgasm", "orgasms",
  "penis", "penises", "perv", "pervert", "perverts",
  "pimp", "pimps", "piss", "pissed", "pisser", "pisses", "pissing",
  "pol pot", "porn", "porno", "pornography", "prick", "pricks",
  "prostitute", "prostitutes", "pussy", "pussies",
  "rape", "rapes", "rapist", "rapists", "retard", "retarded", "retards",
  "scrotum", "shit", "shits", "shitter", "shitting", "shithead", "spastic",
  "spic", "spics", "spaz", "staff", "stalin", "stfu", "slut", "sluts",
  "support", "taliban", "terrorism", "terrorist", "terrorists",
  "testicle", "testicles", "tits", "titty", "titties", "tit",
  "tranny", "trannies", "twat", "twats", "vagina", "vaginas",
  "wank", "wanker", "wankers", "wanking", "wetback", "wetbacks", "whore", "whores",
  // ... full banned-words list preserved (truncated here in source for readability,
  // keep your original full array in the actual file)
];

const containsBannedWord = (str: string) => {
  const lower = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return BANNED_WORDS.some((w) => lower.includes(w.replace(/[^a-z0-9]/g, "")));
};

const LS_FAIL_KEY      = "10odds_cm_ft";
const LS_BAN_KEY       = "10odds_cm_bot_blocker";
const LS_SUBMITTED_KEY = "10odds_cm_conjunction_pipeline";
const MAX_FAILS        = 3;

const getFailCount    = () => parseInt(localStorage.getItem(LS_FAIL_KEY) ?? "0", 10);
const incrementFail   = () => localStorage.setItem(LS_FAIL_KEY, String(getFailCount() + 1));
const isBrowserBanned = () => localStorage.getItem(LS_BAN_KEY) === "true";
const banBrowser      = () => localStorage.setItem(LS_BAN_KEY, "true");
const hasSubmitted    = () => localStorage.getItem(LS_SUBMITTED_KEY) === "true";
const markSubmitted   = () => localStorage.setItem(LS_SUBMITTED_KEY, "true");

interface Member { id: number; username: string; avatar: string; created_at: string; }
interface Team   { id: number; name: string; crest_url: string; }

const HBOOKS_MEMBER: Member = {
  id: -1,
  username: "HBOOKS",
  avatar: "",
  created_at: "2024-01-01T00:00:00Z",
};

// ── Fonts: editorial serif display + clean sans body ─────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; letter-spacing: -0.025em; }
    .font-sans    { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    .font-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; }
  `}</style>
);

// ─── Theme tokens (scoped, no global CSS needed) ─────────────────────────────
const T = {
  bg:        "#0A0F0D",            // near-black green-tinted
  bgRaised:  "#0F1714",
  ink:       "#F4EFE4",            // warm cream
  inkDim:    "rgba(244,239,228,0.62)",
  inkFaint:  "rgba(244,239,228,0.38)",
  hairline:  "rgba(244,239,228,0.10)",
  hairline2: "rgba(244,239,228,0.18)",
  accent:    "#7CC5A1",            // pitch mint
  accentDeep:"#0E4D3C",            // deep emerald
  gold:      "#D4A85A",             // muted gold (HBOOKS only)
  goldDeep:  "#8A6A2E",
  danger:    "#E27A6B",
};

// ─── Banned screen ───────────────────────────────────────────────────────────
const BannedScreen = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6" style={{ background: T.bg, color: T.ink }}>
    <FontLoader />
    <div className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: T.danger }}>Access revoked</div>
    <h1 className="font-display text-5xl sm:text-6xl mt-4 mb-3 text-center" style={{ fontWeight: 500 }}>You've been banned.</h1>
    <p className="font-sans text-sm max-w-sm text-center" style={{ color: T.inkDim }}>
      This browser was blocked from the community board after repeated policy violations.
    </p>
  </div>
);

// ─── Restrained editorial backdrop ───────────────────────────────────────────
const Backdrop = () => (
  <div className="fixed inset-0 pointer-events-none" style={{ background: T.bg, zIndex: 0 }}>
    {/* subtle stadium glow */}
    <div className="absolute inset-x-0 top-0 h-[60vh]" style={{
      background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${T.accentDeep}40 0%, transparent 70%)`
    }} />
    {/* grain */}
    <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{
      backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")"
    }} />
    {/* center-circle hairline */}
    <svg className="absolute left-1/2 top-[18%] -translate-x-1/2 opacity-[0.08]" width="900" height="900" viewBox="0 0 900 900">
      <circle cx="450" cy="450" r="380" fill="none" stroke={T.ink} strokeWidth="1" />
      <line x1="0" y1="450" x2="900" y2="450" stroke={T.ink} strokeWidth="1" />
    </svg>
  </div>
);

// ─── HBOOKS card — coherent #01 founding member ──────────────────────────────
const HBooksCard = () => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
    transition={{ duration: 0.5 }}
    className="group relative flex flex-col p-5 rounded-sm overflow-hidden"
    style={{
      background: `linear-gradient(180deg, ${T.gold}14 0%, ${T.bgRaised} 60%)`,
      border: `1px solid ${T.gold}55`,
    }}
  >
    <div className="flex items-start justify-between mb-6">
      <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: T.gold }}>N° 01</span>
      <span className="font-mono text-[9px] tracking-[0.25em] px-2 py-1 rounded-sm"
            style={{ background: `${T.gold}1f`, color: T.gold, border: `1px solid ${T.gold}40` }}>
        FOUNDING
      </span>
    </div>

    <div className="flex items-center justify-center h-16 mb-5">
      <div
        className="h-14 w-14 rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${T.gold}, ${T.goldDeep})`,
          boxShadow: `0 0 0 1px ${T.gold}66, 0 8px 24px ${T.gold}33`,
        }}
      >
        <span className="font-display text-xl" style={{ color: T.bg, fontWeight: 700 }}>HP</span>
      </div>
    </div>

    <div className="mt-auto">
      <p className="font-display text-base leading-tight" style={{ color: T.ink, fontWeight: 500 }}>
        HBOOKS
      </p>
      <p className="font-mono text-[10px] tracking-[0.15em] mt-1" style={{ color: T.gold }}>
        FOUNDING SUPPORTER
      </p>
    </div>
  </motion.div>
);

// ─── Member card ─────────────────────────────────────────────────────────────
const MemberCard = ({ m, index }: { m: Member; index: number }) => {
  const rank = String(index + 2).padStart(2, "0"); // HBOOKS is 01
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col p-5 rounded-sm transition-colors duration-300"
      style={{
        background: T.bgRaised,
        border: `1px solid ${T.hairline}`,
      }}
    >
      <div className="flex items-start justify-between mb-6">
        <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: T.inkFaint }}>N° {rank}</span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.accent, opacity: 0.7 }} />
      </div>

      <div className="flex items-center justify-center h-16 mb-5">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{
            background: "rgba(255,255,255,0.03)",
            boxShadow: `0 0 0 1px ${T.hairline2}`,
          }}
        >
          <CrestImage url={m.avatar} alt="" className="!w-9 !h-9" />
        </div>
      </div>

      <div className="mt-auto">
        <p className="font-display text-base leading-tight truncate" style={{ color: T.ink, fontWeight: 500 }}>
          {m.username}
        </p>
        <p className="font-mono text-[10px] tracking-[0.15em] mt-1" style={{ color: T.inkFaint }}>
          SUPPORTER
        </p>
      </div>
    </motion.div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
const CommunityPage = () => {
  const [banned, setBanned]                     = useState(isBrowserBanned());
  const [alreadySubmitted, setAlreadySubmitted] = useState(hasSubmitted());
  const [members, setMembers]                   = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers]     = useState(true);
  const [modalOpen, setModalOpen]               = useState(false);
  const [teams, setTeams]                       = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams]         = useState(false);

  const [realName, setRealName]                 = useState("");
  const [username, setUsername]                 = useState("");
  const [selectedAvatar, setSelectedAvatar]     = useState("");
  const [isSupporter, setIsSupporter]           = useState(false);
  const [termsAgreed, setTermsAgreed]           = useState(false);
  const [fieldError, setFieldError]             = useState("");
  const [submitting, setSubmitting]             = useState(false);
  const [submitted, setSubmitted]               = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [confirmChecked, setConfirmChecked]     = useState(false);

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

  useEffect(() => {
    if (banned) return;
    fetchMembers();
    const channel = supabase
      .channel("community-board-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        (payload) => {
          const row = payload.new as (Member & { status: string }) | null;
          const oldRow = payload.old as (Member & { status?: string }) | null;
          if (payload.eventType === "UPDATE") {
            if (row?.status === "approved") {
              setMembers((prev) => {
                if (prev.find((m) => m.id === row.id)) return prev;
                return [{ id: row.id, username: row.username, avatar: row.avatar, created_at: row.created_at }, ...prev];
              });
            } else if (row?.status === "banned" || row?.status === "rejected") {
              setMembers((prev) => prev.filter((m) => m.id !== row.id));
            }
          } else if (payload.eventType === "DELETE") {
            setMembers((prev) => prev.filter((m) => m.id !== (oldRow?.id ?? -999)));
          }
        },
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
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
    setFieldError(""); setSubmitted(false);
    setShowConfirm(false); setConfirmChecked(false);
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
  const totalCount = members.length + 1;

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans" style={{ background: T.bg, color: T.ink }}>
      <FontLoader />
      <Backdrop />

      <div className="relative z-10 mx-auto max-w-6xl px-6 sm:px-10 pt-8 pb-32">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-20">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.2em] uppercase group transition-colors"
                style={{ color: T.inkDim }}>
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </Link>
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: T.inkFaint }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: T.accent }} />
            Live · 10 Odds Board
          </div>
        </div>

        {/* ══ EDITORIAL HERO ══════════════════════════════════════════════ */}
        <header className="grid grid-cols-12 gap-6 mb-20 sm:mb-28">
          <div className="col-span-12 lg:col-span-9">
            <div className="font-mono text-[11px] tracking-[0.35em] uppercase mb-8" style={{ color: T.accent }}>
              — Vol. 01 / The Supporters
            </div>
            <h1 className="font-display leading-[0.92] tracking-tight"
                style={{ fontSize: "clamp(3rem, 9vw, 8rem)", fontWeight: 400, color: T.ink }}>
              The names<br />
              <em style={{ fontStyle: "italic", fontWeight: 300, color: T.accent }}>that keep</em><br />
              the lights on.
            </h1>
          </div>

          <div className="col-span-12 lg:col-span-3 flex lg:flex-col lg:justify-end gap-8 lg:gap-6 lg:pl-6 lg:border-l"
               style={{ borderColor: T.hairline }}>
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: T.inkFaint }}>Members</div>
              <div className="font-display text-4xl" style={{ color: T.ink, fontWeight: 500 }}>
                {loadingMembers ? "—" : String(totalCount).padStart(3, "0")}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: T.inkFaint }}>Updated</div>
              <div className="font-display text-4xl" style={{ color: T.ink, fontWeight: 500 }}>Live</div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 lg:col-start-1 mt-2">
            <p className="text-base sm:text-lg leading-relaxed max-w-2xl" style={{ color: T.inkDim }}>
              Every card below is a real person who put real money behind this project.
              No bots, no filler — just supporters who believed in 10 Odds early enough to be on the wall.
            </p>
          </div>
        </header>

        {/* ══ HOW IT WORKS — editorial 3-step ═════════════════════════════ */}
        <section className="mb-16 sm:mb-20">
          <div className="flex items-baseline justify-between mb-6 pb-4 border-b" style={{ borderColor: T.hairline }}>
            <h2 className="font-display text-2xl" style={{ fontWeight: 500 }}>How you get on the board</h2>
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: T.inkFaint }}>3 steps</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: T.hairline }}>
            {[
              { n: "01", title: "Support the project", sub: "Ko-fi, PayPal, or any contribution channel." },
              { n: "02", title: "Submit your profile", sub: "Name, display handle, and your club crest. 30 seconds." },
              { n: "03", title: "Get recognised", sub: "Reviewed within 1–2 days, then on the wall forever." },
            ].map((s) => (
              <div key={s.n} className="p-6" style={{ background: T.bg }}>
                <div className="font-mono text-[11px] tracking-[0.25em]" style={{ color: T.accent }}>{s.n}</div>
                <h3 className="font-display text-xl mt-3 mb-2" style={{ color: T.ink, fontWeight: 500 }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: T.inkDim }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ MEMBER WALL ═════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-baseline justify-between mb-6 pb-4 border-b" style={{ borderColor: T.hairline }}>
            <h2 className="font-display text-2xl" style={{ fontWeight: 500 }}>The Wall</h2>
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: T.inkFaint }}>
              {loadingMembers ? "Loading…" : `${totalCount} entries`}
            </span>
          </div>

          {loadingMembers ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" style={{ color: T.accent }} />
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: T.inkFaint }}>Loading supporters</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
              initial="hidden" animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            >
              <HBooksCard />
              <AnimatePresence>
                {members.map((m, i) => <MemberCard key={m.id} m={m} index={i} />)}
              </AnimatePresence>

              {members.length === 0 && (
                <div className="col-span-full mt-8 text-center py-12 border border-dashed rounded-sm"
                     style={{ borderColor: T.hairline2 }}>
                  <p className="font-display text-xl mb-1" style={{ color: T.ink, fontWeight: 500 }}>
                    The wall is waiting.
                  </p>
                  <p className="text-sm" style={{ color: T.inkDim }}>Be the next name written on it.</p>
                </div>
              )}
            </motion.div>
          )}
        </section>
      </div>

      {/* ── Floating action ─────────────────────────────────────────────── */}
      {alreadySubmitted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-sm backdrop-blur-md"
          style={{ background: `${T.bgRaised}E6`, border: `1px solid ${T.hairline2}`, color: T.ink }}
        >
          <ShieldCheck className="h-4 w-4" style={{ color: T.accent }} />
          <span className="text-xs font-mono tracking-wider uppercase">Submission received</span>
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
          onClick={openModal}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 pl-5 pr-6 py-4 rounded-sm group"
          style={{
            background: T.ink, color: T.bg,
            boxShadow: `0 20px 40px -10px ${T.ink}30, 0 0 0 1px ${T.ink}`,
          }}
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" strokeWidth={2.5} />
          <span className="font-mono text-[11px] tracking-[0.25em] uppercase font-semibold">Join the board</span>
        </motion.button>
      )}

      {/* ══ JOIN MODAL ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 z-40 backdrop-blur-md"
              style={{ background: "rgba(10,15,13,0.85)" }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-sm font-sans"
                style={{ background: T.bgRaised, border: `1px solid ${T.hairline2}` }}
                onClick={(e) => e.stopPropagation()}
              >
                {submitted ? (
                  <div className="flex flex-col items-center gap-5 p-10 text-center">
                    <CheckCircle className="h-12 w-12" style={{ color: T.accent }} strokeWidth={1.5} />
                    <h2 className="font-display text-3xl" style={{ color: T.ink, fontWeight: 500 }}>
                      You're in the queue.
                    </h2>
                    <p className="text-sm leading-relaxed max-w-xs" style={{ color: T.inkDim }}>
                      Reviews take 1–2 business days. If your card doesn't appear by then,
                      the submission wasn't accepted.
                    </p>
                    <button onClick={closeModal}
                      className="mt-2 px-6 py-3 rounded-sm font-mono text-[11px] tracking-[0.25em] uppercase font-semibold"
                      style={{ background: T.ink, color: T.bg }}>
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="p-8 space-y-6">
                    <div className="flex items-start justify-between pb-6 border-b" style={{ borderColor: T.hairline }}>
                      <div>
                        <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: T.accent }}>
                          New submission
                        </div>
                        <h2 className="font-display text-2xl" style={{ color: T.ink, fontWeight: 500 }}>Join the board</h2>
                      </div>
                      <button onClick={closeModal} className="p-1.5 rounded-sm transition-colors hover:bg-white/5"
                              style={{ color: T.inkDim }}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Full name */}
                    <Field
                      label="Full name"
                      hint="Internal verification only — never displayed."
                      input={
                        <input
                          type="text" value={realName}
                          onChange={(e) => setRealName(e.target.value)}
                          placeholder="Your real name"
                          className="w-full bg-transparent border-0 border-b py-2.5 text-base focus:outline-none transition-colors"
                          style={{ borderColor: T.hairline2, color: T.ink }}
                        />
                      }
                    />

                    {/* Username */}
                    <Field
                      label="Display name"
                      hint="Shown on the board. Max 30 characters."
                      input={
                        <input
                          type="text" value={username} maxLength={30}
                          onChange={(e) => setUsername(e.target.value.replace(/<[^>]*>/g, "").slice(0, 30))}
                          placeholder="e.g. GoalMaster99"
                          className="w-full bg-transparent border-0 border-b py-2.5 text-base focus:outline-none transition-colors"
                          style={{ borderColor: T.hairline2, color: T.ink }}
                        />
                      }
                    />

                    {/* Team avatar */}
                    <div className="space-y-3">
                      <div>
                        <div className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: T.inkDim }}>
                          Team crest
                        </div>
                        <div className="text-xs mt-1" style={{ color: T.inkFaint }}>Pick the badge that appears on your card.</div>
                      </div>
                      {loadingTeams ? (
                        <div className="flex justify-center py-6"><RefreshCw className="h-4 w-4 animate-spin" style={{ color: T.inkFaint }} /></div>
                      ) : (
                        <div className="grid grid-cols-7 gap-1.5 max-h-44 overflow-y-auto pr-1">
                          {teams.map((t) => (
                            <button
                              key={t.id} type="button" title={t.name}
                              onClick={() => setSelectedAvatar(t.crest_url)}
                              className="relative flex items-center justify-center aspect-square rounded-sm transition-all duration-150"
                              style={{
                                background: selectedAvatar === t.crest_url ? `${T.accent}20` : "rgba(255,255,255,0.03)",
                                border: `1px solid ${selectedAvatar === t.crest_url ? T.accent : T.hairline}`,
                              }}
                            >
                              <CrestImage url={t.crest_url} alt={t.name} size="sm" className="w-6 h-6" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3 pt-2">
                      <Check
                        checked={isSupporter} onChange={setIsSupporter}
                        label="I've supported the 10 Odds project (Ko-fi, PayPal, or similar)."
                      />
                      <Check
                        checked={termsAgreed} onChange={setTermsAgreed}
                        label={
                          <>I agree to the{" "}
                            <a href="/community-terms" target="_blank" rel="noreferrer"
                               className="underline underline-offset-4 inline-flex items-center gap-0.5"
                               style={{ color: T.accent }}>
                              community terms <ChevronRight className="h-3 w-3" />
                            </a>
                          </>
                        }
                      />
                    </div>

                    {fieldError && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 rounded-sm px-3 py-2.5"
                        style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40` }}>
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: T.danger }} />
                        <p className="text-xs" style={{ color: T.danger }}>{fieldError}</p>
                      </motion.div>
                    )}

                    <button
                      onClick={handleInitialSubmit}
                      disabled={!canSubmit || submitting}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-sm font-mono text-[11px] tracking-[0.25em] uppercase font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                      style={{ background: T.ink, color: T.bg }}
                    >
                      {submitting
                        ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting</>
                        : <>Review submission →</>}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ══ CONFIRM POPUP ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowConfirm(false); setConfirmChecked(false); }}
              className="fixed inset-0 z-[60] backdrop-blur-md"
              style={{ background: "rgba(10,15,13,0.92)" }}
            />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md rounded-sm p-7 space-y-6"
                style={{ background: T.bgRaised, border: `1px solid ${T.hairline2}` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3 pb-5 border-b" style={{ borderColor: T.hairline }}>
                  <Eye className="h-5 w-5 mt-1" style={{ color: T.accent }} />
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-1.5" style={{ color: T.accent }}>
                      Final check
                    </div>
                    <h2 className="font-display text-xl" style={{ color: T.ink, fontWeight: 500 }}>Confirm your details</h2>
                  </div>
                </div>

                <div className="space-y-3.5 text-sm">
                  {[
                    ["Display name", sanitise(username)],
                    ["Supporter",    isSupporter ? "Yes" : "No"],
                    ["Terms",        termsAgreed ? "Agreed" : "Not agreed"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-baseline pb-2.5 border-b" style={{ borderColor: T.hairline }}>
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: T.inkFaint }}>{label}</span>
                      <span className="font-display text-base" style={{ color: T.ink, fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: T.inkFaint }}>Crest</span>
                    {selectedAvatar
                      ? <img src={selectedAvatar} alt="" className="h-7 w-7 object-contain" />
                      : <span className="text-sm" style={{ color: T.ink }}>—</span>}
                  </div>
                </div>

                <Check checked={confirmChecked} onChange={setConfirmChecked}
                       label="I've checked everything and it's correct." />

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setShowConfirm(false); setConfirmChecked(false); }}
                    className="flex-1 py-3 rounded-sm font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-colors"
                    style={{ border: `1px solid ${T.hairline2}`, color: T.inkDim }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={!confirmChecked || submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm font-mono text-[11px] tracking-[0.25em] uppercase font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: T.accent, color: T.bg }}
                  >
                    {submitting
                      ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting</>
                      : <>Confirm</>}
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

// ── Small primitives ────────────────────────────────────────────────────────
const Field = ({ label, hint, input }: { label: string; hint: string; input: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: T.inkDim }}>{label}</div>
    <div className="text-xs" style={{ color: T.inkFaint }}>{hint}</div>
    {input}
  </div>
);

const Check = ({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label: React.ReactNode }) => (
  <label className="flex items-start gap-3 cursor-pointer group">
    <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors"
          style={{
            background: checked ? T.accent : "transparent",
            border: `1px solid ${checked ? T.accent : T.hairline2}`,
          }}>
      {checked && <CheckCircle className="h-3 w-3" style={{ color: T.bg }} strokeWidth={3} />}
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </span>
    <span className="text-xs leading-relaxed transition-colors" style={{ color: T.inkDim }}>{label}</span>
  </label>
);

export default CommunityPage;
