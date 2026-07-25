import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { motion, AnimatePresence } from "framer-motion";
import {
    Pencil,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    ArrowLeft,
    X,
    BarChart3,
    Target,
    Clock,
    User,
    Mail,
    Shield,
    Sparkles
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import CrestImage from "@/components/CrestImage";
import { toast } from "sonner";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ── Shared design tokens ─────────────────────────────────────────────
// Centralized so the palette stays consistent and is easy to tune in one place.
const C = {
    bg: "#0A0F0D",
    panel: "#0F1714",
    card: "rgba(255,255,255,0.03)",
    cardHover: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(244,239,228,0.07)",
    cardBorderHover: "rgba(244,239,228,0.16)",
    divider: "rgba(244,239,228,0.07)",
    text: "#F4EFE4",
    textMuted: "rgba(244,239,228,0.68)",
    textFaint: "rgba(244,239,228,0.48)",
    textGhost: "rgba(244,239,228,0.34)",
    gold: "#D4A85A",
    goldSoft: "rgba(212,175,55,0.12)",
    goldFaint: "rgba(212,175,55,0.06)",
    red: "#E27A6B",
};

interface Team {
    id: number;
    name: string;
    crest_url: string;
}

interface ComingSoonModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon: React.ReactNode;
}

// ── Reusable: closes a modal on Escape while it's open ───────────────
function useEscapeToClose(isOpen: boolean, onClose: () => void) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);
}

function ComingSoonModal({ isOpen, onClose, title, icon }: ComingSoonModalProps) {
    useEscapeToClose(isOpen, onClose);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="coming-soon-title"
                        initial={{ opacity: 0, scale: 0.94, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ type: "spring", stiffness: 340, damping: 30 }}
                        className="fixed inset-4 z-50 max-w-md mx-auto my-auto h-fit max-h-[80vh] rounded-2xl p-8 text-center shadow-2xl shadow-black/40"
                        style={{ background: C.panel, border: "1px solid rgba(244,239,228,0.1)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center gap-5">
                            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: C.goldSoft }}>
                                <div style={{ color: C.gold }}>{icon}</div>
                            </div>
                            <div className="space-y-2">
                                <h2 id="coming-soon-title" className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.text }}>
                                    {title}
                                </h2>
                                <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
                                    We're building this feature and it'll be ready soon. 
                                    Consider supporting the project to help us bring it to life faster!
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: C.textFaint }}>
                                <Clock className="h-3.5 w-3.5" />
                                <span>Coming in the next update</span>
                            </div>
                            <button
                                onClick={onClose}
                                autoFocus
                                className="w-full px-6 py-3 rounded-xl font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-transform hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 mt-1"
                                style={{ background: C.gold, color: "#0A0F0D", ["--tw-ring-color" as string]: C.gold, ["--tw-ring-offset-color" as string]: C.panel }}
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ─── Option card: a feature entry point, currently in preview ──────────
function OptionCard({
    icon,
    title,
    subtitle,
    onClick
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 p-4 sm:p-5 rounded-xl transition-all duration-200 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
                background: C.card,
                border: `1px solid ${C.cardBorder}`,
                ["--tw-ring-color" as string]: C.gold,
                ["--tw-ring-offset-color" as string]: C.bg,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = C.cardHover;
                e.currentTarget.style.borderColor = C.cardBorderHover;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = C.card;
                e.currentTarget.style.borderColor = C.cardBorder;
            }}
        >
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105" style={{ background: C.goldSoft }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: C.text }}>{title}</p>
                {subtitle && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: C.textFaint }}>{subtitle}</p>
                )}
            </div>
            <div
                className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full font-medium tracking-wide shrink-0"
                style={{ background: C.goldFaint, color: "rgba(212,175,55,0.75)", border: "1px solid rgba(212,175,55,0.15)" }}
            >
                Coming soon
            </div>
        </button>
    );
}

// ─── Skeleton shown while the profile record is loading ────────────────
function ProfileSkeleton() {
    return (
        <div className="min-h-screen py-8 px-4" style={{ background: C.bg }}>
            <div className="max-w-2xl mx-auto animate-pulse">
                <div className="h-4 w-16 rounded mb-6" style={{ background: C.card }} />
                <div className="rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
                    <div className="flex items-center gap-5">
                        <div className="h-24 w-24 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
                        <div className="flex-1 space-y-3">
                            <div className="h-6 w-40 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                            <div className="h-4 w-56 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                        </div>
                    </div>
                    <div className="mt-6 h-16 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
                    <div className="mt-6 space-y-3">
                        <div className="h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
                        <div className="h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const { isAuthenticated, user, logout } = useKindeAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [crestUrl, setCrestUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [showCrestPicker, setShowCrestPicker] = useState(false);
    const [savingCrest, setSavingCrest] = useState(false);

    // Modal states
    const [showPredictionsModal, setShowPredictionsModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);

    // ── Fetch user data from Supabase ────────────────────────────────
    const fetchUserData = async (kindeUserId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from("user_crests")
            .select("username, crest_url")
            .eq("user_id", kindeUserId)
            .maybeSingle();

        if (!error && data) {
            setUsername(data.username || user?.email?.split('@')[0] || '');
            setCrestUrl(data.crest_url || null);
        } else {
            setUsername(user?.email?.split('@')[0] || '');
            setCrestUrl(null);
        }
        setLoading(false);
    };

    // ── Fetch teams for crest picker ──────────────────────────────────
    const fetchTeams = async () => {
        setLoadingTeams(true);
        const { data, error } = await supabase
            .from("teams")
            .select("id, name, crest_url")
            .order("name");

        if (!error && data) {
            setTeams(data as Team[]);
        }
        setLoadingTeams(false);
    };

    // ── Check user ID match ──────────────────────────────────────────
    useEffect(() => {
        if (isAuthenticated && user && userId) {
            if (user.id !== userId) {
                navigate('/');
            } else {
                fetchUserData(user.id);
                fetchTeams();
            }
        }
    }, [isAuthenticated, user, userId, navigate]);

    // ── Auto-save crest when selected ──────────────────────────────────
    const saveCrestToDatabase = async (crest: string | null) => {
        if (!user?.id) return;

        setSavingCrest(true);
        try {
            const { error: upsertError } = await supabase
                .from("user_crests")
                .upsert({
                    user_id: user.id,
                    username: username,
                    crest_url: crest,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id',
                });

            if (upsertError) throw upsertError;

            setCrestUrl(crest);
            toast.success('Crest updated successfully!');
        } catch (error) {
            toast.error('Failed to update crest. Please try again.');
        } finally {
            setSavingCrest(false);
        }
    };

    // ─── Select a crest from the picker ──────────────────────────────
    const handleSelectCrest = (crest: string) => {
        setShowCrestPicker(false);
        saveCrestToDatabase(crest);
    };

    // ─── Reset to default avatar ──────────────────────────────────────
    const handleResetCrest = () => {
        setShowCrestPicker(false);
        saveCrestToDatabase("https://api.dicebear.com/10.x/thumbs/svg?seed=classic");
    };

    // ─── Generate DiceBear default avatar URL ────────────────────────
    const getDefaultAvatarUrl = () => {
        if (user?.id) {
            return `https://api.dicebear.com/10.x/thumbs/svg?seed=classic`;
        }
        return `https://api.dicebear.com/8.x/adventurer-neutral/svg?seed=default`;
    };

    useEscapeToClose(showCrestPicker, () => setShowCrestPicker(false));

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4" style={{ background: C.bg }}>
                <div className="text-center max-w-sm">
                    <div className="h-14 w-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: C.goldSoft }}>
                        <User className="h-6 w-6" style={{ color: C.gold }} />
                    </div>
                    <h2 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.text }}>Please log in</h2>
                    <p className="text-sm mt-2" style={{ color: C.textMuted }}>You need to be logged in to view your profile.</p>
                </div>
            </div>
        );
    }

    if (user && userId && user.id !== userId) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4" style={{ background: C.bg }}>
                <div className="text-center max-w-sm">
                    <div className="h-14 w-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(226,122,107,0.12)" }}>
                        <Shield className="h-6 w-6" style={{ color: C.red }} />
                    </div>
                    <h2 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.red }}>Access denied</h2>
                    <p className="text-sm mt-2" style={{ color: C.textMuted }}>You are not authorized to view this profile.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return <ProfileSkeleton />;
    }

    const displayName = username || user?.email?.split('@')[0] || "User";
    const avatarUrl = crestUrl || getDefaultAvatarUrl();

    return (
        <div className="min-h-screen py-8 px-4" style={{ background: C.bg }}>
            <div className="max-w-2xl mx-auto">
                {/* Back button */}
                <Link
                    to="/games"
                    className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.2em] uppercase group transition-colors mb-6 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ color: C.textMuted, ["--tw-ring-color" as string]: C.gold, ["--tw-ring-offset-color" as string]: C.bg }}
                >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Back
                </Link>

                {/* ── Profile Card ─────────────────────────────────────────── */}
                <div className="rounded-2xl p-6 sm:p-7" style={{
                    background: C.card,
                    border: `1px solid ${C.cardBorder}`
                }}>
                    {/* Header with avatar */}
                    <div className="flex items-center gap-4 sm:gap-5">
                        <div className="relative shrink-0">
                            <div
                                className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 flex items-center justify-center"
                                style={{ borderColor: "rgba(244,239,228,0.14)", background: "rgba(255,255,255,0.03)" }}
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={`${displayName}'s avatar`}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-3xl font-bold" style={{ color: C.gold }}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setShowCrestPicker(true)}
                                aria-label="Change profile picture"
                                disabled={savingCrest}
                                className="absolute -bottom-1 -right-1 h-8 w-8 flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 shadow-lg disabled:opacity-70 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                style={{ background: C.gold, color: "#0A0F0D", ["--tw-ring-color" as string]: C.gold, ["--tw-ring-offset-color" as string]: C.bg }}
                            >
                                {savingCrest ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Pencil className="h-3.5 w-3.5" />
                                )}
                            </button>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold truncate" style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.text }}>
                                {displayName}
                            </h1>
                            <p className="text-sm truncate mt-0.5" style={{ color: C.textMuted }}>
                                {user?.email}
                            </p>
                            {!crestUrl && (
                                <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: C.textFaint }}>
                                    <Sparkles className="h-3 w-3 shrink-0" />
                                    Default 10 Odds avatar
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Migration Notice ──────────────────────────────────── */}
                    <div className="mt-6 p-4 rounded-xl" style={{
                        background: C.goldFaint,
                        border: "1px solid rgba(212,175,55,0.14)"
                    }}>
                        <div className="flex items-start gap-3">
                            <Shield className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.gold }} />
                            <div>
                                <p className="text-sm font-semibold" style={{ color: C.gold }}>Database migration in progress</p>
                                <p className="text-xs mt-1 leading-relaxed" style={{ color: C.textFaint }}>
                                    User details (name, username) are currently locked while we upgrade our systems.
                                    Your profile picture can still be changed. We'll notify you when full editing is available.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Read-only user details ──────────────────────────────── */}
                    <div className="mt-7">
                        <p className="text-xs font-mono tracking-[0.2em] uppercase mb-3" style={{ color: C.textGhost }}>
                            Account Details
                        </p>
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.divider}` }}>
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(244,239,228,0.05)" }}>
                                    <User className="h-4 w-4" style={{ color: C.textFaint }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-mono tracking-wide uppercase" style={{ color: C.textGhost }}>Display Name</p>
                                    <p className="text-sm truncate mt-0.5" style={{ color: C.textMuted }}>{displayName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.divider}` }}>
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(244,239,228,0.05)" }}>
                                    <Mail className="h-4 w-4" style={{ color: C.textFaint }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-mono tracking-wide uppercase" style={{ color: C.textGhost }}>Email</p>
                                    <p className="text-sm truncate mt-0.5" style={{ color: C.textMuted }}>{user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Divider ────────────────────────────────────────────── */}
                    <div className="my-7 h-px" style={{ background: C.divider }} />

                    {/* ── Feature Options ────────────────────────────────────── */}
                    <div className="space-y-3">
                        <p className="text-xs font-mono tracking-[0.2em] uppercase" style={{ color: C.textGhost }}>
                            Coming Soon
                        </p>

                        <OptionCard
                            icon={<Target className="h-5 w-5" style={{ color: C.gold }} />}
                            title="Predictions Tracked"
                            subtitle="View your prediction history"
                            onClick={() => setShowPredictionsModal(true)}
                        />

                        <OptionCard
                            icon={<BarChart3 className="h-5 w-5" style={{ color: C.gold }} />}
                            title="My Stats"
                            subtitle="Your performance analytics"
                            onClick={() => setShowStatsModal(true)}
                        />
                    </div>

                    {/* ── Logout ────────────────────────────────────────────────── */}
                    <button
                        onClick={() => logout()}
                        className="w-full mt-7 px-6 py-3 rounded-xl font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-all hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={{
                            background: "rgba(226, 122, 107, 0.09)",
                            color: C.red,
                            border: "1px solid rgba(226, 122, 107, 0.18)",
                            ["--tw-ring-color" as string]: C.red,
                            ["--tw-ring-offset-color" as string]: C.bg,
                        }}
                    >
                        Log out
                    </button>
                </div>
            </div>

            {/* ── Crest Picker Modal ────────────────────────────────────── */}
            <AnimatePresence>
                {showCrestPicker && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowCrestPicker(false)}
                            aria-hidden="true"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="crest-picker-title"
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 8 }}
                            transition={{ type: "spring", stiffness: 340, damping: 30 }}
                            className="fixed inset-4 z-50 max-w-2xl mx-auto my-auto h-fit max-h-[85vh] overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/40"
                            style={{ background: C.panel, border: "1px solid rgba(244,239,228,0.1)" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between gap-4 mb-5">
                                <div>
                                    <h2 id="crest-picker-title" className="text-xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.text }}>
                                        Choose your crest
                                    </h2>
                                    <p className="text-xs mt-1" style={{ color: C.textFaint }}>
                                        Select a team crest for your profile picture
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCrestPicker(false)}
                                    aria-label="Close"
                                    className="p-2 -mr-1 -mt-1 rounded-lg hover:bg-white/5 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                    style={{ color: C.textMuted, ["--tw-ring-color" as string]: C.gold, ["--tw-ring-offset-color" as string]: C.panel }}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {loadingTeams ? (
                                <div className="flex flex-col items-center gap-3 py-16" role="status" aria-live="polite">
                                    <RefreshCw className="h-6 w-6 animate-spin" style={{ color: C.textFaint }} />
                                    <span className="text-xs" style={{ color: C.textGhost }}>Loading crests…</span>
                                </div>
                            ) : teams.length > 0 ? (
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 sm:gap-3 max-h-72 overflow-y-auto p-1">
                                    {teams.map((team) => {
                                        const isSelected = crestUrl === team.crest_url;
                                        return (
                                            <button
                                                key={team.id}
                                                onClick={() => handleSelectCrest(team.crest_url)}
                                                aria-pressed={isSelected}
                                                aria-label={team.name}
                                                title={team.name}
                                                className={`relative aspect-square rounded-xl p-2.5 transition-all hover:scale-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isSelected
                                                    ? "border-2 border-gold bg-gold/10"
                                                    : "border border-white/8 hover:border-white/20"
                                                    }`}
                                                style={{ ["--tw-ring-color" as string]: C.gold, ["--tw-ring-offset-color" as string]: C.panel }}
                                            >
                                                <CrestImage url={team.crest_url} alt={team.name} size="md" className="w-full h-full object-contain" />
                                                {isSelected && (
                                                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center" style={{ background: C.gold }}>
                                                        <CheckCircle className="h-3 w-3" style={{ color: "#0A0F0D" }} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-16 text-center">
                                    <AlertCircle className="h-5 w-5" style={{ color: C.textFaint }} />
                                    <p className="text-sm" style={{ color: C.textFaint }}>No crests available right now</p>
                                </div>
                            )}

                            <div className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: C.divider }}>
                                <button
                                    onClick={handleResetCrest}
                                    disabled={savingCrest}
                                    className="text-xs hover:underline transition-colors flex items-center gap-1.5 disabled:opacity-60 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                    style={{ color: C.textGhost, ["--tw-ring-color" as string]: C.gold, ["--tw-ring-offset-color" as string]: C.panel }}
                                >
                                    {savingCrest ? (
                                        <><RefreshCw className="h-3 w-3 animate-spin" /> Resetting…</>
                                    ) : (
                                        <>↺ Reset to default avatar</>
                                    )}
                                </button>
                                <span className="text-xs" style={{ color: C.textGhost }}>
                                    {teams.length} crest{teams.length === 1 ? "" : "s"} available
                                </span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Coming Soon Modals ────────────────────────────────────── */}
            <ComingSoonModal
                isOpen={showPredictionsModal}
                onClose={() => setShowPredictionsModal(false)}
                title="Predictions Tracked"
                icon={<Target className="h-7 w-7" />}
            />
            <ComingSoonModal
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)}
                title="My Stats"
                icon={<BarChart3 className="h-7 w-7" />}
            />
        </div>
    );
}