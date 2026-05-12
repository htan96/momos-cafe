import Link from "next/link";
import type { ReactNode } from "react";

export default function OpsQueueCard({
  title,
  subtitle,
  href,
  meta,
  chips,
}: {
  title: string;
  subtitle?: string;
  href: string;
  meta?: ReactNode;
  chips?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-[#3d3830] bg-[#252119] hover:border-[#2f6d66]/50 transition-colors p-3"
    >
      <div className="flex justify-between gap-3 items-start">
        <div>
          <p className="text-[13px] font-semibold text-[#f5e5c0]">{title}</p>
          {subtitle ? <p className="text-[12px] text-[#c9bba8]/85 mt-0.5">{subtitle}</p> : null}
        </div>
        {meta ? <div className="text-[11px] text-[#c9bba8]/70 shrink-0">{meta}</div> : null}
      </div>
      {chips ? <div className="mt-2 flex flex-wrap gap-1">{chips}</div> : null}
    </Link>
  );
}
