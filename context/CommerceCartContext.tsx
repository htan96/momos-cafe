"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/types/ordering";
import { getCartItemKey, getCartItemTotal } from "@/types/ordering";
import type { MerchCartLine, MerchFulfillmentSlug } from "@/types/merch";
import { merchCartLineKey } from "@/types/merch";
import type { CheckoutFulfillmentSummary, UnifiedCartLine, UnifiedFoodLine, UnifiedMerchLine } from "@/types/commerce";
import { buildFulfillmentSummary } from "@/lib/commerce/fulfillmentPreview";
import { migrateLegacyCartsToUnified } from "@/lib/commerce/unifiedCartMigrate";
import { sanitizeUnifiedCartLinesFromStorage } from "@/lib/commerce/parseUnifiedCartLines";

const UNIFIED_STORAGE_KEY = "momos_unified_cart_v2";

interface CommerceCartContextValue {
  lines: UnifiedCartLine[];
  fulfillmentSummary: CheckoutFulfillmentSummary;
  /** Combined item count (qty sum) */
  totalCount: number;
  foodCount: number;
  merchCount: number;
  foodSubtotal: number;
  merchSubtotal: number;
  grandTotal: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  guestCartToken: string | null;
  setGuestCartToken: (token: string | null) => void;

  addFoodItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFoodLineAtIndex: (index: number) => void;
  updateFoodQuantityAtIndex: (index: number, delta: number) => void;
  clearFoodLines: () => void;

  addMerchLine: (input: Omit<MerchCartLine, "lineId" | "type"> & { lineId?: string }) => void;
  setMerchQuantity: (lineId: string, quantity: number) => void;
  removeMerchLine: (lineId: string) => void;
  clearMerchLines: () => void;

  clearAllLines: () => void;
}

const CommerceCartContext = createContext<CommerceCartContextValue | null>(null);

function foodLineKey(line: UnifiedFoodLine): string {
  return getCartItemKey({
    id: line.id,
    variationId: line.variationId,
    name: line.name,
    price: line.price,
    quantity: 1,
    modifiers: line.modifiers,
  });
}

function toMerchCartLine(line: UnifiedMerchLine): MerchCartLine {
  return {
    type: "merch",
    lineId: line.lineId,
    productId: line.productId,
    squareVariationId: line.squareVariationId,
    name: line.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    variantSummary: line.variantSummary,
    image: line.image,
    fulfillmentSlug: line.fulfillmentSlug,
  };
}

function toCartItem(line: UnifiedFoodLine): CartItem {
  return {
    id: line.id,
    variationId: line.variationId,
    name: line.name,
    price: line.price,
    quantity: line.quantity,
    modifiers: line.modifiers,
  };
}

export function CommerceCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<UnifiedCartLine[]>([]);
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [guestCartToken, setGuestCartToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const migrated = migrateLegacyCartsToUnified();
      if (migrated && migrated.length > 0) {
        setLines(migrated);
        setMounted(true);
        return;
      }
      const raw = localStorage.getItem(UNIFIED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        const sanitized = sanitizeUnifiedCartLinesFromStorage(
          Array.isArray(parsed) ? parsed : []
        );
        if (sanitized.length > 0) setLines(sanitized);
      }
      let token = localStorage.getItem("momos_guest_cart_token");
      if (!token) {
        token = crypto.randomUUID();
        localStorage.setItem("momos_guest_cart_token", token);
      }
      setGuestCartToken(token);
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      if (lines.length === 0) localStorage.removeItem(UNIFIED_STORAGE_KEY);
      else localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [mounted, lines]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      if (guestCartToken)
        localStorage.setItem("momos_guest_cart_token", guestCartToken);
    } catch {
      /* ignore */
    }
  }, [mounted, guestCartToken]);

  const addFoodItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      const qty = item.quantity ?? 1;
      const key = getCartItemKey(item as CartItem);
      setLines((prev) => {
        const next = [...prev];
        const idx = next.findIndex(
          (l): l is UnifiedFoodLine => l.kind === "food" && foodLineKey(l) === key
        );
        if (idx >= 0) {
          const row = next[idx] as UnifiedFoodLine;
          next[idx] = { ...row, quantity: row.quantity + qty };
          return next;
        }
        const row: UnifiedFoodLine = {
          kind: "food",
          lineId: crypto.randomUUID(),
          id: item.id,
          variationId: item.variationId,
          name: item.name,
          price: item.price,
          quantity: qty,
          modifiers: item.modifiers,
          fulfillmentPipeline: "KITCHEN",
          pickupEligible: true,
          shippingEligible: false,
        };
        return [...next, row];
      });
    },
    []
  );

  const foodIndices = useCallback((prev: UnifiedCartLine[]) => {
    const indices: number[] = [];
    prev.forEach((l, i) => {
      if (l.kind === "food") indices.push(i);
    });
    return indices;
  }, []);

  const removeFoodLineAtIndex = useCallback((index: number) => {
    setLines((prev) => {
      const idxs = foodIndices(prev);
      const realIdx = idxs[index];
      if (realIdx === undefined) return prev;
      return prev.filter((_, i) => i !== realIdx);
    });
  }, [foodIndices]);

  const updateFoodQuantityAtIndex = useCallback(
    (index: number, delta: number) => {
      setLines((prev) => {
        const idxs = foodIndices(prev);
        const realIdx = idxs[index];
        if (realIdx === undefined) return prev;
        const copy = [...prev];
        const row = copy[realIdx] as UnifiedFoodLine;
        const q = Math.max(0, row.quantity + delta);
        if (q <= 0) copy.splice(realIdx, 1);
        else copy[realIdx] = { ...row, quantity: q };
        return copy;
      });
    },
    [foodIndices]
  );

  const clearFoodLines = useCallback(() => {
    setLines((prev) => prev.filter((l) => l.kind !== "food"));
  }, []);

  const addMerchLine = useCallback(
    (input: Omit<MerchCartLine, "lineId" | "type"> & { lineId?: string }) => {
      const variantSummary = input.variantSummary;
      const mergeKey = merchCartLineKey(input.productId, variantSummary);
      const fulfillmentSlug = input.fulfillmentSlug as MerchFulfillmentSlug;
      setLines((prev) => {
        const idx = prev.findIndex(
          (l): l is UnifiedMerchLine =>
            l.kind === "merch" &&
            merchCartLineKey(l.productId, l.variantSummary) === mergeKey
        );
        if (idx >= 0) {
          const row = prev[idx] as UnifiedMerchLine;
          const copy = [...prev];
          copy[idx] = { ...row, quantity: row.quantity + input.quantity };
          return copy;
        }
        const row: UnifiedMerchLine = {
          kind: "merch",
          lineId: input.lineId ?? crypto.randomUUID(),
          productId: input.productId,
          squareVariationId: input.squareVariationId,
          name: input.name,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          variantSummary,
          image: input.image,
          fulfillmentSlug,
          fulfillmentPipeline: "RETAIL",
          pickupEligible: true,
          shippingEligible: fulfillmentSlug !== "gift_card",
        };
        return [...prev, row];
      });
    },
    []
  );

  const setMerchQuantity = useCallback((lineId: string, quantity: number) => {
    setLines((prev) => {
      if (quantity < 1) return prev.filter((l) => !(l.kind === "merch" && l.lineId === lineId));
      return prev.map((l) =>
        l.kind === "merch" && l.lineId === lineId ? { ...l, quantity } : l
      );
    });
  }, []);

  const removeMerchLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => !(l.kind === "merch" && l.lineId === lineId)));
  }, []);

  const clearMerchLines = useCallback(() => {
    setLines((prev) => prev.filter((l) => l.kind !== "merch"));
  }, []);

  const clearAllLines = useCallback(() => setLines([]), []);

  const fulfillmentSummary = useMemo(() => buildFulfillmentSummary(lines), [lines]);

  const { foodCount, merchCount, totalCount, foodSubtotal, merchSubtotal, grandTotal } =
    useMemo(() => {
      let fc = 0;
      let mc = 0;
      let fs = 0;
      let ms = 0;
      for (const l of lines) {
        if (l.kind === "food") {
          fc += l.quantity;
          fs += getCartItemTotal(toCartItem(l));
        } else {
          mc += l.quantity;
          ms += l.unitPrice * l.quantity;
        }
      }
      return {
        foodCount: fc,
        merchCount: mc,
        totalCount: fc + mc,
        foodSubtotal: fs,
        merchSubtotal: ms,
        grandTotal: fs + ms,
      };
    }, [lines]);

  const value = useMemo(
    (): CommerceCartContextValue => ({
      lines,
      fulfillmentSummary,
      totalCount,
      foodCount,
      merchCount,
      foodSubtotal,
      merchSubtotal,
      grandTotal,
      drawerOpen,
      setDrawerOpen,
      guestCartToken,
      setGuestCartToken,
      addFoodItem,
      removeFoodLineAtIndex,
      updateFoodQuantityAtIndex,
      clearFoodLines,
      addMerchLine,
      setMerchQuantity,
      removeMerchLine,
      clearMerchLines,
      clearAllLines,
    }),
    [
      lines,
      fulfillmentSummary,
      totalCount,
      foodCount,
      merchCount,
      foodSubtotal,
      merchSubtotal,
      grandTotal,
      drawerOpen,
      guestCartToken,
      addFoodItem,
      removeFoodLineAtIndex,
      updateFoodQuantityAtIndex,
      clearFoodLines,
      addMerchLine,
      setMerchQuantity,
      removeMerchLine,
      clearMerchLines,
      clearAllLines,
    ]
  );

  return (
    <CommerceCartContext.Provider value={value}>{children}</CommerceCartContext.Provider>
  );
}

export function useCommerceCart(): CommerceCartContextValue {
  const ctx = useContext(CommerceCartContext);
  if (!ctx) throw new Error("useCommerceCart must be used within CommerceCartProvider");
  return ctx;
}

/** Legacy ordering UI — food-only surface backed by unified lines */
export function useFoodCartCompat(): {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, delta: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
} {
  const {
    lines,
    addFoodItem,
    removeFoodLineAtIndex,
    updateFoodQuantityAtIndex,
    clearFoodLines,
    foodSubtotal,
    foodCount,
  } = useCommerceCart();

  const items = useMemo(
    () => lines.filter((l): l is UnifiedFoodLine => l.kind === "food").map(toCartItem),
    [lines]
  );

  return useMemo(
    () => ({
      items,
      addItem: addFoodItem,
      removeItem: removeFoodLineAtIndex,
      updateQuantity: updateFoodQuantityAtIndex,
      clearCart: clearFoodLines,
      total: foodSubtotal,
      count: foodCount,
    }),
    [
      items,
      addFoodItem,
      removeFoodLineAtIndex,
      updateFoodQuantityAtIndex,
      clearFoodLines,
      foodSubtotal,
      foodCount,
    ]
  );
}

/** Legacy merch hooks — slice of unified cart */
export function useMerchCartCompat(): {
  lines: MerchCartLine[];
  count: number;
  subtotal: number;
  addMerchLine: (line: Omit<MerchCartLine, "lineId" | "type"> & { lineId?: string }) => void;
  setMerchQuantity: (lineId: string, quantity: number) => void;
  removeMerchLine: (lineId: string) => void;
  clearMerchCart: () => void;
} {
  const {
    lines,
    addMerchLine,
    setMerchQuantity,
    removeMerchLine,
    clearMerchLines,
    merchCount,
    merchSubtotal,
  } = useCommerceCart();

  const merchLines = useMemo(
    () => lines.filter((l): l is UnifiedMerchLine => l.kind === "merch").map(toMerchCartLine),
    [lines]
  );

  return useMemo(
    () => ({
      lines: merchLines,
      count: merchCount,
      subtotal: merchSubtotal,
      addMerchLine,
      setMerchQuantity,
      removeMerchLine,
      clearMerchCart: clearMerchLines,
    }),
    [
      merchLines,
      merchCount,
      merchSubtotal,
      addMerchLine,
      setMerchQuantity,
      removeMerchLine,
      clearMerchLines,
    ]
  );
}

export function useMerchCartCompatOptional():
  | {
      lines: MerchCartLine[];
      count: number;
      subtotal: number;
      addMerchLine: (
        line: Omit<MerchCartLine, "lineId" | "type"> & { lineId?: string }
      ) => void;
      setMerchQuantity: (lineId: string, quantity: number) => void;
      removeMerchLine: (lineId: string) => void;
      clearMerchCart: () => void;
    }
  | null {
  const ctx = useContext(CommerceCartContext);
  if (!ctx) return null;
  const merchLines = ctx.lines
    .filter((l): l is UnifiedMerchLine => l.kind === "merch")
    .map(toMerchCartLine);
  return {
    lines: merchLines,
    count: ctx.merchCount,
    subtotal: ctx.merchSubtotal,
    addMerchLine: ctx.addMerchLine,
    setMerchQuantity: ctx.setMerchQuantity,
    removeMerchLine: ctx.removeMerchLine,
    clearMerchCart: ctx.clearMerchLines,
  };
}
