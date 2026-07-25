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

function ComingSoonModal({ isOpen, onClose, title, icon }: ComingSoonModalProps) {
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
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-4 z-50 max-w-md mx-auto my-auto max-h-[80vh] rounded-2xl p-8 text-center"
                        style={{ background: "#0F1714", border: "1px solid rgba(244,239,228,0.1)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center gap-6">
                            <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)" }}>
                                <div className="text-4xl">{icon}</div>
                            </div>
                            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                                {title}
                            </h2>
                            <p className="text-sm" style={{ color: "rgba(244,239,228,0.62)" }}>
                                We're working on this feature and it will be available soon. Stay tuned!
                            </p>
                            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(244,239,228,0.38)" }}>
                                <Clock className="h-3.5 w-3.5" />
                                <span>Coming in the next update</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full px-6 py-3 rounded-xl font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-colors mt-2"
                                style={{ background: "#D4A85A", color: "#0A0F0D" }}
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
        saveCrestToDatabase(null);
    };

    // ─── Generate DiceBear default avatar URL ────────────────────────
    const getDefaultAvatarUrl = () => {
        if (user?.id) {
            return `https://api.dicebear.com/10.x/thumbs/svg?seed=classic`;
        }
        return `https://api.dicebear.com/8.x/adventurer-neutral/svg?seed=default`;
    };

    // ─── Option card component ────────────────────────────────────────
    const OptionCard = ({
        icon,
        title,
        subtitle,
        onClick
    }: {
        icon: React.ReactNode;
        title: string;
        subtitle?: string;
        onClick: () => void;
    }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 p-5 rounded-xl transition-all duration-200 text-left group"
            style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(244,239,228,0.06)",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(244,239,228,0.15)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(244,239,228,0.06)";
            }}
        >
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(212,175,55,0.12)" }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: "#F4EFE4" }}>{title}</p>
                {subtitle && (
                    <p className="text-xs mt-0.5" style={{ color: "rgba(244,239,228,0.38)" }}>{subtitle}</p>
                )}
            </div>
            <div className="text-xs px-3 py-1 rounded-full" style={{
                background: "rgba(212,175,55,0.08)",
                color: "rgba(212,175,55,0.6)"
            }}>
                Soon
            </div>
        </button>
    );

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: "#0A0F0D" }}>
                <div className="text-center">
                    <h2 className="text-2xl font-bold" style={{ color: "#F4EFE4" }}>Please log in</h2>
                    <p style={{ color: "rgba(244,239,228,0.62)" }}>You need to be logged in to view your profile.</p>
                </div>
            </div>
        );
    }

    if (user && userId && user.id !== userId) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: "#0A0F0D" }}>
                <div className="text-center">
                    <h2 className="text-2xl font-bold" style={{ color: "#E27A6B" }}>Access Denied</h2>
                    <p style={{ color: "rgba(244,239,228,0.62)" }}>You are not authorized to view this profile.</p>
                </div>
            </div>
        );
    }

    const displayName = username || user?.email?.split('@')[0] || "User";
    const avatarUrl = crestUrl || getDefaultAvatarUrl();

    return (
        <div className="min-h-screen py-8 px-4" style={{ background: "#0A0F0D" }}>
            <div className="max-w-2xl mx-auto">
                {/* Back button */}
                <Link
                    to="/games"
                    className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.2em] uppercase group transition-colors mb-6"
                    style={{ color: "rgba(244,239,228,0.62)" }}
                >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Back
                </Link>

                {/* ── Profile Card ─────────────────────────────────────────── */}
                <div className="rounded-2xl p-6" style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(244,239,228,0.06)"
                }}>
                    {/* Header with avatar */}
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full overflow-hidden border-2 flex items-center justify-center" style={{ borderColor: "rgba(244,239,228,0.12)" }}>
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-3xl font-bold" style={{ color: "#D4A85A" }}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setShowCrestPicker(true)}
                                className="absolute -bottom-1 -right-1 p-2 rounded-full transition-all hover:scale-110 shadow-lg"
                                style={{ background: "#D4A85A", color: "#0A0F0D" }}
                                disabled={savingCrest}
                            >
                                {savingCrest ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Pencil className="h-3.5 w-3.5" />
                                )}
                            </button>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold truncate" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                                {displayName}
                            </h1>
                            <p className="text-sm truncate" style={{ color: "rgba(244,239,228,0.62)" }}>
                                {user?.email}
                            </p>
                            {!crestUrl && (
                                <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "rgba(244,239,228,0.3)" }}>
                                    <Sparkles className="h-3 w-3" />
                                    Default 10 Odds avatar
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Migration Notice ──────────────────────────────────── */}
                    <div className="mt-6 p-4 rounded-xl" style={{
                        background: "rgba(212,175,55,0.06)",
                        border: "1px solid rgba(212,175,55,0.12)"
                    }}>
                        <div className="flex items-start gap-3">
                            <Shield className="h-4 w-4 mt-0.5" style={{ color: "#D4A85A" }} />
                            <div>
                                <p className="text-sm font-medium" style={{ color: "#D4A85A" }}>Database Migration in Progress</p>
                                <p className="text-xs mt-0.5" style={{ color: "rgba(244,239,228,0.5)" }}>
                                    User details (name, username) are currently locked while we upgrade our systems.
                                    Your profile picture can still be changed. We'll notify you when full editing is available.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Read-only user details ──────────────────────────────── */}
                    <div className="mt-6 space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                            <User className="h-4 w-4" style={{ color: "rgba(244,239,228,0.3)" }} />
                            <div>
                                <p className="text-xs" style={{ color: "rgba(244,239,228,0.3)" }}>Display Name</p>
                                <p className="text-sm" style={{ color: "rgba(244,239,228,0.6)" }}>{displayName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                            <Mail className="h-4 w-4" style={{ color: "rgba(244,239,228,0.3)" }} />
                            <div>
                                <p className="text-xs" style={{ color: "rgba(244,239,228,0.3)" }}>Email</p>
                                <p className="text-sm" style={{ color: "rgba(244,239,228,0.6)" }}>{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Divider ────────────────────────────────────────────── */}
                    <div className="my-6 h-px" style={{ background: "rgba(244,239,228,0.06)" }} />

                    {/* ── Feature Options ────────────────────────────────────── */}
                    <div className="space-y-3">
                        <p className="text-xs font-mono tracking-[0.2em] uppercase" style={{ color: "rgba(244,239,228,0.3)" }}>
                            Coming Soon
                        </p>

                        <OptionCard
                            icon={<Target className="h-5 w-5" style={{ color: "#D4A85A" }} />}
                            title="Predictions Tracked"
                            subtitle="View your prediction history"
                            onClick={() => setShowPredictionsModal(true)}
                        />

                        <OptionCard
                            icon={<BarChart3 className="h-5 w-5" style={{ color: "#D4A85A" }} />}
                            title="My Stats"
                            subtitle="Your performance analytics"
                            onClick={() => setShowStatsModal(true)}
                        />
                    </div>

                    {/* ── Logout ────────────────────────────────────────────────── */}
                    <button
                        onClick={() => logout()}
                        className="w-full mt-6 px-6 py-3 rounded-xl font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-colors"
                        style={{
                            background: "rgba(226, 122, 107, 0.08)",
                            color: "#E27A6B",
                            border: "1px solid rgba(226, 122, 107, 0.12)"
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
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-4 z-50 max-w-2xl mx-auto my-auto max-h-[85vh] overflow-y-auto rounded-2xl p-6"
                            style={{ background: "#0F1714", border: "1px solid rgba(244,239,228,0.08)" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                                        Choose Your Crest
                                    </h2>
                                    <p className="text-xs mt-1" style={{ color: "rgba(244,239,228,0.5)" }}>
                                        Select a team crest for your profile picture
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCrestPicker(false)}
                                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                                    style={{ color: "rgba(244,239,228,0.5)" }}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {loadingTeams ? (
                                <div className="flex justify-center py-16">
                                    <RefreshCw className="h-6 w-6 animate-spin" style={{ color: "rgba(244,239,228,0.3)" }} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-64 overflow-y-auto p-1">
                                    {teams.map((team) => (
                                        <button
                                            key={team.id}
                                            onClick={() => handleSelectCrest(team.crest_url)}
                                            className={`relative aspect-square rounded-xl p-2.5 transition-all hover:scale-105 hover:shadow-lg ${crestUrl === team.crest_url
                                                    ? "border-2 border-gold bg-gold/10"
                                                    : "border border-white/8 hover:border-white/20"
                                                }`}
                                        >
                                            <CrestImage url={team.crest_url} alt={team.name} size="md" className="w-full h-full object-contain" />
                                            <span className="sr-only">{team.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "rgba(244,239,228,0.06)" }}>
                                <button
                                    onClick={handleResetCrest}
                                    className="text-xs hover:underline transition-colors flex items-center gap-1.5"
                                    style={{ color: "rgba(244,239,228,0.35)" }}
                                    disabled={savingCrest}
                                >
                                    {savingCrest ? (
                                        <><RefreshCw className="h-3 w-3 animate-spin" /> Resetting...</>
                                    ) : (
                                        <>↺ Reset to default avatar</>
                                    )}
                                </button>
                                <span className="text-xs" style={{ color: "rgba(244,239,228,0.25)" }}>
                                    {teams.length} crests available
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
                icon= {<Target className="h-6 w-6" />}
            />
            <ComingSoonModal
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)}
                title="My Stats"
                icon= {<BarChart3 className="h-6 w-6" />}
            />
        </div>
    );
}