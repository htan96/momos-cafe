import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";

export default function AccountSettingsPaymentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-dark">
        <Link href="/account/settings" className="hover:underline underline-offset-4">
          ← Settings
        </Link>
      </div>
      <CustomerPageHeader
        eyebrow="Payments"
        title="Quiet tokens at checkout"
        subtitle="No raw card data simmers on our side — these placeholders mirror how saved methods will feel."
        illustrationAccentClassName="bg-teal/12"
      />

      <CustomerPanel title="Saved methods" eyebrow="Tokens only">
        <ul className="space-y-3">
          {[
            { label: "Visa ···4242", meta: "Default · café + shop", brand: "Visa" },
            { label: "Amex ···1001", meta: "Backup · gifts", brand: "Amex" },
          ].map((c) => (
            <li key={c.label} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-dark bg-white px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-charcoal">{c.label}</p>
                <p className="text-[12px] text-charcoal/55">{c.meta}</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/40">{c.brand}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          className="mt-4 w-full rounded-xl border border-cream-dark py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-charcoal/45 sm:w-auto sm:px-6"
        >
          Add payment method (soon)
        </button>
      </CustomerPanel>

      <CustomerPanel title="Billing zip" eyebrow="Receipt alignment">
        <input
          readOnly
          defaultValue="98101"
          className="w-full max-w-xs rounded-xl border border-cream-dark bg-cream/40 px-4 py-3 text-[14px] text-charcoal/55 outline-none"
        />
        <p className="mt-3 text-[12px] text-charcoal/50">Read-only preview · Square-hosted fields at checkout remain canonical.</p>
      </CustomerPanel>
    </div>
  );
}
