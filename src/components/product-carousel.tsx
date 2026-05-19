import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";

interface CarouselProduct {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  stock: number;
  description: string;
  rating?: string;
  reviewCount?: number;
  sectionId?: number | null;
  categoryId?: number | null;
}

interface ProductCarouselProps {
  products: CarouselProduct[];
}

export function ProductCarousel({ products = [] }: ProductCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
    active: Array.isArray(products) && products.length > 0
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const updateButtons = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    emblaApi.on("scroll", updateButtons);
    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
      emblaApi.off("scroll", updateButtons);
    };
  }, [emblaApi, updateButtons]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className="relative group">
      {/* Left arrow */}
      <button
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Scroll left"
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 rounded-full bg-white border border-pink-200 shadow-md shadow-rose-100 flex items-center justify-center text-rose-600 transition-all duration-200
          ${canScrollPrev ? "opacity-100 hover:bg-pink-50 hover:border-primary hover:shadow-rose-200 active:scale-95" : "opacity-0 pointer-events-none"}
          hidden md:flex`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Viewport */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-4 pb-2">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="flex-none w-[200px] sm:w-[220px] md:w-[240px]"
            >
              <ProductCard
                product={product as Parameters<typeof ProductCard>[0]["product"]}
                index={index}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Right arrow */}
      <button
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Scroll right"
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 rounded-full bg-white border border-pink-200 shadow-md shadow-rose-100 flex items-center justify-center text-rose-600 transition-all duration-200
          ${canScrollNext ? "opacity-100 hover:bg-pink-50 hover:border-primary hover:shadow-rose-200 active:scale-95" : "opacity-0 pointer-events-none"}
          hidden md:flex`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
