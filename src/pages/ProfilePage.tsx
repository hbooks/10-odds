import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, Save, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import CrestImage from "@/components/CrestImage";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

interface Team {
    id: number;
    name: string;
    crest_url: string;
}

export default function ProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const { isAuthenticated, user, logout } = useKindeAuth();
    const navigate = useNavigate();

    const [givenName, setGivenName] = useState('');
    const [username, setUsername] = useState('');
    const [crestUrl, setCrestUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Crest picker states
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [showCrestPicker, setShowCrestPicker] = useState(false);

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

    // Check if the logged-in user matches the URL parameter
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

    useEffect(() => {
        if (user) {
            setGivenName(user.givenName || user?.email?.split('@')[0] || '');
        }
    }, [user]);

    // ─── Save profile updates ──────────────────────────────────────────
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // Update user_crests table in Supabase
            if (user?.id) {
                const { error: upsertError } = await supabase
                    .from("user_crests")
                    .upsert({
                        user_id: user.id,
                        username: username,
                        crest_url: crestUrl,
                        updated_at: new Date().toISOString(),
                    }, {
                        onConflict: 'user_id',
                    });

                if (upsertError) throw upsertError;
            }

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    // ─── Select a crest from the picker ──────────────────────────────
    const handleSelectCrest = (crest: string) => {
        setCrestUrl(crest);
        setShowCrestPicker(false);
    };

    // ─── Generate DiceBear default avatar URL ────────────────────────
    const getDefaultAvatarUrl = () => {
        if (user?.id) {
            return `https://api.dicebear.com/6.x/adventurer-neutral/svg?seed=orange`;
        }
        return `https://api.dicebear.com/6.x/adventurer-neutral/svg?seed=default`;
    };

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

    const displayName = givenName || user?.email?.split('@')[0] || "User";
    const avatarUrl = crestUrl || getDefaultAvatarUrl();

    return (
        <div className="min-h-screen py-12 px-4" style={{ background: "#0A0F0D", color: "#F4EFE4" }}>
            <div className="max-w-2xl mx-auto">
                {/* Back button */}
                <Link
                    to="/games"
                    className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.2em] uppercase group transition-colors mb-8"
                    style={{ color: "rgba(244,239,228,0.62)" }}
                >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Back
                </Link>

                {/* Profile header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="relative">
                        <div className="h-24 w-24 rounded-full overflow-hidden border-2 flex items-center justify-center" style={{ borderColor: "rgba(244,239,228,0.18)" }}>
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gold/20 text-gold text-2xl font-bold">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowCrestPicker(true)}
                            className="absolute -bottom-1 -right-1 p-1.5 rounded-full transition-colors hover:scale-110"
                            style={{ background: "#D4A85A", color: "#0A0F0D" }}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                            {displayName}
                        </h1>
                        <p style={{ color: "rgba(244,239,228,0.62)" }}>{user?.email}</p>
                        {!crestUrl && (
                            <p className="text-xs mt-1" style={{ color: "rgba(244,239,228,0.38)" }}>
                                Default avatar from DiceBear
                            </p>
                        )}
                    </div>
                </div>

                {/* Crest Picker Modal */}
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
                                className="fixed inset-4 z-50 max-w-2xl mx-auto my-auto max-h-[80vh] overflow-y-auto rounded-2xl p-6"
                                style={{ background: "#0F1714", border: "1px solid rgba(244,239,228,0.1)" }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                                        Choose Your Crest
                                    </h2>
                                    <button
                                        onClick={() => setShowCrestPicker(false)}
                                        className="p-1.5 rounded hover:bg-white/5"
                                        style={{ color: "rgba(244,239,228,0.62)" }}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className="text-sm mb-4" style={{ color: "rgba(244,239,228,0.62)" }}>
                                    Select a team crest to use as your profile picture.
                                </p>

                                {loadingTeams ? (
                                    <div className="flex justify-center py-12">
                                        <RefreshCw className="h-6 w-6 animate-spin" style={{ color: "rgba(244,239,228,0.38)" }} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-64 overflow-y-auto p-1">
                                        {teams.map((team) => (
                                            <button
                                                key={team.id}
                                                onClick={() => handleSelectCrest(team.crest_url)}
                                                className={`relative aspect-square rounded-xl p-2 transition-all hover:scale-105 ${crestUrl === team.crest_url
                                                        ? "border-2 border-gold bg-gold/10"
                                                        : "border border-white/10 hover:border-white/30"
                                                    }`}
                                            >
                                                <CrestImage url={team.crest_url} alt={team.name} size="md" className="w-full h-full object-contain" />
                                                <span className="sr-only">{team.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        setCrestUrl(null);
                                        setShowCrestPicker(false);
                                    }}
                                    className="mt-4 text-xs hover:underline"
                                    style={{ color: "rgba(244,239,228,0.38)" }}
                                >
                                    Reset to default DiceBear avatar
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg mb-4 flex items-start gap-2 ${message.type === 'success'
                                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}
                    >
                        {message.type === 'success' ? (
                            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        ) : (
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        )}
                        <p className="text-sm">{message.text}</p>
                    </motion.div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Email – read only */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: "rgba(244,239,228,0.62)" }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 rounded-xl bg-transparent border text-sm cursor-not-allowed"
                            style={{
                                borderColor: "rgba(244,239,228,0.18)",
                                color: "rgba(244,239,228,0.38)"
                            }}
                        />
                        <p className="text-xs mt-1" style={{ color: "rgba(244,239,228,0.38)" }}>
                            Email cannot be changed here.
                        </p>
                    </div>

                    {/* Display name – editable */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: "rgba(244,239,228,0.62)" }}>
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={givenName}
                            onChange={(e) => setGivenName(e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-4 py-3 rounded-xl bg-transparent border text-sm transition-colors focus:outline-none"
                            style={{
                                borderColor: isEditing ? "#79edb3ff" : "rgba(244,239,228,0.18)",
                                color: "#F4EFE4",
                            }}
                        />
                        <p className="text-xs mt-1" style={{ color: "rgba(244,239,228,0.38)" }}>
                            This is shown on your profile and in the community wall.
                        </p>
                    </div>

                    {/* Username – editable */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: "rgba(244,239,228,0.62)" }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={!isEditing}
                            className="w-full px-4 py-3 rounded-xl bg-transparent border text-sm transition-colors focus:outline-none"
                            style={{
                                borderColor: isEditing ? "#79edb3ff" : "rgba(244,239,228,0.18)",
                                color: "#F4EFE4",
                            }}
                        />
                        <p className="text-xs mt-1" style={{ color: "rgba(244,239,228,0.38)" }}>
                            Unique handle for your profile URL.
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4">
                        {isEditing ? (
                            <>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-6 py-3 rounded-xl font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-colors disabled:opacity-50"
                                    style={{ background: "#79edb3ff", color: "#0A0F0D" }}
                                >
                                    {loading ? (
                                        <><RefreshCw className="h-3.5 w-3.5 animate-spin inline mr-2" /> Saving</>
                                    ) : (
                                        'Save changes'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setGivenName(user?.givenName || user?.email?.split('@')[0] || '');
                                        setMessage(null);
                                    }}
                                    className="px-6 py-3 rounded-xl font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-colors"
                                    style={{ border: "1px solid rgba(244,239,228,0.18)", color: "rgba(244,239,228,0.62)" }}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="w-full px-6 py-3 rounded-xl font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-colors"
                                style={{ background: "#D4A85A", color: "#0A0F0D" }}
                            >
                                Edit profile
                            </button>
                        )}
                    </div>

                    {/* Log out button */}
                    <button
                        type="button"
                        onClick={() => logout()}
                        className="w-full px-6 py-3 rounded-xl font-mono text-[11px] tracking-[0.25em] uppercase font-semibold transition-colors mt-4"
                        style={{
                            background: "rgba(226, 122, 107, 0.1)",
                            color: "#E27A6B",
                            border: "1px solid rgba(226, 122, 107, 0.2)"
                        }}
                    >
                        Log out
                    </button>
                </form>
            </div>
        </div>
    );
}