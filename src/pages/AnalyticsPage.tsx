import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, Zap, BarChart2, Trophy,
  Flame, DollarSign, RefreshCw, AlertCircle, Activity,
  Brain, Layers, ChevronRight, Sparkles, ShieldCheck,
  CheckCircle2, XCircle, Minus, ArrowUpRight, Star,
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
  created_at?: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const EMERALD        = "#059669";
const ROSE           = "#e11d48";
const GOLD           = "#b45309";
const SAPPHIRE       = "#1d4ed8";
const VIOLET         = "#7c3aed";
const EMERALD_LIGHT  = "#d1fae5";
const ROSE_LIGHT     = "#ffe4e6";
const GOLD_LIGHT     = "#fef3c7";
const SAPPHIRE_LIGHT = "#dbeafe";
const VIOLET_LIGHT   = "#ede9fe";

const CHART_GRID   = "#e2e8f0";
const CHART_TICK   = "#94a3b8";
const PAGE_BG      = "linear-gradient(145deg,#f8f9fb 0%,#f1f3f7 100%)";

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

// Hippo market type categories (group the raw market strings into clean buckets)
const MARKET_CATEGORY_COLORS: Record<string, string> = {
  "Asian Handicap": "#1d4ed8",
  "Over/Under":     "#7c3aed",
  "Both Teams Score":"#059669",
  "Result":         "#b45309",
  "Double Chance":  "#db2777",
  "Draw No Bet":    "#ea580c",
  "Other":          "#64748b",
};

function categoriseMarket(market: string): string {
  const m = market.toLowerCase();
  if (m.includes("asian") || m.includes("handicap")) return "Asian Handicap";
  if (m.includes("over") || m.includes("under") || m.includes("total")) return "Over/Under";
  if (m.includes("both teams") || m.includes("btts") || m.includes("gg")) return "Both Teams Score";
  if (m.includes("double chance")) return "Double Chance";
  if (m.includes("draw no bet") || m.includes("dnb")) return "Draw No Bet";
  if (m.includes("result") || m.includes("1x2") || m.includes("home") || m.includes("away")) return "Result";
  return "Other";
}

// ─── Motion ───────────────────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { duration: 0.52, ease: EASE };

const fadeUp = {
  hidden:  { opacity: 0, y: 22 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { ...SPRING, delay: i * 0.07 } }),
};
const staggerWrap = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const staggerItem = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: SPRING } };

function useReveal(margin = "-60px") {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: margin as any });
  return { ref, inView };
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-4 py-3
      shadow-2xl shadow-slate-300/40 text-xs backdrop-blur-sm">
      <p className="font-bold text-slate-700 mb-1.5 text-[11px] uppercase tracking-wider">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color ?? p.fill ?? GOLD }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold tabular-nums" style={{ color: p.color ?? p.fill ?? GOLD }}>
            {typeof p.value === "number" && p.value % 1 !== 0 ? p.value.toFixed(1) : p.value}
            {["roi","ROI","Win Rate","Actual Win %","winRate"].includes(p.name) ? "%" : ""}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Reusable primitives ──────────────────────────────────────────────────────

function Badge({
  color, bg, children, size = "sm",
}: { color: string; bg: string; children: React.ReactNode; size?: "xs" | "sm" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full
        ${size === "xs" ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-0.5"}`}
      style={{ background: bg, color, border: `1px solid ${color}22` }}
    >
      {children}
    </span>
  );
}

function StatCard({
  index, icon: Icon, label, value, sub, accent = GOLD, accentBg = GOLD_LIGHT, trend,
}: {
  index: number; icon: React.ElementType; label: string;
  value: string | number; sub?: string; accent?: string;
  accentBg?: string; trend?: "up" | "down";
}) {
  return (
    <motion.div custom={index} initial="hidden" animate="visible" variants={fadeUp}
      className="relative rounded-2xl bg-white border border-slate-100 p-5 flex flex-col gap-3
        shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-40 pointer-events-none"
        style={{ background: accentBg }} />
      <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg,transparent,${accent}60,transparent)` }} />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: accentBg }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-[2rem] font-black tabular-nums leading-none tracking-tight"
          style={{ color: accent }}>{value}</p>
        {sub && (
          <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
            {trend === "up"   && <TrendingUp  className="h-3 w-3 shrink-0" style={{ color: EMERALD }} />}
            {trend === "down" && <TrendingDown className="h-3 w-3 shrink-0" style={{ color: ROSE    }} />}
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function Card({
  title, subtitle, icon: Icon, accent = GOLD, children, className = "",
}: {
  title: string; subtitle?: string; icon?: React.ElementType;
  accent?: string; children: React.ReactNode; className?: string;
}) {
  const { ref, inView } = useReveal();
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={staggerItem}
      className={`relative rounded-2xl bg-white border border-slate-100 p-6
        shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 ${className}`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg,${accent},${accent}44,transparent)` }} />
      <div className="mb-5 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            {Icon && (
              <div className="h-6 w-6 rounded-lg flex items-center justify-center"
                style={{ background: `${accent}15` }}>
                <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
              </div>
            )}
            <p className="font-bold text-slate-800 text-sm">{title}</p>
          </div>
          {subtitle && <p className="text-[11px] text-slate-400 pl-8">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, highlight, subtitle, accent }: {
  icon: React.ElementType; title: string; highlight: string; subtitle: string; accent: string;
}) {
  const { ref, inView } = useReveal();
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 18 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={SPRING} className="mb-8 mt-16 first:mt-0">
      <div className="flex items-center gap-3 mb-1.5">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0"
          style={{ background: `${accent}14`, border: `1.5px solid ${accent}28` }}>
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
        <h2 className="text-[1.6rem] font-black tracking-tight text-slate-900">
          {title} <span style={{ color: accent }}>{highlight}</span>
        </h2>
      </div>
      <p className="text-[13px] text-slate-400 pl-[52px] leading-relaxed">{subtitle}</p>
      <div className="mt-5 h-px"
        style={{ background: `linear-gradient(90deg,${accent}50,${accent}10,transparent)` }} />
    </motion.div>
  );
}

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-5 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Shimmer key={i} className="h-32" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Shimmer className="h-64" /><Shimmer className="h-64" />
      </div>
      <Shimmer className="h-60" /><Shimmer className="h-56" />
      <div className="grid md:grid-cols-2 gap-4">
        <Shimmer className="h-56" /><Shimmer className="h-56" />
      </div>
    </div>
  );
}

// ─── Win-rate arc gauge ────────────────────────────────────────────────────────
function WinRateGauge({ rate, color = EMERALD }: { rate: number; color?: string }) {
  const data = [
    { value: rate,       fill: color },
    { value: 100 - rate, fill: "transparent" },
  ];
  return (
    <div className="relative flex items-center justify-center h-52">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="58%" innerRadius="64%" outerRadius="90%"
          startAngle={210} endAngle={-30} data={data} barSize={20}>
          <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "#f1f5f9" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-10 gap-0.5">
        <span className="text-[2.4rem] font-black tabular-nums leading-none" style={{ color }}>
          {rate.toFixed(1)}%
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Win Rate</span>
      </div>
    </div>
  );
}

// ─── Animated progress bar row ────────────────────────────────────────────────
function ProgressRow({ label, winRate, wins, total, color }: {
  label: string; winRate: number; wins: number; total: number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 group py-0.5">
      <span className="text-[12px] text-slate-500 w-32 shrink-0 truncate font-medium
        group-hover:text-slate-800 transition-colors">{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-100">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(winRate, 100)}%` }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
      <span className="text-[10px] text-slate-400 tabular-nums w-10 text-right">
        {wins.toFixed(0)}/{total}
      </span>
      <span className="text-[12px] font-black tabular-nums w-12 text-right" style={{ color }}>
        {winRate.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── MK-806 data processing ───────────────────────────────────────────────────
function processPredictions(predictions: Prediction[]) {
  const empty = {
    summary: { total:0,wins:0,losses:0,voids:0,winRate:0,roi:0,streak:0,
      streakType:"win" as const,profitUnits:0 },
    weekly:[],cumulative:[],leagueBreakdown:[],betTypeBreakdown:[],confidenceBuckets:[],
  };
  if (!predictions.length) return empty;

  const sorted = [...predictions].sort(
    (a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let wins=0, losses=0, voids=0, totalStake=0, totalReturn=0;
  sorted.forEach(p => {
    totalStake++;
    if      (p.status==="WIN")       { wins++;       totalReturn += p.predicted_odds; }
    else if (p.status==="LOSS")      { losses++; }
    else if (p.status==="HALF_WIN")  { wins+=0.5;    totalReturn += 1+(p.predicted_odds-1)/2; }
    else if (p.status==="HALF_LOSS") { losses+=0.5;  totalReturn += 0.5; }
    else if (p.status==="VOID")      { voids++;      totalReturn += 1; }
  });

  const settled = wins+losses;
  const winRate = settled>0 ? (wins/settled)*100 : 0;
  const roi     = totalStake>0 ? ((totalReturn-totalStake)/totalStake)*100 : 0;
  const profitUnits = totalReturn-totalStake;

  let streak=0, streakType:"win"|"loss"="win";
  for (let i=sorted.length-1; i>=0; i--) {
    const p=sorted[i];
    if (p.status==="WIN"||p.status==="HALF_WIN") {
      if (streakType==="win"||streak===0){streakType="win";streak++;}else break;
    } else if (p.status==="LOSS"||p.status==="HALF_LOSS") {
      if (streakType==="loss"||streak===0){streakType="loss";streak++;}else break;
    } else break;
  }

  const summary={total:predictions.length,wins,losses,voids,winRate,roi,streak,streakType,profitUnits};

  // Weekly breakdown
  const wkMap:Record<string,{wins:number;losses:number;stake:number;ret:number}>={}; 
  sorted.forEach(p=>{
    const d=new Date(p.created_at);
    const ws=new Date(d); ws.setDate(d.getDate()-d.getDay()+(d.getDay()===0?-6:1));
    const k=ws.toISOString().split("T")[0];
    if(!wkMap[k])wkMap[k]={wins:0,losses:0,stake:0,ret:0};
    wkMap[k].stake++;
    if(p.status==="WIN"){wkMap[k].wins++;wkMap[k].ret+=p.predicted_odds;}
    else if(p.status==="LOSS"){wkMap[k].losses++;}
    else if(p.status==="HALF_WIN"){wkMap[k].wins+=0.5;wkMap[k].ret+=1+(p.predicted_odds-1)/2;}
    else if(p.status==="HALF_LOSS"){wkMap[k].losses+=0.5;wkMap[k].ret+=0.5;}
    else if(p.status==="VOID"){wkMap[k].ret+=1;}
  });
  const weekly=Object.entries(wkMap).sort((a,b)=>a[0].localeCompare(b[0])).slice(-10)
    .map(([week,d])=>({
      week:`${new Date(week).getDate()}/${new Date(week).getMonth()+1}`,
      wins:d.wins,losses:d.losses,
      roi:d.stake>0?((d.ret-d.stake)/d.stake)*100:0,
    }));

  // Cumulative ROI
  const dayMap:Record<string,{stake:number;ret:number}>={};
  sorted.forEach(p=>{
    const day=p.created_at.split("T")[0];
    if(!dayMap[day])dayMap[day]={stake:0,ret:0};
    dayMap[day].stake++;
    if(p.status==="WIN")dayMap[day].ret+=p.predicted_odds;
    else if(p.status==="HALF_WIN")dayMap[day].ret+=1+(p.predicted_odds-1)/2;
    else if(p.status==="HALF_LOSS")dayMap[day].ret+=0.5;
    else if(p.status==="VOID")dayMap[day].ret+=1;
  });
  let rs=0,rr=0;
  const cumulative:{day:string;roi:number}[]=[];
  Object.entries(dayMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([,d],i)=>{
    rs+=d.stake;rr+=d.ret;
    cumulative.push({day:`D${i+1}`,roi:Math.round(((rr-rs)/Math.max(rs,1))*1000)/10});
  });

  // League
  const lgMap:Record<string,{wins:number;total:number;color:string}>={};
  sorted.forEach(p=>{
    const lg=p.matches?.competition?.name||"Other";
    if(!lgMap[lg])lgMap[lg]={wins:0,total:0,color:LEAGUE_COLORS[lg]||"#64748b"};
    lgMap[lg].total++;
    if(p.status==="WIN")lgMap[lg].wins++;
    else if(p.status==="HALF_WIN")lgMap[lg].wins+=0.5;
  });
  const leagueBreakdown=Object.entries(lgMap)
    .map(([league,d])=>({league,wins:d.wins,total:d.total,
      winRate:d.total>0?(d.wins/d.total)*100:0,color:d.color}))
    .filter(l=>l.total>0).sort((a,b)=>b.winRate-a.winRate);

  // Bet type
  const btMap:Record<string,number>={};
  sorted.forEach(p=>{const lbl=BET_TYPE_LABELS[p.bet_type]||p.bet_type;btMap[lbl]=(btMap[lbl]||0)+1;});
  const betTypeBreakdown=Object.entries(btMap)
    .map(([name,value])=>{
      const key=Object.keys(BET_TYPE_LABELS).find(k=>BET_TYPE_LABELS[k]===name)||name;
      return{name,value,color:BET_TYPE_COLORS[key]||"#64748b"};
    }).sort((a,b)=>b.value-a.value).slice(0,8);

  // Confidence calibration
  const buckets=[
    {min:0.40,max:0.50,range:"40–50%"},{min:0.50,max:0.60,range:"50–60%"},
    {min:0.60,max:0.70,range:"60–70%"},{min:0.70,max:0.80,range:"70–80%"},
    {min:0.80,max:1.00,range:"80%+"},
  ];
  const confidenceBuckets=buckets.map(bk=>{
    const inB=sorted.filter(p=>p.confidence_score>=bk.min&&p.confidence_score<bk.max);
    let bw=0;inB.forEach(p=>{if(p.status==="WIN")bw++;else if(p.status==="HALF_WIN")bw+=0.5;});
    return{range:bk.range,count:inB.length,winRate:inB.length>0?(bw/inB.length)*100:0};
  }).filter(b=>b.count>0);

  return{summary,weekly,cumulative,leagueBreakdown,betTypeBreakdown,confidenceBuckets};
}

// ─── Hippo data parsing ───────────────────────────────────────────────────────
function processHippoMarkets(rows: any[]): HippoMarketEval[] {
  const evals: HippoMarketEval[] = [];
  for (const row of rows) {
    let status: Record<string, unknown> = {};
    if (row.result_status) {
      if (typeof row.result_status === "string") {
        try { status = JSON.parse(row.result_status); } catch { status = {}; }
      } else if (typeof row.result_status === "object") {
        status = row.result_status as Record<string, unknown>;
      }
    }

    const slots = [
      { market:row.market_1, selection:row.selection_1, confidence:row.confidence_1??0, idx:1 },
      { market:row.market_2, selection:row.selection_2, confidence:row.confidence_2??0, idx:2 },
      { market:row.market_3, selection:row.selection_3, confidence:row.confidence_3??0, idx:3 },
      { market:row.market_4, selection:row.selection_4, confidence:row.confidence_4??0, idx:4 },
    ];

    for (const m of slots) {
      if (!m.market || !m.selection) continue;
      const keys = [`market_${m.idx}`, String(m.idx), `market_${m.idx}_result`, `result_${m.idx}`, `m${m.idx}`];
      let raw: unknown;
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(status, k)) { raw = status[k]; break; }
      }
      const r = String(raw ?? "").toLowerCase().trim();
      const result: "won"|"lost"|null =
        ["won","win","w","1","true","yes"].includes(r) ? "won"  :
        ["lost","loss","l","0","false","no"].includes(r) ? "lost" : null;
      if (result) {
        // Hippo stores confidence as percentage (e.g., 85). Convert to decimal.
        const rawConf = Number(m.confidence) || 0;
        const confidence = rawConf > 1.5 ? rawConf / 100 : rawConf;
        evals.push({
          market: String(m.market),
          selection: String(m.selection),
          confidence,
          result,
          created_at: row.created_at,
        });
      }
    }
  }
  return evals;
}

// ─── Hippo analytics engine ────────────────────────────────────────────────────
function computeHippoAnalytics(evals: HippoMarketEval[]) {
  if (!evals.length) return null;

  const total  = evals.length;
  const wins   = evals.filter(e => e.result === "won").length;
  const losses = evals.filter(e => e.result === "lost").length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  // Category-level breakdown
  const catMap: Record<string,{wins:number;losses:number;total:number}> = {};
  evals.forEach(e => {
    const cat = categoriseMarket(e.market);
    if (!catMap[cat]) catMap[cat] = {wins:0,losses:0,total:0};
    catMap[cat].total++;
    if (e.result==="won")  catMap[cat].wins++;
    if (e.result==="lost") catMap[cat].losses++;
  });
  const categoryBreakdown = Object.entries(catMap)
    .map(([name,d]) => ({
      name, wins:d.wins, losses:d.losses, total:d.total,
      winRate: d.total>0 ? (d.wins/d.total)*100 : 0,
      color: MARKET_CATEGORY_COLORS[name] || "#64748b",
    }))
    .sort((a,b) => b.total - a.total);

  // Detailed market-selection pairs (top 12 by volume)
  const pairMap: Record<string,{wins:number;losses:number;total:number;cat:string}> = {};
  evals.forEach(e => {
    const key = `${e.market} — ${e.selection}`;
    if (!pairMap[key]) pairMap[key] = {wins:0,losses:0,total:0,cat:categoriseMarket(e.market)};
    pairMap[key].total++;
    if (e.result==="won")  pairMap[key].wins++;
    if (e.result==="lost") pairMap[key].losses++;
  });
  const pairBreakdown = Object.entries(pairMap)
    .map(([name,d]) => ({
      name, wins:d.wins, losses:d.losses, total:d.total, cat:d.cat,
      winRate: d.total>0 ? (d.wins/d.total)*100 : 0,
      color: MARKET_CATEGORY_COLORS[d.cat] || "#64748b",
    }))
    .sort((a,b) => b.total - a.total)   // sort by volume (most used first)
    .slice(0, 14);

  // Confidence calibration for Hippo
  const confBuckets = [
    {min:0,   max:0.55, range:"<55%"},
    {min:0.55,max:0.65, range:"55–65%"},
    {min:0.65,max:0.75, range:"65–75%"},
    {min:0.75,max:0.85, range:"75–85%"},
    {min:0.85,max:1.01, range:"85%+"},
  ];
  const confidenceCalibration = confBuckets.map(bk => {
    const inB = evals.filter(e => e.confidence >= bk.min && e.confidence < bk.max);
    const bWins = inB.filter(e => e.result==="won").length;
    return {
      range: bk.range,
      count: inB.length,
      winRate: inB.length>0 ? (bWins/inB.length)*100 : 0,
    };
  }).filter(b => b.count > 0);

  // Weekly trend
  const hasDate = evals.some(e => !!e.created_at);
  let weeklyTrend: {label:string;winRate:number;picks:number}[] = [];
  if (hasDate) {
    const wkMap: Record<string,{wins:number;total:number}> = {};
    evals.forEach(e => {
      if (!e.created_at) return;
      const d = new Date(e.created_at);
      const ws = new Date(d); ws.setDate(d.getDate()-d.getDay()+(d.getDay()===0?-6:1));
      const k = ws.toISOString().split("T")[0];
      if (!wkMap[k]) wkMap[k]={wins:0,total:0};
      wkMap[k].total++;
      if (e.result==="won") wkMap[k].wins++;
    });
    weeklyTrend = Object.entries(wkMap)
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([week,d])=>({
        label: `${new Date(week).getDate()}/${new Date(week).getMonth()+1}`,
        winRate: d.total>0 ? (d.wins/d.total)*100 : 0,
        picks: d.total,
      }));
  } else {
    const chunkSize = Math.max(Math.floor(total/6), 5);
    for (let i=0; i<evals.length; i+=chunkSize) {
      const chunk = evals.slice(i, i+chunkSize);
      const cWins = chunk.filter(e=>e.result==="won").length;
      weeklyTrend.push({
        label: `#${Math.floor(i/chunkSize)+1}`,
        winRate: (cWins/chunk.length)*100,
        picks: chunk.length,
      });
    }
  }

  // Best & worst market by win rate (min 3 picks)
  const qualified = pairBreakdown.filter(p => p.total >= 3);
  const bestMarket  = qualified.length ? qualified.slice().sort((a,b)=>b.winRate-a.winRate)[0]  : null;
  const worstMarket = qualified.length ? qualified.slice().sort((a,b)=>a.winRate-b.winRate)[0] : null;

  // Current streak
  let streak = 0;
  let streakType: "won"|"lost" = "won";
  for (let i = evals.length-1; i >= 0; i--) {
    const r = evals[i].result;
    if (streak===0) { streakType=r; streak=1; }
    else if (r===streakType) streak++;
    else break;
  }

  return {
    total, wins, losses, winRate,
    categoryBreakdown, pairBreakdown,
    confidenceCalibration, weeklyTrend,
    bestMarket, worstMarket,
    streak, streakType,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [predictions,  setPredictions]  = useState<Prediction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string|null>(null);
  const [hippoRows,    setHippoRows]    = useState<any[]>([]);
  const [hippoLoading, setHippoLoading] = useState(true);
  const [hippoError,   setHippoError]   = useState<string|null>(null);
  const [lastUpdated,  setLastUpdated]  = useState<Date|null>(null);

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
    } catch (e:any) { setError(e?.message||"Failed to load MK-806 data."); }
    finally { setLoading(false); }
  };

  const fetchHippoData = async () => {
    setHippoLoading(true); setHippoError(null);
    try {
      const { data, error } = await supabase
        .from("hippo_predictions")
        .select(`
          created_at,
          market_1,selection_1,confidence_1,
          market_2,selection_2,confidence_2,
          market_3,selection_3,confidence_3,
          market_4,selection_4,confidence_4,
          result_status
        `)
        .not("result_status","is",null)
        .order("created_at",{ascending:true});
      if (error) throw error;

      const nonEmpty = (data ?? []).filter(row => {
        const rs = row.result_status;
        if (!rs) return false;
        if (typeof rs==="object") return Object.keys(rs).length>0;
        if (typeof rs==="string") { const t=rs.trim(); return t!==""&&t!=="{}"&&t!=="null"; }
        return false;
      });

      setHippoRows(nonEmpty);
      if (nonEmpty.length>0) {
        const parsed=processHippoMarkets(nonEmpty);
        if (parsed.length===0) {
          console.warn("[Hippo] result_status sample:", nonEmpty[0]?.result_status);
          setHippoError(`${nonEmpty.length} rows fetched but no results matched. Check console for sample.`);
        }
      }
    } catch (e:any) {
      setHippoError(e?.message||"Failed to load Hippo data.");
      setHippoRows([]);
    } finally { setHippoLoading(false); }
  };

  useEffect(() => { fetchMKData(); fetchHippoData(); }, []);

  const mk    = processPredictions(predictions);
  const hippoEvals = processHippoMarkets(hippoRows);
  const hippo = computeHippoAnalytics(hippoEvals);
  const { summary,weekly,cumulative,leagueBreakdown,betTypeBreakdown,confidenceBuckets } = mk;
  const voidPct  = summary.total>0?(summary.voids/summary.total)*100:0;
  const lossPct  = summary.total>0?(summary.losses/summary.total)*100:0;
  const roiColor = summary.roi>=0 ? EMERALD : ROSE;
  const roiBg    = summary.roi>=0 ? EMERALD_LIGHT : ROSE_LIGHT;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <Layout>
      <div style={{ background: PAGE_BG }} className="min-h-screen">
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin" style={{ color:GOLD }} />
            </div>
            <div>
              <Shimmer className="h-7 w-60 mb-2" />
              <Shimmer className="h-3 w-44" />
            </div>
          </div>
          <PageSkeleton />
        </div>
      </div>
    </Layout>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) return (
    <Layout>
      <div style={{ background: PAGE_BG }} className="min-h-screen">
        <div className="container mx-auto px-4 py-24 max-w-md text-center">
          <div className="rounded-2xl p-8 bg-rose-50 border border-rose-100 shadow-sm">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color:ROSE }} />
            <p className="font-bold text-slate-800 mb-1">Unable to load analytics</p>
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
      <div style={{ background: PAGE_BG }} className="min-h-screen">
        <div className="container mx-auto px-4 py-10 max-w-6xl">

          {/* ═══════════════ HERO ═══════════════════════════════════════════ */}
          <motion.div initial={{ opacity:0,y:-18 }} animate={{ opacity:1,y:0 }} transition={SPRING}
            className="mb-10 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-[10px]
                font-bold uppercase tracking-widest"
                style={{ background:GOLD_LIGHT, color:GOLD, border:`1px solid ${GOLD}28` }}>
                <Sparkles className="h-3 w-3" /> Analytics Dashboard
              </div>
              <h1 className="text-3xl md:text-[2.2rem] font-black tracking-tight text-slate-900 leading-tight">
                MK-806 &amp; <span style={{ color:GOLD }}>Hippo AI</span>{" "}
                <span className="text-slate-400 font-light">Analytics</span>
              </h1>
              <p className="text-[13px] text-slate-400 mt-2 max-w-xl leading-relaxed">
                Full season intelligence — prediction engine performance, alternative market analysis, and confidence calibration across all tracked competitions.
              </p>
              {lastUpdated && (
                <p className="text-[11px] text-slate-300 mt-2 flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Refreshed at {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button onClick={() => { fetchMKData(); fetchHippoData(); }}
              title="Refresh data"
              className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0
                hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </button>
          </motion.div>

          {/* ═══════════════ MK-806 SECTION ═════════════════════════════════ */}
          <SectionHeader icon={Trophy} title="MK-806" highlight="Performance"
            subtitle="Season-to-date results from the prediction engine across all tracked competitions and bet types."
            accent={GOLD} />

          {/* KPI row */}
          <motion.div initial="hidden" animate="visible" variants={staggerWrap}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard index={0} icon={Target}     label="Total Predictions"
              value={summary.total}
              sub={`${summary.wins.toFixed(1)}W · ${summary.losses.toFixed(1)}L · ${summary.voids}V`}
              accent={GOLD} accentBg={GOLD_LIGHT} />
            <StatCard index={1} icon={Trophy}     label="Win Rate"
              value={`${summary.winRate.toFixed(1)}%`} sub="Settled picks only"
              accent={EMERALD} accentBg={EMERALD_LIGHT}
              trend={summary.winRate>=50?"up":"down"} />
            <StatCard index={2} icon={DollarSign} label="Season ROI"
              value={`${summary.roi>=0?"+":""}${summary.roi.toFixed(1)}%`}
              sub={`${summary.profitUnits>=0?"+":""}${summary.profitUnits.toFixed(1)} units profit`}
              accent={SAPPHIRE} accentBg={SAPPHIRE_LIGHT}
              trend={summary.roi>=0?"up":"down"} />
            <StatCard index={3} icon={Flame}
              label={`${summary.streakType==="win"?"Win":"Loss"} Streak`}
              value={`${summary.streak} ${summary.streakType==="win"?"✓":"✗"}`}
              sub="Most recent consecutive outcomes"
              accent={summary.streakType==="win"?EMERALD:ROSE}
              accentBg={summary.streakType==="win"?EMERALD_LIGHT:ROSE_LIGHT}
              trend={summary.streakType==="win"?"up":"down"} />
          </motion.div>

          {/* Gauge + Bet-type donut */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Card title="Overall Win Rate"
              subtitle={`${summary.wins.toFixed(1)} wins from ${(summary.wins + summary.losses).toFixed(1)} settled predictions`}
              icon={Target} accent={EMERALD}>
              <WinRateGauge rate={summary.winRate} color={EMERALD} />
              <div className="flex justify-center gap-6 -mt-1">
                {[
                  {label:"Win",  val:summary.winRate.toFixed(1),color:EMERALD,bg:EMERALD_LIGHT},
                  {label:"Loss", val:lossPct.toFixed(1),         color:ROSE,   bg:ROSE_LIGHT  },
                  {label:"Void", val:voidPct.toFixed(1),         color:GOLD,   bg:GOLD_LIGHT  },
                ].map(x => (
                  <div key={x.label} className="flex flex-col items-center gap-1">
                    <div className="h-1.5 w-10 rounded-full" style={{ background:x.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{x.label}</span>
                    <span className="text-[15px] font-black tabular-nums" style={{ color:x.color }}>{x.val}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Bet Type Distribution" subtitle="Predictions by bet category" icon={Layers} accent={SAPPHIRE}>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={betTypeBreakdown} cx="42%" cy="50%"
                      innerRadius={50} outerRadius={76} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {betTypeBreakdown.map((e,i) => <Cell key={i} fill={e.color} opacity={0.88} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
                {betTypeBreakdown.map(b => (
                  <div key={b.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background:b.color }} />
                    <span className="text-[11px] text-slate-500 truncate">{b.name}</span>
                    <span className="ml-auto text-[11px] font-bold font-mono" style={{ color:b.color }}>
                      {b.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Cumulative ROI area */}
          <Card title="Cumulative ROI Over Time"
            subtitle="Running return on investment — 1 unit flat stake per prediction"
            icon={TrendingUp} accent={roiColor} className="mb-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulative} margin={{top:4,right:8,left:-18,bottom:0}}>
                  <defs>
                    <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"   stopColor={roiColor} stopOpacity={0.18} />
                      <stop offset="95%"  stopColor={roiColor} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="day" tick={{fontSize:9,fill:CHART_TICK}} axisLine={false} tickLine={false}
                    interval="preserveStartEnd" />
                  <YAxis tick={{fontSize:9,fill:CHART_TICK}} axisLine={false} tickLine={false}
                    tickFormatter={v=>`${v}%`} />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="5 3" />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="roi" name="ROI"
                    stroke={roiColor} strokeWidth={2.5} fill="url(#roiGrad)" dot={false}
                    activeDot={{r:5,fill:roiColor,strokeWidth:2,stroke:"#fff"}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Weekly bars */}
          <Card title="Weekly Results" subtitle={`Win / loss breakdown — last ${weekly.length} weeks`}
            icon={BarChart2} accent={SAPPHIRE} className="mb-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} barGap={3} margin={{top:4,right:8,left:-18,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="week" tick={{fontSize:10,fill:CHART_TICK}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:CHART_TICK}} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={7}
                    wrapperStyle={{fontSize:"11px",paddingTop:"10px",color:CHART_TICK}} />
                  <Bar dataKey="wins"   name="Wins"   fill={EMERALD} radius={[4,4,0,0]} maxBarSize={26} />
                  <Bar dataKey="losses" name="Losses" fill={ROSE}    radius={[4,4,0,0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* League + Confidence */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Card title="Win Rate by League" subtitle="Top competitions ranked by performance" icon={Trophy} accent={GOLD}>
              <div className="space-y-3.5 mt-1">
                {leagueBreakdown.length === 0
                  ? <p className="text-sm text-slate-400 py-6 text-center">No league data yet</p>
                  : leagueBreakdown.map(l =>
                      <ProgressRow key={l.league} label={l.league} winRate={l.winRate}
                        wins={l.wins} total={l.total} color={l.color} />)}
              </div>
            </Card>

            <Card title="Confidence Calibration"
              subtitle="Does higher model confidence actually predict wins?" icon={Activity} accent={SAPPHIRE}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confidenceBuckets} margin={{top:4,right:4,left:-22,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="range" tick={{fontSize:9,fill:CHART_TICK}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize:9,fill:CHART_TICK}} axisLine={false} tickLine={false}
                      tickFormatter={v=>`${v}%`} domain={[0,100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="winRate" name="Actual Win %" radius={[4,4,0,0]} maxBarSize={40}>
                      {confidenceBuckets.map((e,i) => (
                        <Cell key={i} fill={e.winRate>=65?EMERALD:e.winRate>=50?GOLD:ROSE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 rounded-xl px-3.5 py-2.5 bg-slate-50 border border-slate-100
                text-[11px] text-slate-400 flex items-start gap-2">
                <Zap className="h-3 w-3 shrink-0 mt-0.5" style={{ color:GOLD }} />
                <span>
                  {confidenceBuckets.length>0
                    ? "Higher confidence bands should map to higher win rates. Flat or inverse curves indicate model drift."
                    : "Insufficient data for calibration analysis."}
                </span>
              </div>
            </Card>
          </div>

          {/* Weekly ROI table */}
          <Card title="Weekly ROI Detail" subtitle="Profit & loss per week — 1 unit flat stake"
            icon={DollarSign} accent={GOLD} className="mb-6">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Week","Wins","Losses","ROI","Trend"].map(h => (
                      <th key={h}
                        className="pb-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-3 first:pl-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekly.map((w,i) => {
                    const pos = w.roi>=0;
                    return (
                      <motion.tr key={w.week} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}}
                        transition={{delay:0.25+i*0.035}}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 font-bold text-slate-700 pr-3">{w.week}</td>
                        <td className="py-2.5 font-mono font-semibold pr-3" style={{color:EMERALD}}>
                          {w.wins.toFixed(1)}
                        </td>
                        <td className="py-2.5 font-mono font-semibold pr-3" style={{color:ROSE}}>
                          {w.losses.toFixed(1)}
                        </td>
                        <td className="py-2.5 font-black font-mono pr-3" style={{color:pos?EMERALD:ROSE}}>
                          {pos?"+":""}{w.roi.toFixed(1)}%
                        </td>
                        <td className="py-2.5">
                          <Badge color={pos?EMERALD:ROSE} bg={pos?EMERALD_LIGHT:ROSE_LIGHT}>
                            {pos
                              ? <><TrendingUp className="h-3 w-3"/>Profit</>
                              : <><TrendingDown className="h-3 w-3"/>Loss</>}
                          </Badge>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {weekly.length>0 && (
              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {label:"Avg Weekly Wins",   val:(summary.wins/Math.max(weekly.length,1)).toFixed(1),              c:EMERALD},
                  {label:"Avg Weekly Losses", val:(summary.losses/Math.max(weekly.length,1)).toFixed(1),            c:ROSE  },
                  {label:"Best ROI Week",     val:`+${Math.max(...weekly.map(w=>w.roi),0).toFixed(1)}%`,            c:GOLD  },
                  {label:"Worst ROI Week",    val:`${Math.min(...weekly.map(w=>w.roi),0).toFixed(1)}%`,             c:ROSE  },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                    <p className="text-lg font-black tabular-nums" style={{color:s.c}}>{s.val}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ═══════════════ HIPPO AI SECTION ═══════════════════════════════ */}
          <SectionHeader icon={Brain} title="Hippo AI" highlight="Market Intelligence"
            subtitle="Deep analytics on the 4 alternative markets Hippo selects per prediction — category performance, confidence calibration, and trend analysis."
            accent={SAPPHIRE} />

          {hippoLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_,i)=><Shimmer key={i} className="h-32"/>)}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Shimmer className="h-64"/><Shimmer className="h-64"/>
              </div>
              <Shimmer className="h-72"/><Shimmer className="h-60"/>
            </div>

          ) : hippoError && hippoEvals.length===0 ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 flex gap-4 items-start mb-6">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{color:GOLD}} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-800 mb-1">Hippo data issue</p>
                <p className="text-sm text-amber-700 break-words">{hippoError}</p>
                <button onClick={fetchHippoData}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg
                    bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all">
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            </div>

          ) : hippo===null ? (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm py-16 text-center mb-6">
              <Brain className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="font-bold text-slate-500">No settled Hippo markets yet</p>
              <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto">
                Results populate once matches conclude and the update-results function runs.
              </p>
            </div>

          ) : (
            <>
              {/* ── Hippo KPI row ─────────────────────────────────────────── */}
              <motion.div initial="hidden" animate="visible" variants={staggerWrap}
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <StatCard index={0} icon={Target}      label="Total Market Picks"
                  value={hippo.total} sub={`${hippo.wins}W · ${hippo.losses}L`}
                  accent={SAPPHIRE} accentBg={SAPPHIRE_LIGHT} />
                <StatCard index={1} icon={Trophy}      label="Overall Win Rate"
                  value={`${hippo.winRate.toFixed(1)}%`} sub="Across all market types"
                  accent={EMERALD} accentBg={EMERALD_LIGHT}
                  trend={hippo.winRate>=50?"up":"down"} />
                <StatCard index={2} icon={Star}        label="Best Category"
                  value={hippo.categoryBreakdown.slice().sort((a,b)=>b.winRate-a.winRate)[0]?.name||"—"}
                  sub={`${hippo.categoryBreakdown.slice().sort((a,b)=>b.winRate-a.winRate)[0]?.winRate.toFixed(1)||0}% win rate`}
                  accent={GOLD} accentBg={GOLD_LIGHT} />
                <StatCard index={3} icon={Flame}
                  label={`${hippo.streakType==="won"?"Win":"Loss"} Streak`}
                  value={`${hippo.streak} ${hippo.streakType==="won"?"✓":"✗"}`}
                  sub="Recent consecutive market results"
                  accent={hippo.streakType==="won"?EMERALD:ROSE}
                  accentBg={hippo.streakType==="won"?EMERALD_LIGHT:ROSE_LIGHT}
                  trend={hippo.streakType==="won"?"up":"down"} />
              </motion.div>

              {/* ── Best / Worst market callouts ──────────────────────────── */}
              {(hippo.bestMarket || hippo.worstMarket) && (
                <div className="grid md:grid-cols-2 gap-4 mb-5">
                  {hippo.bestMarket && (
                    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1,...SPRING}}
                      className="rounded-2xl p-5 border flex items-start gap-4"
                      style={{background:EMERALD_LIGHT,borderColor:`${EMERALD}25`}}>
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{background:`${EMERALD}22`}}>
                        <CheckCircle2 className="h-5 w-5" style={{color:EMERALD}} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                          style={{color:EMERALD}}>Best Performing Market (min 3 picks)</p>
                        <p className="font-black text-slate-800 truncate">{hippo.bestMarket.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[13px] font-black tabular-nums" style={{color:EMERALD}}>
                            {hippo.bestMarket.winRate.toFixed(1)}% win rate
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {hippo.bestMarket.wins}W / {hippo.bestMarket.losses}L / {hippo.bestMarket.total} picks
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {hippo.worstMarket && hippo.worstMarket.name !== hippo.bestMarket?.name && (
                    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.15,...SPRING}}
                      className="rounded-2xl p-5 border flex items-start gap-4"
                      style={{background:ROSE_LIGHT,borderColor:`${ROSE}25`}}>
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{background:`${ROSE}18`}}>
                        <XCircle className="h-5 w-5" style={{color:ROSE}} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                          style={{color:ROSE}}>Weakest Market (min 3 picks)</p>
                        <p className="font-black text-slate-800 truncate">{hippo.worstMarket.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[13px] font-black tabular-nums" style={{color:ROSE}}>
                            {hippo.worstMarket.winRate.toFixed(1)}% win rate
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {hippo.worstMarket.wins}W / {hippo.worstMarket.losses}L / {hippo.worstMarket.total} picks
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── Category donut + Win rate trend ──────────────────────── */}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <Card title="Picks by Market Category"
                  subtitle="Volume distribution across market types"
                  icon={Layers} accent={SAPPHIRE}>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={hippo.categoryBreakdown} cx="42%" cy="50%"
                          innerRadius={48} outerRadius={74} paddingAngle={3} dataKey="total" strokeWidth={0}>
                          {hippo.categoryBreakdown.map((e,i) => (
                            <Cell key={i} fill={e.color} opacity={0.9} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />}
                          formatter={(v:any,n:any)=>[v,n==="total"?"Picks":n]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
                    {hippo.categoryBreakdown.map(c => (
                      <div key={c.name} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{background:c.color}} />
                        <span className="text-[11px] text-slate-500 truncate">{c.name}</span>
                        <span className="ml-auto text-[11px] font-bold font-mono" style={{color:c.color}}>
                          {c.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Win Rate Trend"
                  subtitle="Market win rate over time — are picks improving?"
                  icon={TrendingUp} accent={SAPPHIRE}>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hippo.weeklyTrend} margin={{top:4,right:8,left:-18,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis dataKey="label" tick={{fontSize:9,fill:CHART_TICK}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize:9,fill:CHART_TICK}} axisLine={false} tickLine={false}
                          tickFormatter={v=>`${v.toFixed(0)}%`} domain={[0,100]} />
                        <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="5 3" label={{value:"50%",position:"right",fontSize:9,fill:"#94a3b8"}} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="winRate" name="Win Rate"
                          stroke={SAPPHIRE} strokeWidth={2.5} dot={{r:4,fill:SAPPHIRE,strokeWidth:2,stroke:"#fff"}}
                          activeDot={{r:6,fill:SAPPHIRE,strokeWidth:2,stroke:"#fff"}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* ── Category performance bars ─────────────────────────────── */}
              <Card title="Win Rate by Market Category"
                subtitle="How each market type performs — volume-weighted view"
                icon={BarChart2} accent={SAPPHIRE} className="mb-4">
                <div className="space-y-3 mt-1">
                  {hippo.categoryBreakdown.map(c => (
                    <ProgressRow key={c.name} label={c.name} winRate={c.winRate}
                      wins={c.wins} total={c.total} color={c.color} />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    {label:"Strong ≥60%",color:EMERALD,bg:EMERALD_LIGHT},
                    {label:"Average 40–60%",color:GOLD,bg:GOLD_LIGHT},
                    {label:"Weak <40%",color:ROSE,bg:ROSE_LIGHT},
                  ].map(x => (
                    <Badge key={x.label} color={x.color} bg={x.bg}>{x.label}</Badge>
                  ))}
                </div>
              </Card>

              {/* ── Hippo confidence calibration ─────────────────────────── */}
              <Card title="Confidence Calibration — Hippo AI"
                subtitle="Does Hippo's confidence score predict actual market wins?"
                icon={Activity} accent={VIOLET} className="mb-4">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hippo.confidenceCalibration} margin={{top:4,right:4,left:-22,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                      <XAxis dataKey="range" tick={{fontSize:9,fill:CHART_TICK}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize:9,fill:CHART_TICK}} axisLine={false} tickLine={false}
                        tickFormatter={v=>`${v}%`} domain={[0,100]} />
                      <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="4 3" />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="winRate" name="Actual Win %" radius={[4,4,0,0]} maxBarSize={44}>
                        {hippo.confidenceCalibration.map((e,i) => (
                          <Cell key={i} fill={e.winRate>=60?EMERALD:e.winRate>=45?GOLD:ROSE} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {hippo.confidenceCalibration.map(b => (
                    <div key={b.range}
                      className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{b.range}</p>
                      <p className="text-[15px] font-black tabular-nums mt-0.5"
                        style={{color:b.winRate>=60?EMERALD:b.winRate>=45?GOLD:ROSE}}>
                        {b.winRate.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-slate-400">{b.count} picks</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── Detailed pair table ───────────────────────────────────── */}
              <Card title="Market-Selection Pair Breakdown"
                subtitle={`Top ${hippo.pairBreakdown.length} most-picked combinations — sorted by volume`}
                icon={Layers} accent={GOLD} className="mb-4">
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[580px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Market & Selection","Category","W","L","Total","Win Rate"].map(h => (
                          <th key={h}
                            className="pb-3 text-left text-[10px] font-bold text-slate-400
                              uppercase tracking-widest pr-3 first:pl-0">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hippo.pairBreakdown.map((row,i) => {
                        const col = row.winRate>=60?EMERALD:row.winRate>=40?GOLD:ROSE;
                        const bg  = row.winRate>=60?EMERALD_LIGHT:row.winRate>=40?GOLD_LIGHT:ROSE_LIGHT;
                        return (
                          <motion.tr key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}}
                            transition={{delay:0.15+i*0.025}}
                            className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{background:row.color}} />
                                <span className="font-semibold text-slate-700 text-[12px]">{row.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-3">
                              <Badge color={row.color} bg={`${row.color}18`} size="xs">{row.cat}</Badge>
                            </td>
                            <td className="py-2.5 pr-3 font-mono font-bold tabular-nums text-[12px]"
                              style={{color:EMERALD}}>{row.wins}</td>
                            <td className="py-2.5 pr-3 font-mono font-bold tabular-nums text-[12px]"
                              style={{color:ROSE}}>{row.losses}</td>
                            <td className="py-2.5 pr-3 font-mono tabular-nums text-[12px] text-slate-400">
                              {row.total}
                            </td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-14 rounded-full overflow-hidden bg-slate-100">
                                  <div className="h-full rounded-full"
                                    style={{width:`${row.winRate}%`,background:col}} />
                                </div>
                                <Badge color={col} bg={bg} size="xs">{row.winRate.toFixed(1)}%</Badge>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-[11px] text-slate-400 flex items-start gap-1.5">
                  <Zap className="h-3 w-3 shrink-0 mt-0.5" style={{color:SAPPHIRE}} />
                  Markets are classified using BSD match result data. Picks without BSD data are excluded from all calculations.
                </p>
              </Card>
            </>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;