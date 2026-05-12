"use client";

import type { ReactNode } from "react";

export type CommerceBadgeTone = "tealOutline" | "gold" | "danger" | "charcoal";

const toneClasses: Record<CommerceBadgeTone, string> = {
  tealOutline:
    "rounded-full bg-white/93 backdrop-blur-sm px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-dark shadow-sm ring-1 ring-white/60",
  gold: "rounded-full bg-gold/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-charcoal shadow-sm",
  danger:
    "rounded bg-red px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm",
  charcoal:
    "rounded bg-charcoal/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white",
};

interface CommerceBadgeProps {
  tone: CommerceBadgeTone;
  children: ReactNode;
  className?: string;
}

export default function CommerceBadge({ tone, children, className = "" }: CommerceBadgeProps) {
  return (
    <span className={`${toneClasses[tone]} ${className}`.trim()}>
      {children}
    </span>
  );
}
