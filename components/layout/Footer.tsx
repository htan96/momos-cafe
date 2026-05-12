"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useAdminSettings,
  DEFAULT_SETTINGS,
  getHoursSummary,
  getTodayKey,
  formatDayHours,
} from "@/lib/useAdminSettings";
import { useMapsUrl } from "@/lib/mapsUrl";
import {
  businessPhoneDisplay,
  businessPhoneTelHref,
  formatBusinessAddressShort,
} from "@/lib/businessLocation";

const FOOTER_NAV = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/catering", label: "Catering" },
  { href: "/find-us", label: "Find Us" },
  { href: "/our-story", label: "Our Story" },
  { href: "/shop", label: "Shop" },
];

export default function Footer() {
  const { settings } = useAdminSettings();
  const mapsUrl = useMapsUrl();
  const loc = settings?.businessLocation ?? DEFAULT_SETTINGS.businessLocation;
  const weeklyHours = settings?.weeklyHours ?? DEFAULT_SETTINGS.weeklyHours;
  const todayKey = getTodayKey(settings);
  const todayHours = weeklyHours[todayKey];
  const hoursSummary = getHoursSummary(weeklyHours);

  return (
    <footer className="bg-cream-mid border-t border-cream-dark">
      <div className="max-w-[1140px] mx-auto px-5 py-12 sm:py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8 lg:gap-10">
          {/* Column 1 — Brand */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <Link href="/" className="mb-3 hover:opacity-90 transition-opacity">
              <Image
                src="/images/logo.png"
                alt="Momo's Café"
                width={140}
                height={70}
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-[13px] text-charcoal/65 leading-relaxed max-w-[220px]">
              Fresh, made-to-order breakfast &amp; lunch in Vallejo
            </p>
          </div>

          {/* Column 2 — Navigation */}
          <div>
            <h5 className="font-semibold text-[11px] tracking-[0.2em] uppercase text-teal-dark mb-4">
              Navigate
            </h5>
            <ul className="space-y-2.5">
              {FOOTER_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-charcoal/75 hover:text-teal-dark hover:underline underline-offset-2 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Contact */}
          <div>
            <h5 className="font-semibold text-[11px] tracking-[0.2em] uppercase text-teal-dark mb-4">
              Contact
            </h5>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={businessPhoneTelHref(loc)}
                  className="text-[14px] text-charcoal/75 hover:text-teal-dark hover:underline underline-offset-2 transition-colors duration-200"
                >
                  {businessPhoneDisplay(loc)}
                </a>
              </li>
              <li>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] text-charcoal/75 hover:text-teal-dark hover:underline underline-offset-2 transition-colors duration-200"
                >
                  {formatBusinessAddressShort(loc)}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 — Ordering */}
          <div>
            <h5 className="font-semibold text-[11px] tracking-[0.2em] uppercase text-teal-dark mb-4">
              Ordering
            </h5>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/order"
                  className="text-[14px] font-semibold text-red hover:text-red/90 hover:underline underline-offset-2 transition-colors duration-200"
                >
                  Order Online
                </Link>
              </li>
              <li className="text-[14px] text-charcoal/65">
                Pickup at Morgen&apos;s Kitchen
              </li>
              <li className="text-[13px] text-charcoal/55">
                {hoursSummary === "Hours vary" ? (
                  <span>
                    Today: {todayHours ? formatDayHours(todayHours) : "—"}
                  </span>
                ) : (
                  <span>{hoursSummary}</span>
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-cream-dark flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-charcoal/45">
            © {new Date().getFullYear()} Momo&apos;s Café Vallejo. All rights reserved.
          </p>
          <div className="font-display text-[11px] text-charcoal/35 tracking-[0.15em]">
            VALLEJO · BAY AREA · EST. 2000
          </div>
        </div>
      </div>
    </footer>
  );
}
