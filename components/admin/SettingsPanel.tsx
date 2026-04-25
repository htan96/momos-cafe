"use client";

import {
  useAdminSettings,
  type AdminSettings,
  type DayKey,
  DAY_ORDER,
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
