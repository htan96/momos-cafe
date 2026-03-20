"use client";

import {
  useAdminSettings,
  DEFAULT_SETTINGS,
  getHoursSummary,
  getIsOpenToday,
} from "@/lib/useAdminSettings";

export default function LocationBlockHeader() {
  const { settings } = useAdminSettings();
  const locationNote =
    settings?.locationNote ?? DEFAULT_SETTINGS.locationNote;
  const weeklyHours = settings?.weeklyHours ?? DEFAULT_SETTINGS.weeklyHours;
  const isOpenToday = getIsOpenToday(weeklyHours);
  const hoursSummary = getHoursSummary(weeklyHours);

  return (
    <div className="text-center mb-12">
      <span className="font-semibold text-[11px] tracking-[0.3em] uppercase text-teal block">
        Current Location
      </span>
      <div className="flex items-center gap-4 my-2 max-w-[200px] mx-auto">
        <div className="flex-1 h-[1.5px] bg-gold" />
        <div className="flex-1 h-[1.5px] bg-gold" />
      </div>
      <h2 className="font-display text-[clamp(38px,6vw,64px)] leading-none text-charcoal mt-2 mb-3">
        We&apos;re at Morgen&apos;s Kitchen
      </h2>
      <p className="text-base text-charcoal/65 max-w-[500px] mx-auto leading-relaxed">
        {locationNote}
      </p>
      <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
        <div
          className={`inline-flex items-center gap-1.5 font-semibold text-[11px] tracking-wider uppercase py-1.5 px-3.5 rounded-full ${
            isOpenToday
              ? "text-[#2d7a2d] bg-[#2d7a2d]/10"
              : "text-charcoal/50 bg-charcoal/5"
          }`}
        >
          {isOpenToday && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a2d] animate-pulse" />
          )}
          {isOpenToday ? "Open Today" : "Closed Today"}
        </div>
        <span className="text-sm text-charcoal/60 font-medium">
          {hoursSummary === "Hours vary" || hoursSummary === "Closed"
            ? hoursSummary
            : `${hoursSummary} daily`}
        </span>
      </div>
    </div>
  );
}
