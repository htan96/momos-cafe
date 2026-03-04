"use client";
import { motion } from "framer-motion";
import { MapPin, Clock, Phone, Instagram } from "lucide-react";

export default function FindUs() {
  return (
    <section className="relative bg-[#F5E5C0] text-[#2F6D66] py-24 px-6 md:px-12 lg:px-20 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center"
      >
        {/* Left Side — Info */}
        <div>
          <h2 className="font-display text-4xl md:text-5xl font-bold uppercase mb-6">
            Find Us
          </h2>

          <p className="text-lg text-[#2F6D66]/80 mb-10 leading-relaxed">
            We’re currently serving from our <span className="font-semibold">pop-up window inside Morgen’s Kitchen</span> — 
            still the same Momo’s taste, now in a shared community space while we prepare for our next home in Vallejo.
          </p>

          <div className="space-y-4 text-md">
            <p className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#C43B2F]" />
              <span>
                Inside Morgen’s Kitchen<br />
                1922 Broadway St, Vallejo CA 94589
              </span>
            </p>
            <p className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#C43B2F]" />
              Wednesday – Sunday • 8 AM – 4 PM
            </p>
            <p className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-[#C43B2F]" />
              (707) 654-7180 • Pickup Orders Only
            </p>
            <a
              href="https://www.instagram.com/momoscafe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-[#2F6D66] hover:text-[#C43B2F] transition-colors"
            >
              <Instagram className="w-5 h-5 text-[#C43B2F]" />
              @momoscafe
            </a>
          </div>

          <motion.a
            href="https://www.google.com/maps/place/1922+Broadway+St,+Vallejo,+CA+94589"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className="inline-block mt-10 bg-[#C43B2F] text-white hover:text-[#D4AF37] font-semibold px-10 py-3 rounded-full shadow-md hover:shadow-lg transition-all"
          >
            Get Directions
          </motion.a>
        </div>

        {/* Right Side — Map */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="w-full h-[350px] md:h-[450px] rounded-2xl overflow-hidden shadow-lg border border-[#2F6D66]/20"
        >
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3139.337235146166!2d-122.26161732335705!3d38.11783099827836!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808512f7a26e63b3%3A0xb7d5d9e15dca983a!2s1922%20Broadway%20St%2C%20Vallejo%2C%20CA%2094589!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
          ></iframe>
        </motion.div>
      </motion.div>
    </section>
  );
}
