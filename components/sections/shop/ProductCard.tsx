"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/lib/mockProducts";

interface ProductCardProps {
  product: Product;
  index?: number;
}

function formatPrice(product: Product): string {
  if (product.priceLabel) return product.priceLabel;
  return `$${product.price}`;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const handleAddToCart = () => {
    console.log("Added to cart", product);
  };

  const handleBuyNow = () => {
    console.log("Buy now", product);
  };

  const isBuyNow = product.buttonLabel === "Buy Now";

  return (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.55, delay: index * 0.05 }}
      className="bg-cream border border-cream-dark rounded-2xl overflow-hidden flex flex-col transition-all hover:border-teal-light hover:shadow-[0_6px_28px_rgba(74,139,140,0.15)] hover:-translate-y-0.5"
    >
      <div className="w-full aspect-square bg-cream-dark flex items-center justify-center text-6xl border-b border-cream-dark overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            width={400}
            height={400}
            className="w-full h-full object-cover"
          />
        ) : (
          <span aria-hidden>{product.imagePlaceholder ?? "🛍️"}</span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {product.tag && (
          <span
            className={`font-semibold text-[10px] tracking-[0.2em] uppercase mb-2 block ${
              product.tag === "Gift Card" ? "text-gold" : "text-teal"
            }`}
          >
            {product.tag}
          </span>
        )}
        <h3 className="font-semibold text-base text-charcoal mb-1 leading-snug">
          {product.name}
        </h3>
        <p className="text-[13px] text-charcoal/60 leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-cream-dark">
          <span className="font-display text-[28px] text-red leading-none">
            {formatPrice(product)}
          </span>
          <button
            type="button"
            onClick={isBuyNow ? handleBuyNow : handleAddToCart}
            className="bg-red text-white border-none rounded-lg cursor-pointer font-semibold text-xs tracking-wider uppercase py-2 px-4 shadow-[0_3px_0_#800] transition-all hover:opacity-90 hover:-translate-y-0.5"
          >
            {product.buttonLabel ?? "Add to Cart"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
