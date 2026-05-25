import { useState, useEffect } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// Use the same client pattern as the rest of the site
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL  as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

type MaintenanceState = {
  /** true = maintenance is ON, false = site is live */
  isMaintenance: boolean;
  /** true while the initial fetch is in-flight */
  isChecking: boolean;
};

/**
 * useMaintenanceMode
 *
 * 1. Fetches the current `maintenance_mode` value from `site_settings` on mount.
 * 2. Opens a Supabase Realtime subscription that fires instantly when the row
 *    is updated — no polling, no refresh needed across open tabs.
 * 3. Cleans up the channel on unmount.
 */
export function useMaintenanceMode(): MaintenanceState {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isChecking,    setIsChecking]    = useState(true);

  useEffect(() => {
    let channel: RealtimeChannel;

    // ── Initial fetch ──────────────────────────────────────────────────────────
    async function fetchInitial() {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("maintenance_mode")
          .eq("id", 1)
          .maybeSingle();

        if (!error && data !== null) {
          setIsMaintenance(data.maintenance_mode ?? false);
        }
      } catch {
        // Network error — assume site is live so users aren't permanently locked out
        setIsMaintenance(false);
      } finally {
        setIsChecking(false);
      }
    }

    // ── Realtime subscription ──────────────────────────────────────────────────
    // Fires on every UPDATE to the site_settings row with id = 1.
    // Works across all open browser tabs instantly.
    function subscribeRealtime() {
      channel = supabase
        .channel("site_settings_maintenance")
        .on(
          "postgres_changes",
          {
            event:  "UPDATE",
            schema: "public",
            table:  "site_settings",
            filter: "id=eq.1",
          },
          (payload) => {
            const newValue = payload.new as { maintenance_mode: boolean };
            setIsMaintenance(newValue.maintenance_mode ?? false);
            // Always clear the checking spinner when a real update lands
            setIsChecking(false);
          }
        )
        .subscribe();
    }

    fetchInitial();
    subscribeRealtime();

    // ── Cleanup ────────────────────────────────────────────────────────────────
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []); // runs once on mount

  return { isMaintenance, isChecking };
}