import type { CateringInquiry } from "@prisma/client";

/**
 * Catering boards should surface one lane card per CateringInquiry id. If callers ever concatenate
 * multiple sources into one list, collapsing duplicate ids avoids duplicate React keys while the
 * optional count surfaces that the source list was sloppy.
 */
export function dedupeCateringInquiriesById(rows: CateringInquiry[]): {
  /** First occurrence preserved in original order */
  inquiries: CateringInquiry[];
  /** Including the first occurrence; used for collapsed ×N when > 1 */
  countById: Map<string, number>;
} {
  const countById = new Map<string, number>();
  for (const r of rows) {
    countById.set(r.id, (countById.get(r.id) ?? 0) + 1);
  }

  const inquiries: CateringInquiry[] = [];
  const placed = new Set<string>();
  for (const r of rows) {
    if (placed.has(r.id)) continue;
    placed.add(r.id);
    inquiries.push(r);
  }

  return { inquiries, countById };
}
