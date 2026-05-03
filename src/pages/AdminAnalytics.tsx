import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { createClient } from "@supabase/supabase-js";

// ── Supabase Client ─────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ── Config ────────────────────────────────────────────────────
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? 'changeme';
const GOLD = '#D4AF37';
const GOLD_DIM = '#9A7D1E';
const RED = '#EF4444';
const BLUE = '#3B82F6';
const GREEN = '#10B981';
const PURPLE = '#8B5CF6';

// ── Types ─────────────────────────────────────────────────────
interface KPI {
  totalViews: number;
  todayViews: number;
  todayUnique: number;
  totalSessions: number;
  totalErrors: number;
  todayErrors: number;
}

interface DailyPoint {
  date: string;
  views: number;
  unique: number;
  errors: number;
}

interface TopPage {
  page_path: string;
  views: number;
}

interface ErrorRow {
  id: number;
  created_at: string;
  page_path: string;
  error_type: string;
  error_message: string;
  stack_trace: string;
  session_id: string;
  component_name: string | null;
  network_url: string | null;
  http_status: number | null;
}

interface DeviceRow {
  device_type: string;
  browser: string;
  os: string;
  count: number;
}

interface SessionEvent {
  type: 'view' | 'error';
  page_path: string;
  created_at: string;
  error_type?: string;
  error_message?: string;
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function errorColor(type: string): string {
  const map: Record<string, string> = {
    js_runtime: RED,
    unhandled_promise: '#F97316',
    network: BLUE,
    react_boundary: PURPLE,
    slow_render: '#FBBF24',
  };
  return map[type] ?? '#6B7280';
}

// ── Sub-components ────────────────────────────────────────────

function KPICard({ label, value, sub, color = GOLD }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid rgba(212,175,55,0.18)`,
      borderRadius: 12,
      padding: '20px 24px',
      minWidth: 140,
      flex: 1,
    }}>
      <div style={{ color: '#9CA3AF', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{value.toLocaleString()}</div>
      {sub && <div style={{ color: '#6B7280', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      color: GOLD,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: 'uppercase',
      margin: '32px 0 14px',
      borderBottom: `1px solid rgba(212,175,55,0.15)`,
      paddingBottom: 8,
    }}>{children}</h2>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const [params] = useSearchParams();
  const key = params.get('key') ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [errorFilter, setErrorFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionTimeline, setSessionTimeline] = useState<SessionEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'devices' | 'sessions'>('overview');

  const authorized = key === ADMIN_SECRET;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const days14Ago = new Date(Date.now() - 14 * 86400000).toISOString();

      // ── KPIs ──────────────────────────────────────────────
      const [pvAll, pvToday, sessAll, errAll, errToday] = await Promise.all([
        supabase.from('page_views').select('id', { count: 'exact', head: true }),
        supabase.from('page_views').select('session_id').gte('created_at', todayStart),
        supabase.from('analytics_sessions').select('session_id', { count: 'exact', head: true }),
        supabase.from('analytics_errors').select('id', { count: 'exact', head: true }),
        supabase.from('analytics_errors').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      ]);

      const todayRows = pvToday.data ?? [];
      const todayUnique = new Set(todayRows.map((r) => r.session_id)).size;

      setKpi({
        totalViews: pvAll.count ?? 0,
        todayViews: todayRows.length,
        todayUnique,
        totalSessions: sessAll.count ?? 0,
        totalErrors: errAll.count ?? 0,
        todayErrors: errToday.count ?? 0,
      });

      // ── Daily trend (14 days) ─────────────────────────────
      const [pvDaily, errDaily] = await Promise.all([
        supabase.from('page_views').select('created_at, session_id').gte('created_at', days14Ago),
        supabase.from('analytics_errors').select('created_at').gte('created_at', days14Ago),
      ]);

      const dayMap: Record<string, { views: number; sessions: Set<string>; errors: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { views: 0, sessions: new Set(), errors: 0 };
      }
      for (const row of pvDaily.data ?? []) {
        const d = row.created_at.slice(0, 10);
        if (dayMap[d]) { dayMap[d].views++; dayMap[d].sessions.add(row.session_id); }
      }
      for (const row of errDaily.data ?? []) {
        const d = row.created_at.slice(0, 10);
        if (dayMap[d]) dayMap[d].errors++;
      }
      setDaily(Object.entries(dayMap).map(([date, v]) => ({
        date: formatDate(date + 'T00:00:00'),
        views: v.views,
        unique: v.sessions.size,
        errors: v.errors,
      })));

      // ── Top pages ─────────────────────────────────────────
      const pvPaths = (pvDaily.data ?? []).concat(
        ((await supabase.from('page_views').select('page_path')).data ?? []) as { created_at: string; session_id: string; page_path: string }[]
      );
      // Simpler: just query all paths and count
      const allPaths = (await supabase.from('page_views').select('page_path')).data ?? [];
      const pathCount: Record<string, number> = {};
      for (const r of allPaths) pathCount[r.page_path] = (pathCount[r.page_path] ?? 0) + 1;
      setTopPages(
        Object.entries(pathCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([page_path, views]) => ({ page_path, views }))
      );

      // ── Error log ─────────────────────────────────────────
      const { data: errRows } = await supabase
        .from('analytics_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setErrors((errRows as ErrorRow[]) ?? []);

      // ── Device matrix ─────────────────────────────────────
      const { data: sessRows } = await supabase
        .from('analytics_sessions')
        .select('device_type, browser, os');
      const devMap: Record<string, number> = {};
      for (const r of sessRows ?? []) {
        const k = `${r.device_type}|${r.browser}|${r.os}`;
        devMap[k] = (devMap[k] ?? 0) + 1;
      }
      setDevices(
        Object.entries(devMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([k, count]) => {
            const [device_type, browser, os] = k.split('|');
            return { device_type, browser, os, count };
          })
      );

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) loadData();
    else setLoading(false);
  }, [authorized, loadData]);

  async function loadSessionTimeline(sessionId: string) {
    setTimelineLoading(true);
    setSelectedSession(sessionId);
    const [pvRes, errRes] = await Promise.all([
      supabase.from('page_views').select('page_path, created_at').eq('session_id', sessionId).order('created_at'),
      supabase.from('analytics_errors').select('page_path, created_at, error_type, error_message').eq('session_id', sessionId).order('created_at'),
    ]);
    const events: SessionEvent[] = [
      ...(pvRes.data ?? []).map((r) => ({ type: 'view' as const, page_path: r.page_path, created_at: r.created_at })),
      ...(errRes.data ?? []).map((r) => ({ type: 'error' as const, page_path: r.page_path, created_at: r.created_at, error_type: r.error_type, error_message: r.error_message })),
    ].sort((a, b) => a.created_at.localeCompare(b.created_at));
    setSessionTimeline(events);
    setTimelineLoading(false);
  }

  // Unique sessions from error log
  const uniqueErrorSessions = [...new Set(errors.map((e) => e.session_id))].slice(0, 30);

  // Filtered errors
  const filteredErrors = errorFilter === 'all' ? errors : errors.filter((e) => e.error_type === errorFilter);

  // Device pie data
  const devicePie = ['desktop', 'mobile', 'tablet'].map((d) => ({
    name: d.charAt(0).toUpperCase() + d.slice(1),
    value: devices.filter((r) => r.device_type === d).reduce((s, r) => s + r.count, 0),
  })).filter((d) => d.value > 0);
  const PIE_COLORS = [GOLD, BLUE, GREEN];

  // ── Render ────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0A0A0A',
    color: '#E5E7EB',
    fontFamily: '"Inter", system-ui, sans-serif',
    padding: '0 0 64px',
  };

  const headerStyle: React.CSSProperties = {
    background: 'rgba(212,175,55,0.05)',
    borderBottom: `1px solid rgba(212,175,55,0.2)`,
    padding: '20px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'space-between',
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
  };

  if (!authorized) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ color: RED, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Access Denied</div>
          <div style={{ color: '#6B7280', fontSize: 14 }}>Add <code style={{ color: GOLD }}>?key=YOUR_SECRET</code> to the URL</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid rgba(212,175,55,0.2)`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: '#6B7280' }}>Loading analytics…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: RED }}>⚠ {error}</div>
      </div>
    );
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    background: active ? GOLD : 'transparent',
    color: active ? '#000' : '#9CA3AF',
    transition: 'all 0.15s',
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <div style={{ color: GOLD, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>10 Odds</div>
          <div style={{ color: '#F9FAFB', fontSize: 20, fontWeight: 700 }}>Analytics Dashboard</div>
        </div>
        <button onClick={loadData} style={{ background: 'rgba(212,175,55,0.1)', border: `1px solid rgba(212,175,55,0.3)`, color: GOLD, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
          ↻ Refresh
        </button>
      </div>

      <div style={contentStyle}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '24px 0 0' }}>
          {(['overview', 'errors', 'devices', 'sessions'] as const).map((t) => (
            <button key={t} style={tabStyle(activeTab === t)} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ───────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
              <KPICard label="Total Page Views" value={kpi?.totalViews ?? 0} />
              <KPICard label="Today's Views" value={kpi?.todayViews ?? 0} />
              <KPICard label="Today's Unique" value={kpi?.todayUnique ?? 0} color={GREEN} />
              <KPICard label="Total Sessions" value={kpi?.totalSessions ?? 0} color={BLUE} />
              <KPICard label="Total Errors" value={kpi?.totalErrors ?? 0} color={RED} sub={`${kpi?.todayErrors ?? 0} today`} />
            </div>

            {/* Daily Trend */}
            <SectionTitle>Daily Trend (14 Days)</SectionTitle>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={daily} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gUnique" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BLUE} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gErrors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={RED} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={RED} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1A1A1A', border: `1px solid rgba(212,175,55,0.2)`, borderRadius: 8, color: '#E5E7EB' }} />
                  <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
                  <Area type="monotone" dataKey="views" stroke={GOLD} fill="url(#gViews)" strokeWidth={2} name="Page Views" />
                  <Area type="monotone" dataKey="unique" stroke={BLUE} fill="url(#gUnique)" strokeWidth={2} name="Unique Visitors" />
                  <Area type="monotone" dataKey="errors" stroke={RED} fill="url(#gErrors)" strokeWidth={2} name="Errors" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top Pages */}
            <SectionTitle>Top 10 Pages</SectionTitle>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              {topPages.map((p, i) => {
                const pct = topPages[0] ? (p.views / topPages[0].views) * 100 : 0;
                return (
                  <div key={p.page_path} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: i < topPages.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', gap: 16 }}>
                    <span style={{ color: '#4B5563', width: 20, fontSize: 12, textAlign: 'right' }}>#{i + 1}</span>
                    <span style={{ flex: 1, color: '#E5E7EB', fontSize: 13, fontFamily: 'monospace' }}>{p.page_path}</span>
                    <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: GOLD, borderRadius: 2 }} />
                    </div>
                    <span style={{ color: GOLD, fontWeight: 700, fontSize: 14, minWidth: 50, textAlign: 'right' }}>{p.views.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── ERRORS TAB ─────────────────────────────────── */}
        {activeTab === 'errors' && (
          <>
            <SectionTitle>Error Log</SectionTitle>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['all', 'js_runtime', 'unhandled_promise', 'network', 'react_boundary', 'slow_render'].map((f) => (
                <button key={f} onClick={() => setErrorFilter(f)} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${errorFilter === f ? errorColor(f) : 'rgba(255,255,255,0.1)'}`, background: errorFilter === f ? `${errorColor(f)}22` : 'transparent', color: errorFilter === f ? errorColor(f) : '#9CA3AF', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', maxHeight: 600, overflowY: 'auto' }}>
              {filteredErrors.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#4B5563' }}>No errors recorded</div>
              )}
              {filteredErrors.map((e, i) => (
                <div key={e.id} style={{ padding: '14px 20px', borderBottom: i < filteredErrors.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ background: `${errorColor(e.error_type)}22`, color: errorColor(e.error_type), fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, letterSpacing: 0.5 }}>{e.error_type}</span>
                    <span style={{ color: '#4B5563', fontSize: 11 }}>{formatTime(e.created_at)}</span>
                    <span style={{ color: '#374151', fontSize: 11, fontFamily: 'monospace' }}>{e.page_path}</span>
                    {e.http_status && <span style={{ color: RED, fontSize: 11 }}>HTTP {e.http_status}</span>}
                    <span
                      onClick={() => loadSessionTimeline(e.session_id)}
                      style={{ marginLeft: 'auto', color: GOLD_DIM, fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Session →
                    </span>
                  </div>
                  <div style={{ color: '#D1D5DB', fontSize: 13 }}>{e.error_message}</div>
                  {e.stack_trace && (
                    <pre style={{ color: '#4B5563', fontSize: 10, marginTop: 6, overflow: 'auto', maxHeight: 80, padding: '6px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>
                      {e.stack_trace.slice(0, 400)}
                    </pre>
                  )}
                  {e.network_url && <div style={{ color: '#4B5563', fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>↳ {e.network_url}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── DEVICES TAB ────────────────────────────────── */}
        {activeTab === 'devices' && (
          <>
            <SectionTitle>Device & Browser Matrix</SectionTitle>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Pie chart */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.06)', flex: '0 0 280px' }}>
                <div style={{ color: '#9CA3AF', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Device Types</div>
                <PieChart width={220} height={220}>
                  <Pie data={devicePie} cx={105} cy={105} innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {devicePie.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1A1A1A', border: `1px solid rgba(212,175,55,0.2)`, borderRadius: 8 }} />
                </PieChart>
              </div>

              {/* Table */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', minWidth: 300 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', padding: '10px 16px', background: 'rgba(255,255,255,0.04)', color: '#6B7280', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                  <span>Device</span><span>Browser</span><span>OS</span><span style={{ textAlign: 'right' }}>Sessions</span>
                </div>
                {devices.map((d, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                    <span style={{ color: d.device_type === 'mobile' ? GREEN : d.device_type === 'tablet' ? BLUE : GOLD }}>
                      {d.device_type === 'mobile' ? '📱' : d.device_type === 'tablet' ? '📱' : '🖥'} {d.device_type}
                    </span>
                    <span style={{ color: '#D1D5DB' }}>{d.browser}</span>
                    <span style={{ color: '#9CA3AF' }}>{d.os}</span>
                    <span style={{ textAlign: 'right', color: GOLD, fontWeight: 700 }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Browser bar chart */}
            <SectionTitle>Browser Distribution</SectionTitle>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
              {(() => {
                const browserCounts: Record<string, number> = {};
                devices.forEach((d) => { browserCounts[d.browser] = (browserCounts[d.browser] ?? 0) + d.count; });
                const data = Object.entries(browserCounts).map(([browser, count]) => ({ browser, count })).sort((a, b) => b.count - a.count);
                return (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="browser" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1A1A1A', border: `1px solid rgba(212,175,55,0.2)`, borderRadius: 8, color: '#E5E7EB' }} />
                      <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} name="Sessions" />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </>
        )}

        {/* ── SESSIONS TAB ───────────────────────────────── */}
        {activeTab === 'sessions' && (
          <>
            <SectionTitle>Session Timeline</SectionTitle>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Session list */}
              <div style={{ width: 260, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', maxHeight: 600, overflowY: 'auto' }}>
                <div style={{ padding: '10px 14px', color: '#6B7280', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Sessions with Errors</div>
                {uniqueErrorSessions.map((sid) => (
                  <div key={sid} onClick={() => loadSessionTimeline(sid)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: selectedSession === sid ? 'rgba(212,175,55,0.08)' : 'transparent', color: selectedSession === sid ? GOLD : '#9CA3AF', fontSize: 11, fontFamily: 'monospace', transition: 'all 0.1s' }}>
                    {sid.slice(0, 20)}…
                  </div>
                ))}
                {uniqueErrorSessions.length === 0 && <div style={{ padding: 20, color: '#4B5563', fontSize: 12, textAlign: 'center' }}>No error sessions</div>}
              </div>

              {/* Timeline */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', maxHeight: 600, overflowY: 'auto', minWidth: 320 }}>
                {!selectedSession && <div style={{ padding: 40, textAlign: 'center', color: '#4B5563' }}>Select a session to view its timeline</div>}
                {timelineLoading && <div style={{ padding: 40, textAlign: 'center', color: '#4B5563' }}>Loading…</div>}
                {selectedSession && !timelineLoading && (
                  <>
                    <div style={{ padding: '10px 16px', color: '#6B7280', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {sessionTimeline.length} events · {selectedSession.slice(0, 16)}…
                    </div>
                    <div style={{ padding: '16px' }}>
                      {sessionTimeline.map((ev, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.type === 'error' ? errorColor(ev.error_type ?? '') : GREEN, marginTop: 4, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 2 }}>{formatTime(ev.created_at)}</div>
                            <div style={{ fontSize: 12, color: ev.type === 'error' ? errorColor(ev.error_type ?? '') : '#D1D5DB' }}>
                              {ev.type === 'view' ? `📄 ${ev.page_path}` : `⚠ ${ev.error_type}: ${ev.error_message?.slice(0, 80)}`}
                            </div>
                          </div>
                        </div>
                      ))}
                      {sessionTimeline.length === 0 && <div style={{ color: '#4B5563', fontSize: 12 }}>No events found</div>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}