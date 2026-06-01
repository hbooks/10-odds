import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { createClient } from "@supabase/supabase-js";  

// ── Supabase Client ─────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);


// ── Config ────────────────────────────────────────────────────
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? 'changeme';

// ── Theme ─────────────────────────────────────────────────────
const C = {
  gold:      '#D4AF37',
  goldDim:   '#9A7D1E',
  goldFaint: 'rgba(212,175,55,0.12)',
  red:       '#EF4444',
  orange:    '#F97316',
  blue:      '#3B82F6',
  green:     '#10B981',
  purple:    '#8B5CF6',
  yellow:    '#FBBF24',
  bg:        '#0C0C0C',
  surface:   'rgba(255,255,255,0.035)',
  border:    'rgba(255,255,255,0.07)',
  borderGold:'rgba(212,175,55,0.2)',
  text:      '#E5E7EB',
  muted:     '#9CA3AF',
  faint:     '#4B5563',
};

// ── Types ─────────────────────────────────────────────────────
interface KPI {
  totalViews:    number;
  todayViews:    number;
  todayUnique:   number;
  totalSessions: number;
  totalErrors:   number;
  todayErrors:   number;
  avgPagesPerSession: number;
}

interface DailyPoint {
  date:   string;
  views:  number;
  unique: number;
  errors: number;
}

interface TopPage   { page_path: string; views: number; }

interface ErrorRow {
  id:             number;
  created_at:     string;
  page_path:      string;
  error_type:     string;
  error_message:  string;
  stack_trace:    string | null;
  session_id:     string;
  component_name: string | null;
  network_url:    string | null;
  http_status:    number | null;
}

interface SessionRow {
  session_id:      string;
  browser:         string;
  browser_version: string;
  os:              string;
  device_type:     string;
  language:        string;
  timezone:        string;
  network_type:    string;
  screen_width:    number;
  screen_height:   number;
  created_at:      string;
  last_seen_at:    string;
  // joined/computed
  page_count?:     number;
  error_count?:    number;
}

interface DeviceRow {
  device_type: string;
  browser:     string;
  os:          string;
  count:       number;
}

interface LogRow {
  id:          number;
  created_at:  string;
  session_id:  string;
  page_path:   string | null;
  level:       string; // e.g. 'error'|'warn'|'info'|'debug'
  message:     string;
  data:        string | null;
}

interface TimelineEventBase {
  type:       'view' | 'error' | 'log';
  page_path:  string | null;
  created_at: string;
}

// union extended to include logs
interface TimelineEventView extends TimelineEventBase { type: 'view'; time_on_page_ms?: number | null; }
interface TimelineEventError extends TimelineEventBase { type: 'error'; error_type?: string; error_message?: string; }
interface TimelineEventLog extends TimelineEventBase { type: 'log'; level: string; message: string; data?: string | null; }

type TimelineEvent = TimelineEventView | TimelineEventError | TimelineEventLog;

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(ms: number | null | undefined) {
  if (!ms || ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function errorColor(type: string): string {
  return (({
    js_runtime:        C.red,
    unhandled_promise: C.orange,
    network:           C.blue,
    react_boundary:    C.purple,
    slow_render:       C.yellow,
  } as Record<string, string>)[type]) ?? C.faint;
}

function logColor(level: string): string {
  return ({
    error:  C.red,
    warn:   C.orange,
    info:   C.blue,
    debug:  C.purple,
    log:    C.faint,
  } as Record<string, string>)[level] ?? C.faint;
}

function deviceIcon(type: string) {
  return type === 'mobile' ? '📱' : type === 'tablet' ? '📟' : '🖥️';
}

// ── Reusable UI pieces ────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, ...style }}>
      {children}
    </div>
  );
}

function KPICard({
  label, value, sub, color = C.gold, hint,
}: { label: string; value: string | number; sub?: string; color?: string; hint?: string }) {
  return (
    <Card style={{ padding: '18px 22px', flex: 1, minWidth: 130, position: 'relative' }}>
      <div style={{ color: C.muted, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ color, fontSize: 30, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub  && <div style={{ color: C.faint, fontSize: 11, marginTop: 6 }}>{sub}</div>}
      {hint && <div title={hint} style={{ position: 'absolute', top: 14, right: 14, color: C.faint, fontSize: 12, cursor: 'help' }}>ℹ</div>}
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: 2,
      textTransform: 'uppercase', margin: '32px 0 12px',
      borderBottom: `1px solid ${C.borderGold}`, paddingBottom: 8,
    }}>{children}</h2>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: `${color}22`, color, fontSize: 9, fontWeight: 700,
      padding: '2px 7px', borderRadius: 10, letterSpacing: 0.6,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.goldFaint}`, borderTopColor: C.gold, borderRadius: '50%', animation: '_spin 0.7s linear infinite' }} />
    </>
  );
}

// ── Tooltip customisation ─────────────────────────────────────
const TooltipStyle = { background: '#161616', border: `1px solid ${C.borderGold}`, borderRadius: 8, color: C.text, fontSize: 12 };

// ── Main ──────────────────────────────────────────────────────
type Tab = 'overview' | 'sessions' | 'errors' | 'devices';

export default function AdminAnalyticsPage() {
  const [params]      = useSearchParams();
  const secret        = params.get('key') ?? '';
  const authorized    = secret === ADMIN_SECRET;

  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Overview
  const [kpi,      setKpi]      = useState<KPI | null>(null);
  const [daily,    setDaily]    = useState<DailyPoint[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);

  // Sessions
  const [sessions,         setSessions]         = useState<SessionRow[]>([]);
  const [sessionSearch,    setSessionSearch]     = useState('');
  const [selectedSession,  setSelectedSession]   = useState<string | null>(null);
  const [timeline,         setTimeline]          = useState<TimelineEvent[]>([]);
  const [timelineLoading,  setTimelineLoading]   = useState(false);
  const timelinePanelRef = useRef<HTMLDivElement>(null);

  // Errors
  const [errors,      setErrors]      = useState<ErrorRow[]>([]);
  const [errorFilter, setErrorFilter] = useState('all');
  const [errorSearch, setErrorSearch] = useState('');

  // Logs (console)
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logLevelFilter, setLogLevelFilter] = useState<'all'|'error'|'warn'|'info'|'debug'>('all');
  const [logSearch, setLogSearch] = useState('');

  // Devices
  const [devices, setDevices] = useState<DeviceRow[]>([]);

  // ── Data loading ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchErr('');
    try {
      const now        = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const ago14      = new Date(Date.now() - 14 * 86400000).toISOString();

      // ── Run all top-level queries in parallel ─────────────
      const [
        pvAllRes, pvTodayRes,
        sessAllRes,
        errAllRes, errTodayRes,
        pvDailyRes, errDailyRes,
        pvPathsRes,
        errLogRes,
        logsRes,
        sessListRes,
      ] = await Promise.all([
        supabase.from('page_views').select('id', { count: 'exact', head: true }),
        supabase.from('page_views').select('session_id').gte('created_at', todayStart),
        supabase.from('analytics_sessions').select('*').order('last_seen_at', { ascending: false }).limit(500),
        supabase.from('analytics_errors').select('id', { count: 'exact', head: true }),
        supabase.from('analytics_errors').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('page_views').select('created_at, session_id').gte('created_at', ago14),
        supabase.from('analytics_errors').select('created_at').gte('created_at', ago14),
        supabase.from('page_views').select('page_path, session_id'),
        supabase.from('analytics_errors').select('*').order('created_at', { ascending: false }).limit(300),
        supabase.from('analytics_logs').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('analytics_sessions').select('*').order('last_seen_at', { ascending: false }).limit(500),
      ]);

      // ── KPIs ──────────────────────────────────────────────
      const todayRows  = pvTodayRes.data ?? [];
      const todayUnique = new Set(todayRows.map((r) => r.session_id)).size;
      const sessRows   = sessListRes.data ?? [];

      // Page count per session (from all page_views)
      const pvPaths = pvPathsRes.data ?? [];
      // We'll count from pvDailyRes + pvPathsRes — but for avg we need per-session counts
      // Re-use pvDailyRes + pvPathsRes for session page counts
      const allPvForCount = pvDailyRes.data ?? [];
      const pvCountBySid: Record<string, number> = {};
      for (const r of allPvForCount) pvCountBySid[r.session_id] = (pvCountBySid[r.session_id] ?? 0) + 1;
      const avgPages = sessRows.length
        ? Object.values(pvCountBySid).reduce((s, v) => s + v, 0) / sessRows.length
        : 0;

      setKpi({
        totalViews:         pvAllRes.count ?? 0,
        todayViews:         todayRows.length,
        todayUnique,
        totalSessions:      sessAllRes.count ?? sessRows.length,
        totalErrors:        errAllRes.count ?? 0,
        todayErrors:        errTodayRes.count ?? 0,
        avgPagesPerSession: parseFloat(avgPages.toFixed(1)),
      });

      // ── Daily trend (14 days) ─────────────────────────────
      const dayMap: Record<string, { views: number; sessions: Set<string>; errors: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        dayMap[d] = { views: 0, sessions: new Set(), errors: 0 };
      }
      for (const r of pvDailyRes.data ?? []) {
        const d = r.created_at.slice(0, 10);
        if (dayMap[d]) { dayMap[d].views++; dayMap[d].sessions.add(r.session_id); }
      }
      for (const r of errDailyRes.data ?? []) {
        const d = r.created_at.slice(0, 10);
        if (dayMap[d]) dayMap[d].errors++;
      }
      setDaily(Object.entries(dayMap).map(([date, v]) => ({
        date:   fmtDate(date + 'T00:00:00'),
        views:  v.views,
        unique: v.sessions.size,
        errors: v.errors,
      })));

      // ── Top pages ─────────────────────────────────────────
      // Count all page_path values (no duplication from multiple queries)
      const pathCount: Record<string, number> = {};
      for (const r of pvPaths) pathCount[r.page_path] = (pathCount[r.page_path] ?? 0) + 1;
      setTopPages(
        Object.entries(pathCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([page_path, views]) => ({ page_path, views }))
      );

      // ── Error log ─────────────────────────────────────────
      setErrors((errLogRes.data ?? []) as ErrorRow[]);

      // ── Logs ──────────────────────────────────────────────
      setLogs((logsRes.data ?? []) as LogRow[]);

      // ── Sessions with enrichment ──────────────────────────
      const errCountBySid: Record<string, number> = {};
      for (const e of (errLogRes.data ?? [])) {
        errCountBySid[e.session_id] = (errCountBySid[e.session_id] ?? 0) + 1;
      }
      const enriched: SessionRow[] = sessRows.map((s) => ({
        ...s,
        page_count:  pvCountBySid[s.session_id]  ?? 0,
        error_count: errCountBySid[s.session_id] ?? 0,
      }));
      setSessions(enriched);

      // ── Device matrix ─────────────────────────────────────
      const devMap: Record<string, number> = {};
      for (const r of sessRows) {
        const k = `${r.device_type}|${r.browser}|${r.os}`;
        devMap[k] = (devMap[k] ?? 0) + 1;
      }
      setDevices(
        Object.entries(devMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 25)
          .map(([k, count]) => {
            const [device_type, browser, os] = k.split('|');
            return { device_type, browser, os, count };
          })
      );

    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) loadData();
    else setLoading(false);
  }, [authorized, loadData]);

  // ── Session timeline loader ────────────────────────────────
  async function openSessionTimeline(sid: string) {
    // Switch to sessions tab if not already there
    setActiveTab('sessions');
    setSelectedSession(sid);
    setTimeline([]);
    setTimelineLoading(true);

    const [pvRes, errRes, logRes] = await Promise.all([
      supabase.from('page_views').select('page_path, created_at, time_on_page_ms').eq('session_id', sid).order('created_at'),
      supabase.from('analytics_errors').select('page_path, created_at, error_type, error_message').eq('session_id', sid).order('created_at'),
      supabase.from('analytics_logs').select('page_path, created_at, level, message, data').eq('session_id', sid).order('created_at'),
    ]);

    const events: TimelineEvent[] = [
      ...(pvRes.data ?? []).map((r) => ({
        type:           'view' as const,
        page_path:      r.page_path ?? null,
        created_at:     r.created_at,
        time_on_page_ms: r.time_on_page_ms,
      })),
      ...(errRes.data ?? []).map((r) => ({
        type:          'error' as const,
        page_path:     r.page_path ?? null,
        created_at:    r.created_at,
        error_type:    r.error_type,
        error_message: r.error_message,
      })),
      ...(logRes.data ?? []).map((r) => ({
        type:       'log' as const,
        page_path:  r.page_path ?? null,
        created_at: r.created_at,
        level:      r.level,
        message:    r.message,
        data:       r.data,
      })),
    ].sort((a, b) => a.created_at.localeCompare(b.created_at));

    setTimeline(events);
    setTimelineLoading(false);

    setTimeout(() => timelinePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  // ── Derived state ──────────────────────────────────────────
  const filteredErrors = errors.filter((e) => {
    if (errorFilter !== 'all' && e.error_type !== errorFilter) return false;
    if (errorSearch) {
      const q = errorSearch.toLowerCase();
      return (
        e.error_message?.toLowerCase().includes(q) ||
        e.page_path?.toLowerCase().includes(q) ||
        e.session_id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredLogs = logs.filter((l) => {
    if (logLevelFilter !== 'all' && l.level !== logLevelFilter) return false;
    if (logSearch) {
      const q = logSearch.toLowerCase();
      return (
        l.message?.toLowerCase().includes(q) ||
        l.page_path?.toLowerCase().includes(q) ||
        l.session_id?.toLowerCase().includes(q) ||
        l.data?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredSessions = sessions.filter((s) => {
    if (!sessionSearch) return true;
    const q = sessionSearch.toLowerCase();
    return (
      s.session_id.toLowerCase().includes(q) ||
      s.browser?.toLowerCase().includes(q) ||
      s.os?.toLowerCase().includes(q) ||
      s.device_type?.toLowerCase().includes(q)
    );
  });

  const devicePie = ['desktop', 'mobile', 'tablet'].map((dt, i) => ({
    name:  dt.charAt(0).toUpperCase() + dt.slice(1),
    value: devices.filter((d) => d.device_type === dt).reduce((s, d) => s + d.count, 0),
    color: [C.gold, C.blue, C.green][i],
  })).filter((d) => d.value > 0);

  const browserBarData = (() => {
    const m: Record<string, number> = {};
    devices.forEach((d) => { m[d.browser] = (m[d.browser] ?? 0) + d.count; });
    return Object.entries(m).map(([browser, count]) => ({ browser, count })).sort((a, b) => b.count - a.count);
  })();

  // ── Styles ─────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.text, padding: '7px 12px', fontSize: 12, outline: 'none', width: '100%',
  };

  const tabBtn = (t: Tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
    background: activeTab === t ? C.gold : 'transparent',
    color:      activeTab === t ? '#000' : C.muted,
    transition: 'all 0.15s',
  });

  // ── Auth guard ─────────────────────────────────────────────
  if (!authorized) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
        <div style={{ color: C.red, fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Access Denied</div>
        <div style={{ color: C.faint, fontSize: 13 }}>
          Append <code style={{ color: C.gold, background: C.goldFaint, padding: '2px 6px', borderRadius: 4 }}>?key=YOUR_SECRET</code> to the URL
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'system-ui, sans-serif' }}>
      <Spinner />
      <div style={{ color: C.faint, fontSize: 13 }}>Loading analytics…</div>
    </div>
  );

  if (fetchErr) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ color: C.red, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠</div>
        <div>{fetchErr}</div>
        <button onClick={loadData} style={{ marginTop: 16, padding: '8px 20px', background: C.goldFaint, color: C.gold, border: `1px solid ${C.borderGold}`, borderRadius: 8, cursor: 'pointer' }}>Retry</button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"Inter", system-ui, sans-serif', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'rgba(212,175,55,0.04)', borderBottom: `1px solid ${C.borderGold}`, padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: C.goldDim, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>10 Odds · Internal</div>
          <div style={{ color: '#F9FAFB', fontSize: 19, fontWeight: 800, letterSpacing: -0.3 }}>Analytics Dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ color: C.faint, fontSize: 11, marginRight: 8 }}>
            {sessions.length} sessions · {(kpi?.totalViews ?? 0).toLocaleString()} views
          </div>
          <button onClick={loadData} style={{ background: C.goldFaint, border: `1px solid ${C.borderGold}`, color: C.gold, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '20px 0 0' }}>
          {(['overview', 'sessions', 'errors', 'devices'] as Tab[]).map((t) => (
            <button key={t} style={tabBtn(t)} onClick={() => setActiveTab(t)}>
              {t === 'sessions' && selectedSession ? '● ' : ''}{t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'errors'   && errors.length   > 0 && <span style={{ marginLeft: 6, background: C.red, color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 9 }}>{errors.length}</span>}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            <SectionTitle>Key Metrics</SectionTitle>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <KPICard label="Total Page Views"   value={kpi?.totalViews    ?? 0} />
              <KPICard label="Today's Views"      value={kpi?.todayViews    ?? 0} sub={`of ${kpi?.totalViews ?? 0} total`} />
              <KPICard
                label="Today's Unique Sessions"
                value={kpi?.todayUnique ?? 0}
                color={C.green}
                hint="One session per browser/device. Phone + laptop = 2 unique sessions — this is correct."
              />
              <KPICard label="Total Sessions"     value={kpi?.totalSessions ?? 0} color={C.blue}   sub="all time" />
              <KPICard label="Avg Pages / Session" value={kpi?.avgPagesPerSession ?? 0} color={C.gold} sub="last 14 days" />
              <KPICard label="Total Errors"       value={kpi?.totalErrors   ?? 0} color={C.red}    sub={`${kpi?.todayErrors ?? 0} today`} />
            </div>

            <SectionTitle>Daily Trend — Last 14 Days</SectionTitle>
            <Card style={{ padding: '20px 24px 10px' }}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={daily} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    {[['gV', C.gold], ['gU', C.blue], ['gE', C.red]].map(([id, color]) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend wrapperStyle={{ color: C.muted, fontSize: 12, paddingTop: 12 }} />
                  <Area type="monotone" dataKey="views"  name="Page Views"       stroke={C.gold} fill="url(#gV)" strokeWidth={2} />
                  <Area type="monotone" dataKey="unique" name="Unique Sessions"   stroke={C.blue} fill="url(#gU)" strokeWidth={2} />
                  <Area type="monotone" dataKey="errors" name="Errors"            stroke={C.red}  fill="url(#gE)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <SectionTitle>Top 10 Pages</SectionTitle>
            <Card>
              {topPages.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: C.faint }}>No data yet</div>}
              {topPages.map((p, i) => {
                const pct = topPages[0] ? (p.views / topPages[0].views) * 100 : 0;
                return (
                  <div key={p.page_path} style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', borderBottom: i < topPages.length - 1 ? `1px solid ${C.border}` : 'none', gap: 14 }}>
                    <span style={{ color: C.faint, width: 22, fontSize: 11, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                    <span style={{ flex: 1, color: C.text, fontSize: 13, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page_path}</span>
                    <div style={{ width: 100, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: C.gold, borderRadius: 2 }} />
                    </div>
                    <span style={{ color: C.gold, fontWeight: 800, fontSize: 14, minWidth: 44, textAlign: 'right', flexShrink: 0 }}>{p.views.toLocaleString()}</span>
                  </div>
                );
              })}
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════════════
            SESSIONS TAB
        ════════════════════════════════════════════════════ */}
        {activeTab === 'sessions' && (
          <>
            <SectionTitle>All Sessions ({sessions.length})</SectionTitle>
            <div style={{ marginBottom: 12 }}>
              <input
                style={inputStyle}
                placeholder="Search by session ID, browser, OS, device…"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Sessions list */}
              <Card style={{ width: 340, maxHeight: 640, overflowY: 'auto', flexShrink: 0 }}>
                <div style={{ padding: '9px 14px', color: C.faint, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#161616' }}>
                  {filteredSessions.length} sessions
                </div>
                {filteredSessions.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: C.faint, fontSize: 12 }}>No sessions found</div>
                )}
                {filteredSessions.map((s) => (
                  <div
                    key={s.session_id}
                    onClick={() => openSessionTimeline(s.session_id)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      background: selectedSession === s.session_id ? C.goldFaint : 'transparent',
                      borderLeft: selectedSession === s.session_id ? `3px solid ${C.gold}` : '3px solid transparent',
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>{deviceIcon(s.device_type)}</span>
                      <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{s.browser} · {s.os}</span>
                      {s.error_count && s.error_count > 0
                        ? <Badge label={`${s.error_count} err`} color={C.red} />
                        : null}
                    </div>
                    <div style={{ color: C.faint, fontSize: 10, fontFamily: 'monospace', marginBottom: 3 }}>{s.session_id.slice(0, 28)}…</div>
                    <div style={{ display: 'flex', gap: 10, color: C.faint, fontSize: 10 }}>
                      <span>📄 {s.page_count ?? 0} pages</span>
                      <span>🕐 {fmtDateTime(s.last_seen_at)}</span>
                    </div>
                  </div>
                ))}
              </Card>

              {/* Timeline panel */}
              <div ref={timelinePanelRef} style={{ flex: 1, minWidth: 320 }}>
                {!selectedSession && (
                  <Card style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>👈</div>
                    <div style={{ color: C.faint, fontSize: 13 }}>Select a session from the list to view its full event timeline</div>
                  </Card>
                )}

                {selectedSession && timelineLoading && (
                  <Card style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner />
                  </Card>
                )}

                {selectedSession && !timelineLoading && (() => {
                  const sess = sessions.find((s) => s.session_id === selectedSession);
                  return (
                    <Card>
                      {/* Session header */}
                      {sess && (
                        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.goldFaint }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 18 }}>{deviceIcon(sess.device_type)}</span>
                            <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{sess.browser} {sess.browser_version}</span>
                            <span style={{ color: C.muted, fontSize: 13 }}>· {sess.os}</span>
                            <Badge label={sess.device_type} color={C.gold} />
                            {sess.error_count && sess.error_count > 0 ? <Badge label={`${sess.error_count} errors`} color={C.red} /> : null}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: C.faint, fontSize: 11 }}>
                            <span>🌐 {sess.language}</span>
                            <span>🕐 {sess.timezone}</span>
                            <span>📶 {sess.network_type}</span>
                            <span>🖥 {sess.screen_width}×{sess.screen_height}</span>
                            <span>📅 First: {fmtDateTime(sess.created_at)}</span>
                            <span>📅 Last: {fmtDateTime(sess.last_seen_at)}</span>
                          </div>
                          <div style={{ color: C.faint, fontSize: 10, fontFamily: 'monospace', marginTop: 6 }}>{selectedSession}</div>
                        </div>
                      )}

                      {/* Event stream */}
                      <div style={{ padding: '16px 18px', maxHeight: 520, overflowY: 'auto' }}>
                        <div style={{ color: C.faint, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                          {timeline.length} events
                        </div>

                        {timeline.length === 0 && (
                          <div style={{ color: C.faint, fontSize: 13, textAlign: 'center', padding: 32 }}>
                            No events recorded for this session yet
                          </div>
                        )}

                        {timeline.map((ev, i) => (
                          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                            {/* Timeline line */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                              <div style={{
                                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                background: ev.type === 'error' ? errorColor((ev as TimelineEventError).error_type ?? '') : ev.type === 'view' ? C.green : logColor((ev as TimelineEventLog).level ?? 'log'),
                                border: `2px solid ${ev.type === 'error' ? errorColor((ev as TimelineEventError).error_type ?? '') : ev.type === 'view' ? C.green : logColor((ev as TimelineEventLog).level ?? 'log')}`,
                                boxShadow: `0 0 6px ${ev.type === 'error' ? errorColor((ev as TimelineEventError).error_type ?? '') : ev.type === 'view' ? C.green : logColor((ev as TimelineEventLog).level ?? 'log')}44`,
                              }} />
                              {i < timeline.length - 1 && (
                                <div style={{ width: 1, flex: 1, minHeight: 16, background: C.border, margin: '2px 0' }} />
                              )}
                            </div>
                            <div style={{ flex: 1, paddingBottom: 4 }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                                <span style={{ color: C.faint, fontSize: 10 }}>{fmtTime(ev.created_at)}</span>
                                {ev.type === 'error' && <Badge label={(ev as TimelineEventError).error_type ?? 'error'} color={errorColor((ev as TimelineEventError).error_type ?? '')} />}
                                {ev.type === 'log' && <Badge label={(ev as TimelineEventLog).level.toUpperCase()} color={logColor((ev as TimelineEventLog).level)} />}
                                {(ev as TimelineEventView).time_on_page_ms && (ev as TimelineEventView).time_on_page_ms > 0
                                  ? <span style={{ color: C.faint, fontSize: 10 }}>⏱ {fmtDuration((ev as TimelineEventView).time_on_page_ms)}</span>
                                  : null}
                              </div>
                              <div style={{ fontSize: 13, color: ev.type === 'error' ? errorColor((ev as TimelineEventError).error_type ?? '') : C.text }}>
                                {ev.type === 'view'
                                  ? <span>📄 <span style={{ fontFamily: 'monospace' }}>{ev.page_path}</span></span>
                                  : ev.type === 'error'
                                    ? <span>⚠ {(ev as TimelineEventError).error_message?.slice(0, 100)}{(((ev as TimelineEventError).error_message?.length ?? 0) > 100 ? '…' : '')}</span>
                                    : <span>📝 {(ev as TimelineEventLog).message}</span>
                                }
                              </div>
                              {ev.type === 'error' && (
                                <div style={{ color: C.faint, fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>{ev.page_path}</div>
                              )}
                              {ev.type === 'log' && (ev as TimelineEventLog).data && (
                                <div style={{ color: C.faint, fontSize: 11, fontFamily: 'monospace', marginTop: 6, overflow: 'auto', maxHeight: 120, background: 'rgba(0,0,0,0.35)', padding: 8, borderRadius: 6 }}>
                                  {(ev as TimelineEventLog).data}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════
            ERRORS TAB (includes Console Logs)
        ════════════════════════════════════════════════════ */}
        {activeTab === 'errors' && (
          <>
            <SectionTitle>Error Log ({errors.length})</SectionTitle>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {['all', 'js_runtime', 'unhandled_promise', 'network', 'react_boundary', 'slow_render'].map((f) => (
                <button key={f} onClick={() => setErrorFilter(f)} style={{
                  padding: '4px 11px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  border: `1px solid ${errorFilter === f ? errorColor(f) : C.border}`,
                  background: errorFilter === f ? `${errorColor(f)}18` : 'transparent',
                  color: errorFilter === f ? errorColor(f) : C.faint, cursor: 'pointer',
                }}>
                  {f}
                  {f !== 'all' && (
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>
                      ({errors.filter((e) => e.error_type === f).length})
                    </span>
                  )}
                </button>
              ))}
              <div style={{ flex: 1, minWidth: 200 }}>
                <input style={inputStyle} placeholder="Search message, path, session…" value={errorSearch} onChange={(e) => setErrorSearch(e.target.value)} />
              </div>
            </div>

            <Card style={{ maxHeight: 340, overflowY: 'auto' }}>
              {filteredErrors.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: C.faint }}>No errors match your filter</div>
              )}
              {filteredErrors.map((e, i) => (
                <div key={e.id} style={{ padding: '13px 18px', borderBottom: i < filteredErrors.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                    <Badge label={e.error_type} color={errorColor(e.error_type)} />
                    <span style={{ color: C.faint, fontSize: 11 }}>{fmtDateTime(e.created_at)}</span>
                    <span style={{ color: '#374151', fontSize: 11, fontFamily: 'monospace' }}>{e.page_path}</span>
                    {e.http_status && <Badge label={`HTTP ${e.http_status}`} color={C.red} />}
                    <button
                      onClick={() => openSessionTimeline(e.session_id)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.goldDim, fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      View session →
                    </button>
                  </div>

                  <div style={{ color: '#D1D5DB', fontSize: 13, marginBottom: 4 }}>{e.error_message}</div>

                  {e.stack_trace && (
                    <pre style={{ color: C.faint, fontSize: 10, marginTop: 6, overflow: 'auto', maxHeight: 80, padding: '6px 10px', background: 'rgba(0,0,0,0.35)', borderRadius: 6, lineHeight: 1.5 }}>
                      {e.stack_trace.slice(0, 500)}
                    </pre>
                  )}

                  {e.network_url && (
                    <div style={{ color: C.faint, fontSize: 11, marginTop: 4, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ↳ {e.network_url}
                    </div>
                  )}

                  <div style={{ color: '#2D3748', fontSize: 9, marginTop: 5, fontFamily: 'monospace' }}>{e.session_id}</div>
                </div>
              ))}
            </Card>

            {/* Console logs subsection */}
            <SectionTitle>Console Logs ({logs.length})</SectionTitle>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {(['all','error','warn','info','debug'] as const).map((lvl) => (
                <button key={lvl} onClick={() => setLogLevelFilter(lvl)} style={{
                  padding: '4px 11px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  border: `1px solid ${logLevelFilter === lvl ? logColor(lvl) : C.border}`,
                  background: logLevelFilter === lvl ? `${logColor(lvl)}18` : 'transparent',
                  color: logLevelFilter === lvl ? logColor(lvl) : C.faint, cursor: 'pointer',
                }}>
                  {lvl}
                  {lvl !== 'all' && (
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>
                      ({logs.filter((l) => l.level === lvl).length})
                    </span>
                  )}
                </button>
              ))}
              <div style={{ flex: 1, minWidth: 200 }}>
                <input style={inputStyle} placeholder="Search message, path, session…" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
              </div>
            </div>

            <Card style={{ maxHeight: 420, overflowY: 'auto' }}>
              {filteredLogs.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: C.faint }}>No logs match your filter</div>
              )}
              {filteredLogs.map((l, i) => (
                <div key={l.id} style={{ padding: '13px 18px', borderBottom: i < filteredLogs.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <Badge label={l.level} color={logColor(l.level)} />
                    <span style={{ color: C.faint, fontSize: 11 }}>{fmtDateTime(l.created_at)}</span>
                    <span style={{ color: '#374151', fontSize: 11, fontFamily: 'monospace' }}>{l.page_path ?? '—'}</span>
                    <button
                      onClick={() => openSessionTimeline(l.session_id)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.goldDim, fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      View session →
                    </button>
                  </div>

                  <div style={{ color: '#D1D5DB', fontSize: 13, marginBottom: 6 }}>{l.message}</div>

                  {l.data && (
                    <pre style={{ color: C.faint, fontSize: 11, marginTop: 6, overflow: 'auto', maxHeight: 120, padding: '6px 10px', background: 'rgba(0,0,0,0.35)', borderRadius: 6, lineHeight: 1.4 }}>
                      {l.data.slice(0, 200)}
                    </pre>
                  )}

                  <div style={{ color: '#2D3748', fontSize: 9, marginTop: 6, fontFamily: 'monospace' }}>{l.session_id}</div>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════════════
            DEVICES TAB
        ════════════════════════════════════════════════════ */}
        {activeTab === 'devices' && (
          <>
            <SectionTitle>Device Overview</SectionTitle>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
              {devicePie.map((d) => (
                <KPICard key={d.name} label={d.name} value={d.value} color={d.color} sub={`${sessions.length ? Math.round((d.value / sessions.length) * 100) : 0}% of sessions`} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {/* Pie */}
              <Card style={{ padding: 24, flexShrink: 0 }}>
                <div style={{ color: C.muted, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Device Split</div>
                <PieChart width={220} height={220}>
                  <Pie data={devicePie} cx={105} cy={105} innerRadius={64} outerRadius={92} dataKey="value" paddingAngle={3}>
                    {devicePie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TooltipStyle} formatter={(v, n) => [`${v} sessions`, n]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: C.muted }} />
                </PieChart>
              </Card>

              {/* Browser bar */}
              <Card style={{ flex: 1, padding: '20px 24px', minWidth: 280 }}>
                <div style={{ color: C.muted, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Browser Distribution</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={browserBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="browser" tick={{ fill: C.faint, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.faint, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TooltipStyle} />
                    <Bar dataKey="count" fill={C.gold} radius={[4, 4, 0, 0]} name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <SectionTitle>Device · Browser · OS Matrix</SectionTitle>
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 80px', padding: '9px 18px', background: 'rgba(255,255,255,0.03)', color: C.faint, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>
                <span>Device</span><span>Browser</span><span>OS</span><span style={{ textAlign: 'right' }}>Sessions</span>
              </div>
              {devices.map((d, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 80px', padding: '10px 18px', borderBottom: i < devices.length - 1 ? `1px solid ${C.border}` : 'none', fontSize: 13 }}>
                  <span style={{ color: d.device_type === 'mobile' ? C.green : d.device_type === 'tablet' ? C.blue : C.gold }}>
                    {deviceIcon(d.device_type)} {d.device_type}
                  </span>
                  <span style={{ color: C.text }}>{d.browser}</span>
                  <span style={{ color: C.muted }}>{d.os}</span>
                  <span style={{ textAlign: 'right', color: C.gold, fontWeight: 800 }}>{d.count}</span>
                </div>
              ))}
              {devices.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: C.faint }}>No device data yet</div>}
            </Card>
          </>
        )}

      </div>
    </div>
  );
}