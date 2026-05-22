import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createClient } from "@supabase/supabase-js";

// ── Supabase Client ─────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ── Constants ─────────────────────────────────────────────────
const SESSION_KEY        = '10odds_session_id';
const SESSION_TS_KEY     = '10odds_session_ts';   // last activity timestamp
const SESSION_BOOT_KEY   = '10odds_boot';          // sessionStorage – upserted this tab?
const SESSION_TIMEOUT_MS = 120 * 60 * 1000;        // 120 min inactivity = new session {fits a full soccer match!}

// Skip our own analytics URLs to prevent infinite error loops
const ANALYTICS_TABLE_NAMES = [
  'analytics_sessions', 'page_views', 'analytics_errors', 'analytics_performance',
];

// ── Session management ────────────────────────────────────────
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getSessionId(): string {
  const now      = Date.now();
  const stored   = localStorage.getItem(SESSION_KEY);
  const lastSeen = parseInt(localStorage.getItem(SESSION_TS_KEY) ?? '0', 10);
  const timedOut = stored && (now - lastSeen > SESSION_TIMEOUT_MS);

  if (!stored || timedOut) {
    const id = generateId();
    localStorage.setItem(SESSION_KEY, id);
    localStorage.setItem(SESSION_TS_KEY, String(now));
    sessionStorage.removeItem(SESSION_BOOT_KEY); // force re-upsert for new session
    return id;
  }

  localStorage.setItem(SESSION_TS_KEY, String(now)); // refresh timestamp
  return stored;
}

// ── Device fingerprinting ─────────────────────────────────────
function detectDeviceType(ua: string): 'desktop' | 'tablet' | 'mobile' {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseBrowser(ua: string): { browser: string; browserVersion: string } {
  const list: [RegExp, string][] = [
    [/Edg\/([\d.]+)/,             'Edge'],
    [/OPR\/([\d.]+)/,             'Opera'],
    [/SamsungBrowser\/([\d.]+)/,  'Samsung Internet'],
    [/Chrome\/([\d.]+)/,          'Chrome'],
    [/Firefox\/([\d.]+)/,         'Firefox'],
    [/Version\/([\d.]+).*Safari/, 'Safari'],
    [/Trident.*rv:([\d.]+)/,      'IE'],
  ];
  for (const [re, name] of list) {
    const m = ua.match(re);
    if (m) return { browser: name, browserVersion: m[1] };
  }
  return { browser: 'Unknown', browserVersion: '0' };
}

function parseOS(ua: string): { os: string; osVersion: string } {
  const list: [RegExp, string][] = [
    [/Windows NT ([\d.]+)/,  'Windows'],
    [/Mac OS X ([\d_.]+)/,   'macOS'],
    [/Android ([\d.]+)/,     'Android'],
    [/iPhone OS ([\d_]+)/,   'iOS'],
    [/iPad.*OS ([\d_]+)/,    'iPadOS'],
    [/CrOS\s\S+ ([\d.]+)/,   'ChromeOS'],
    [/Linux/,                 'Linux'],
  ];
  for (const [re, name] of list) {
    const m = ua.match(re);
    if (m) return { os: name, osVersion: m[1]?.replace(/_/g, '.') ?? 'Unknown' };
  }
  return { os: 'Unknown', osVersion: 'Unknown' };
}

function getNetworkType(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;
    if (c) return c.effectiveType ?? c.type ?? 'unknown';
  } catch { /* ignore */ }
  return 'unknown';
}

// ── DB writers ────────────────────────────────────────────────

async function upsertSession(sessionId: string): Promise<void> {
  if (sessionStorage.getItem(SESSION_BOOT_KEY)) return;
  sessionStorage.setItem(SESSION_BOOT_KEY, '1');

  try {
    const ua = navigator.userAgent;
    const { browser, browserVersion } = parseBrowser(ua);
    const { os, osVersion } = parseOS(ua);

    await supabase.from('analytics_sessions').upsert(
      {
        session_id:      sessionId,
        browser,
        browser_version: browserVersion,
        os,
        os_version:      osVersion,
        device_type:     detectDeviceType(ua),
        screen_width:    screen.width,
        screen_height:   screen.height,
        viewport_width:  window.innerWidth,
        viewport_height: window.innerHeight,
        color_depth:     screen.colorDepth,
        pixel_ratio:     window.devicePixelRatio,
        language:        navigator.language,
        timezone:        Intl.DateTimeFormat().resolvedOptions().timeZone,
        network_type:    getNetworkType(),
        touch_support:   navigator.maxTouchPoints > 0,
        last_seen_at:    new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );
  } catch { /* silent */ }
}

async function updateSessionLastSeen(sessionId: string): Promise<void> {
  try {
    await supabase
      .from('analytics_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('session_id', sessionId);
  } catch { /* silent */ }
}

export async function insertPageView(
  sessionId:    string,
  pagePath:     string,
  previousPath: string | null,
  timeOnPageMs: number | null
): Promise<void> {
  try {
    await supabase.from('page_views').insert({
      session_id:      sessionId,
      page_path:       pagePath,
      previous_path:   previousPath,
      referrer:        document.referrer || null,
      time_on_page_ms: timeOnPageMs,
    });
  } catch { /* silent */ }
}

export async function insertError(
  sessionId: string,
  pagePath:  string,
  errorType: string,
  payload: {
    message?:       string;
    stack?:         string;
    componentName?: string;
    networkUrl?:    string;
    httpStatus?:    number;
    durationMs?:    number;
    metadata?:      Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from('analytics_errors').insert({
      session_id:     sessionId,
      page_path:      pagePath,
      error_type:     errorType,
      error_message:  payload.message       ?? null,
      stack_trace:    payload.stack         ?? null,
      component_name: payload.componentName ?? null,
      network_url:    payload.networkUrl    ?? null,
      http_status:    payload.httpStatus    ?? null,
      duration_ms:    payload.durationMs    ?? null,
      metadata:       payload.metadata      ?? null,
    });
  } catch { /* silent */ }
}

async function insertPerformance(sessionId: string, pagePath: string): Promise<void> {
  try {
    // Wait until page is fully loaded
    await new Promise<void>((res) => {
      if (document.readyState === 'complete') res();
      else window.addEventListener('load', () => res(), { once: true });
    });

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const fcp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')?.startTime ?? null;

    let lcp: number | null = null;
    let cls = 0;

    await Promise.allSettled([
      new Promise<void>((res) => {
        try {
          const obs = new PerformanceObserver((list) => {
            const es = list.getEntries();
            lcp = es[es.length - 1]?.startTime ?? null;
            obs.disconnect(); res();
          });
          obs.observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(res, 3000);
        } catch { res(); }
      }),
      new Promise<void>((res) => {
        try {
          const obs = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (!(e as any).hadRecentInput) cls += (e as any).value ?? 0;
            }
            obs.disconnect(); res();
          });
          obs.observe({ type: 'layout-shift', buffered: true });
          setTimeout(res, 3000);
        } catch { res(); }
      }),
    ]);

    await supabase.from('analytics_performance').insert({
      session_id:                  sessionId,
      page_path:                   pagePath,
      page_load_ms:                nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
      dom_content_loaded_ms:       nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
      first_contentful_paint_ms:   fcp ? Math.round(fcp) : null,
      time_to_interactive_ms:      nav ? Math.round(nav.domInteractive - nav.startTime) : null,
      largest_contentful_paint_ms: lcp ? Math.round(lcp) : null,
      cumulative_layout_shift:     parseFloat(cls.toFixed(4)),
    });
  } catch { /* silent */ }
}

// ── Fetch patch – captures network errors ─────────────────────
let fetchPatched = false;

function patchFetch(sessionId: string, getPath: () => string) {
  if (fetchPatched) return;
  fetchPatched = true;
  const orig = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    // Skip our own analytics inserts to prevent infinite loops
    if (ANALYTICS_TABLE_NAMES.some((t) => url.includes(t))) return orig(input, init);

    try {
      const res = await orig(input, init);
      if (!res.ok && res.status >= 400) {
        await insertError(sessionId, getPath(), 'network', {
          networkUrl: url,
          httpStatus: res.status,
          message:    `HTTP ${res.status} — ${url}`,
        });
      }
      return res;
    } catch (err) {
      await insertError(sessionId, getPath(), 'network', {
        networkUrl: url,
        message:    err instanceof Error ? err.message : String(err),
        stack:      err instanceof Error ? err.stack    : undefined,
      });
      throw err;
    }
  };
}

// ── Global JS error listeners ─────────────────────────────────
let listenersAttached = false;

function attachGlobalListeners(sessionId: string, getPath: () => string) {
  if (listenersAttached) return;
  listenersAttached = true;

  window.addEventListener('error', (e) => {
    insertError(sessionId, getPath(), 'js_runtime', {
      message:  e.message,
      stack:    e.error?.stack,
      metadata: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const err = e.reason;
    insertError(sessionId, getPath(), 'unhandled_promise', {
      message: err instanceof Error ? err.message : String(err),
      stack:   err instanceof Error ? err.stack   : undefined,
    });
  });
}

// ── Public helpers ────────────────────────────────────────────

/** Call from React Profiler onRender for components that render slowly */
export async function reportSlowRender(componentName: string, durationMs: number): Promise<void> {
  await insertError(getSessionId(), window.location.pathname, 'slow_render', { componentName, durationMs });
}

/** Call from React Error Boundary componentDidCatch */
export async function reportReactError(error: Error, componentName?: string): Promise<void> {
  await insertError(getSessionId(), window.location.pathname, 'react_boundary', {
    message: error.message,
    stack:   error.stack,
    componentName,
  });
}

// ── Main Hook ─────────────────────────────────────────────────
export function usePageTracking(): void {
  const location         = useLocation();
  const sessionId        = getSessionId();
  const previousPathRef  = useRef<string | null>(null);
  const pageEnterTimeRef = useRef<number>(Date.now());
  const isFirstRef       = useRef(true);
  const currentPathRef   = useRef(location.pathname);
  currentPathRef.current = location.pathname;

  // One-time setup per mount
  useEffect(() => {
    upsertSession(sessionId);
    attachGlobalListeners(sessionId, () => currentPathRef.current);
    patchFetch(sessionId, () => currentPathRef.current);

    // Keep last_seen_at fresh when user returns to the tab
    const onFocus = () => updateSessionLastSeen(sessionId);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [sessionId]);

  // Track every navigation
  useEffect(() => {
    const path       = location.pathname;
    const timeOnPrev = isFirstRef.current ? null : Date.now() - pageEnterTimeRef.current;
    isFirstRef.current = false;

    insertPageView(sessionId, path, previousPathRef.current, timeOnPrev);
    insertPerformance(sessionId, path);

    previousPathRef.current  = path;
    pageEnterTimeRef.current = Date.now();
  }, [location.pathname, sessionId]);
}

// ── Zero-render component ─────────────────────────────────────
export function PageTracker(): null {
  usePageTracking();
  return null;
}