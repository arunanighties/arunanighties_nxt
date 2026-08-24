import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/components/admin/image-uploader";
import { Monitor, Smartphone, ArrowRight, Sparkles } from "lucide-react";

interface BannerPreviewModalProps {
  open: boolean;
  onClose: () => void;
  banner: any | null;
}

export function BannerPreviewModal({
  open,
  onClose,
  banner,
}: BannerPreviewModalProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  if (!banner) return null;

  const desktopImg = resolveImageUrl(banner.desktopImageUrl);
  const mobileImg = resolveImageUrl(banner.mobileImageUrl);
  const title = banner.title || "Summer Nighties Collection";
  const subtitle = banner.subtitle || "Premium pure cotton nightgowns designed for maximum comfort.";
  const ctaText = banner.ctaText || "Shop Now";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 text-white border-slate-800 rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <DialogTitle className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-400" />
              Banner Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Preview how this hero banner will render on storefront devices.
            </DialogDescription>
          </div>

          {/* Device Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "desktop"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "mobile"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center">
          {viewMode === "desktop" ? (
            /* Desktop Container */
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl relative">
              <div className="relative w-full h-[360px] flex items-center overflow-hidden">
                {/* Background Image */}
                <img
                  src={desktopImg}
                  alt={title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark Gradient Overlay for Contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

                {/* Banner Content */}
                <div className="relative z-10 p-8 max-w-md space-y-3">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold tracking-wider uppercase">
                    Featured Promotion
                  </span>
                  <h2 className="text-3xl font-serif font-bold text-white leading-tight">
                    {title}
                  </h2>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {subtitle}
                  </p>
                  {banner.ctaText && (
                    <div className="pt-2">
                      <Button className="bg-rose-600 text-white hover:bg-rose-700 rounded-full px-6 h-10 text-sm font-semibold shadow-lg flex items-center gap-2">
                        {ctaText} <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Mobile Mockup Device Frame */
            <div className="w-[320px] rounded-[36px] p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl relative">
              <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-2" />
              <div className="w-full rounded-[24px] overflow-hidden border border-slate-800 bg-slate-950 relative h-[420px] flex flex-col justify-end p-5">
                {/* Mobile Image */}
                <img
                  src={mobileImg}
                  alt={title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                <div className="relative z-10 space-y-2 text-left">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/30 text-[10px] font-semibold uppercase">
                    Mobile Hero
                  </span>
                  <h3 className="text-xl font-serif font-bold text-white leading-tight">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-3">
                    {subtitle}
                  </p>
                  {banner.ctaText && (
                    <div className="pt-2">
                      <Button className="w-full bg-rose-600 text-white hover:bg-rose-700 rounded-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 shadow">
                        {ctaText} <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
