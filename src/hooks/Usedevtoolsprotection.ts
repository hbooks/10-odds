import { useEffect } from "react";

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET as string | undefined;

function isAdminSession(): boolean {
  if (!ADMIN_SECRET) return false;
  try {
    return new URLSearchParams(window.location.search).get("key") === ADMIN_SECRET;
  } catch {
    return false;
  }
}

export function useDevToolsProtection(): void {
  useEffect(() => {
    if (isAdminSession()) return;

    // ── 1. Block ALL keyboard shortcuts that open DevTools ──────────────────
    const blockKeys = (e: KeyboardEvent) => {
      const ctrl  = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const k     = e.key;

      const blocked =
        k === "F12" ||
        (ctrl && shift && ["i","I","j","J","c","C"].includes(k)) ||
        (ctrl && ["u","U"].includes(k)) ||
        k === "F5" && ctrl; // Ctrl+F5 hard reload (optional)

      if (blocked) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    // ── 2. Block right-click context menu ───────────────────────────────────
    const blockCtx = (e: MouseEvent) => e.preventDefault();

    // ── 3. Block text selection (makes source harder to read) ───────────────
    const blockSelect = (e: Event) => e.preventDefault();

    document.addEventListener("keydown",     blockKeys,   true);
    document.addEventListener("contextmenu", blockCtx,    true);
    document.addEventListener("selectstart", blockSelect, true);

    return () => {
      document.removeEventListener("keydown",     blockKeys,   true);
      document.removeEventListener("contextmenu", blockCtx,    true);
      document.removeEventListener("selectstart", blockSelect, true);
    };
  }, []);
}
