"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useAdminSettings,
  DEFAULT_SETTINGS,
  getIsOpenToday,
} from "@/lib/useAdminSettings";

export default function StickyBar() {
  const [visible, setVisible] = useState(false);
  const { settings } = useAdminSettings();
  const weeklyHours = settings?.weeklyHours ?? DEFAULT_SETTINGS.weeklyHours;
  const isOpenToday = getIsOpenToday(settings);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed left-0 right-0 z-[650] bg-red px-5 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        visible ? "translate-y-0" : "translate-y-full"
      } bottom-14 lg:bottom-0`}
    >
      <div className="font-medium text-sm tracking-wide text-white/85 flex items-center gap-3">
        <strong className="text-white text-base">Momo&apos;s Café</strong>
        <span>— Ready in 15 min</span>
        <span
          className={`text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded ${
            isOpenToday ? "bg-white/25 text-white" : "bg-white/10 text-white/80"
          }`}
        >
          {isOpenToday ? "Open Today" : "Closed Today"}
        </span>
      </div>
      <Link
        href="/menu"
        className="bg-cream text-red font-semibold text-sm tracking-wider uppercase py-2.5 px-5 rounded-lg hover:bg-white transition-colors"
      >
        Order Now
      </Link>
    </div>
  );
}
