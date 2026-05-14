import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";
import CommunicationRow from "@/components/customer/CommunicationRow";
import { mockCommunications } from "@/lib/customer/mockAccount";

export default function AccountSettingsCommunicationPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-dark">
        <Link href="/account/settings" className="hover:underline underline-offset-4">
          ← Settings
        </Link>
      </div>
      <CustomerPageHeader
        eyebrow="Communication"
        title="A gentle paper trail"
        subtitle="Every note we’ve shared about your orders — sample entries stand in until live logs arrive."
        illustrationAccentClassName="bg-cream-dark/55"
      />

      <CustomerPanel title="Recent threads" eyebrow="Sample inbox">
        <div className="space-y-4">
          {mockCommunications.map((c) => (
            <CommunicationRow key={c.id} subject={c.subject} preview={c.preview} when={c.when} channel={c.channel} />
          ))}
        </div>
      </CustomerPanel>

      <CustomerPanel title="Archives" eyebrow="Older seasons">
        <p className="text-[14px] text-charcoal/65 leading-relaxed">
          Historic catering notes and receipt bundles will stack here with thoughtful search — for now, imagine a cedar
          drawer that never groans when you open it.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 rounded-xl border border-cream-dark px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-charcoal/45"
        >
          Browse archive (soon)
        </button>
      </CustomerPanel>
    </div>
  );
}
