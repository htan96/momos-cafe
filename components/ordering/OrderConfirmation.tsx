"use client";

interface OrderConfirmationProps {
  orderNum: string;
  onOrderAgain: () => void;
}

export default function OrderConfirmation({ orderNum, onOrderAgain }: OrderConfirmationProps) {
  return (
    <section
      id="order-success-section"
      className="text-center py-14 px-6"
      aria-label="Order confirmation"
    >
        <span className="text-6xl block mb-4">✅</span>
        <h2 className="font-display text-5xl text-teal-dark leading-none mb-2">
          Order Placed!
        </h2>
        <div className="font-semibold text-[13px] tracking-wider uppercase text-gold mb-4">
          Order #{orderNum}
        </div>
        <p className="text-[15px] text-gray-mid leading-relaxed max-w-[380px] mx-auto mb-7">
          Your order is being prepared. Head to the pickup window at Morgen&apos;s Kitchen in about 15 minutes.
        </p>
        <button
          type="button"
          onClick={onOrderAgain}
          className="inline-flex items-center justify-center font-semibold text-sm tracking-wider uppercase py-3 px-6 rounded-lg bg-transparent text-teal-dark border-2 border-teal hover:bg-teal hover:text-white transition-all"
        >
          Order Again
        </button>
    </section>
  );
}
