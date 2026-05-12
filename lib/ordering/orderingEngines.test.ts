import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";

import type { WeeklyHours } from "@/lib/adminSettings.model";
import { DEFAULT_ORDERING_RULES } from "@/lib/adminSettings.model";
import { generatePickupWindows } from "@/lib/ordering/generatePickupWindows";
import { getNextAvailablePickupTime } from "@/lib/ordering/getNextAvailablePickupTime";

const TZ = "America/Los_Angeles";

function zonedUtc(y: number, m: number, d: number, h: number, min = 0) {
  return DateTime.fromObject({ year: y, month: m, day: d, hour: h, minute: min }, { zone: TZ }).toUTC().toJSDate();
}

const openWeek: WeeklyHours = {
  sunday: { open: "08:00", close: "16:00", closed: false },
  monday: { open: "08:00", close: "16:00", closed: false },
  tuesday: { open: "08:00", close: "16:00", closed: false },
  wednesday: { open: "08:00", close: "16:00", closed: false },
  thursday: { open: "08:00", close: "16:00", closed: false },
  friday: { open: "08:00", close: "16:00", closed: false },
  saturday: { open: "08:00", close: "16:00", closed: false },
};

describe("getNextAvailablePickupTime", () => {
  /** Scenario A — mid-shift Tuesday: aligns to Ops interval after prep lead */
  it("scenario A snaps to pickupInterval after minimum lead inside open hours", () => {
    const now = zonedUtc(2026, 5, 12, 10, 0); // Tuesday
    const next = getNextAvailablePickupTime(now, openWeek, DEFAULT_ORDERING_RULES, 1);
    expect(next).not.toBeNull();
    const lt = DateTime.fromJSDate(next!, { zone: "utc" }).setZone(TZ);
    expect(lt.hour).toBeGreaterThanOrEqual(11);
    expect(lt.minute % DEFAULT_ORDERING_RULES.pickupIntervalMinutes).toBe(0);
  });

  /** Scenario B — Tuesday after same-day cutoff: rolls to Wednesday morning spacing */
  it("scenario B rolls past cutoff to next qualifying open day", () => {
    const now = zonedUtc(2026, 5, 12, 15, 45); // Tue 15:45 local, cutoff ~15:30
    const next = getNextAvailablePickupTime(now, openWeek, DEFAULT_ORDERING_RULES, 3);
    expect(next).not.toBeNull();
    const lt = DateTime.fromJSDate(next!, { zone: "utc" }).setZone(TZ);
    expect(lt.weekday).not.toBe(2); /* not Tue */
    expect([3, 4, 5, 6]).toContain(lt.weekday); /* Wed onward */
  });

  /** Scenario C — Sunday closed: skips to Monday */
  it("scenario C skips explicitly closed weekdays", () => {
    const week: WeeklyHours = {
      ...openWeek,
      sunday: { ...openWeek.sunday, closed: true },
    };
    const now = zonedUtc(2026, 5, 10, 9, 0); // Mother's day Sunday-ish — actual weekday depends; assert not Sunday slot */
    const next = getNextAvailablePickupTime(now, week, DEFAULT_ORDERING_RULES, 1);
    expect(next).not.toBeNull();
    const dow = DateTime.fromJSDate(next!, { zone: "utc" }).setZone(TZ).weekday;
    expect(dow).not.toBe(7); /* Luxon Sun */
  });

  /** Legacy capped horizon rejects multi-day hops */
  it("respects legacy maxFutureDaysOverride=0 (same calendar day horizon only)", () => {
    const now = zonedUtc(2026, 5, 12, 15, 59);
    const next = getNextAvailablePickupTime(
      now,
      openWeek,
      { ...DEFAULT_ORDERING_RULES, enableFutureOrdering: false },
      1,
      { maxFutureDaysOverride: 0 }
    );
    expect(next).toBeNull();
  });
});

describe("generatePickupWindows", () => {
  it("honors earliestPickupUtc floor and emits sorted slots", () => {
    const now = zonedUtc(2026, 5, 12, 9, 0);
    const earliest = getNextAvailablePickupTime(now, openWeek, DEFAULT_ORDERING_RULES, 5);
    expect(earliest).not.toBeNull();
    const slots = generatePickupWindows({
      nowUtc: now,
      earliestPickupUtc: earliest!,
      weeklyHours: openWeek,
      orderingRulesPartial: DEFAULT_ORDERING_RULES,
      limit: 12,
    });
    expect(slots.length).toBeGreaterThanOrEqual(1);
    expect(slots[0]!.pickupAtUtc.getTime()).toBeGreaterThanOrEqual(earliest!.getTime() - 1);
    const times = slots.map((s) => s.pickupAtUtc.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
