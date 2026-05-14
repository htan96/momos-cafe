"use client";

import { useEffect, useState, useCallback } from "react";
import {
  patchAdminSettings,
  normalizeAdminSettingsJson,
  DAY_ORDER,
  type AdminSettings,
  DEFAULT_SETTINGS,
  formatDayHours,
  formatTimeForDisplay,
  getHoursSummary,
  resolveOrderingRules,
  DEFAULT_ORDERING_RULES,
} from "@/lib/adminSettings.model";
import {
  buildScheduleBanner,
  getOrderingStatus,
  getIsOpenToday,
  getTodayKeyInRestaurantTz,
} from "@/lib/adminScheduling";

export type { AdminSettings };
export type { OrderingRules, DayKey, DayHours, WeeklyHours, BusinessLocation } from "@/lib/adminSettings.model";
export type { OrderingStatus } from "@/lib/adminScheduling";

export {
  DAY_ORDER,
  DEFAULT_SETTINGS,
  resolveOrderingRules,
  DEFAULT_ORDERING_RULES,
  formatTimeForDisplay,
  formatDayHours,
  getHoursSummary,
};

export function getSchedulingBannerCopy(settings: AdminSettings): string | undefined {
  const { note } = buildScheduleBanner(settings);
  return note;
}

export function getTodayKey(settings: AdminSettings): import("@/lib/adminSettings.model").DayKey {
  return getTodayKeyInRestaurantTz(settings);
}

/** @deprecated use getTodayKeyInRestaurantTz — kept for churn control */
export { getTodayKeyInRestaurantTz, getOrderingStatus, getIsOpenToday };

const STORAGE_KEY = "admin_settings";

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setSettings(normalizeAdminSettingsJson(data as Record<string, unknown>));
        } else {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              setSettings(normalizeAdminSettingsJson(JSON.parse(stored) as Record<string, unknown>));
            } catch {
              /* ignore */
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMounted(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleCustom = (e: CustomEvent<AdminSettings>) => {
      setSettings((prev) => patchAdminSettings(prev, e.detail));
    };
    window.addEventListener("admin_settings_updated", handleCustom as EventListener);
    return () => {
      window.removeEventListener("admin_settings_updated", handleCustom as EventListener);
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AdminSettings>) => {
    setSettings((prev) => {
      const next = patchAdminSettings(prev, newSettings);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("admin_settings_updated", { detail: next }));
        fetch("/api/admin/settings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  return { settings: mounted ? settings : DEFAULT_SETTINGS, updateSettings };
}
