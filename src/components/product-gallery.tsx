import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getApiBase } from "@/lib/api-config";

export const apiBase = getApiBase;

export function resolveImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("/objects/")) {
    return `${apiBase()}/api/storage${path}`;
  }
  return path;
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

  if (resolvedImages.length === 0) return null;

  if (resolvedImages.length === 1) {
    return (
      <div className={`w-full h-full ${className}`}>
        <img
          src={resolvedImages[0]}
          alt={productName}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          style={{ imageRendering: "auto" }}
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
              <img
                src={src}
                alt={`${productName} - ${i + 1}`}
                className="w-full h-full object-cover"
                style={{ imageRendering: "auto" }}
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
