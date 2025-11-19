"use client";
import { motion } from "framer-motion";

export default function Community() {
  return (
    <section className="bg-teal text-cream py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto text-center px-6"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold uppercase text-gold">
          Thank You, Vallejo
        </h2>
        <p className="mt-4 text-lg md:text-xl text-cream/90 leading-relaxed">
          Every plate we serve carries a story — of our roots, our family, and
          the love this community has shown through every chapter. We’re proud
          to still call Vallejo home.
        </p>
      </motion.div>
    </section>
  );
}
