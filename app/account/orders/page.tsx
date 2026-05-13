import Link from "next/link";
import PlatformPlaceholderCard from "@/components/platform/PlatformPlaceholderCard";

export default function AccountOrdersPage() {
  return (
    <div className="space-y-10">
      <PlatformPlaceholderCard
        title="Orders"
        description="This view will summarize every storefront and pickup order tied to your account. Active and historical orders remain on your dashboard until this list lands."
      />
      <Link
        href="/account"
        className="inline-flex text-[13px] font-semibold text-teal-dark hover:text-red underline-offset-4 hover:underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
