"use client";

import Image from "next/image";
import { MenuCategory } from "@/types/menu";

interface MenuSectionProps {
  category: MenuCategory;
}

export default function MenuSection({ category }: MenuSectionProps) {
  return (
    <section
      id={category.slug}
      className="scroll-mt-[130px] py-10"
    >
      {/* Section Header */}
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-teal uppercase tracking-wide">
          {category.name}
        </h2>

        {category.description && (
          <p className="text-sm md:text-base text-charcoal/80 mt-2 max-w-2xl mx-auto">
            {category.description}
          </p>
        )}
      </div>
6
      {/* Menu Items Grid */}
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {category.menuitems?.map((item, index) => (
          <div
            id={`item-${item.id}`}
            key={item.id}
            className="bg-cream rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-lg hover:shadow-gold/10 transition-shadow duration-200"
          >
            {/* Image / Placeholder */}
            <div className="relative h-56 bg-teal overflow-hidden">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  priority={index < 4}
                  className="object-cover"
                />
              ) : (
                <span className="flex items-center justify-center h-full text-cream/90 font-medium text-sm">
                  Pictures Coming Soon
                </span>
              )}
            </div>

            {/* Item Details */}
            <div className="flex flex-col justify-between flex-grow p-5">
              <div>
                <h3 className="font-display text-lg font-semibold text-teal mb-1 leading-tight">
                  {item.name}
                </h3>
                <p className="text-sm text-charcoal/80 leading-snug">
                  {item.description || "Description coming soon."}
                </p>
              </div>

              {/* Price */}
              <div className="flex justify-end items-center mt-4">
                <span className="text-gold font-semibold text-lg">
                  {item.price ? `$${item.price}` : "--"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
