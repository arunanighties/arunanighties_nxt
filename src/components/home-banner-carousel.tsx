import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/components/admin/image-uploader";
import { useListPublicHomeBanners } from "@workspace/api-client-react";

const AUTOPLAY_INTERVAL_MS = 5000;

export function HomeBannerCarousel({ fallback }: { fallback?: React.ReactNode }) {
  const { data: bannersData, isLoading } = useListPublicHomeBanners();
  const banners = Array.isArray(bannersData) ? bannersData : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const total = banners.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setDirection("right");
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setDirection("left");
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Autoplay timer
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [total, isPaused, nextSlide]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      prevSlide();
    } else if (e.key === "ArrowRight") {
      nextSlide();
    }
  };

  if (isLoading) {
    return (
      <section className="relative w-full h-[460px] md:h-[560px] lg:h-[640px] xl:h-[700px] bg-rose-50 animate-pulse flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-primary animate-spin" />
      </section>
    );
  }

  // If no publishable banners are returned from API, render fallback static Hero
  if (total === 0) {
    return fallback ? <>{fallback}</> : null;
  }

  const current = banners[currentIndex] || banners[0];
  const desktopImg = resolveImageUrl(current.desktopImageUrl);
  const mobileImg = resolveImageUrl(current.mobileImageUrl);
  const isExternalLink = current.linkType === "external";
  const targetUrl = current.ctaUrl || "/new-arrivals";

  const slideVariants: any = {
    initial: (dir: "left" | "right") => ({
      opacity: 0,
      x: dir === "right" ? 100 : -100,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
    exit: (dir: "left" | "right") => ({
      opacity: 0,
      x: dir === "right" ? -100 : 100,
      transition: { duration: 0.5, ease: "easeIn" },
    }),
  };

  return (
    <section
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-label="Promotional Hero Banners Carousel"
      className="relative w-full overflow-hidden bg-rose-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[460px] md:min-h-[560px] lg:min-h-[640px] xl:min-h-[700px] 2xl:min-h-[750px] flex items-center"
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current.id || currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0 w-full h-full"
        >
          {/* Responsive Picture element */}
          <picture className="w-full h-full block">
            <source media="(max-width: 767px)" srcSet={mobileImg} />
            <img
              src={desktopImg}
              alt={current.title || "Promotional Banner"}
              className="w-full h-full object-cover object-center"
            />
          </picture>

          {/* Overlay gradient for contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent md:from-black/75 md:via-black/35" />

          {/* Slide Text Content Container */}
          <div className="container mx-auto px-4 md:px-8 relative z-10 h-full flex items-center">
            <div className="max-w-xl py-12 md:py-20 lg:py-28 text-white space-y-4 md:space-y-6 animate-in fade-in slide-in-from-left-6 duration-500">
              {current.title && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/25 text-rose-200 border border-rose-400/30 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Special Offer
                </span>
              )}

              {current.title && (
                <h1 className="font-serif text-3xl md:text-5xl font-bold leading-tight drop-shadow-md">
                  {current.title}
                </h1>
              )}

              {current.subtitle && (
                <p className="text-sm md:text-lg text-rose-100/90 leading-relaxed max-w-lg drop-shadow">
                  {current.subtitle}
                </p>
              )}

              {current.ctaText && (
                <div className="pt-3">
                  {isExternalLink ? (
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Button
                        size="lg"
                        className="bg-primary text-white hover:bg-primary/90 rounded-full px-8 h-12 font-semibold shadow-lg shadow-rose-900/40 text-base flex items-center gap-2 group"
                      >
                        {current.ctaText}{" "}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </a>
                  ) : (
                    <Link href={targetUrl}>
                      <Button
                        size="lg"
                        className="bg-primary text-white hover:bg-primary/90 rounded-full px-8 h-12 font-semibold shadow-lg shadow-rose-900/40 text-base flex items-center gap-2 group"
                      >
                        {current.ctaText}{" "}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls (Only if > 1 banner) */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous banner slide"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-md hover:scale-105"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next banner slide"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-md hover:scale-105"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Pagination Indicators */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {banners.map((b, idx) => (
              <button
                key={b.id || idx}
                type="button"
                onClick={() => {
                  setDirection(idx > currentIndex ? "right" : "left");
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to banner slide ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "w-8 bg-primary shadow-sm"
                    : "w-2.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
