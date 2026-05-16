import Link from "next/link";
import type { CateringInquiry } from "@prisma/client";
import {
  CATERING_INQUIRY_STATUS_LABELS,
  CATERING_INQUIRY_STATUS_VALUES,
} from "@/lib/catering/cateringInquiryStatus";
import type { CateringInquiryStatus } from "@prisma/client";

export default function CateringInquiriesTable({
  rows,
  basePath,
  activeStatus,
}: {
  rows: CateringInquiry[];
  basePath: string;
  activeStatus: CateringInquiryStatus | null;
}) {
  const chips: { href: string; label: string; value: CateringInquiryStatus | null }[] = [
    { href: basePath, label: "All", value: null },
    ...CATERING_INQUIRY_STATUS_VALUES.map((s) => ({
      href: `${basePath}?status=${encodeURIComponent(s)}`,
      label: CATERING_INQUIRY_STATUS_LABELS[s],
      value: s,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const on = c.value === null ? activeStatus === null : activeStatus === c.value;
          return (
            <Link
              key={c.href}
              href={c.href}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                on
                  ? "border-teal-dark bg-teal-dark text-white"
                  : "border-cream-dark bg-white text-charcoal hover:bg-cream/60"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-cream-dark bg-cream/40 text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
            <tr>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Guests</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-dark/80">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-charcoal/55">
                  No inquiries match this filter.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-cream/25">
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal/80">
                    {r.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-cream px-2 py-0.5 text-xs font-medium text-charcoal">
                      {CATERING_INQUIRY_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${basePath}/${r.id}`}
                      className="font-medium text-teal-dark hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="text-xs text-charcoal/55">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-charcoal/80">
                    <div>{r.eventDate}</div>
                    {r.eventType ? (
                      <div className="text-xs text-charcoal/50">{r.eventType}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-charcoal/80">{r.guestCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
