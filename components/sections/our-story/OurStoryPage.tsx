"use client";
import Hero from "./Hero";
import Timeline from "./Timeline";
import Community from "./Community";

export default function OurStoryPage() {
  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Hero />
      <Timeline />
      <Community />
    </main>
  );
}
