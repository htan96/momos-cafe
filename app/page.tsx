import Hero from "@/components/sections/home/Hero";
import StickyBar from "@/components/sections/home/StickyBar";
import Deals from "@/components/sections/home/Deals";
import Featured from "@/components/sections/home/Featured";
import HomeMenuPreview from "@/components/sections/home/HomeMenuPreview";
import Why from "@/components/sections/home/Why";
import Order from "@/components/sections/home/Order";
import Location from "@/components/sections/home/Location";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StickyBar />
      <Deals />
      <Featured />
      <HomeMenuPreview />
      <Why />
      <Order />
      <Location />
    </>
  );
}
