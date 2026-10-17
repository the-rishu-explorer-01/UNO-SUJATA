import type { ProductImage as Img } from "@/types/catalog";

interface Props {
  image: Img | null;
  /** Eager loading for the first gallery image; everything else lazy. */
  eager?: boolean;
  className?: string;
}

/**
 * Lazy-loaded product image with reserved aspect ratio (prevents layout shift).
 * Falls back to a technical placeholder when no image is supplied.
 */
export default function ProductImage({ image, eager = false, className = "" }: Props) {
  if (!image) {
    return (
      <div className={`tech-grid flex aspect-[4/3] w-full items-center justify-center bg-bone ${className}`} role="img" aria-label="Image available on request">
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" className="text-ink/30">
          <circle cx="36" cy="36" r="24" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="36" cy="36" r="12" fill="none" stroke="#A9834A" strokeWidth="1.5" />
          <path d="M36 4v10M36 58v10M4 36h10M58 36h10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={image.url}
      alt={image.alt}
      width={image.width ?? 800}
      height={image.height ?? 600}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      className={`aspect-[4/3] w-full object-cover ${className}`}
    />
  );
}
