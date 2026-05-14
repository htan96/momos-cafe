import Link from "next/link";
import PlatformPlaceholderCard from "@/components/platform/PlatformPlaceholderCard";

const links = [
  { href: "/account/settings/profile", title: "Profile", body: "Display name and contact preferences for orders." },
  { href: "/account/settings/security", title: "Security", body: "Password, sign-in, and session safety." },
  { href: "/account/settings/addresses", title: "Addresses", body: "Saved shipping and event addresses." },
  { href: "/account/settings/payments", title: "Payment methods", body: "Cards and billing references used at checkout." },
  { href: "/account/settings/notifications", title: "Notifications", body: "Email and SMS preferences." },
  { href: "/account/settings/communication", title: "Communication history", body: "Messages and notices tied to your orders." },
  { href: "/account/settings/support", title: "Support", body: "Past support conversations and requests." },
] as const;

export default function AccountSettingsHubPage() {
  return (
    <div className="space-y-10">
      <PlatformPlaceholderCard
        title="Settings"
        description="Customer account preferences and history are split below — each area will connect to Cognito and commerce profiles when wired."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-2xl border border-cream-dark bg-white/90 p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="font-display text-lg text-charcoal">{l.title}</h2>
            <p className="mt-2 text-[14px] text-charcoal/70 leading-relaxed">{l.body}</p>
            <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-dark">Open →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
