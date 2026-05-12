/**
 * Admin settings persisted in Postgres `admin_settings.data` JSON (singleton row).
 * Shared by storefront, ops UI, and server routes — no React / "use client".
 */

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

/**
 * Scheduling / kitchen throughput — tune in Ops → Settings → Ordering rules.
 * Future: holidays / blackouts (see holidaysBlackoutTodo in ordering module).
 */
export type OrderingRules = {
  minimumPrepLeadMinutes: number;
  /** Last instant customers can choose same-day fulfillment = close − this many minutes. */
  lastOrderCutoffMinutes: number;
  pickupIntervalMinutes: number;
  /**
   * Ignored for food — kitchen pickup stays same-calendar-day only.
   * Retained for legacy JSON and non-food tooling.
   */
  enableFutureOrdering: boolean;
  maxFutureOrderDays: number;
  restaurantTimeZone: string;
  /**
   * Optional `HH:mm` pair — when both are non-empty, replaces `open` / `close` on every
   * **non-closed** day in `weeklyHours` for kitchen scheduling (cutoff, prep, slots).
   */
  openingTime?: string;
  closingTime?: string;
};

export const DEFAULT_ORDERING_RULES: OrderingRules = {
  minimumPrepLeadMinutes: 60,
  lastOrderCutoffMinutes: 30,
  pickupIntervalMinutes: 15,
  /** Legacy field — storefront policy uses same-day kitchen windows only (see ordering module). */
  enableFutureOrdering: false,
  maxFutureOrderDays: 7,
  restaurantTimeZone: "America/Los_Angeles",
};

export type AdminSettings = {
  weeklyHours: WeeklyHours;
  locationNote: string;
  deliveryComingSoon: boolean;
  isShopUnlocked: boolean;
  isOrderingOpen: boolean;
  isCateringOpen: boolean;
  orderingRules?: Partial<OrderingRules>;
};

export const DEFAULT_SETTINGS: AdminSettings = {
  weeklyHours: { ...DEFAULT_WEEKLY_HOURS },
  locationNote:
    "Currently serving from Morgen's Kitchen (patio seating available)",
  deliveryComingSoon: true,
  isShopUnlocked: false,
  isOrderingOpen: true,
  isCateringOpen: true,
  orderingRules: { ...DEFAULT_ORDERING_RULES },
};

export function resolveOrderingRules(
  partial?: Partial<OrderingRules>
): OrderingRules {
  return { ...DEFAULT_ORDERING_RULES, ...partial };
}

/** Applies optional `orderingRules.openingTime` / `closingTime` overrides for a single day row. */
export function resolveDayHoursForOrdering(
  day: DayHours,
  rules: OrderingRules
): DayHours {
  if (day.closed) return day;
  const o = rules.openingTime?.trim();
  const c = rules.closingTime?.trim();
  if (o && c) {
    return { ...day, open: o, close: c };
  }
  return day;
}

export function resolveWeeklyHoursForOrdering(
  weeklyHours: WeeklyHours,
  orderingRulesPartial?: Partial<OrderingRules>
): WeeklyHours {
  const rules = resolveOrderingRules(orderingRulesPartial);
  const next = {} as WeeklyHours;
  for (const k of DAY_ORDER) {
    next[k] = resolveDayHoursForOrdering(weeklyHours[k]!, rules);
  }
  return next;
}

export function normalizeAdminSettingsJson(
  parsed: Record<string, unknown>
): AdminSettings {
  const { isOpenToday: _removed, ...rest } = parsed;
  const base = { ...DEFAULT_SETTINGS, ...rest } as AdminSettings;
  if (!base.orderingRules || typeof base.orderingRules !== "object") {
    base.orderingRules = { ...DEFAULT_ORDERING_RULES };
  } else {
    base.orderingRules = resolveOrderingRules(
      base.orderingRules as Partial<OrderingRules>
    );
  }
  if (base.weeklyHours && typeof base.weeklyHours === "object") {
    return base;
  }
  return {
    ...base,
    weeklyHours: { ...DEFAULT_WEEKLY_HOURS },
    orderingRules: resolveOrderingRules(
      base.orderingRules as Partial<OrderingRules> | undefined
    ),
  };
}

export function patchAdminSettings(
  prev: AdminSettings,
  partial: Partial<AdminSettings>
): AdminSettings {
  const next = { ...prev, ...partial } as AdminSettings;
  next.orderingRules = resolveOrderingRules({
    ...(prev.orderingRules as Partial<OrderingRules> | undefined),
    ...(partial.orderingRules as Partial<OrderingRules> | undefined),
  });
  if (partial.weeklyHours && typeof partial.weeklyHours === "object") {
    next.weeklyHours = partial.weeklyHours;
  }
  return next;
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
