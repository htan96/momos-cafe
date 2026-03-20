"use client";

import { useEffect, useState, useCallback } from "react";

export type DayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

export type WeeklyHours = Record<DayKey, DayHours>;

export const DAY_ORDER: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DEFAULT_DAY: DayHours = {
  open: "08:00",
  close: "16:00",
  closed: false,
};

const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  sunday: { ...DEFAULT_DAY },
  monday: { ...DEFAULT_DAY },
  tuesday: { ...DEFAULT_DAY },
  wednesday: { ...DEFAULT_DAY },
  thursday: { ...DEFAULT_DAY },
  friday: { ...DEFAULT_DAY },
  saturday: { ...DEFAULT_DAY },
};

export type AdminSettings = {
  weeklyHours: WeeklyHours;
  locationNote: string;
  deliveryComingSoon: boolean;
  isShopUnlocked: boolean;
  isOrderingOpen: boolean;
  isCateringOpen: boolean;
};

export const DEFAULT_SETTINGS: AdminSettings = {
  weeklyHours: { ...DEFAULT_WEEKLY_HOURS },
  locationNote:
    "Currently serving from Morgen's Kitchen (patio seating available)",
  deliveryComingSoon: true,
  isShopUnlocked: false,
  isOrderingOpen: true,
  isCateringOpen: true,
};

/** Derived from weekly hours: true if today is not marked closed */
export function getIsOpenToday(weeklyHours: WeeklyHours): boolean {
  const today = getTodayKey();
  const day = weeklyHours[today];
  return !day?.closed;
}

export function formatTimeForDisplay(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const isPM = h >= 12;
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = isPM ? "PM" : "AM";
  const mins = m ? `:${m.toString().padStart(2, "0")}` : "";
  return `${hour12}${mins} ${ampm}`;
}

export function formatDayHours(day: DayHours): string {
  if (day.closed) return "Closed";
  return `${formatTimeForDisplay(day.open)} – ${formatTimeForDisplay(day.close)}`;
}

export function getHoursSummary(weeklyHours: WeeklyHours): string {
  const formatted = DAY_ORDER.map((k) => formatDayHours(weeklyHours[k]));
  const unique = [...new Set(formatted)];
  if (unique.length === 1 && unique[0] === "Closed") return "Closed";
  if (unique.length === 1) return unique[0];
  return "Hours vary";
}

export function getTodayKey(): DayKey {
  return DAY_ORDER[new Date().getDay()];
}

export type OrderingStatus = {
  canAccept: boolean;
  closedMessage?: string;
};

/** Convert "HH:mm" to minutes since midnight. Returns 0 for invalid input. */
function timeToMinutes(time: string): number {
  if (!time || typeof time !== "string") return 0;
  const parts = time.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/**
 * Determines if online ordering is allowed.
 * Blocked by: admin toggle, closed day, or 15 min before closing.
 */
export function getOrderingStatus(settings: AdminSettings): OrderingStatus {
  if (!settings?.isOrderingOpen) {
    return {
      canAccept: false,
      closedMessage: "Online ordering is currently unavailable",
    };
  }

  const today = getTodayKey();
  const todayHours = settings.weeklyHours?.[today];
  if (!todayHours || todayHours.closed) {
    return {
      canAccept: false,
      closedMessage: "Online ordering is currently unavailable",
    };
  }

  const closingMinutes = timeToMinutes(todayHours.close);
  const cutoffMinutes = Math.max(0, closingMinutes - 15);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const isBeforeCutoff = currentMinutes < cutoffMinutes;
  if (!isBeforeCutoff) {
    return {
      canAccept: false,
      closedMessage: "Online ordering is closed for today. We reopen tomorrow.",
    };
  }

  return { canAccept: true };
}

const STORAGE_KEY = "admin_settings";

function migrateStorage(parsed: Record<string, unknown>): AdminSettings {
  const { isOpenToday: _removed, ...rest } = parsed;
  const base = { ...DEFAULT_SETTINGS, ...rest };
  if (base.weeklyHours && typeof base.weeklyHours === "object") {
    return base as AdminSettings;
  }
  return {
    ...base,
    weeklyHours: { ...DEFAULT_WEEKLY_HOURS },
  } as AdminSettings;
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  // Fetch from Supabase on mount; fallback to localStorage if API returns null
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setSettings(migrateStorage(data as Record<string, unknown>));
        } else {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as Record<string, unknown>;
              setSettings(migrateStorage(parsed));
            } catch {
              // ignore
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMounted(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleCustom = (e: CustomEvent<AdminSettings>) => {
      setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...e.detail }));
    };
    window.addEventListener(
      "admin_settings_updated",
      handleCustom as EventListener
    );
    return () => {
      window.removeEventListener(
        "admin_settings_updated",
        handleCustom as EventListener
      );
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AdminSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent("admin_settings_updated", { detail: next })
        );
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  return { settings: mounted ? settings : DEFAULT_SETTINGS, updateSettings };
}
