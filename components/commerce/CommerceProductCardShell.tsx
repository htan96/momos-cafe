"use client";

import type { CSSProperties, ReactNode } from "react";

interface CommerceProductCardShellProps {
  children: ReactNode;
  imageSlot: ReactNode;
  footerSlot: ReactNode;
  orderingDisabled?: boolean;
  onCardClick?: () => void;
  idAttr?: string;
  /** Staggered entrance — matches Shop `ProductCard` */
  cardStyle?: CSSProperties;
}

/**
 * Shared card chrome (border, shadow, hover) — Shop `ProductCard` and menu cards align here.
 */
export default function CommerceProductCardShell({
  children,
  imageSlot,
  footerSlot,
  orderingDisabled = false,
  onCardClick,
  idAttr,
  cardStyle,
}: CommerceProductCardShellProps) {
  return (
    <article
      id={idAttr}
      style={cardStyle}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={orderingDisabled ? undefined : onCardClick}
      onKeyDown={
        orderingDisabled || !onCardClick
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCardClick();
              }
            }
      }
      className={`group flex flex-col rounded-xl overflow-hidden bg-white border border-cream-dark/90 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-all duration-200 ${
        orderingDisabled
          ? "cursor-default opacity-90"
          : "cursor-pointer hover:border-teal/35 hover:shadow-[0_8px_24px_-10px_rgba(74,139,140,0.35)]"
      }`}
    >
      {/* Image */}
      <div className={`relative aspect-[4/5] w-full overflow-hidden shrink-0`}>{imageSlot}</div>

      <div className="p-3 md:p-3.5 flex-1 flex flex-col gap-2">{children}</div>
      <div className="px-3 md:px-3.5 pb-3 md:pb-3.5 pt-0 flex flex-col gap-2">{footerSlot}</div>
    </article>
  );
}
