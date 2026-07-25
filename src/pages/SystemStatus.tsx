import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, ShieldCheck, Zap, Brain, RefreshCw } from "lucide-react";

// ── Shared design tokens — kept in sync with the rest of the app ────────
const C = {
    bg: "#0A0F0D",
    panel: "#0F1714",
    card: "rgba(255,255,255,0.03)",
    cardBorder: "rgba(244,239,228,0.07)",
    cardBorderHover: "rgba(244,239,228,0.14)",
    divider: "rgba(244,239,228,0.07)",
    text: "#F4EFE4",
    textMuted: "rgba(244,239,228,0.68)",
    textFaint: "rgba(244,239,228,0.48)",
    textGhost: "rgba(244,239,228,0.34)",
    gold: "#D4A85A",
    goldSoft: "rgba(212,175,55,0.12)",
    green: "#7FBF8F",
};

interface ServiceDef {
    id: string;
    name: string;
    description: string;
    badgeUrl: string;
    icon: React.ReactNode;
}

const SERVICES: ServiceDef[] = [
    {
        id: "website",
        name: "Website",
        description: "Main site availability — pages, odds, and match data",
        badgeUrl: "https://api.cron-job.org/jobs/8158567/b8ab2e6a90f15aa3/status-3.svg",
        icon: <Globe className="h-5 w-5" style={{ color: C.gold }} />,
    },
    {
        id: "auth",
        name: "Auth Servers",
        description: "Sign in, sign up, and session services",
        badgeUrl: "https://api.cron-job.org/jobs/8158572/3c2ba6015c256e78/status-5.svg",
        icon: <ShieldCheck className="h-5 w-5" style={{ color: C.gold }} />,
    },
    {
        id: "feeds",
        name: "Live Data & Feeds",
        description: "Real-time scores, fixtures, and API integrations",
        badgeUrl: "https://api.cron-job.org/jobs/8159156/5ece3d5d07192fde/status-3.svg",
        icon: <Zap className="h-5 w-5" style={{ color: C.gold }} />,
    },
    {
        id: "engine",
        name: "Prediction Engine",
        description: "Model that powers our odds and predictions",
        badgeUrl: "https://api.cron-job.org/jobs/8159155/962462ffa81bdd3a/status-7.svg",
        icon: <Brain className="h-5 w-5" style={{ color: C.gold }} />,
    },
];

const AUTO_REFRESH_MS = 60_000;

function ServiceCard({ service, cacheBust }: { service: ServiceDef; cacheBust: number }) {
    const [refreshing, setRefreshing] = useState(false);
    const [imgKey, setImgKey] = useState(cacheBust);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Keep the badge in sync with the global auto-refresh tick
    useEffect(() => {
        setImgKey(cacheBust);
        setImgLoaded(false);
    }, [cacheBust]);

    const handleManualRefresh = useCallback(() => {
        setRefreshing(true);
        setImgLoaded(false);
        setImgKey(Date.now());
        window.setTimeout(() => setRefreshing(false), 500);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-2xl p-5 sm:p-6 transition-colors duration-200"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.cardBorderHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.cardBorder; }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.goldSoft }}>
                        {service.icon}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm sm:text-base" style={{ color: C.text }}>{service.name}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: C.textFaint }}>{service.description}</p>
                    </div>
                </div>

                <button
                    onClick={handleManualRefresh}
                    aria-label={`Refresh ${service.name} status`}
                    className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ color: C.textFaint, ["--tw-ring-color" as string]: C.gold, ["--tw-ring-offset-color" as string]: C.bg }}
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
            </div>

            <div className="mt-4 pt-4 flex items-center justify-center" style={{ borderTop: `1px solid ${C.divider}` }}>
                <div
                    className="relative inline-flex items-center justify-center px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.cardBorder}` }}
                >
                    {!imgLoaded && (
                        <div className="h-9 sm:h-10 w-32 rounded-lg animate-pulse" style={{ background: "rgba(244,239,228,0.06)" }} />
                    )}
                    <motion.img
                        key={imgKey}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: imgLoaded ? 1 : 0 }}
                        transition={{ duration: 0.25 }}
                        onLoad={() => setImgLoaded(true)}
                        src={service.badgeUrl}
                        alt={`${service.name} live status`}
                        className="h-9 sm:h-10 w-auto"
                        style={{ position: imgLoaded ? "static" : "absolute", top: 0, left: 0 }}
                    />
                </div>
            </div>
        </motion.div>
    );
}

export default function SystemStatus() {
    const [lastChecked, setLastChecked] = useState(() => new Date());
    const [tick, setTick] = useState(() => Date.now());

    // Auto-refresh every 60s so badges never look stale without a manual reload
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(Date.now());
            setLastChecked(new Date());
        }, AUTO_REFRESH_MS);
        return () => clearInterval(interval);
    }, []);

    const handleRefreshAll = () => {
        setTick(Date.now());
        setLastChecked(new Date());
    };

    return (
        <div className="min-h-screen py-10 sm:py-14 px-4" style={{ background: C.bg }}>
            <div className="max-w-2xl mx-auto">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.2em] uppercase group transition-colors mb-8 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ color: C.textMuted, ["--tw-ring-color" as string]: C.gold, ["--tw-ring-offset-color" as string]: C.bg }}
                >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Back
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8 flex items-center gap-3"
                >
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.text }}>
                        System Status
                    </h1>
                </motion.div>

                <div className="space-y-4">
                    {SERVICES.map((service) => (
                        <ServiceCard key={service.id} service={service} cacheBust={tick} />
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="mt-6 pt-5 flex flex-wrap items-center justify-between gap-3 px-1"
                    style={{ borderTop: `1px solid ${C.divider}` }}
                >
                    <p className="text-xs" style={{ color: C.textGhost }}>
                        Last checked {lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <button
                        onClick={handleRefreshAll}
                        className="text-xs font-mono tracking-[0.15em] uppercase transition-colors hover:text-current rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={{ color: C.textFaint, ["--tw-ring-color" as string]: C.gold, ["--tw-ring-offset-color" as string]: C.bg }}
                    >
                        Refresh
                    </button>
                </motion.div>
            </div>
        </div>
    );
}