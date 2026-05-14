import Link from "next/link";
import CustomerPageHeader from "@/components/customer/CustomerPageHeader";
import CustomerPanel from "@/components/customer/CustomerPanel";

const links = [
  { href: "/account/settings/profile", title: "Profile", body: "Display name and contact preferences for orders." },
  { href: "/account/settings/security", title: "Security", body: "Password, sign-in, and session safety." },
  { href: "/account/settings/addresses", title: "Addresses", body: "Saved shipping and event addresses." },
  { href: "/account/settings/payments", title: "Payment methods", body: "Cards and billing references used at checkout." },
  { href: "/account/settings/notifications", title: "Notifications", body: "Email and SMS preferences." },
  {
    href: "/account/settings/communication",
    title: "Communication history",
    body: "Messages and notices tied to your orders.",
  },
  { href: "/account/settings/support", title: "Support", body: "Past support conversations and requests." },
] as const;

export default function AccountSettingsHubPage() {
  return (
    <div className="space-y-10">
      <CustomerPageHeader
        eyebrow="Account"
        title="Settings, softly gathered"
        subtitle="Each pocket below will sync with Cognito and commerce profiles — for now, they’re calm placeholders you can explore."
        illustrationAccentClassName="bg-cream-dark/60"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-dark">
            <CustomerPanel className="h-full transition-colors group-hover:border-teal/20 group-hover:shadow-[0_12px_32px_rgba(24,20,16,0.06)]" paddingClassName="p-5 md:p-6">
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
