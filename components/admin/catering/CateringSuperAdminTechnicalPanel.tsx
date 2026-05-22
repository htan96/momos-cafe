/** Visible only alongside `showSuperAdminOperationalLens` — raw loader diagnostics for CateringInquiry merges. */

export default function CateringSuperAdminTechnicalPanel({
  prismaRowCount,
  distinctInquiryCount,
}: {
  prismaRowCount: number;
  distinctInquiryCount: number;
}) {
  const collisions = prismaRowCount - distinctInquiryCount;

  return (
    <section className="rounded-xl border border-dashed border-charcoal/[0.12] bg-charcoal/[0.02] p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/50">
        Super-admin · intake telemetry
      </h3>
      <dl className="mt-4 grid gap-3 text-[12px] sm:grid-cols-3">
        <div>
          <dt className="text-[11px] text-charcoal/45">Recent Prisma rows</dt>
          <dd className="mt-1 font-mono text-charcoal/85">{prismaRowCount}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-charcoal/45">Unique inquiry ids surfaced</dt>
          <dd className="mt-1 font-mono text-charcoal/85">{distinctInquiryCount}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-charcoal/45">Collapsed duplicate ids</dt>
          <dd className="mt-1 font-mono text-charcoal/85">
            {collisions > 0 ? collisions : "0"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-charcoal/45 leading-snug">
        Cards always key by CateringInquiry id. When Prisma payloads repeat the same id, the lane shows a folded ×
        badge so SSR remains stable across legacy joins.
      </p>
    </section>
  );
}
