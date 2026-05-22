import Link from "next/link";

export type OperationalBreadcrumbSegment = {
  label: string;
  href?: string;
};

type Props = {
  segments: OperationalBreadcrumbSegment[];
  className?: string;
};

/**
 * Lightweight wayfinding for Operations consoles — renders above {@link GovPageHeader} where adopted.
 */
export default function OperationalBreadcrumbs({ segments, className = "" }: Props) {
  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`text-[11px] text-charcoal/55 ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {segments.map((seg, i) => {
          const last = i === segments.length - 1;
          return (
            <li key={`${seg.label}-${i}`} className="inline-flex items-center gap-1.5">
              {i > 0 ? <span className="text-charcoal/35" aria-hidden>/</span> : null}
              {seg.href && !last ?
                <Link href={seg.href} className="font-semibold text-teal-dark/90 hover:underline">
                  {seg.label}
                </Link>
              : <span className={last ? "font-semibold text-charcoal/70" : "font-semibold"}>{seg.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
