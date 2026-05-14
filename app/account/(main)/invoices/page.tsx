import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";
import InvoiceRow from "@/components/customer/InvoiceRow";
import { mockInvoices } from "@/lib/customer/mockAccount";

export default function AccountInvoicesPage() {
  const catering = mockInvoices.filter((i) => i.kind === "catering");
  const retail = mockInvoices.filter((i) => i.kind === "retail");

  return (
    <div className="space-y-10">
      <CustomerPageHeader
        eyebrow="Records"
        title="Invoices & receipts"
        subtitle="A hushed filing cabinet — catering retainers beside everyday shop delights."
        illustrationAccentClassName="bg-gold/20"
      />

      <nav aria-label="Invoice categories" className="-mt-2 flex flex-wrap gap-2">
        <a
          href="#catering-invoices"
          className="inline-flex rounded-full border border-gold/35 bg-cream/40 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-dark transition-colors hover:border-teal/35"
        >
          Catering
        </a>
        <a
          href="#retail-invoices"
          className="inline-flex rounded-full border border-gold/35 bg-cream/40 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-dark transition-colors hover:border-teal/35"
        >
          Retail / gifts
        </a>
      </nav>

      <CustomerPanel id="catering-invoices" title="Catering" eyebrow="Celebrations & gatherings">
        {catering.map((inv) => (
          <InvoiceRow
            key={inv.id}
            label={inv.label}
            subtitle={inv.subtitle}
            amount={inv.amount}
            date={inv.date}
            status={inv.status}
            actions={
              <>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-cream-dark px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
                >
                  PDF
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-cream-dark px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
                >
                  Share
                </button>
              </>
            }
          />
        ))}
      </CustomerPanel>

      <CustomerPanel id="retail-invoices" title="Retail & gifts" eyebrow="Shop moments">
        {retail.map((inv) => (
          <InvoiceRow
            key={inv.id}
            label={inv.label}
            subtitle={inv.subtitle}
            amount={inv.amount}
            date={inv.date}
            status={inv.status}
            actions={
              <button
                type="button"
                disabled
                className="rounded-lg border border-cream-dark px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
              >
                PDF
              </button>
            }
          />
        ))}
      </CustomerPanel>

      <p className="text-[13px] text-charcoal/55">
        Questions about a charge?{" "}
        <Link href="/account/settings/support" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
          Visit support preferences
        </Link>
        .
      </p>
    </div>
  );
}
