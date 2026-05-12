"use client";

import {
  useAdminSettings,
  type AdminSettings,
  type DayKey,
  DAY_ORDER,
  DEFAULT_ORDERING_RULES,
  resolveOrderingRules,
} from "@/lib/useAdminSettings";

const inputClass =
  "px-3.5 py-2.5 rounded-lg border-2 border-cream-dark bg-cream text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-teal";

export default function SettingsPanel() {
  const { settings, updateSettings } = useAdminSettings();

  const handleChange = <K extends keyof AdminSettings>(
    key: K,
    value: AdminSettings[K]
  ) => {
    updateSettings({ [key]: value });
  };

  const handleDayChange = (day: DayKey, field: keyof AdminSettings["weeklyHours"][DayKey], value: string | boolean) => {
    updateSettings({
      weeklyHours: {
        ...settings.weeklyHours,
        [day]: {
          ...settings.weeklyHours[day],
          [field]: value,
        },
      },
    });
  };

  const ordering = resolveOrderingRules(settings.orderingRules);

  const orderingRulePatch = (patch: Partial<typeof DEFAULT_ORDERING_RULES>) => {
    updateSettings({ orderingRules: patch });
  };

  return (
    <div className="bg-white border-2 border-cream-dark rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
      <h2 className="font-display text-xl text-charcoal mb-4">Site Settings</h2>
      <p className="text-sm text-gray-mid mb-6">
        Changes save automatically and apply across the site.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-cream-dark bg-cream px-4 py-3 mb-6">
        <span className="text-sm font-medium text-charcoal">
          Printer-ready menu (pulls live prices from Square)
        </span>
        <a
          href="/menu/print"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-red px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          View / Print Menu
        </a>
      </div>

      <div className="space-y-6">
        {/* Business Hours */}
        <div>
          <h3 className="font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-4">
            Business Hours
          </h3>
          <div className="space-y-4">
            {DAY_ORDER.map((day) => {
              const data = settings.weeklyHours[day];
              const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
              return (
                <div
                  key={day}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <div className="w-28 font-medium text-charcoal capitalize shrink-0">
                    {dayLabel}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <input
                      type="time"
                      value={data.open}
                      onChange={(e) => handleDayChange(day, "open", e.target.value)}
                      disabled={data.closed}
                      className={`${inputClass} w-full sm:w-28 disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                    <input
                      type="time"
                      value={data.close}
                      onChange={(e) => handleDayChange(day, "close", e.target.value)}
                      disabled={data.closed}
                      className={`${inputClass} w-full sm:w-28 disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                    <label className="flex items-center gap-2 shrink-0">
                      <input
                        type="checkbox"
                        checked={data.closed}
                        onChange={(e) =>
                          handleDayChange(day, "closed", e.target.checked)
                        }
                        className="w-5 h-5 rounded border-2 border-cream-dark text-teal focus:ring-teal"
                      />
                      <span className="font-medium text-charcoal text-sm">
                        Closed
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ordering rules */}
        <div>
          <h3 className="font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-4">
            Ordering Rules
          </h3>
          <p className="text-xs text-charcoal/60 mb-4 leading-relaxed">
            Uses <strong className="text-charcoal font-semibold">Business Hours</strong> above as kitchen pickup windows — no redeploy needed.{" "}
            {/* TODO(holidays/blackouts): add closed dates */}
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
              Min prep lead (minutes)
              <input
                type="number"
                min={15}
                max={720}
                value={ordering.minimumPrepLeadMinutes}
                onChange={(e) =>
                  orderingRulePatch({
                    minimumPrepLeadMinutes:
                      Number(e.target.value) || DEFAULT_ORDERING_RULES.minimumPrepLeadMinutes,
                  })
                }
                className={`${inputClass} w-full mt-1`}
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
              Last order cutoff (minutes before close)
              <input
                type="number"
                min={0}
                max={180}
                value={ordering.lastOrderCutoffMinutes}
                onChange={(e) =>
                  orderingRulePatch({
                    lastOrderCutoffMinutes:
                      Number(e.target.value) || DEFAULT_ORDERING_RULES.lastOrderCutoffMinutes,
                  })
                }
                className={`${inputClass} w-full mt-1`}
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
              Pickup slot interval (minutes)
              <input
                type="number"
                min={5}
                max={240}
                value={ordering.pickupIntervalMinutes}
                onChange={(e) =>
                  orderingRulePatch({
                    pickupIntervalMinutes:
                      Number(e.target.value) || DEFAULT_ORDERING_RULES.pickupIntervalMinutes,
                  })
                }
                className={`${inputClass} w-full mt-1`}
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
              Max days ahead customers can reserve
              <input
                type="number"
                min={0}
                max={30}
                value={ordering.maxFutureOrderDays}
                onChange={(e) =>
                  orderingRulePatch({
                    maxFutureOrderDays:
                      Number(e.target.value) ||
                      DEFAULT_ORDERING_RULES.maxFutureOrderDays,
                  })
                }
                className={`${inputClass} w-full mt-1`}
              />
            </label>
            <label className="flex flex-col sm:col-span-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
              Restaurant IANA timezone
              <input
                type="text"
                value={ordering.restaurantTimeZone}
                onChange={(e) =>
                  orderingRulePatch({
                    restaurantTimeZone: e.target.value.trim().length > 2
                      ? e.target.value.trim()
                      : DEFAULT_ORDERING_RULES.restaurantTimeZone,
                  })
                }
                placeholder="America/Los_Angeles"
                className={`${inputClass} w-full mt-1 font-normal normal-case`}
              />
            </label>
          </div>
          <div className="flex items-center gap-3 mb-2 opacity-60">
            <input
              id="future-ordering"
              type="checkbox"
              checked={ordering.enableFutureOrdering}
              disabled
              readOnly
              className="w-5 h-5 rounded border-2 border-cream-dark text-teal focus:ring-teal cursor-not-allowed"
            />
            <label htmlFor="future-ordering" className="font-medium text-charcoal text-sm">
              Future-dated food pickup (disabled — same-day kitchen windows only)
            </label>
          </div>
          <p className="text-xs text-charcoal/55 leading-relaxed">
            The storefront schedules food pickup only inside active Ops hours for the current day. Ops still uses lead
            time, cutoff, and slot spacing below.
          </p>
        </div>

        <div>
          <label
            htmlFor="location-note"
            className="block font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-1.5"
          >
            Location Note
          </label>
          <textarea
            id="location-note"
            value={settings.locationNote}
            onChange={(e) => handleChange("locationNote", e.target.value)}
            placeholder="e.g. Currently serving from Morgen's Kitchen"
            rows={3}
            className={`${inputClass} w-full resize-y`}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="ordering-open"
            type="checkbox"
            checked={settings.isOrderingOpen}
            onChange={(e) =>
              handleChange("isOrderingOpen", e.target.checked)
            }
            className="w-5 h-5 rounded border-2 border-cream-dark text-teal focus:ring-teal"
          />
          <label htmlFor="ordering-open" className="font-medium text-charcoal">
            Accepting Online Orders
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="catering-open"
            type="checkbox"
            checked={settings.isCateringOpen}
            onChange={(e) =>
              handleChange("isCateringOpen", e.target.checked)
            }
            className="w-5 h-5 rounded border-2 border-cream-dark text-teal focus:ring-teal"
          />
          <label htmlFor="catering-open" className="font-medium text-charcoal">
            Accepting Catering Requests
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="delivery-coming-soon"
            type="checkbox"
            checked={settings.deliveryComingSoon}
            onChange={(e) =>
              handleChange("deliveryComingSoon", e.target.checked)
            }
            className="w-5 h-5 rounded border-2 border-cream-dark text-teal focus:ring-teal"
          />
          <label
            htmlFor="delivery-coming-soon"
            className="font-medium text-charcoal"
          >
            Delivery Coming Soon (hide delivery option when unchecked)
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="shop-unlocked"
            type="checkbox"
            checked={settings.isShopUnlocked}
            onChange={(e) =>
              handleChange("isShopUnlocked", e.target.checked)
            }
            className="w-5 h-5 rounded border-2 border-cream-dark text-teal focus:ring-teal"
          />
          <label htmlFor="shop-unlocked" className="font-medium text-charcoal">
            Shop Unlocked (show full shop when checked)
          </label>
        </div>
      </div>
    </div>
  );
}
