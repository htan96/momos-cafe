"use client";

import type { ReactNode } from "react";

interface CommerceSectionHeaderProps {
  kicker?: string;
  title: ReactNode;
  aside?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

export default function CommerceSectionHeader({
  kicker = "Menu",
  title,
  aside,
  subtitle,
  className = "",
}: CommerceSectionHeaderProps) {
  return (
    <div className={`flex flex-col gap-1 mb-5 ${className}`}>
      {kicker && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark">{kicker}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="font-display text-2xl md:text-[clamp(26px,3.8vw,36px)] text-charcoal leading-tight">
          {title}
        </h2>
        <span className="hidden md:block flex-1 h-0.5 bg-gradient-to-r from-gold to-transparent min-w-[32px]" />
        {aside}
      </div>
      {subtitle && <div className="text-sm text-charcoal/60 max-w-2xl">{subtitle}</div>}
    </div>
  );
}
