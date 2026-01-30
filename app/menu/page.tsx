"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import MenuNav from "@/components/sections/menu/MenuNav";
import MenuSection from "@/components/sections/menu/MenuSection";
import { MenuCategory } from "@/types/menu";

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMenu() {
      const { data, error } = await supabase
        .from("menucategories")
        .select(`
          id,
          name,
          slug,
          description,
          display_order,
          menuitems (
            id,
            name,
            description,
            price,
            image_url,
            is_active
          )
        `)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching menu:", error);
      } else {
        setCategories(data || []);
      }

      setLoading(false);
    }

    loadMenu();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-teal">
        Loading menu...
      </div>
    );
  }

  return (
    <section className="bg-cream min-h-screen text-charcoal">
      <MenuNav categories={categories} />

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 space-y-20">
        {categories.map((category) => (
          <MenuSection
            key={category.id}
            category={category}
          />
        ))}
      </div>
    </section>
  );
}
