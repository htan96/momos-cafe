"use client";

import { useAdminSettings, DEFAULT_SETTINGS } from "@/lib/useAdminSettings";
import ShopComingSoon from "@/components/shop/ShopComingSoon";
import ShopHero from "@/components/sections/shop/ShopHero";
import ProductGrid from "@/components/sections/shop/ProductGrid";
import ShopCTA from "@/components/sections/shop/ShopCTA";
import { mockProducts } from "@/lib/mockProducts";

export default function ShopPage() {
  const { settings } = useAdminSettings();
  const isShopUnlocked =
    settings?.isShopUnlocked ?? DEFAULT_SETTINGS.isShopUnlocked;

  if (!isShopUnlocked) {
    return <ShopComingSoon />;
  }

  return (
    <main className="bg-white">
      <ShopHero />
      <section id="shop-products" className="py-20 bg-white">
        <div className="container max-w-[1140px] mx-auto px-5">
          <div className="text-center mb-12">
            <span className="font-semibold text-[11px] tracking-[0.3em] uppercase text-teal block">
              Shop
            </span>
            <div className="flex items-center gap-4 my-2 max-w-[200px] mx-auto">
              <div className="flex-1 h-[1.5px] bg-gold" />
              <div className="flex-1 h-[1.5px] bg-gold" />
            </div>
            <h2 className="font-display text-[clamp(38px,6vw,64px)] leading-none text-charcoal mt-2 mb-3">
              From Our Kitchen to Yours
            </h2>
            <p className="text-base text-charcoal/65 max-w-[520px] mx-auto leading-relaxed">
              Every purchase supports our crew and the community we&apos;ve been feeding since 2000.
            </p>
          </div>

          <ProductGrid products={mockProducts} />
        </div>
      </section>
      <ShopCTA />
    </main>
  );
}
