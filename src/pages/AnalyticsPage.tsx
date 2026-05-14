import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, Zap, BarChart2, Trophy,
  Flame, DollarSign, RefreshCw, AlertCircle, Activity,
  Brain, Layers, ChevronRight, Sparkles, ShieldCheck,
} from "lucide-react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────────────────────────
type PredictionResult = "PENDING" | "WIN" | "LOSS" | "HALF_WIN" | "HALF_LOSS" | "VOID";

interface Prediction {
  id: number;
  status: PredictionResult;
  predicted_odds: number;
  confidence_score: number;
  created_at: string;
  bet_type: string;
  matches: { competition: { name: string } };
}

interface HippoMarketEval {
  market: string;
  selection: string;
  confidence: number;
  result: "won" | "lost";
}

// ─── Design tokens — warm cream / slate, jewel accents ────────────────────────
const EMERALD       = "#059669";
const ROSE          = "#e11d48";
const GOLD          = "#b45309";
const SAPPHIRE      = "#1d4ed8";
const EMERALD_LIGHT = "#d1fae5";
const ROSE_LIGHT    = "#ffe4e6";
const GOLD_LIGHT    = "#fef3c7";
const SAPPHIRE_LIGHT= "#dbeafe";

const LEAGUE_COLORS: Record<string, string> = {
  "Premier League": "#1d4ed8",
  "La Liga":        "#b45309",
  "Serie A":        "#059669",
  "Bundesliga":     "#dc2626",
  "Ligue 1":        "#7c3aed",
};

const BET_TYPE_COLORS: Record<string, string> = {
  HOME_WIN:"#059669", AWAY_WIN:"#1d4ed8", DRAW:"#b45309",
  "OVER_2.5":"#7c3aed","OVER_1.5":"#7c3aed","OVER_0.5":"#7c3aed",
  "OVER_3.5":"#7c3aed","OVER_4.5":"#7c3aed","OVER_5.5":"#7c3aed",
  "UNDER_2.5":"#db2777","UNDER_1.5":"#db2777","UNDER_0.5":"#db2777",
  "UNDER_3.5":"#db2777","UNDER_4.5":"#db2777","UNDER_5.5":"#db2777",
  BTTS_YES:"#db2777", BTTS_NO:"#ea580c",
};

const BET_TYPE_LABELS: Record<string, string> = {
  HOME_WIN:"Home Win", AWAY_WIN:"Away Win", DRAW:"Draw",
  "OVER_0.5":"Over 0.5","OVER_1.5":"Over 1.5","OVER_2.5":"Over 2.5",
  "OVER_3.5":"Over 3.5","OVER_4.5":"Over 4.5","OVER_5.5":"Over 5.5",
  "UNDER_0.5":"Under 0.5","UNDER_1.5":"Under 1.5","UNDER_2.5":"Under 2.5",
  "UNDER_3.5":"Under 3.5","UNDER_4.5":"Under 4.5","UNDER_5.5":"Under 5.5",
  BTTS_YES:"BTTS Yes", BTTS_NO:"BTTS No",
};

// ─── Motion helpers ───────────────────────────────────────────────────────────
const ease = [0.22, 1, 0.36, 1] as const;
const spring = { duration: 0.55, ease };
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { ...spring, delay: i * 0.07 } }),
};
const staggerC  = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const staggerCh = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: spring } };

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return { ref, inView };
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-200/60 text-xs">
      <p className="font-bold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill ?? GOLD }} className="font-mono font-semibold">
          {p.name}:{" "}
          {typeof p.value === "number" && p.value % 1 !== 0 ? p.value.toFixed(1) : p.value}
          {["roi","ROI","Win Rate","Actual Win %"].includes(p.name) ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  index, icon: Icon, label, value, sub,
  accent = GOLD, accentBg = GOLD_LIGHT, trend,
}: {
  index: number; icon: React.ElementType; label: string;
  value: string | number; sub?: string; accent?: string;
  accentBg?: string; trend?: "up" | "down";
}) {
  return (
    <motion.div custom={index} initial="hidden" animate="visible" variants={fadeUp}
      className="relative rounded-2xl bg-white border border-slate-100 p-5 flex flex-col gap-3
        shadow-sm shadow-slate-100/80 overflow-hidden">
      {/* soft corner wash */}
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-50 pointer-events-none"
        style={{ background: accentBg }} />
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: accentBg }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-3xl font-black tabular-nums tracking-tight" style={{ color: accent }}>{value}</p>
        {sub && (
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            {trend === "up"   && <TrendingUp   className="h-3 w-3 shrink-0" style={{ color: EMERALD }} />}
            {trend === "down" && <TrendingDown  className="h-3 w-3 shrink-0" style={{ color: ROSE    }} />}
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({
  title, subtitle, icon: Icon, accentColor = GOLD, children, className = "",
}: {
  title: string; subtitle?: string; icon?: React.ElementType;
  accentColor?: string; children: React.ReactNode; className?: string;
}) {
  const { ref, inView } = useReveal();
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={staggerCh}
      className={`relative rounded-2xl bg-white border border-slate-100 p-6 shadow-sm
        shadow-slate-100/80 overflow-hidden ${className}`}>
      {/* top accent line */}
      <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full opacity-70"
        style={{ background: `linear-gradient(90deg,${accentColor},transparent)` }} />
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: accentColor }} />}
          <p className="font-bold text-slate-800 text-sm">{title}</p>
        </div>
        {subtitle && <p className="text-[11px] text-slate-400 pl-6">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, highlight, subtitle, accentColor }: {
  icon: React.ElementType; title: string; highlight: string; subtitle: string; accentColor: string;
}) {
  const { ref, inView } = useReveal();
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={spring} className="mb-8 mt-14 first:mt-0">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          {title} <span style={{ color: accentColor }}>{highlight}</span>
        </h2>
      </div>
      <p className="text-sm text-slate-400 pl-[52px]">{subtitle}</p>
      <div className="mt-4 h-px w-full"
        style={{ background: `linear-gradient(90deg,${accentColor}55,transparent)` }} />
    </motion.div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: bg, color, border: `1px solid ${color}25` }}>
      {children}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}
function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Shimmer key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Shimmer className="h-64" /><Shimmer className="h-64" />
      </div>
      <Shimmer className="h-60" /><Shimmer className="h-60" />
    </div>
  );
}

// ─── Win-rate gauge ───────────────────────────────────────────────────────────
function WinRateGauge({ rate }: { rate: number }) {
  const data = [
    { name: "Win Rate", value: rate,       fill: EMERALD },
    { name: "Blank",    value: 100 - rate, fill: "transparent" },
  ];
  return (
    <div className="relative flex items-center justify-center h-52">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="58%" innerRadius="62%" outerRadius="88%"
          startAngle={210} endAngle={-30} data={data} barSize={18}>
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "#f1f5f9" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-8 gap-1">
        <span className="text-4xl font-black tabular-nums" style={{ color: EMERALD }}>
          {rate.toFixed(1)}%
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Win Rate</span>
      </div>
    </div>
  );
}

// ─── League bar ───────────────────────────────────────────────────────────────
function LeagueBar({ league, winRate, total, wins, color }: {
  league: string; winRate: number; total: number; wins: number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs text-slate-500 w-28 shrink-0 truncate font-medium
        group-hover:text-slate-700 transition-colors">{league}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-100">
        <motion.div initial={{ width: 0 }} animate={{ width: `${winRate}%` }}
          transition={{ duration: 1.1, ease, delay: 0.2 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
      <div className="flex items-center gap-2 w-28 justify-end">
        <span className="text-[10px] text-slate-400 tabular-nums">{wins.toFixed(0)}/{total}</span>
        <span className="text-xs font-black tabular-nums w-12 text-right" style={{ color }}>
          {winRate.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ─── MK-806 data processing (unchanged logic) ────────────────────────────────
function processPredictions(predictions: Prediction[]) {
  if (!predictions.length) return {
    summary: { total:0,wins:0,losses:0,voids:0,winRate:0,roi:0,streak:0,streakType:"win" as const,profitUnits:0 },
    weekly:[],cumulative:[],leagueBreakdown:[],betTypeBreakdown:[],confidenceBuckets:[],
  };

  const sorted = [...predictions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let wins = 0, losses = 0, voids = 0, totalStake = 0, totalReturn = 0;
  sorted.forEach(p => {
    totalStake++;
    if      (p.status === "WIN")       { wins++;      totalReturn += p.predicted_odds; }
    else if (p.status === "LOSS")      { losses++; }
    else if (p.status === "HALF_WIN")  { wins   += 0.5; totalReturn += 1 + (p.predicted_odds - 1) / 2; }
    else if (p.status === "HALF_LOSS") { losses += 0.5; totalReturn += 0.5; }
    else if (p.status === "VOID")      { voids++;     totalReturn += 1; }
  });

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const roi = totalStake > 0 ? ((totalReturn - totalStake) / totalStake) * 100 : 0;
  const profitUnits = totalReturn - totalStake;

  let streak = 0, streakType: "win"|"loss" = "win";
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    if (p.status==="WIN"||p.status==="HALF_WIN") {
      if (streakType==="win"||streak===0) { streakType="win"; streak++; } else break;
    } else if (p.status==="LOSS"||p.status==="HALF_LOSS") {
      if (streakType==="loss"||streak===0) { streakType="loss"; streak++; } else break;
    } else break;
  }

  const summary = { total:predictions.length,wins,losses,voids,winRate,roi,streak,streakType,profitUnits };

  // Weekly
  const wkMap: Record<string,{wins:number;losses:number;stake:number;ret:number}> = {};
  sorted.forEach(p => {
    const d = new Date(p.created_at);
    const ws = new Date(d); ws.setDate(d.getDate() - d.getDay() + (d.getDay()===0?-6:1));
    const k = ws.toISOString().split("T")[0];
    if (!wkMap[k]) wkMap[k] = {wins:0,losses:0,stake:0,ret:0};
    wkMap[k].stake++;
    if      (p.status==="WIN")       { wkMap[k].wins++;     wkMap[k].ret += p.predicted_odds; }
    else if (p.status==="LOSS")      { wkMap[k].losses++; }
    else if (p.status==="HALF_WIN")  { wkMap[k].wins+=0.5;  wkMap[k].ret += 1+(p.predicted_odds-1)/2; }
    else if (p.status==="HALF_LOSS") { wkMap[k].losses+=0.5;wkMap[k].ret += 0.5; }
    else if (p.status==="VOID")      { wkMap[k].ret += 1; }
  });
  const weekly = Object.entries(wkMap).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8)
    .map(([week,d]) => ({
      week: `W${new Date(week).getDate()}/${new Date(week).getMonth()+1}`,
      wins: d.wins, losses: d.losses,
      roi:  d.stake>0 ? ((d.ret-d.stake)/d.stake)*100 : 0,
    }));

  // Cumulative
  const dayMap: Record<string,{stake:number;ret:number}> = {};
  sorted.forEach(p => {
    const day = p.created_at.split("T")[0];
    if (!dayMap[day]) dayMap[day]={stake:0,ret:0};
    dayMap[day].stake++;
    if      (p.status==="WIN")       dayMap[day].ret += p.predicted_odds;
    else if (p.status==="HALF_WIN")  dayMap[day].ret += 1+(p.predicted_odds-1)/2;
    else if (p.status==="HALF_LOSS") dayMap[day].ret += 0.5;
    else if (p.status==="VOID")      dayMap[day].ret += 1;
  });
  let rs=0,rr=0;
  const cumulative: {day:string;roi:number}[] = [];
  Object.entries(dayMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([,d],i) => {
    rs+=d.stake; rr+=d.ret;
    cumulative.push({ day:`Day ${i+1}`, roi: Math.round(((rr-rs)/Math.max(rs,1))*1000)/10 });
  });

  // League
  const lgMap: Record<string,{wins:number;total:number;color:string}> = {};
  sorted.forEach(p => {
    const lg = p.matches?.competition?.name || "Other";
    if (!lgMap[lg]) lgMap[lg] = {wins:0,total:0,color:LEAGUE_COLORS[lg]||"#64748b"};
    lgMap[lg].total++;
    if (p.status==="WIN") lgMap[lg].wins++;
    else if (p.status==="HALF_WIN") lgMap[lg].wins += 0.5;
  });
  const leagueBreakdown = Object.entries(lgMap)
    .map(([league,d]) => ({ league,code:league.slice(0,3).toUpperCase(),wins:d.wins,total:d.total,
      winRate:d.total>0?(d.wins/d.total)*100:0,color:d.color }))
    .filter(l=>l.total>0).sort((a,b)=>b.winRate-a.winRate);

  // Bet type
  const btMap: Record<string,number> = {};
  sorted.forEach(p => { const lbl=BET_TYPE_LABELS[p.bet_type]||p.bet_type; btMap[lbl]=(btMap[lbl]||0)+1; });
  const betTypeBreakdown = Object.entries(btMap)
    .map(([name,value]) => {
      const key = Object.keys(BET_TYPE_LABELS).find(k=>BET_TYPE_LABELS[k]===name)||name;
      return {name,value,color:BET_TYPE_COLORS[key]||"#64748b"};
    }).sort((a,b)=>b.value-a.value).slice(0,6);

  // Confidence buckets
  const buckets = [
    {min:0.40,max:0.50,range:"40–50%"},{min:0.50,max:0.60,range:"50–60%"},
    {min:0.60,max:0.70,range:"60–70%"},{min:0.70,max:0.80,range:"70–80%"},
    {min:0.80,max:1.00,range:"80%+"},
  ];
  const confidenceBuckets = buckets.map(bk => {
    const inB = sorted.filter(p=>p.confidence_score>=bk.min&&p.confidence_score<bk.max);
    let bw=0; inB.forEach(p=>{ if(p.status==="WIN")bw++; else if(p.status==="HALF_WIN")bw+=0.5; });
    return {range:bk.range,predictions:inB.length,winRate:inB.length>0?(bw/inB.length)*100:0};
  }).filter(b=>b.predictions>0);

  return {summary,weekly,cumulative,leagueBreakdown,betTypeBreakdown,confidenceBuckets};
}

// ─── Hippo processing — ROBUST ────────────────────────────────────────────────
// result_status is a Postgres JSONB column. The supabase JS client returns it
// as a plain JS object (already parsed). Keys could be:
//   "market_1" | "1" | "market_1_result" | "result_1"
// Values could be: "won"|"win"|"WIN"|"1"|"lost"|"loss"|"LOSS"|"0"
function processHippoMarkets(rows: any[]): HippoMarketEval[] {
  const evals: HippoMarketEval[] = [];

  for (const row of rows) {
    // Safely parse result_status — handle both pre-parsed objects and raw strings
    let status: Record<string, unknown> = {};
    if (row.result_status) {
      if (typeof row.result_status === "string") {
        try { status = JSON.parse(row.result_status); } catch { status = {}; }
      } else if (typeof row.result_status === "object") {
        status = row.result_status as Record<string, unknown>;
      }
    }

    const slots = [
      { market: row.market_1, selection: row.selection_1, confidence: row.confidence_1 ?? 0, idx: 1 },
      { market: row.market_2, selection: row.selection_2, confidence: row.confidence_2 ?? 0, idx: 2 },
      { market: row.market_3, selection: row.selection_3, confidence: row.confidence_3 ?? 0, idx: 3 },
      { market: row.market_4, selection: row.selection_4, confidence: row.confidence_4 ?? 0, idx: 4 },
    ];

    for (const m of slots) {
      if (!m.market || !m.selection) continue;

      // Try all plausible key patterns in priority order
      const candidateKeys = [
        `market_${m.idx}`,        // "market_1"  ← most common
        String(m.idx),             // "1"
        `market_${m.idx}_result`,  // "market_1_result"
        `result_${m.idx}`,         // "result_1"
        `m${m.idx}`,               // "m1"
      ];

      let raw: unknown = undefined;
      for (const k of candidateKeys) {
        if (Object.prototype.hasOwnProperty.call(status, k)) {
          raw = status[k]; break;
        }
      }

      // Normalise to "won" | "lost"
      const r = String(raw ?? "").toLowerCase().trim();
      const normalised: "won"|"lost"|null =
        ["won","win","w","1","true","yes"].includes(r)        ? "won"  :
        ["lost","loss","l","0","false","no"].includes(r)      ? "lost" : null;

      if (normalised) {
        evals.push({
          market:     String(m.market),
          selection:  String(m.selection),
          confidence: Number(m.confidence) || 0,
          result:     normalised,
        });
      }
    }
  }
  return evals;
}

function computeHippoStats(evals: HippoMarketEval[]) {
  if (!evals.length) return null;
  const total  = evals.length;
  const wins   = evals.filter(e => e.result === "won").length;
  const losses = evals.filter(e => e.result === "lost").length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const mMap: Record<string,{wins:number;losses:number;total:number}> = {};
  evals.forEach(e => {
    const lbl = `${e.market} – ${e.selection}`;
    if (!mMap[lbl]) mMap[lbl] = {wins:0,losses:0,total:0};
    mMap[lbl].total++;
    if (e.result==="won")  mMap[lbl].wins++;
    if (e.result==="lost") mMap[lbl].losses++;
  });

  const marketBreakdown = Object.entries(mMap)
    .map(([name,d]) => ({name,wins:d.wins,losses:d.losses,total:d.total,
      winRate:d.total>0?(d.wins/d.total)*100:0}))
    .sort((a,b)=>b.winRate-a.winRate);

  return {total,wins,losses,winRate,marketBreakdown};
}

// ─── Main page ────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string|null>(null);
  const [hippoEvals,  setHippoEvals]  = useState<HippoMarketEval[]>([]);
  const [hippoLoading,setHippoLoading]= useState(true);
  const [hippoError,  setHippoError]  = useState<string|null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date|null>(null);

  const fetchMKData = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase
        .from("predictions")
        .select(`id,status,predicted_odds,confidence_score,created_at,bet_type,
          matches(competition:competitions(name))`)
        .in("status",["WIN","LOSS","HALF_WIN","HALF_LOSS","VOID"])
        .order("created_at",{ascending:true});
      if (error) throw error;
      setPredictions(data as unknown as Prediction[]);
      setLastUpdated(new Date());
    } catch (e:any) {
      setError(e?.message || "Failed to load MK-806 analytics.");
    } finally { setLoading(false); }
  };

  const fetchHippoData = async () => {
    setHippoLoading(true); setHippoError(null);
    try {
      // ⚠ Key fix: do NOT filter .not("result_status","eq","{}") — that uses
      // string comparison against a JSONB column and silently drops all rows.
      // Fetch everything with a non-NULL result_status, then filter client-side.
      const { data, error } = await supabase
        .from("hippo_predictions")
        .select(`
          market_1,selection_1,confidence_1,
          market_2,selection_2,confidence_2,
          market_3,selection_3,confidence_3,
          market_4,selection_4,confidence_4,
          result_status
        `)
        .not("result_status","is",null);   // only exclude true NULLs

      if (error) throw error;

      // Client-side filter: drop rows where result_status is an empty object
      const nonEmpty = (data ?? []).filter(row => {
        const rs = row.result_status;
        if (!rs) return false;
        if (typeof rs === "object") return Object.keys(rs).length > 0;
        if (typeof rs === "string") {
          const t = rs.trim();
          return t !== "" && t !== "{}" && t !== "null";
        }
        return false;
      });

      const evals = processHippoMarkets(nonEmpty);
      setHippoEvals(evals);

      // Surface a diagnostic when rows exist but we couldn't parse any results
      if (evals.length === 0 && nonEmpty.length > 0) {
        // Log first row to help diagnose key format
        console.warn("[Hippo] Rows fetched but no results parsed. First row result_status:", nonEmpty[0]?.result_status);
        setHippoError(
          `Found ${nonEmpty.length} settled rows but couldn't match result keys. ` +
          `Check console — result_status keys may differ from "market_1","market_2", etc.`
        );
      }
    } catch (e:any) {
      setHippoError(e?.message || "Failed to load Hippo market data.");
      setHippoEvals([]);
    } finally { setHippoLoading(false); }
  };

  useEffect(() => { fetchMKData(); fetchHippoData(); }, []);

  const mkData = processPredictions(predictions);
  const hippo  = computeHippoStats(hippoEvals);
  const { summary,weekly,cumulative,leagueBreakdown,betTypeBreakdown,confidenceBuckets } = mkData;
  const voidRate = summary.total > 0 ? (summary.voids / summary.total) * 100 : 0;
  const lossRate = summary.total > 0 ? (summary.losses / summary.total) * 100 : 0;
  const roiColor = summary.roi >= 0 ? EMERALD : ROSE;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <Layout>
      <div className="min-h-screen" style={{ background:"linear-gradient(160deg,#fafaf8,#f4f4f0)" }}>
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-50">
              <RefreshCw className="h-5 w-5 animate-spin" style={{ color:GOLD }} />
            </div>
            <div>
              <div className="h-7 w-56 rounded-lg bg-slate-200 animate-pulse mb-1" />
              <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    </Layout>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) return (
    <Layout>
      <div className="min-h-screen" style={{ background:"linear-gradient(160deg,#fafaf8,#f4f4f0)" }}>
        <div className="container mx-auto px-4 py-24 text-center max-w-md">
          <div className="rounded-2xl p-8 bg-rose-50 border border-rose-100 shadow-sm">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color:ROSE }} />
            <p className="font-bold text-slate-800 mb-1">Unable to load data</p>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <button onClick={() => { fetchMKData(); fetchHippoData(); }}
              className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl
                bg-white border border-rose-200 text-rose-600 shadow-sm hover:scale-105 transition-all">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="min-h-screen" style={{ background:"linear-gradient(160deg,#fafaf8 0%,#f0f0ea 100%)" }}>
        <div className="container mx-auto px-4 py-10 max-w-6xl">

          {/* ══ HERO ══════════════════════════════════════════════════════════ */}
          <motion.div initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }} transition={spring}
            className="mb-10 relative">
            {/* soft warm glow behind heading */}
            <div className="absolute -top-12 -left-12 h-64 w-64 rounded-full blur-3xl opacity-15 pointer-events-none"
              style={{ background:GOLD }} />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 mb-3 text-[11px] font-bold uppercase tracking-widest
                  px-3 py-1 rounded-full" style={{ background:GOLD_LIGHT,color:GOLD,border:`1px solid ${GOLD}30` }}>
                  <Sparkles className="h-3 w-3" /> Intelligence Dashboard
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                  MK-806 &amp; <span style={{ color:GOLD }}>Hippo AI</span> Analytics
                </h1>
                <p className="text-sm text-slate-400 mt-2 max-w-lg leading-relaxed">
                  Season-long performance intelligence — five leagues tracked, alternative markets evaluated, model confidence calibrated.
                </p>
                {lastUpdated && (
                  <p className="text-[11px] text-slate-300 mt-2 flex items-center gap-1.5">
                    <Activity className="h-3 w-3" /> Updated {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
              <button onClick={() => { fetchMKData(); fetchHippoData(); }}
                className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm
                  hover:border-slate-300 hover:scale-105 transition-all shrink-0">
                <RefreshCw className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </motion.div>

          {/* ══ MK-806 ════════════════════════════════════════════════════════ */}
          <SectionHeader icon={Trophy} title="MK-806" highlight="Performance"
            subtitle="Prediction engine results across all tracked competitions" accentColor={GOLD} />

          <motion.div initial="hidden" animate="visible" variants={staggerC}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard index={0} icon={Target}     label="Total Predictions"
              value={summary.total}
              sub={`${summary.wins.toFixed(1)}W · ${summary.losses.toFixed(1)}L · ${summary.voids} void`}
              accent={GOLD} accentBg={GOLD_LIGHT} />
            <StatCard index={1} icon={Trophy}     label="Win Rate"
              value={`${summary.winRate.toFixed(1)}%`} sub="Completed predictions"
              accent={EMERALD} accentBg={EMERALD_LIGHT}
              trend={summary.winRate>=50?"up":"down"} />
            <StatCard index={2} icon={DollarSign} label="Season ROI"
              value={`${summary.roi>=0?"+":""}${summary.roi.toFixed(1)}%`}
              sub={`${summary.profitUnits>=0?"+":""}${summary.profitUnits.toFixed(1)} units`}
              accent={SAPPHIRE} accentBg={SAPPHIRE_LIGHT}
              trend={summary.roi>=0?"up":"down"} />
            <StatCard index={3} icon={Flame}
              label={`${summary.streakType==="win"?"Win":"Loss"} Streak`}
              value={`${summary.streak}${summary.streakType==="win"?" ✓":" ✗"}`}
              sub="Consecutive outcomes"
              accent={summary.streakType==="win"?EMERALD:ROSE}
              accentBg={summary.streakType==="win"?EMERALD_LIGHT:ROSE_LIGHT}
              trend={summary.streakType==="win"?"up":"down"} />
          </motion.div>

          {/* Gauge + Pie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Overall Win Rate"
              subtitle={`${summary.wins.toFixed(1)} wins from ${summary.total} predictions`}
              icon={Target} accentColor={EMERALD}>
              <WinRateGauge rate={summary.winRate} />
              <div className="flex justify-center gap-6 mt-2">
                {[
                  {label:"Win", pct:summary.winRate.toFixed(1),color:EMERALD,bg:EMERALD_LIGHT},
                  {label:"Loss",pct:lossRate.toFixed(1),        color:ROSE,   bg:ROSE_LIGHT  },
                  {label:"Void",pct:voidRate.toFixed(1),        color:GOLD,   bg:GOLD_LIGHT  },
                ].map(item => (
                  <div key={item.label} className="flex flex-col items-center gap-1">
                    <div className="h-1.5 w-10 rounded-full" style={{ background:item.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
                    <span className="text-sm font-black tabular-nums" style={{ color:item.color }}>{item.pct}%</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Predictions by Bet Type" subtitle="Distribution across bet categories"
              icon={Layers} accentColor={SAPPHIRE}>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={betTypeBreakdown} cx="50%" cy="50%"
                      innerRadius={54} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {betTypeBreakdown.map((e,i) => <Cell key={i} fill={e.color} opacity={0.9} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {betTypeBreakdown.map(b => (
                  <div key={b.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background:b.color }} />
                    <span className="text-[11px] text-slate-500 truncate">{b.name}</span>
                    <span className="text-[11px] font-bold font-mono ml-auto" style={{ color:b.color }}>{b.value}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Cumulative ROI */}
          <ChartCard title="Cumulative ROI"
            subtitle="Season-to-date return on investment — 1 unit flat stake"
            icon={TrendingUp} accentColor={roiColor} className="mb-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulative} margin={{top:4,right:8,left:-16,bottom:0}}>
                  <defs>
                    <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={roiColor} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={roiColor} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}
                    interval="preserveStartEnd" />
                  <YAxis tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}
                    tickFormatter={v=>`${v}%`} />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="roi" name="ROI"
                    stroke={roiColor} strokeWidth={2.5} fill="url(#roiGrad)" dot={false}
                    activeDot={{r:5,fill:roiColor,strokeWidth:2,stroke:"#fff"}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Weekly W/L */}
          <ChartCard title="Weekly Wins &amp; Losses" subtitle={`Last ${weekly.length} weeks`}
            icon={BarChart2} accentColor={SAPPHIRE} className="mb-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} barGap={4} margin={{top:4,right:8,left:-16,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="week" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={7}
                    wrapperStyle={{fontSize:"11px",paddingTop:"12px",color:"#94a3b8"}} />
                  <Bar dataKey="wins"   name="Wins"   fill={EMERALD} radius={[5,5,0,0]} maxBarSize={28} />
                  <Bar dataKey="losses" name="Losses" fill={ROSE}    radius={[5,5,0,0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* League + Calibration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ChartCard title="League Win Rate" subtitle="European leagues tracked"
              icon={Trophy} accentColor={GOLD}>
              <div className="space-y-4 mt-2">
                {leagueBreakdown.length === 0
                  ? <p className="text-sm text-slate-400 text-center py-6">No league data yet</p>
                  : leagueBreakdown.map(l =>
                      <LeagueBar key={l.league} league={l.league} winRate={l.winRate}
                        total={l.total} wins={l.wins} color={l.color} />)}
              </div>
              {leagueBreakdown.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 grid gap-1"
                  style={{gridTemplateColumns:`repeat(${Math.min(leagueBreakdown.length,5)},1fr)`}}>
                  {leagueBreakdown.slice(0,5).map(l => (
                    <div key={l.code} className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{l.code}</p>
                      <p className="text-xs font-black tabular-nums" style={{ color:l.color }}>
                        {l.wins.toFixed(0)}/{l.total}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            <ChartCard title="Confidence Calibration"
              subtitle="Model confidence vs actual win rate"
              icon={Activity} accentColor={SAPPHIRE}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confidenceBuckets} margin={{top:4,right:4,left:-20,bottom:0}} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="range" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}
                      tickFormatter={v=>`${v}%`} domain={[0,100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="winRate" name="Actual Win %" radius={[5,5,0,0]} maxBarSize={36}>
                      {confidenceBuckets.map((e,i) => (
                        <Cell key={i} fill={e.winRate>=65?EMERALD:e.winRate>=50?GOLD:ROSE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 rounded-xl px-3 py-2.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-100">
                <Zap className="h-3 w-3 inline-block mr-1 -mt-0.5" style={{ color:GOLD }} />
                {confidenceBuckets.length > 0
                  ? "Higher confidence bands produce higher actual win rates — model is well-calibrated."
                  : "Not enough data yet to evaluate calibration."}
              </div>
            </ChartCard>
          </div>

          {/* Weekly ROI table */}
          <ChartCard title="Weekly ROI Detail"
            subtitle="Return on investment per week — 1 unit flat stake"
            icon={DollarSign} accentColor={GOLD} className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Week","Wins","Losses","ROI","Status"].map(h => (
                      <th key={h}
                        className="pb-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest first:pl-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekly.map((w,i) => {
                    const pos = w.roi >= 0;
                    return (
                      <motion.tr key={w.week} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
                        transition={{delay:0.3+i*0.04}}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 font-bold text-slate-700">{w.week}</td>
                        <td className="py-3 font-mono font-semibold tabular-nums" style={{color:EMERALD}}>
                          {w.wins.toFixed(1)}W
                        </td>
                        <td className="py-3 font-mono font-semibold tabular-nums" style={{color:ROSE}}>
                          {w.losses.toFixed(1)}L
                        </td>
                        <td className="py-3 font-black font-mono tabular-nums" style={{color:pos?EMERALD:ROSE}}>
                          {pos?"+":""}{w.roi.toFixed(1)}%
                        </td>
                        <td className="py-3">
                          <Badge color={pos?EMERALD:ROSE} bg={pos?EMERALD_LIGHT:ROSE_LIGHT}>
                            {pos ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>}
                            {pos ? "Profit" : "Loss"}
                          </Badge>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {weekly.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-6">
                {[
                  {label:"Avg Weekly Wins",  value:(summary.wins/Math.max(weekly.length,1)).toFixed(1),         color:EMERALD},
                  {label:"Avg Weekly Losses",value:(summary.losses/Math.max(weekly.length,1)).toFixed(1),       color:ROSE  },
                  {label:"Best Week ROI",    value:`+${Math.max(...weekly.map(w=>w.roi),0).toFixed(1)}%`,       color:GOLD  },
                  {label:"Worst Week ROI",   value:`${Math.min(...weekly.map(w=>w.roi),0).toFixed(1)}%`,        color:ROSE  },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                    <p className="text-lg font-black tabular-nums" style={{color:s.color}}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* ══ HIPPO AI ══════════════════════════════════════════════════════ */}
          <SectionHeader icon={Brain} title="Hippo AI" highlight="Alternative Markets"
            subtitle="Performance of the 4 alternative markets Hippo selects per prediction"
            accentColor={SAPPHIRE} />

          {hippoLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_,i) => <Shimmer key={i} className="h-32" />)}
              </div>
              <Shimmer className="h-72" /><Shimmer className="h-52" />
            </div>

          ) : hippoError && hippoEvals.length === 0 ? (
            /* Diagnostic panel — shows when rows exist but parsing failed */
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 flex gap-4 items-start mb-6">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{color:GOLD}} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-800 mb-1">Hippo data issue detected</p>
                <p className="text-sm text-amber-700 break-words">{hippoError}</p>
                <button onClick={fetchHippoData}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg
                    bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all">
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            </div>

          ) : hippoEvals.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-white border border-slate-100 shadow-sm mb-6">
              <Brain className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-500">No Hippo market results yet</p>
              <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto">
                Results appear once matches conclude and the update-results function runs.
              </p>
            </div>

          ) : (
            <>
              {/* Show partial diagnostic if some rows parsed but error still set */}
              {hippoError && (
                <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3
                  text-xs text-amber-700 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {hippoError}
                </div>
              )}

              {/* Hippo KPI row */}
              <motion.div initial="hidden" animate="visible" variants={staggerC}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard index={0} icon={Target}      label="Total Picks"
                  value={hippo!.total} sub={`${hippo!.wins}W · ${hippo!.losses}L`}
                  accent={SAPPHIRE} accentBg={SAPPHIRE_LIGHT} />
                <StatCard index={1} icon={Trophy}      label="Overall Win Rate"
                  value={`${hippo!.winRate.toFixed(1)}%`} sub="All alternative markets"
                  accent={EMERALD} accentBg={EMERALD_LIGHT}
                  trend={hippo!.winRate>=50?"up":"down"} />
                <StatCard index={2} icon={Flame}       label="Top Market"
                  value={hippo!.marketBreakdown[0]?.name.split("–")[0].trim()||"—"}
                  sub={`${hippo!.marketBreakdown[0]?.winRate.toFixed(1)??0}% win rate`}
                  accent={GOLD} accentBg={GOLD_LIGHT} />
                <StatCard index={3} icon={ShieldCheck} label="Market Types"
                  value={hippo!.marketBreakdown.length} sub="Unique market-selection pairs"
                  accent={ROSE} accentBg={ROSE_LIGHT} />
              </motion.div>

              {/* Horizontal win-rate bar chart */}
              <ChartCard title="Win Rate by Market Type"
                subtitle="Each bar = one market + selection pair, coloured by performance tier"
                icon={BarChart2} accentColor={SAPPHIRE} className="mb-4">
                <div style={{ height:`${Math.max(hippo!.marketBreakdown.length*42+28,180)}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hippo!.marketBreakdown} layout="vertical"
                      margin={{top:4,right:56,left:4,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" domain={[0,100]}
                        tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}
                        tickFormatter={v=>`${v}%`} />
                      <YAxis dataKey="name" type="category" width={185}
                        tick={{fontSize:10,fill:"#475569",fontWeight:500}}
                        axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="winRate" name="Win Rate" radius={[0,5,5,0]} maxBarSize={24}>
                        {hippo!.marketBreakdown.map((e,i) => (
                          <Cell key={i}
                            fill={e.winRate>=60?EMERALD:e.winRate>=40?GOLD:ROSE} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-5 mt-3 flex-wrap">
                  {[
                    {label:"Strong ≥60%",color:EMERALD,bg:EMERALD_LIGHT},
                    {label:"Mid 40–60%", color:GOLD,   bg:GOLD_LIGHT   },
                    {label:"Weak <40%",  color:ROSE,   bg:ROSE_LIGHT   },
                  ].map(x => (
                    <div key={x.label} className="flex items-center gap-1.5">
                      <span className="h-2 w-5 rounded-full" style={{ background:x.color }} />
                      <span className="text-[10px] font-semibold text-slate-400">{x.label}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              {/* Detailed market table */}
              <ChartCard title="Market Detail Breakdown"
                subtitle="Full wins / losses / win rate for every market-selection pair"
                icon={Layers} accentColor={GOLD} className="mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Market & Selection","W","L","Total","Win Rate"].map(h => (
                          <th key={h}
                            className="pb-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest first:pl-0">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hippo!.marketBreakdown.map((row,i) => {
                        const col = row.winRate>=60?EMERALD:row.winRate>=40?GOLD:ROSE;
                        const bg  = row.winRate>=60?EMERALD_LIGHT:row.winRate>=40?GOLD_LIGHT:ROSE_LIGHT;
                        return (
                          <motion.tr key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
                            transition={{delay:0.2+i*0.03}}
                            className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 font-semibold text-slate-700">
                              <div className="flex items-center gap-2">
                                <ChevronRight className="h-3 w-3 shrink-0" style={{color:col}} />
                                {row.name}
                              </div>
                            </td>
                            <td className="py-3 font-mono font-bold tabular-nums" style={{color:EMERALD}}>
                              {row.wins}
                            </td>
                            <td className="py-3 font-mono font-bold tabular-nums" style={{color:ROSE}}>
                              {row.losses}
                            </td>
                            <td className="py-3 font-mono tabular-nums text-slate-400">{row.total}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[60px] bg-slate-100">
                                  <div className="h-full rounded-full"
                                    style={{width:`${row.winRate}%`,background:col}} />
                                </div>
                                <Badge color={col} bg={bg}>{row.winRate.toFixed(1)}%</Badge>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 rounded-xl px-3.5 py-3 text-[11px] text-slate-500 bg-slate-50 border border-slate-100">
                  <Zap className="h-3 w-3 inline-block mr-1.5 -mt-0.5" style={{color:SAPPHIRE}} />
                  Hippo AI markets are evaluated using BSD match result data. Picks without BSD data are excluded from win-rate calculations.
                </div>
              </ChartCard>
            </>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;