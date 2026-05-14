import Link from "next/link";
import PlatformPlaceholderCard from "@/components/platform/PlatformPlaceholderCard";

export default function AdminSettingsIntegrationsPage() {
  return (
    <div className="space-y-6">
      <PlatformPlaceholderCard
        title="Integrations"
        description="Shippo, Square, and email providers will be configured here. Credentials stay server-side; this pane is the control surface."
      />
      <p className="text-[14px] text-charcoal/72">
        Shipping labels and tracking sync: see{" "}
        <Link href="/admin/shipping" className="font-semibold text-teal-dark hover:underline underline-offset-2">
          Shipping (Shippo placeholder)
        </Link>
        .
      </p>
    </div>
  );
}
