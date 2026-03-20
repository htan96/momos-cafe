"use client";

import OurStoryHero from "./OurStoryHero";
import NarrativeIntro from "./NarrativeIntro";
import TimelineSection from "./TimelineSection";
import LocationCallout from "./LocationCallout";
import OurStoryCTA from "./OurStoryCTA";

export default function OurStoryPage() {
  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <OurStoryHero />
      <NarrativeIntro />
      <TimelineSection />
      <LocationCallout />
      <OurStoryCTA />
    </main>
  );
}
