import Image from "next/image";
import { ImageOff } from "lucide-react";

/** Product photo, or a neutral placeholder when the product has none. */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  noPhotoLabel,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  noPhotoLabel: string;
  className?: string;
}) {
  return (
    <div className={`relative aspect-square overflow-hidden bg-[#efebe4] ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
          <ImageOff aria-hidden className="size-8" strokeWidth={1.5} />
          <span className="text-xs">{noPhotoLabel}</span>
        </div>
      )}
    </div>
  );
}
