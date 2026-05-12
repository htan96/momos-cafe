"use client";

import ProductCard from "./ProductCard";
import type { MerchProduct } from "@/types/merch";

interface MerchProductGridProps {
  products: MerchProduct[];
  onConfigureProduct: (product: MerchProduct) => void;
  onQuickAddProduct: (product: MerchProduct) => void;
}

export default function MerchProductGrid({
  products,
  onConfigureProduct,
  onQuickAddProduct,
}: MerchProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cream-dark bg-white py-16 text-center px-4">
        <p className="font-semibold text-charcoal">Nothing in this collection yet.</p>
        <p className="text-sm text-charcoal/55 mt-1">Try another category — Square catalog sync lands soon.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          onConfigure={onConfigureProduct}
          onQuickAdd={onQuickAddProduct}
        />
      ))}
    </div>
  );
}
