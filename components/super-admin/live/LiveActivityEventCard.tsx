"use client";

import Link from "next/link";
import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";
import { formatAbsoluteTimestamp, formatRelativeTimestamp } from "@/lib/liveActivity/formatActivityTime";
import type { LiveActivityEvent } from "@/lib/liveActivity/types";

function severityPillVariant(sev: LiveActivityEvent["severity"]): StatusPillVariant {
  switch (sev) {
    case "info":
    case "notice":
      return "neutral";
    case "warning":
      return "warning";
    case "error":
      return "degraded";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

function severityBorderClass(sev: LiveActivityEvent["severity"]): string {
  switch (sev) {
    case "critical":
      return "border-l-red-dark";
    case "error":
      return "border-l-amber-700";
    case "warning":
      return "border-l-amber-400";
    default:
      return "border-l-charcoal/15";
  }
}

type Props = {
  event: LiveActivityEvent;
};

export default function LiveActivityEventCard({ event }: Props) {
  return (
    <li
      className={`border-l-4 ${severityBorderClass(event.severity)} py-4 first:pt-0 pl-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4`}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <time
            dateTime={event.occurredAt}
            title={formatAbsoluteTimestamp(event.occurredAt)}
            className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
          >
            {formatRelativeTimestamp(event.occurredAt)}
          </time>
          <StatusPill variant={severityPillVariant(event.severity)}>{event.severity}</StatusPill>
          <span className="text-[11px] font-mono text-charcoal/55 break-all">{event.subtype}</span>
          {event.incidentIds?.length ? (
            <Link href="/super-admin/incidents">
              <StatusPill variant="degraded">Incident linked</StatusPill>
            </Link>
          ) : null}
        </div>
        <p className="text-[13px] text-charcoal leading-snug">{event.summary}</p>
        {event.actorLabel ? (
          <p className="text-[12px] text-charcoal/55 leading-relaxed">{event.actorLabel}</p>
        ) : null}
        {event.jumpLinks && event.jumpLinks.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {event.jumpLinks.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
