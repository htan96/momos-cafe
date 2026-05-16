import Link from "next/link";
import { notFound } from "next/navigation";
import GovPageHeader from "@/components/governance/GovPageHeader";
import OperationalCard from "@/components/governance/OperationalCard";
import StatusPill from "@/components/governance/StatusPill";
import { CATERING_INQUIRY_STATUS_LABELS } from "@/lib/catering/cateringInquiryStatus";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function SuperAdminCateringInquiryDetailPage(props: PageProps) {
  const { id } = await props.params;
  if (!OPS_ENTITY_UUID_RE.test(id)) {
    notFound();
  }

  const inquiry = await prisma.cateringInquiry.findUnique({ where: { id } });
  if (!inquiry) {
    notFound();
  }

  const emailTrim = inquiry.email.trim();
  const linkedCustomer = emailTrim
    ? await prisma.customer.findFirst({
        where: { email: { equals: emailTrim, mode: "insensitive" } },
        select: { id: true },
      })
    : null;

  const statusLabel = CATERING_INQUIRY_STATUS_LABELS[inquiry.status] ?? inquiry.status;

  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Platform · Catering"
        title={`Inquiry · ${inquiry.id.slice(0, 8)}…`}
        subtitle="Web intake row from `catering_inquiries` — link-out uses email ↔ `customers.email` only when it resolves."
        actions={
          <Link
            href="/super-admin/live-operations"
            className="rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
          >
            Live operations
          </Link>
        }
      />

      <OperationalCard title="CRM handoff" meta="customers · optional match">
        {linkedCustomer ? (
          <p className="text-[13px] text-charcoal/75">
            <Link
              href={`/super-admin/customer-operations/${linkedCustomer.id}`}
              className="inline-flex rounded-lg border border-cream-dark/60 bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal/80 shadow-sm transition hover:bg-cream-mid/40"
            >
              Open customer operations
            </Link>
            <span className="block mt-2 text-[12px] text-charcoal/55">
              Matched <span className="font-mono">{emailTrim}</span> to a customer profile row.
            </span>
          </p>
        ) : (
          <p className="text-[13px] text-charcoal/60 leading-relaxed">
            No `customers` row with this inquiry email — provisioning or guest intake only.
          </p>
        )}
      </OperationalCard>

      <OperationalCard title="Inquiry" meta="catering_inquiries">
        <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Id</dt>
            <dd className="mt-1 font-mono text-[12px] text-charcoal/80 break-all">{inquiry.id}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Status</dt>
            <dd className="mt-1">
              <StatusPill variant="neutral">{statusLabel}</StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Created</dt>
            <dd className="mt-1 text-charcoal/80">
              {inquiry.createdAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Name</dt>
            <dd className="mt-1 text-charcoal/80">{inquiry.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Email</dt>
            <dd className="mt-1 text-charcoal/80 break-all">{inquiry.email}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Phone</dt>
            <dd className="mt-1 text-charcoal/80">{inquiry.phone}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Event date</dt>
            <dd className="mt-1 text-charcoal/80">{inquiry.eventDate}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Guests</dt>
            <dd className="mt-1 text-charcoal/80">{inquiry.guestCount}</dd>
          </div>
          {inquiry.eventType ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Event type</dt>
              <dd className="mt-1 text-charcoal/80">{inquiry.eventType}</dd>
            </div>
          ) : null}
          {inquiry.details ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">Details</dt>
              <dd className="mt-1 text-[13px] text-charcoal/75 whitespace-pre-wrap">{inquiry.details}</dd>
            </div>
          ) : null}
        </dl>
      </OperationalCard>
    </div>
  );
}
