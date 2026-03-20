"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSwipeToCloseOptions {
  onClose: () => void;
  enabled?: boolean;
  direction?: "down" | "left" | "right";
  /** For "down": only start drag when this scroll container is at top */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  threshold?: number;
}

const DEFAULT_THRESHOLD = 100;

export function useSwipeToClose({
  onClose,
  enabled = true,
  direction = "down",
  scrollContainerRef,
  threshold = DEFAULT_THRESHOLD,
}: UseSwipeToCloseOptions) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const currentOffsetRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const getTranslate = useCallback(
    (offset: number) => {
      if (direction === "down") {
        return `translateY(${Math.max(0, offset)}px)`;
      }
      if (direction === "right") {
        return `translateX(${Math.max(0, -offset)}px)`;
      }
      return `translateX(${Math.min(0, offset)}px)`;
    },
    [direction]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      if (direction === "down" && scrollContainerRef?.current) {
        if (scrollContainerRef.current.scrollTop > 0) {
          return;
        }
      }
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      isDragging.current = true;
    },
    [enabled, direction, scrollContainerRef]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !isDragging.current) return;
      const deltaY = e.touches[0].clientY - startY.current;
      const deltaX = e.touches[0].clientX - startX.current;

      const offset = direction === "down" ? deltaY : deltaX;
      currentOffsetRef.current = offset;
      setDragOffset(offset);
    },
    [enabled, direction]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const offset = currentOffsetRef.current;
    const shouldClose =
      direction === "down"
        ? offset >= threshold
        : direction === "right"
          ? offset <= -threshold
          : offset <= -threshold;

    if (shouldClose) {
      setIsAnimating(true);
      setDragOffset(
        direction === "down" ? 9999 : direction === "right" ? -9999 : -9999
      );
      onClose();
      setTimeout(() => {
        if (mountedRef.current) {
          setDragOffset(0);
          setIsAnimating(false);
        }
      }, 300);
    } else {
      setDragOffset(0);
    }
  }, [direction, threshold, onClose]);

  const style: React.CSSProperties =
    dragOffset !== 0
      ? {
          transform: getTranslate(dragOffset),
          transition: isAnimating ? "transform 0.3s ease-out" : "none",
          touchAction: "pan-y",
        }
      : { touchAction: "pan-y" };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    style,
  };
}
