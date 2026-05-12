"use client";

interface CommerceQuantityControlProps {
  quantity: number;
  onDelta: (delta: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export default function CommerceQuantityControl({
  quantity,
  onDelta,
  disabled = false,
  size = "sm",
  className = "",
}: CommerceQuantityControlProps) {
  const pad = size === "md" ? "px-2.5 py-1.5" : "px-2 py-1";
  return (
    <div
      className={`inline-flex rounded-lg border border-cream-dark text-xs font-semibold overflow-hidden h-fit ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        className={`${pad} hover:bg-cream disabled:opacity-40`}
        aria-label="Decrease quantity"
        onClick={() => onDelta(-1)}
      >
        −
      </button>
      <span className={`${pad} min-w-[1.75rem] text-center tabular-nums`}>{quantity}</span>
      <button
        type="button"
        disabled={disabled}
        className={`${pad} hover:bg-cream disabled:opacity-40`}
        aria-label="Increase quantity"
        onClick={() => onDelta(1)}
      >
        +
      </button>
    </div>
  );
}
