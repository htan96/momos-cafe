"use client";

import { useEffect } from "react";
import { useMerchCart } from "@/context/MerchCartContext";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface MerchBagDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MerchBagDrawer({ open, onClose }: MerchBagDrawerProps) {
  const { lines, subtotal, setMerchQuantity, removeMerchLine } = useMerchCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && lines.length === 0) onClose();
  }, [open, lines.length, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <button type="button" aria-label="Close bag" className="absolute inset-0 bg-charcoal/45" onClick={onClose} />
      <aside className="relative z-[111] w-full max-w-md bg-cream shadow-2xl flex flex-col h-full pb-[env(safe-area-inset-bottom)]">
        <header className="flex items-center justify-between px-5 py-4 border-b border-cream-dark bg-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-dark">Shop bag</p>
            <h2 className="font-display text-xl text-charcoal">Your picks</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cream-dark w-9 h-9 text-charcoal/60 hover:bg-cream text-lg leading-none"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {lines.length === 0 ? (
            <p className="text-sm text-charcoal/55 text-center py-12">
              Bag is empty — browse collections above.
            </p>
          ) : (
            lines.map((line) => (
              <div
                key={line.lineId}
                className="rounded-xl border border-cream-dark bg-white p-3 flex gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-charcoal text-sm leading-snug">{line.name}</p>
                  <p className="text-[11px] text-charcoal/50 mt-0.5">{line.variantSummary}</p>
                  <p className="text-[11px] text-teal-dark font-semibold mt-1">{formatMoney(line.unitPrice)} ea.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="inline-flex rounded-lg border border-cream-dark text-xs font-semibold overflow-hidden">
                      <button
                        type="button"
                        className="px-2 py-1 hover:bg-cream"
                        onClick={() => setMerchQuantity(line.lineId, line.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="px-2 py-1 min-w-[1.75rem] text-center">{line.quantity}</span>
                      <button
                        type="button"
                        className="px-2 py-1 hover:bg-cream"
                        onClick={() => setMerchQuantity(line.lineId, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMerchLine(line.lineId)}
                      className="text-[11px] font-semibold uppercase tracking-wide text-red hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="border-t border-cream-dark bg-white px-5 py-4 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/55">Subtotal</span>
            <span className="font-display text-2xl text-red">{formatMoney(subtotal)}</span>
          </div>
          <p className="text-[11px] text-charcoal/45 leading-snug">
            Merch fulfillment ≈ 2–3 business days. Unified checkout with food is planned — this bag saves locally on your device.
          </p>
          <button
            type="button"
            disabled
            className="w-full rounded-xl bg-charcoal/25 text-charcoal/55 font-bold text-xs uppercase tracking-wider py-3.5 cursor-not-allowed border border-cream-dark"
          >
            Checkout — coming soon
          </button>
        </footer>
      </aside>
    </div>
  );
}
