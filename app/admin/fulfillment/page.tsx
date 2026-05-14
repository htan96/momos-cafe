import Link from "next/link";
import PlatformPlaceholderCard from "@/components/platform/PlatformPlaceholderCard";

export default function AdminFulfillmentPage() {
  return (
    <div className="space-y-6">
      <PlatformPlaceholderCard
        title="Fulfillment queue"
        description="Kitchen and pack-station work queues — ties into order pipelines and label generation when automation lands."
      />
      <p className="text-[14px] text-charcoal/72">
        Labels and carriers:{" "}
        <Link href="/admin/shipping" className="font-semibold text-teal-dark hover:underline underline-offset-2">
          Shipping
        </Link>
        .
      </p>
    </div>
  );
}
