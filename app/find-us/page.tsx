import FindUsHero from "@/components/sections/find-us/FindUsHero";
import LocationBlockHeader from "@/components/sections/find-us/LocationBlockHeader";
import LocationDetails from "@/components/sections/find-us/LocationDetails";
import HoursSection from "@/components/sections/find-us/HoursSection";
import MapSection from "@/components/sections/find-us/MapSection";
import FindUsCTA from "@/components/sections/find-us/FindUsCTA";

export default function FindUsPage() {
  return (
    <main className="bg-white">
      <FindUsHero />
      <section id="location-block" className="py-20 bg-white">
        <div className="container max-w-[1140px] mx-auto px-5">
          <LocationBlockHeader />
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            <LocationDetails />
            <HoursSection />
          </div>
        </div>
      </section>
      <MapSection />
      <FindUsCTA />
    </main>
  );
}
