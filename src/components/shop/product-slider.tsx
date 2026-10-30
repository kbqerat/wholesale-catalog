"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal row of product cards with a visible scrollbar and arrow
 * buttons. Arrows are physical (left/right), so they work the same in RTL.
 */
export function ProductSlider({
  label,
  prevLabel,
  nextLabel,
  children,
}: {
  label: string;
  prevLabel: string;
  nextLabel: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [rtl, setRtl] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // scrollLeft is 0 at the start edge and negative in RTL.
    const update = () => {
      const max = list.scrollWidth - list.clientWidth;
      const rtl = getComputedStyle(list).direction === "rtl";
      const left = rtl ? max + list.scrollLeft : list.scrollLeft;
      setRtl(rtl);
      setCanLeft(left > 1);
      setCanRight(left < max - 1);
    };
    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scroll = (direction: -1 | 1) => {
    const list = listRef.current;
    if (list) list.scrollBy({ left: direction * list.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/3 z-10 hidden size-10 items-center justify-center rounded-full border border-line-strong bg-surface/95 shadow-md hover:bg-canvas sm:flex";

  return (
    <div className="relative">
      {canLeft && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label={rtl ? nextLabel : prevLabel}
          className={`${arrow} -left-3`}
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
      )}
      <ul
        ref={listRef}
        aria-label={label}
        className="product-slider flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 sm:gap-4"
      >
        {children}
      </ul>
      {canRight && (
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label={rtl ? prevLabel : nextLabel}
          className={`${arrow} -right-3`}
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      )}
    </div>
  );
}
