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

const CART_STORAGE_KEY = "momos_cart";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, delta: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function cartItemKey(item: CartItem): string {
  const modKey = item.modifiers?.map((m) => m.id).sort().join(",") ?? "";
  return `${item.id}:${modKey}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore invalid JSON
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      if (items.length === 0) {
        localStorage.removeItem(CART_STORAGE_KEY);
      } else {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      // ignore storage errors
    }
  }, [mounted, items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      const qty = item.quantity ?? 1;
      const key = cartItemKey(item as CartItem);
      setItems((prev) => {
        const existing = prev.find((c) => cartItemKey(c) === key);
        if (existing) {
          return prev.map((c) =>
            cartItemKey(c) === key
              ? { ...c, quantity: c.quantity + qty }
              : c
          );
        }
        return [...prev, { ...item, quantity: qty }];
      });
    },
    []
  );

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index].quantity = Math.max(0, next[index].quantity + delta);
      if (next[index].quantity <= 0) {
        next.splice(index, 1);
      }
      return next;
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0;
        return sum + (item.price + modTotal) * item.quantity;
      }, 0),
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      count,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, total, count]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
