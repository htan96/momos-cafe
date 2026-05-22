import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Lightweight queue row — creamsicle admin styling by default (`theme="admin"`).
 * Dark variant preserved for transitional ops palette reuse.
 */
export default function OperationalQueueCard({
  title,
  subtitle,
  href,
  meta,
  chips,
  theme = "admin",
}: {
  title: string;
  subtitle?: string;
  href: string;
  meta?: ReactNode;
  chips?: ReactNode;
  theme?: "admin" | "dark";
}) {
  const shell =
    theme === "dark" ?
      "block rounded-lg border border-[#3d3830] bg-[#252119] hover:border-[#2f6d66]/50 transition-colors p-3"
    : "block rounded-xl border border-cream-dark/70 bg-white/90 hover:border-teal-dark/35 transition-colors p-4 shadow-[0_1px_2px_rgb(41_53_61/0.04)]";

  const titleCn =
    theme === "dark" ? "text-[13px] font-semibold text-[#f5e5c0]" : "font-display text-[15px] text-teal-dark";
  const subtitleCn =
    theme === "dark" ? "text-[12px] text-[#c9bba8]/85 mt-0.5" : "text-[12px] text-charcoal/70 mt-1";
  const metaCn = theme === "dark" ? "text-[11px] text-[#c9bba8]/70 shrink-0" : "text-[11px] text-charcoal/50 shrink-0";

  return (
    <Link href={href} className={shell}>
      <div className="flex justify-between gap-3 items-start">
        <div className="min-w-0">
          <p className={titleCn}>{title}</p>
          {subtitle ? <p className={subtitleCn}>{subtitle}</p> : null}
        </div>
        {meta ? <div className={metaCn}>{meta}</div> : null}
      </div>
      {chips ? <div className="mt-2 flex flex-wrap gap-1.5">{chips}</div> : null}
    </Link>
  );
}
