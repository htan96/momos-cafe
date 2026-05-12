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

/** Shared category chip — mirrors Shop `CollectionFilterBar` charcoal active state */
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
      className={`snap-start shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-wide transition-all duration-200 ease-out border ${
        active
          ? "bg-charcoal text-cream border-charcoal shadow-sm"
          : "bg-white text-charcoal/70 border-cream-dark hover:border-teal hover:text-teal-dark"
      } ${className}`.trim()}
    >
      {label}
    </button>
  );
}
