import Link from "next/link";
import PlatformPlaceholderCard from "@/components/platform/PlatformPlaceholderCard";

export default function AccountCateringRequestsPage() {
  return (
    <div className="space-y-8">
      <PlatformPlaceholderCard
        title="Catering requests"
        description="Formalize every celebration inquiry you start with Momo&apos;s—including guest counts and proposed dates—with status updates surfaced here."
      />
      <Link href="/catering" className="inline-flex text-[13px] font-semibold text-red hover:text-red-dark">
        Start a new inquiry →
      </Link>
    </div>
  );
}
