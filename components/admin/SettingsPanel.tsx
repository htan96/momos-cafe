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

export type SettingsPanelProps = {
  /** Overrides the card title (e.g. when embedded under a governance page header). */
  panelTitle?: string;
  /** Overrides the lead sentence under the title. */
  panelDescription?: string;
};

export default function SettingsPanel({
  panelTitle = "Site Settings",
  panelDescription = "Changes save automatically and apply across the site.",
}: SettingsPanelProps = {}) {
  const { settings, updateSettings } = useAdminSettings();

  const handleChange = <K extends keyof AdminSettings>(
    key: K,
    value: AdminSettings[K]
  ) => {
    updateSettings({ [key]: value });
  };

  const handleBizLocChange = <K extends keyof AdminSettings["businessLocation"]>(
    field: K,
    value: AdminSettings["businessLocation"][K]
  ) => {
    updateSettings({
      businessLocation: {
        ...settings.businessLocation,
        [field]: value,
      },
    });
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
      <h2 className="font-display text-xl text-charcoal mb-4">{panelTitle}</h2>
      <p className="text-sm text-gray-mid mb-6">{panelDescription}</p>

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
        {/* Business location — storefront, maps, pickup copy, Shippo ship-from */}
        <div>
          <h3 className="font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-4">
            Business location
          </h3>
          <p className="text-sm text-gray-mid mb-4">
            Single source of truth for address on the site, Google/Apple Maps links, and carrier shipping
            origin (Shippo). Use E.164 phone so labels and APIs validate cleanly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-charcoal">
              Display name
              <input
                type="text"
                value={settings.businessLocation.displayName}
                onChange={(e) => handleBizLocChange("displayName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-charcoal">
              Country (ISO, e.g. US)
              <input
                type="text"
                value={settings.businessLocation.country}
                onChange={(e) => handleBizLocChange("country", e.target.value.toUpperCase().slice(0, 2))}
                className={inputClass}
                maxLength={2}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-charcoal sm:col-span-2">
              Street line 1
              <input
                type="text"
                value={settings.businessLocation.street1}
                onChange={(e) => handleBizLocChange("street1", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-charcoal sm:col-span-2">
              Street line 2 (optional)
              <input
                type="text"
                value={settings.businessLocation.street2 ?? ""}
                onChange={(e) => handleBizLocChange("street2", e.target.value || undefined)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-charcoal">
              City
              <input
                type="text"
                value={settings.businessLocation.city}
                onChange={(e) => handleBizLocChange("city", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-charcoal">
              State / Province
              <input
                type="text"
                value={settings.businessLocation.state}
                onChange={(e) => handleBizLocChange("state", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-charcoal">
              Postal code
              <input
                type="text"
                value={settings.businessLocation.postalCode}
                onChange={(e) => handleBizLocChange("postalCode", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-charcoal">
              Phone (display)
              <input
                type="text"
                value={settings.businessLocation.phoneDisplay ?? ""}
                onChange={(e) => handleBizLocChange("phoneDisplay", e.target.value || undefined)}
                className={inputClass}
                placeholder="(707) 654-7180"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-charcoal sm:col-span-2">
              Phone (E.164 for carriers)
              <input
                type="text"
                value={settings.businessLocation.phoneE164 ?? ""}
                onChange={(e) => handleBizLocChange("phoneE164", e.target.value || undefined)}
                className={inputClass}
                placeholder="+17076547180"
              />
            </label>
          </div>
        </div>

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
              Kitchen open (optional override)
              <input
                type="time"
                value={ordering.openingTime ?? ""}
                onChange={(e) =>
                  orderingRulePatch({
                    openingTime: e.target.value.trim() || undefined,
                  })
                }
                className={`${inputClass} w-full mt-1`}
              />
              <span className="block mt-1 text-[10px] text-charcoal/45 font-normal normal-case leading-snug">
                When set with closing time, replaces posted open time on each non-closed day for kitchen scheduling
                only.
              </span>
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
              Kitchen close (optional override)
              <input
                type="time"
                value={ordering.closingTime ?? ""}
                onChange={(e) =>
                  orderingRulePatch({
                    closingTime: e.target.value.trim() || undefined,
                  })
                }
                className={`${inputClass} w-full mt-1`}
              />
              <span className="block mt-1 text-[10px] text-charcoal/45 font-normal normal-case leading-snug">
                Pair with open override; leave blank to use each day&apos;s hours above.
              </span>
            </label>
          </div>
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
            <label className="flex flex-col sm:col-span-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal/55">
              Restaurant IANA timezone
              <input
                type="text"
                value={ordering.restaurantTimeZone}
                onChange={(e) =>
                  orderingRulePatch({
                    restaurantTimeZone:
                      e.target.value.trim().length > 2
                        ? e.target.value.trim()
                        : DEFAULT_ORDERING_RULES.restaurantTimeZone,
                  })
                }
                placeholder="America/Los_Angeles"
                className={`${inputClass} w-full mt-1 font-normal normal-case`}
              />
            </label>
          </div>
          <p className="text-xs text-charcoal/55 leading-relaxed mb-0">
            Food pickup stays <strong className="text-charcoal font-semibold">same-day</strong> only — last-order
            cutoff and prep lead apply until close. Guests can always browse; kitchen items reconcile at checkout.
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
