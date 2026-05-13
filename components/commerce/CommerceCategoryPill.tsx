"use client";

export interface CommerceCategoryPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  id?: string;
  /** For horizontal scroll sync (menu category strip) */
  dataSlug?: string;
  role?: "tab" | "button";
  "aria-selected"?: boolean;
  /** Extra utility classes — e.g. menu strip sizing */
  className?: string;
}

/** Shared category chip — cream/teal rail; matches Shop + Menu strips */
export default function CommerceCategoryPill({
  label,
  active = false,
  onClick,
  id,
  dataSlug,
  role = "button",
  "aria-selected": ariaSelected,
  className = "",
}: CommerceCategoryPillProps) {
  return (
    <button
      id={id}
      type="button"
      role={role}
      data-slug={dataSlug}
      aria-selected={ariaSelected ?? (role === "tab" ? active : undefined)}
      onClick={onClick}
      className={`snap-start shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wide border outline-none transition-[transform,box-shadow,border-color,background-color,color] duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cream active:duration-150 active:ease-out ${
        active
          ? "relative z-[1] scale-[1.02] border-teal-dark bg-teal-dark text-cream shadow-[0_6px_18px_-8px_rgba(45,107,107,0.52),0_1px_0_rgba(212,175,55,0.22)] ring-2 ring-teal/30 ring-offset-2 ring-offset-cream active:scale-[0.98]"
          : "border-cream-dark/90 bg-white/88 text-charcoal/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(44,44,44,0.07)] hover:border-teal/50 hover:text-teal-dark hover:shadow-[0_4px_14px_-8px_rgba(45,107,107,0.22)] active:scale-[0.97]"
      } ${className}`.trim()}
    >
      {label}
    </button>
  );
}
