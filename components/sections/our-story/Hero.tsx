"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export default function OurStoryHero() {
  return (
    <section className="relative bg-[#2F6D66] text-[#D4AF37] py-32 px-6 md:px-12 lg:px-20 overflow-hidden">
      {/* Bottom fade for smooth blend */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-b from-[#2F6D66] via-[#3B7C74] to-[#F5E5C0]" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between max-w-7xl mx-auto gap-12"
      >
        {/* Left Text Block */}
        <div className="text-left max-w-xl">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold uppercase leading-tight text-[#D4AF37]">
            Our Comeback <br /> Story
          </h1>
          <p className="text-[#F5E5C0] mt-6 text-lg md:text-xl leading-relaxed">
            From humble beginnings to community roots — Momo’s Café has been built 
            on hard work, heart, and Vallejo love since 2000.
          </p>
        </div>

        {/* Right Image */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full md:w-[50%] h-[300px] md:h-[450px] relative rounded-2xl overflow-hidden shadow-lg"
        >
          <Image
            src="https://ccwditgtfnlgbmbxoxmz.supabase.co/storage/v1/object/public/menu-images/momos-story.jpg"
            alt="Momo’s Café History"
            fill
            className="object-cover"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
