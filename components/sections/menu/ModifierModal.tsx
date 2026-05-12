"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MenuItem } from "@/types/menu";
import type { ModifierGroup, SelectedModifier } from "@/types/ordering";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import CommerceQuantityControl from "@/components/commerce/CommerceQuantityControl";

interface ModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  orderingDisabled?: boolean;
  onAddToOrder?: (item: MenuItem, qty: number, modifiers: SelectedModifier[]) => void;
}

export default function ModifierModal({
  isOpen,
  onClose,
  item,
  orderingDisabled = false,
  onAddToOrder,
}: ModifierModalProps) {
  const [qty, setQty] = useState(1);
  const [selections, setSelections] = useState<Record<string, string | string[]>>(
    {}
  );

  const modifierGroups: ModifierGroup[] = item?.modifierGroups ?? [];

  useEffect(() => {
    if (isOpen && item) {
      const s: Record<string, string | string[]> = {};
      modifierGroups.forEach((g) => {
        if (g.type === "radio") {
          s[g.id] = g.options[0]?.id ?? "";
        } else {
          s[g.id] = [];
        }
      });
      setSelections(s);
      setQty(1);
    }
  }, [isOpen, item, modifierGroups]);

  const swipe = useSwipeToClose({
    onClose,
    enabled: isOpen,
    direction: "down",
  });

  if (!item) return null;

  const basePrice = item.price ?? 0;

  const selectOption = (groupId: string, optionId: string, type: string) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (type === "radio") {
        next[groupId] = optionId;
      } else {
        const arr = (next[groupId] as string[]) ?? [];
        const idx = arr.indexOf(optionId);
        if (idx >= 0) {
          arr.splice(idx, 1);
        } else {
          arr.push(optionId);
        }
        next[groupId] = arr;
      }
      return next;
    });
  };

  const getTotalPrice = () => {
    let extra = 0;
    modifierGroups.forEach((group) => {
      const sel = selections[group.id];
      if (group.type === "radio" && typeof sel === "string") {
        const opt = group.options.find((o) => o.id === sel);
        if (opt) extra += opt.price;
      } else if (Array.isArray(sel)) {
        sel.forEach((id) => {
          const opt = group.options.find((o) => o.id === id);
          if (opt) extra += opt.price;
        });
      }
    });
    return (basePrice + extra) * qty;
  };

  const handleConfirm = () => {
    if (orderingDisabled) return;
    const selectedMods: SelectedModifier[] = [];
    modifierGroups.forEach((group) => {
      const sel = selections[group.id];
      if (group.type === "radio" && typeof sel === "string") {
        const opt = group.options.find((o) => o.id === sel);
        if (opt) {
          selectedMods.push({
            id: opt.id,
            name: opt.name,
            price: opt.price,
            modifierListId: group.id,
          });
        }
      } else if (Array.isArray(sel)) {
        sel.forEach((id) => {
          const opt = group.options.find((o) => o.id === id);
          if (opt) {
            selectedMods.push({
              id: opt.id,
              name: opt.name,
              price: opt.price,
              modifierListId: group.id,
            });
          }
        });
      }
    });
    onAddToOrder?.(item, qty, selectedMods);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[970] flex items-end md:items-center justify-center md:p-6 transition-opacity duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-charcoal/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-[971] bg-cream w-full max-w-[600px] md:max-w-lg max-h-[min(92vh,760px)] rounded-t-2xl md:rounded-2xl border border-cream-dark shadow-2xl overflow-hidden flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full md:translate-y-4"
        }`}
        style={isOpen ? swipe.style : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 h-1 w-12 rounded-full bg-cream-dark mx-auto mt-2 md:hidden"
          style={{ touchAction: "none" }}
          onTouchStart={swipe.onTouchStart}
          onTouchMove={swipe.onTouchMove}
          onTouchEnd={swipe.onTouchEnd}
        />

        <div className="flex flex-1 flex-col md:flex-row md:min-h-[280px] overflow-hidden">
          <div className="relative aspect-[5/4] md:aspect-auto md:w-[42%] md:min-h-[240px] bg-charcoal shrink-0">
            {item.image_url ? (
              <Image src={item.image_url} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 280px" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-teal-dark to-charcoal text-white/30">
                <span className="font-display text-5xl">M</span>
              </div>
            )}
            <span className="absolute left-3 top-3">
              <span className="rounded-full bg-white/93 backdrop-blur-sm px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-dark shadow-sm ring-1 ring-white/60">
                Customize
              </span>
            </span>
          </div>

          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            <div className="p-5 pb-0 md:p-6 shrink-0 flex justify-between gap-3 items-start border-b border-cream-dark bg-white">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark mb-1">
                  Your cart
                </p>
                <h3 className="font-display text-2xl text-charcoal leading-tight pr-2">{item.name}</h3>
                <p className="font-display text-lg text-red mt-1">${basePrice.toFixed(2)}</p>
                <p className="text-[13px] text-charcoal/60 leading-relaxed mt-2 max-h-20 overflow-y-auto">
                  {item.description || "Fine-tune toppings and add-ons below."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-cream-dark w-9 h-9 text-charcoal/60 hover:bg-white hover:text-charcoal text-lg leading-none shrink-0"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4 pb-2">
              {modifierGroups.map((group) => (
                <div key={group.id} className="mt-2 first:mt-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[11px] uppercase tracking-[0.12em] text-charcoal/65">
                      {group.name}
                    </span>
                    <span
                      className={`font-bold text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full ${
                        group.required ? "bg-charcoal text-cream" : "bg-white text-teal-dark ring-1 ring-cream-dark"
                      }`}
                    >
                      {group.required ? "Required" : "Optional"}
                    </span>
                  </div>

                  {group.options.map((opt) => {
                    const isSelected =
                      group.type === "radio"
                        ? selections[group.id] === opt.id
                        : ((selections[group.id] as string[]) ?? []).includes(opt.id);

                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => selectOption(group.id, opt.id, group.type)}
                        className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl border text-left transition-all mb-1.5 select-none ${
                          isSelected
                            ? "border-teal bg-white shadow-sm ring-1 ring-teal/20"
                            : "border-cream-dark hover:border-teal/50 bg-white/80"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "border-teal bg-teal" : "border-cream-dark bg-white"
                          }`}
                        >
                          {group.type === "checkbox" && isSelected && (
                            <span className="text-white text-[10px] font-bold">✓</span>
                          )}
                          {group.type === "radio" && isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span className="flex-1 font-medium text-[13px] text-charcoal">{opt.name}</span>
                        {opt.price > 0 ? (
                          <span className="font-semibold text-xs text-teal-dark">+${opt.price.toFixed(2)}</span>
                        ) : (
                          <span className="text-[11px] text-charcoal/40">Free</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="p-4 md:p-5 border-t border-cream-dark bg-white flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <CommerceQuantityControl
                  size="md"
                  quantity={qty}
                  onDelta={(d) => setQty((q) => Math.max(1, q + d))}
                  disabled={orderingDisabled}
                />
                <div className="flex-1 text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-charcoal/45">Total</span>
                  <strong className="font-display text-xl text-charcoal ml-2">${getTotalPrice().toFixed(2)}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={orderingDisabled}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm tracking-wide transition-all ${
                  orderingDisabled
                    ? "bg-charcoal/20 text-charcoal/45 cursor-not-allowed"
                    : "bg-red text-white hover:opacity-95"
                }`}
              >
                {orderingDisabled
                  ? "Kitchen checkout is paused — we saved your selections"
                  : `Add to cart · $${getTotalPrice().toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
