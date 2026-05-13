"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type ForwardedRef,
  type ReactNode,
} from "react";

export type CommerceCategoryScrollRailProps = {
  children: ReactNode;
  /** Wrapper — use for layout around the scroll track */
  className?: string;
  /** Classes on the horizontally scrolling element */
  scrollClassName?: string;
  role?: string;
  "aria-label"?: string;
};

function assignForwardedRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/**
 * Horizontal strip with scroll-linked edge fades (cream rail). Disabled when content does not overflow.
 */
const CommerceCategoryScrollRail = forwardRef<
  HTMLDivElement,
  CommerceCategoryScrollRailProps
>(function CommerceCategoryScrollRail(
  {
    children,
    className = "",
    scrollClassName = "",
    role,
    "aria-label": ariaLabel,
  },
  ref
) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      assignForwardedRef(ref, node);
      setScrollEl(node);
    },
    [ref]
  );

  const updateFades = useCallback(() => {
    const el = scrollEl;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const eps = 4;
    const overflow = maxScroll > eps;
    setFadeLeft(overflow && scrollLeft > eps);
    setFadeRight(overflow && scrollLeft < maxScroll - eps);
  }, [scrollEl]);

  useEffect(() => {
    if (!scrollEl) return;
    updateFades();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateFades);
    });
    ro.observe(scrollEl);
    scrollEl.addEventListener("scroll", updateFades, { passive: true });
    window.addEventListener("resize", updateFades, { passive: true });
    return () => {
      ro.disconnect();
      scrollEl.removeEventListener("scroll", updateFades);
      window.removeEventListener("resize", updateFades);
    };
  }, [scrollEl, updateFades]);

  return (
    <div className={`relative min-w-0 ${className}`.trim()}>
      <div
        ref={setRefs}
        className={scrollClassName.trim()}
        role={role}
        aria-label={ariaLabel}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-9 bg-gradient-to-r from-cream from-35% via-cream/60 to-transparent transition-opacity duration-300 ease-out sm:w-11 ${
          fadeLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-9 bg-gradient-to-l from-cream from-35% via-cream/60 to-transparent transition-opacity duration-300 ease-out sm:w-11 ${
          fadeRight ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
});

export default CommerceCategoryScrollRail;
