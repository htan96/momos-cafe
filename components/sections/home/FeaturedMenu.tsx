"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface FeaturedItem {
  id: string;
  name: string;
  custom_featured_name: string | null;
  image_url: string | null;
  price: number | null;
  category_id: string;
}

export default function FeaturedMenu() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      const { data, error } = await supabase
        .from("menuitems")
        .select("id, name, custom_featured_name, image_url, price, category_id")
        .eq("is_featured", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("❌ Error loading featured items:", error);
      } else {
        console.log("✅ Featured items loaded:", data);
        setItems(data || []);
      }
      setLoading(false);
    }

    loadFeatured();
  }, []);

  return (
    <section className="relative bg-[#F5E5C0] py-24 px-6 md:px-12 lg:px-20 text-center">
      <h2 className="text-3xl md:text-4xl font-spartan tracking-wide text-[#D4AF37] mb-2 uppercase">
        Featured Favorites
      </h2>
      <p className="text-[#2F6D66] mb-12 font-sourcesans text-lg">
        A few of our go-to classics — made fresh, served warm.
      </p>

      {loading ? (
        <p className="text-[#2F6D66]/70 text-lg">Loading favorites...</p>
      ) : items.length === 0 ? (
        <p className="text-[#2F6D66]/70 text-lg italic">
          No featured items found. Try marking a few in Supabase.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => {
            const displayName = item.custom_featured_name || item.name;
            const imageSrc = item.image_url || "/images/menu/coming-soon.jpg";

            return (
              <Link key={item.id} href={`/menu#item-${item.id}`}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                  className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl cursor-pointer bg-white"
                >
                  <Image
                    src={imageSrc}
                    alt={displayName}
                    width={400}
                    height={300}
                    className="object-cover w-full h-64 transition-all duration-300 hover:brightness-90"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#00000099] to-transparent p-4">
                    <h3 className="text-lg md:text-xl font-semibold text-white">
                      {displayName}
                    </h3>
                  
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Divider */}
      <div className="w-24 h-[2px] bg-[#D4AF37] opacity-50 mx-auto my-12 rounded-full" />

      <p className="text-[#2F6D66] text-lg md:text-xl font-sourcesans mb-6 max-w-2xl mx-auto text-center leading-relaxed">
        We’re cooking up our comeback — every bit of love and support brings us one step closer to home.
      </p>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <motion.a
          href="https://www.gofundme.com/f/reopen-momos-cafe-after-smoke-damage"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className="bg-[#C43B2F] text-white hover:text-[#D4AF37] font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
        >
          Support Us
        </motion.a>

        <motion.a
          href="#find-us"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className="bg-[#2F6D66] text-white hover:text-[#D4AF37] font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
        >
          Visit Us
        </motion.a>
      </div>
    </section>
  );
}
