import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createClient } from "@supabase/supabase-js";


const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── Constants ────────────────────────────────────────────────
const SESSION_KEY = '10odds_session_id';
const SESSION_UPSERTED_KEY = '10odds_session_upserted';

// ─── Helpers ─────────────────────────────────────────────────

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function detectDeviceType(ua: string): string {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseBrowser(ua: string): { browser: string; browserVersion: string } {
  const browsers: [RegExp, string][] = [
    [/Edg\/([\d.]+)/, 'Edge'],
    [/OPR\/([\d.]+)/, 'Opera'],
    [/Chrome\/([\d.]+)/, 'Chrome'],
    [/Firefox\/([\d.]+)/, 'Firefox'],
    [/Safari\/([\d.]+)/, 'Safari'],
    [/Trident.*rv:([\d.]+)/, 'IE'],
  ];
  for (const [regex, name] of browsers) {
    const match = ua.match(regex);
    if (match) return { browser: name, browserVersion: match[1] };
  }
  return { browser: 'Unknown', browserVersion: '0' };
}

function parseOS(ua: string): { os: string; osVersion: string } {
  const systems: [RegExp, string][] = [
    [/Windows NT ([\d.]+)/, 'Windows'],
    [/Mac OS X ([\d_.]+)/, 'macOS'],
    [/Android ([\d.]+)/, 'Android'],
    [/iPhone OS ([\d_]+)/, 'iOS'],
    [/iPad.*OS ([\d_]+)/, 'iPadOS'],
    [/Linux/, 'Linux'],
  ];
  for (const [regex, name] of systems) {
    const match = ua.match(regex);
    if (match) {
      const version = match[1]?.replace(/_/g, '.') ?? 'Unknown';
      return { os: name, osVersion: version };
    }
  }
  return { os: 'Unknown', osVersion: 'Unknown' };
}

function getNetworkType(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;
    if (conn) return conn.effectiveType ?? conn.type ?? 'unknown';
  } catch { /* ignore */ }
  return 'unknown';
}

async function upsertSession(sessionId: string): Promise<void> {
  // Only send once per page load to avoid hammering the DB
  if (sessionStorage.getItem(SESSION_UPSERTED_KEY)) return;
  sessionStorage.setItem(SESSION_UPSERTED_KEY, '1');

  try {
    const ua = navigator.userAgent;
    const { browser, browserVersion } = parseBrowser(ua);
    const { os, osVersion } = parseOS(ua);

    await supabase.from('analytics_sessions').upsert(
      {
        session_id: sessionId,
        browser,
        browser_version: browserVersion,
        os,
        os_version: osVersion,
        device_type: detectDeviceType(ua),
        screen_width: screen.width,
        screen_height: screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        color_depth: screen.colorDepth,
        pixel_ratio: window.devicePixelRatio,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        network_type: getNetworkType(),
        touch_support: navigator.maxTouchPoints > 0,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );
  } catch { /* silent */ }
}

async function insertPageView(
  sessionId: string,
  pagePath: string,
  previousPath: string | null,
  timeOnPageMs: number | null
): Promise<void> {
  try {
    await supabase.from('page_views').insert({
      session_id: sessionId,
      page_path: pagePath,
      previous_path: previousPath,
      referrer: document.referrer || null,
      time_on_page_ms: timeOnPageMs,
    });
  } catch { /* silent */ }
}

async function insertError(
  sessionId: string,
  pagePath: string,
  errorType: string,
  payload: {
    message?: string;
    stack?: string;
    componentName?: string;
    networkUrl?: string;
    httpStatus?: number;
    durationMs?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from('analytics_errors').insert({
      session_id: sessionId,
      page_path: pagePath,
      error_type: errorType,
      error_message: payload.message ?? null,
      stack_trace: payload.stack ?? null,
      component_name: payload.componentName ?? null,
      network_url: payload.networkUrl ?? null,
      http_status: payload.httpStatus ?? null,
      duration_ms: payload.durationMs ?? null,
      metadata: payload.metadata ?? null,
    });
  } catch { /* silent */ }
}

async function insertPerformance(sessionId: string, pagePath: string): Promise<void> {
  try {
    // Wait for page to fully load
    await new Promise<void>((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), { once: true });
    });

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find((e) => e.name === 'first-contentful-paint')?.startTime ?? null;

    // LCP via PerformanceObserver (best-effort)
    let lcp: number | null = null;
    try {
      await new Promise<void>((resolve) => {
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          lcp = entries[entries.length - 1]?.startTime ?? null;
          obs.disconnect();
          resolve();
        });
        obs.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(resolve, 3000); // don't wait forever
      });
    } catch { /* LCP not supported */ }

    // CLS
    let cls = 0;
    try {
      await new Promise<void>((resolve) => {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!(entry as any).hadRecentInput) cls += (entry as any).value;
          }
          obs.disconnect();
          resolve();
        });
        obs.observe({ type: 'layout-shift', buffered: true });
        setTimeout(resolve, 3000);
      });
    } catch { /* CLS not supported */ }

    await supabase.from('analytics_performance').insert({
      session_id: sessionId,
      page_path: pagePath,
      page_load_ms: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
      dom_content_loaded_ms: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
      first_contentful_paint_ms: fcp ? Math.round(fcp) : null,
      time_to_interactive_ms: nav ? Math.round(nav.domInteractive - nav.startTime) : null,
      largest_contentful_paint_ms: lcp ? Math.round(lcp) : null,
      cumulative_layout_shift: cls ? parseFloat(cls.toFixed(4)) : null,
    });
  } catch { /* silent */ }
}

// ─── Fetch override to capture network errors ─────────────────
let fetchPatched = false;

function patchFetch(sessionId: string, getPath: () => string) {
  if (fetchPatched) return;
  fetchPatched = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    try {
      const res = await origFetch(input, init);
      if (!res.ok && res.status >= 400) {
        await insertError(sessionId, getPath(), 'network', {
          networkUrl: url,
          httpStatus: res.status,
          message: `HTTP ${res.status} on ${url}`,
        });
      }
      return res;
    } catch (err) {
      await insertError(sessionId, getPath(), 'network', {
        networkUrl: url,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  };
}

// ─── Global error listeners ───────────────────────────────────
let listenersAttached = false;

function attachGlobalListeners(sessionId: string, getPath: () => string) {
  if (listenersAttached) return;
  listenersAttached = true;

  window.addEventListener('error', (event) => {
    insertError(sessionId, getPath(), 'js_runtime', {
      message: event.message,
      stack: event.error?.stack,
      metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason;
    insertError(sessionId, getPath(), 'unhandled_promise', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });
}

// ─── React slow-render reporter (call from React Profiler) ────
export async function reportSlowRender(
  componentName: string,
  durationMs: number
): Promise<void> {
  const sessionId = getSessionId();
  const pagePath = window.location.pathname;
  await insertError(sessionId, pagePath, 'slow_render', { componentName, durationMs });
}

// ─── React Error Boundary helper ─────────────────────────────
export async function reportReactError(
  error: Error,
  componentName?: string
): Promise<void> {
  const sessionId = getSessionId();
  const pagePath = window.location.pathname;
  await insertError(sessionId, pagePath, 'react_boundary', {
    message: error.message,
    stack: error.stack,
    componentName,
  });
}

// ─── Main Hook ───────────────────────────────────────────────
export function usePageTracking(): void {
  const location = useLocation();
  const sessionId = getSessionId();
  const previousPathRef = useRef<string | null>(null);
  const pageEnterTimeRef = useRef<number>(Date.now());
  const isFirstRender = useRef(true);

  // Current path accessor for closures
  const currentPathRef = useRef(location.pathname);
  currentPathRef.current = location.pathname;

  useEffect(() => {
    // Setup once
    upsertSession(sessionId);
    attachGlobalListeners(sessionId, () => currentPathRef.current);
    patchFetch(sessionId, () => currentPathRef.current);
  }, [sessionId]);

  useEffect(() => {
    const path = location.pathname;
    const timeOnPrevious = isFirstRender.current
      ? null
      : Date.now() - pageEnterTimeRef.current;

    isFirstRender.current = false;

    insertPageView(sessionId, path, previousPathRef.current, timeOnPrevious);

    // Capture Web Vitals for every navigation (best-effort on first load)
    insertPerformance(sessionId, path);

    previousPathRef.current = path;
    pageEnterTimeRef.current = Date.now();
  }, [location.pathname, sessionId]);
}

// ─── Convenience tracker component ───────────────────────────
export function PageTracker(): null {
  usePageTracking();
  return null;
}