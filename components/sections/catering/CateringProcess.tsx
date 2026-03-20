"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    num: "01",
    icon: "📋",
    title: "Tell Us About Your Event",
    description:
      "Fill out the inquiry form below or give us a call. Tell us the date, guest count, and what type of food you have in mind.",
  },
  {
    num: "02",
    icon: "💬",
    title: "We Send a Custom Quote",
    description:
      "We'll get back to you with a menu recommendation and pricing based on your group size and preferences. No surprises.",
  },
  {
    num: "03",
    icon: "✅",
    title: "Confirm & We Prepare",
    description:
      "Once you confirm, we start planning. We handle all the prep — you'll get a reminder 24 hours before your event.",
  },
  {
    num: "04",
    icon: "🍽️",
    title: "Pickup or We Deliver",
    description:
      "Pick up from our location or ask about delivery for your event. Food arrives hot, portioned, and ready to serve.",
  },
];

export default function CateringProcess() {
  return (
    <section id="how-it-works" className="relative py-20 md:py-24 bg-teal-dark overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(74,139,140,0.4) 0%, transparent 70%)",
        }}
      />

      <div className="container max-w-[1140px] mx-auto px-5 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="font-semibold text-xs tracking-[0.2em] uppercase text-gold">
            How It Works
          </span>
          <div className="flex items-center justify-center gap-4 my-2">
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold/50" />
            <span className="flex-1 max-w-[120px] h-[1.5px] bg-gold/50" />
          </div>
          <h2 className="font-display text-[clamp(38px,6vw,64px)] leading-none text-cream mt-2 mb-3">
            Simple Process
          </h2>
          <p className="text-base text-white/65 max-w-[520px] mx-auto leading-relaxed">
            We handle the food. You focus on your event. Here&apos;s what ordering catering looks like.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-sm hover:-translate-y-1.5 hover:bg-white/10 transition-all relative z-10"
            >
              <span className="font-display text-5xl text-gold leading-none block mb-3">
                {step.num}
              </span>
              <span className="text-3xl block mb-3.5">{step.icon}</span>
              <h3 className="font-display text-xl text-cream mb-2.5 leading-tight">
                {step.title}
              </h3>
              <p className="text-sm text-white/62 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
