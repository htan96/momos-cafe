"use client";

interface MobileOrderBarProps {
  itemCount: number;
  total: number;
  onOpenCart: () => void;
  orderingDisabled?: boolean;
}

export default function MobileOrderBar({
  itemCount,
  total,
  onOpenCart,
  orderingDisabled = false,
}: MobileOrderBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[900] bg-red px-5 py-3 flex items-center justify-between lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      <div>
        <strong className="text-white text-base font-display">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </strong>{" "}
        <span className="font-medium text-sm text-white/85">in your order</span>
      </div>
      <button
        onClick={onOpenCart}
        className="bg-white text-red font-bold text-sm tracking-wider py-2.5 px-5 rounded-lg flex items-center gap-2"
      >
        🛒 View Cart — ${total.toFixed(2)}
      </button>
    </div>
  );
}
