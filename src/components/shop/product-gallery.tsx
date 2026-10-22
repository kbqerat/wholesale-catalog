"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/product-image";
import { useI18n } from "@/components/i18n-provider";

/** Swipeable photo strip (scroll-snap) with thumbnail buttons. */
export function ProductGallery({ images, name, dimmed }: { images: string[]; name: string; dimmed: boolean }) {
  const { dict, t } = useI18n();
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const alt = t(dict.product.photoOf, { name });

  if (images.length <= 1) {
    return (
      <ProductImage
        src={images[0]}
        alt={alt}
        priority
        sizes="(min-width: 768px) 50vw, 100vw"
        noPhotoLabel={dict.product.noPhoto}
        className={`rounded-2xl border border-line ${dimmed ? "opacity-60 grayscale" : ""}`}
      />
    );
  }

  function goTo(index: number) {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActive(index);
  }

  return (
    <div className="space-y-2">
      <div
        ref={trackRef}
        className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-line ${dimmed ? "opacity-60 grayscale" : ""}`}
        onScroll={(e) => {
          const el = e.currentTarget;
          const index = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
          if (index !== active) setActive(index);
        }}
      >
        {images.map((src, index) => (
          <div key={src} className="relative aspect-square w-full shrink-0 snap-center bg-[#efebe4]">
            <Image
              src={src}
              alt={`${alt} — ${t(dict.product.photoNumber, { index: index + 1, total: images.length })}`}
              fill
              priority={index === 0}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => goTo(index)}
            aria-label={t(dict.product.photoNumber, { index: index + 1, total: images.length })}
            aria-current={index === active}
            className={`relative size-16 shrink-0 overflow-hidden rounded-lg border-2 ${
              index === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <Image src={src} alt="" fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
