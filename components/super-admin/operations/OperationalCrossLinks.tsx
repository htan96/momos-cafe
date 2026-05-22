import Link from "next/link";

import type { OperationalIncidentContext } from "./operationalIncidentContext";

type Props = {
  context: OperationalIncidentContext;
  className?: string;
};

/**
 * Renders canned scenario copy plus grouped chips for related consoles / runbook paths (repo-relative markdown).
 */
export default function OperationalCrossLinks({ context, className = "" }: Props) {
  const { scenario, groups } = context;
  if (!scenario && groups.length === 0) return null;

  return (
    <div className={`rounded-xl border border-cream-dark/50 bg-white/90 px-4 py-3 shadow-sm space-y-3 ${className}`}>
      {scenario ?
        <p className="text-[13px] text-charcoal/80 leading-snug">
          <span className="font-semibold text-charcoal">Operator path.</span> {scenario}
        </p>
      : null}

      {groups.map((g) => (
        <div key={g.heading}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45 mb-2">{g.heading}</p>
          <ul className="flex flex-wrap gap-2">
            {g.items.map((item) => (
              <li key={`${g.heading}-${item.label}`}>
                {item.kind === "repo_doc" ?
                  <span
                    className="inline-flex max-w-full items-center rounded-lg border border-dashed border-cream-dark/55 bg-cream-mid/10 px-2.5 py-1 text-[12px] font-semibold text-charcoal/75"
                    title={item.hint}
                  >
                    <span className="mr-1.5">{item.label}</span>
                    <code className="font-mono text-[11px] font-normal text-charcoal/60 break-all">{item.repoPath}</code>
                  </span>
                : <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className="inline-flex max-w-full items-center rounded-lg border border-cream-dark/60 bg-cream-mid/15 px-2.5 py-1 text-[12px] font-semibold text-charcoal/85 shadow-sm transition hover:bg-cream-mid/35"
                    title={item.hint}
                  >
                    {item.label}
                  </Link>
                }
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
