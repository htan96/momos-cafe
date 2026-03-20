import CateringHero from "@/components/sections/catering/CateringHero";
import CateringServices from "@/components/sections/catering/CateringServices";
import CateringMenuPreview from "@/components/sections/catering/CateringMenuPreview";
import CateringProcess from "@/components/sections/catering/CateringProcess";
import CateringTrust from "@/components/sections/catering/CateringTrust";
import CateringInquiry from "@/components/sections/catering/CateringInquiry";
import CateringCTA from "@/components/sections/catering/CateringCTA";

export default function CateringPage() {
  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <CateringHero />
      <CateringServices />
      <CateringMenuPreview />
      <CateringProcess />
      <CateringTrust />
      <CateringInquiry />
      <CateringCTA />
    </main>
  );
}
