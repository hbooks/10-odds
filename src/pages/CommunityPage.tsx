import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  Users,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ShieldOff,
  ChevronRight,
} from "lucide-react";
import Layout from "@/components/Layout";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Banned word list (150+ terms) ────────────────────────────────────────────
const BANNED_WORDS = [
  "fuck","fucker","fucked","fucking","fucks","fuk","fck","f*ck","f**k",
  "shit","shits","shitting","shitter","sh1t","bullshit",
  "ass","asses","asshole","assh0le","arse","arsehole",
  "bitch","bitches","bitching","b1tch",
  "cunt","cunts","c*nt",
  "dick","dicks","dickhead","d1ck",
  "cock","cocks","cockhead",
  "pussy","pussies",
  "bastard","bastards",
  "prick","pricks",
  "twat","twats",
  "wank","wanker","wankers","wanking",
  "slut","sluts",
  "whore","whores",
  "nigger","niggers","nigga","niggas","n1gger","nga", "nnggaaaa", "n1ggaaaa",
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
  "damn","damnit",
  "hell","hells",
  "piss","pisses","pissing","pissed","pisser",
  "jerk","jerks",
  "dumb","dumber","dumbass",
  "stupid","stupids",
  "loser","losers",
  "freak","freaks",
  "pervert","perverts","perv",
  "creep","creeps","creepy",
  "rape","rapes","rapist","rapists",
  "murder","murderer",
  "kill","killer","kills",
  "suicide","suicides",
  "terrorist","terrorists",
  "jihad",
  "nazi","nazis",
  "hitler","mussolini",
  "porn","porno","pornography",
  "sex","sexy","sexist",
  "dildo","dildos",
  "vibrator","vibrators",
  "masturbate","masturbation",
  "ejaculate","ejaculation",
  "orgasm","orgasms",
  "erection","erections",
  "boob","boobs","boobies",
  "tits","tit","titty","titties",
  "nipple","nipples",
  "penis","penises",
  "vagina","vaginas",
  "clitoris",
  "anus","anuses",
  "testicle","testicles","balls","nutjob",
  "scrotum",
  "blowjob","blowjobs","handjob","handjobs",
  "hooker","hookers","prostitute","prostitutes",
  "pimp","pimps",
  "drug","drugs","druggie","junkie",
  "cocaine","heroin","meth","methamphetamine",
  "stfu","gtfo","wtf","omfg",
  "s.o.b","son of a bitch",
  "motherf","motherfucker","mf","mfer",
  "d*mn","sh*t","a**","a**hole",
  "admin","administrator","moderator","staff","official","support",
  "10odds","10-odds","tenodds",
];

const containsBannedWord = (str: string): boolean => {
  const lower = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return BANNED_WORDS.some((w) => {
    const clean = w.replace(/[^a-z0-9]/g, "");
    return lower.includes(clean);
  });
};

// ─── LocalStorage ban helpers ─────────────────────────────────────────────────
const LS_FAIL_KEY = "10odds_cm_fails";
const LS_BAN_KEY  = "10odds_cm_banned";
const MAX_FAILS   = 3;

const getFailCount = () => parseInt(localStorage.getItem(LS_FAIL_KEY) ?? "0", 10);
const incrementFail = () => localStorage.setItem(LS_FAIL_KEY, String(getFailCount() + 1));
const isBrowserBanned = () => localStorage.getItem(LS_BAN_KEY) === "true";
const banBrowser = () => localStorage.setItem(LS_BAN_KEY, "true");

// ─── Types ────────────────────────────────────────────────────────────────────
interface Member {
  id: number;
  username: string;
  avatar: string;
  created_at: string;
}

interface Team {
  id: number;
  name: string;
  crest_url: string;
}

// ─── Soft gradient palette cycling for cards ──────────────────────────────────
const CARD_GRADIENTS = [
  "from-blue-950/60 to-blue-900/30",
  "from-emerald-950/60 to-emerald-900/30",
  "from-violet-950/60 to-violet-900/30",
  "from-amber-950/60 to-amber-900/30",
  "from-rose-950/60 to-rose-900/30",
  "from-cyan-950/60 to-cyan-900/30",
  "from-indigo-950/60 to-indigo-900/30",
  "from-orange-950/60 to-orange-900/30",
];

// ─── BannedScreen ─────────────────────────────────────────────────────────────
const BannedScreen = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-red-950 text-white">
    <div className="text-8xl mb-6">⛔</div>
    <h1 className="text-3xl font-bold tracking-tight mb-2">YOU HAVE BEEN BANNED</h1>
    <p className="text-red-300 text-sm max-w-xs text-center">
      This browser has been blocked from accessing the community board due to repeated policy violations.
    </p>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const CommunityPage = () => {
  const [banned, setBanned] = useState(isBrowserBanned());
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Form fields
  const [realName, setRealName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [isSupporter, setIsSupporter] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Submission state
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Fetch approved members ──────────────────────────────────────────────
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

  // ── Fetch teams when modal opens ────────────────────────────────────────
  const openModal = async () => {
    if (banned) return;
    setModalOpen(true);
    if (teams.length === 0) {
      setLoadingTeams(true);
      const { data } = await supabase
        .from("teams")
        .select("id, name, crest_url")
        .order("name");
      setTeams((data as Team[]) ?? []);
      setLoadingTeams(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setFieldError("");
    setSubmitted(false);
    setRealName("");
    setUsername("");
    setSelectedAvatar("");
    setIsSupporter(false);
    setTermsAgreed(false);
  };

  // ── Username sanitise ───────────────────────────────────────────────────
  const sanitiseUsername = (raw: string) =>
    raw.replace(/<[^>]*>/g, "").trim().slice(0, 30);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setFieldError("");

    const cleanName = realName.trim();
    const cleanUser = sanitiseUsername(username);

    if (!cleanName) return setFieldError("Please enter your full name.");
    if (!cleanUser) return setFieldError("Please enter a username.");
    if (cleanUser.length < 2) return setFieldError("Username must be at least 2 characters.");
    if (!selectedAvatar) return setFieldError("Please select a team avatar.");
    if (!isSupporter) return setFieldError("Please confirm you have supported the project.");
    if (!termsAgreed) return setFieldError("Please agree to the community terms.");

    if (containsBannedWord(cleanUser)) {
      const fails = getFailCount() + 1;
      incrementFail();
      if (fails >= MAX_FAILS) {
        banBrowser();
        setBanned(true);
        return;
      }
      return setFieldError(
        `That username isn't allowed, please choose another. (Warning ${fails}/${MAX_FAILS})`
      );
    }

    setSubmitting(true);
    const { error } = await supabase.from("community_members").insert({
      real_name:    cleanName,
      username:     cleanUser,
      avatar:       selectedAvatar,
      is_supporter: isSupporter,
      terms_agreed: termsAgreed,
      status:       "pending",
    });
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        return setFieldError("That username is already taken. Please choose another.");
      }
      return setFieldError("Something went wrong. Please try again.");
    }

    setSubmitted(true);
  };

  if (banned) return <BannedScreen />;

  const canSubmit = realName.trim() && username.trim() && selectedAvatar && isSupporter && termsAgreed;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-5xl">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl gradient-gold mb-4">
            <Users className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight mb-2">
            10 Odds Community Board
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            A growing family of supporters who believe in the project.
            Supporters are hand-reviewed before appearing here.
          </p>
        </div>

        {/* ── Board grid ───────────────────────────────────────────────── */}
        {loadingMembers ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No approved members yet — be the first!
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          >
            {members.map((m, i) => (
              <motion.div
                key={m.id}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.92 },
                  show:   { opacity: 1, y: 0,  scale: 1 },
                }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
              >
                <div className="w-14 h-14 rounded-full bg-background/40 flex items-center justify-center overflow-hidden ring-2 ring-white/10">
                  <img
                    src={m.avatar}
                    alt=""
                    className="w-10 h-10 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <p className="text-xs font-semibold text-center text-foreground leading-tight break-all">
                  {m.username}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Floating join button ──────────────────────────────────────── */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          onClick={openModal}
          className="fixed bottom-8 right-6 z-40 flex items-center gap-2 gradient-gold text-accent-foreground font-semibold px-5 py-3.5 rounded-2xl shadow-xl text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Join Community Board
        </motion.button>
      </div>

      {/* ── Join Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-x-4 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl"
            >
              {submitted ? (
                /* ── Success state ── */
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-400" />
                  <h2 className="text-xl font-heading font-bold">Request submitted!</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your request is being reviewed. If approved, it'll appear within 1–2 business
                    days. If it doesn't show up after that, it means your submission wasn't accepted.
                  </p>
                  <button
                    onClick={closeModal}
                    className="mt-2 px-6 py-2.5 rounded-xl gradient-gold text-accent-foreground text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* ── Form ── */
                <div className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-heading font-bold">Join the Board</h2>
                    <button
                      onClick={closeModal}
                      className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Full name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Full Name</label>
                    <p className="text-[11px] text-muted-foreground">
                      Never displayed – used only for verification.
                    </p>
                    <input
                      type="text"
                      value={realName}
                      onChange={(e) => setRealName(e.target.value)}
                      placeholder="Your real name"
                      className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Username</label>
                    <p className="text-[11px] text-muted-foreground">
                      This is the name displayed on the board. Max 30 characters.
                    </p>
                    <input
                      type="text"
                      value={username}
                      maxLength={30}
                      onChange={(e) => setUsername(sanitiseUsername(e.target.value))}
                      placeholder="e.g. GoalMaster99"
                      className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
                    />
                  </div>

                  {/* Avatar grid */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Team Avatar</label>
                    <p className="text-[11px] text-muted-foreground">
                      Choose the team crest you'd like to represent you.
                    </p>
                    {loadingTeams ? (
                      <div className="flex justify-center py-6">
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-6 gap-2 max-h-44 overflow-y-auto pr-1">
                        {teams.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedAvatar(t.crest_url)}
                            title={t.name}
                            className={`relative flex items-center justify-center w-full aspect-square rounded-xl border-2 transition-all duration-150 ${
                              selectedAvatar === t.crest_url
                                ? "border-gold bg-gold/10 scale-105 shadow-md"
                                : "border-border bg-muted/30 hover:border-muted-foreground/40"
                            }`}
                          >
                            <img
                              src={t.crest_url}
                              alt={t.name}
                              className="w-7 h-7 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                            />
                            {selectedAvatar === t.crest_url && (
                              <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-gold flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 text-accent-foreground" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Supporter checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSupporter}
                      onChange={(e) => setIsSupporter(e.target.checked)}
                      className="mt-0.5 accent-gold h-4 w-4 cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      I have supported the 10 Odds project (via Ko‑fi, PayPal, or similar).
                    </span>
                  </label>

                  {/* Terms checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="mt-0.5 accent-gold h-4 w-4 cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      I agree to the{" "}
                      <a
                        href="/community-terms"
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold underline underline-offset-2 hover:text-gold/80 inline-flex items-center gap-0.5"
                      >
                        community terms <ChevronRight className="h-3 w-3" />
                      </a>
                    </span>
                  </label>

                  {/* Error */}
                  {fieldError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-400">{fieldError}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    className="w-full flex items-center justify-center gap-2 gradient-gold text-accent-foreground font-semibold px-5 py-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</>
                      : "Submit for Review"
                    }
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default CommunityPage;