"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MenuItem } from "@/types/menu";
import type { ModifierGroup } from "@/types/ordering";

interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

interface ModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  orderingDisabled?: boolean;
  onAddToOrder?: (item: MenuItem, qty: number, modifiers: ModifierOption[]) => void;
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
  }, [isOpen, item]);

  if (!item) return null;

  const basePrice = item.price ?? 0;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
    const selectedMods: ModifierOption[] = [];
    modifierGroups.forEach((group) => {
      const sel = selections[group.id];
      if (group.type === "radio" && typeof sel === "string") {
        const opt = group.options.find((o) => o.id === sel);
        if (opt) selectedMods.push(opt);
      } else if (Array.isArray(sel)) {
        sel.forEach((id) => {
          const opt = group.options.find((o) => o.id === id);
          if (opt) selectedMods.push(opt);
        });
      }
    });
    onAddToOrder?.(item, qty, selectedMods);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[2000] bg-black/55 backdrop-blur-sm flex items-end justify-center transition-opacity duration-250 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={handleOverlayClick}
    >
      <div
        className={`bg-white rounded-t-[20px] w-full max-w-[600px] max-h-[92vh] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-11 h-1 bg-cream-dark rounded-full mx-auto mt-3 flex-shrink-0" />

        {/* Image */}
        <div className="w-full h-[180px] bg-cream-dark flex items-center justify-center text-7xl overflow-hidden">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              width={600}
              height={180}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="opacity-70">🍽️</span>
          )}
        </div>

        <div className="px-5 pt-5 flex-shrink-0">
          <h3 className="font-display text-[32px] text-charcoal leading-none mb-1.5">
            {item.name}
          </h3>
          <p className="text-sm text-gray-mid leading-relaxed">
            {item.description || "Description coming soon."}
          </p>
          <div className="flex items-center justify-between mt-2.5">
            <span className="font-display text-[28px] text-red">
              ${basePrice.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {modifierGroups.map((group) => (
            <div key={group.id} className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-xl text-charcoal">
                  {group.name}
                </span>
                <span
                  className={`font-bold text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded ${
                    group.required
                      ? "bg-red text-white"
                      : "bg-teal-light text-teal-dark"
                  }`}
                >
                  {group.required ? "Required" : "Optional"}
                </span>
              </div>
              <div className="h-[1.5px] bg-cream-dark mb-3" />

              {group.options.map((opt) => {
                const isSelected =
                  group.type === "radio"
                    ? selections[group.id] === opt.id
                    : (selections[group.id] as string[] ?? []).includes(opt.id);

                return (
                  <div
                    key={opt.id}
                    onClick={() =>
                      selectOption(group.id, opt.id, group.type)
                    }
                    className={`flex items-center gap-3 py-3 px-3.5 rounded-lg border-2 cursor-pointer transition-all mb-2 select-none ${
                      isSelected
                        ? "border-teal bg-teal/5"
                        : "border-cream-dark hover:border-teal-light hover:bg-teal/5"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "border-teal bg-teal"
                          : "border-cream-dark bg-white"
                      }`}
                    >
                      {group.type === "checkbox" && isSelected && (
                        <span className="text-white text-xs font-bold">✓</span>
                      )}
                      {group.type === "radio" && isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="flex-1 font-medium text-sm text-charcoal">
                      {opt.name}
                    </span>
                    {opt.price > 0 ? (
                      <span className="font-semibold text-sm text-teal-dark">
                        +${opt.price.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-mid text-sm">Free</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-cream-dark bg-cream-mid flex-shrink-0">
          <div className="flex items-center gap-3 mb-3.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 rounded-full bg-cream-dark flex items-center justify-center text-lg font-bold hover:bg-teal-light transition-colors"
              >
                −
              </button>
              <span className="font-display text-2xl text-charcoal min-w-[32px] text-center">
                {qty}
              </span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-full bg-cream-dark flex items-center justify-center text-lg font-bold hover:bg-teal-light transition-colors"
              >
                +
              </button>
            </div>
            <div className="flex-1 text-right">
              <span className="font-semibold text-sm text-gray-mid">
                Total:{" "}
              </span>
              <strong className="font-display text-[22px] text-charcoal ml-1.5">
                ${getTotalPrice().toFixed(2)}
              </strong>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={orderingDisabled}
            className={`w-full py-3.5 px-4 rounded-lg font-semibold text-base transition-all ${
              orderingDisabled
                ? "bg-gray-mid text-white/80 cursor-not-allowed shadow-none"
                : "bg-red text-white shadow-[0_3px_0_#800] hover:-translate-y-0.5"
            }`}
          >
            {orderingDisabled ? "Ordering Closed" : `Add to Order — $${getTotalPrice().toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
