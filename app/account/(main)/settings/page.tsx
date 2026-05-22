import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";

const links = [
  { href: "/account/settings/profile", title: "Profile", body: "Email and identity for your signed-in account." },
] as const;

export default function AccountSettingsHubPage() {
  return (
    <div className="space-y-10">
      <CustomerPageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Profile is available now; other preferences will return as we wire them to live data."
        illustrationAccentClassName="bg-cream-dark/60"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-dark"
          >
            <CustomerPanel
              className="h-full transition-colors group-hover:border-teal/20 group-hover:shadow-[0_12px_32px_rgba(24,20,16,0.06)]"
              paddingClassName="p-5 md:p-6"
            >
              <p className="font-display text-lg text-charcoal">{l.title}</p>
              <p className="mt-2 text-[14px] text-charcoal/70 leading-relaxed">{l.body}</p>
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-dark group-hover:underline underline-offset-4">
                Open →
              </p>
            </CustomerPanel>
          </Link>
        ))}
      </div>
    </div>
  );
}
