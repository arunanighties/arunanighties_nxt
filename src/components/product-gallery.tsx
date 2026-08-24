import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getApiBase } from "@/lib/api-config";

export const apiBase = getApiBase;

const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-3d4081bfb09f4b9d836da7e4edca0bf3.r2.dev").replace(/\/+$/, "");

export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const cleanKey = trimmed.replace(/^\/?(objects\/)?/, "");
  return `${R2_PUBLIC_URL}/${cleanKey}`;
}

function ImageWithFallback({
  src,
  alt,
  className = "",
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-pink-50 to-rose-100 p-4 ${className}`}>
        <svg viewBox="0 0 100 160" className="w-16 h-28 text-rose-300 opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50" cy="18" rx="12" ry="13" fill="currentColor" opacity="0.5" />
          <path d="M42 30 Q50 36 58 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <path d="M30 32 Q22 38 18 50 L12 140 Q50 152 88 140 L82 50 Q78 38 70 32 Q60 30 50 31 Q40 30 30 32Z" fill="currentColor" opacity="0.25" />
          <path d="M30 32 Q15 40 10 55 Q18 60 28 52 Q30 42 36 36Z" fill="currentColor" opacity="0.3" />
          <path d="M70 32 Q85 40 90 55 Q82 60 72 52 Q70 42 64 36Z" fill="currentColor" opacity="0.3" />
          <path d="M12 140 Q50 155 88 140" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        </svg>
        <span className="text-[10px] font-semibold text-rose-400 tracking-wide uppercase">Aruna Nighties</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
    />
  );
}

interface ProductGalleryProps {
  images: string[];
  productName: string;
  className?: string;
}

export function ProductGallery({ images: rawImages, productName, className = "" }: ProductGalleryProps) {
  const images = typeof rawImages === "string" ? (() => { try { return JSON.parse(rawImages); } catch { return []; } })() : (Array.isArray(rawImages) ? rawImages : []);
  const resolvedImages = (images || []).map(resolveImageUrl).filter(Boolean);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: resolvedImages.length > 1, 
    dragFree: false,
    active: resolvedImages.length > 1
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  const scrollPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    emblaApi?.scrollNext();
  }, [emblaApi]);

  if (resolvedImages.length === 0) {
    return (
      <div className={`w-full h-full ${className}`}>
        <ImageWithFallback src="" alt={productName} className="w-full h-full object-cover" />
      </div>
    );
  }

  if (resolvedImages.length === 1) {
    return (
      <div className={`w-full h-full ${className}`}>
        <ImageWithFallback
          src={resolvedImages[0]}
          alt={productName}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden group ${className}`}>
      <div ref={emblaRef} className="overflow-hidden h-full">
        <div className="flex h-full">
          {resolvedImages.map((src: string, i: number) => (
            <div key={i} className="flex-none w-full h-full">
              <ImageWithFallback
                src={src}
                alt={`${productName} - ${i + 1}`}
                className="w-full h-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={scrollPrev}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 hover:bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-4 h-4 text-rose-700" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 hover:bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Next image"
      >
        <ChevronRight className="w-4 h-4 text-rose-700" />
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
        {resolvedImages.map((_: string, i: number) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); emblaApi?.scrollTo(i); }}
            className={`h-1.5 rounded-full transition-all ${i === selectedIndex ? "w-4 bg-white shadow-sm" : "w-1.5 bg-white/60"}`}
            aria-label={`Image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
