import { useState } from "react";
import { Upload, X, Loader2, AlertCircle, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductMediaSchema, ProductImageItem, ProductColorMedia } from "@/db";

export interface PendingMediaFile {
  file: File;
  target: "featured" | "color";
  colorName?: string;
}

export interface LocalProductImageItem extends ProductImageItem {
  file?: File;
}

interface ProductMediaManagerProps {
  productId?: number;
  media: ProductMediaSchema;
  inventory: Record<string, Record<string, { hex: string; qty: number; price?: number; mrp?: number }>>;
  onChange: (media: ProductMediaSchema, pendingFiles?: PendingMediaFile[], pendingDeletions?: string[]) => void;
  adminToken?: string;
  pendingDeletions?: string[];
}

function getApiBase() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function cloneMediaSchema(media?: ProductMediaSchema): ProductMediaSchema {
  const base = media || { featuredImages: [], colorVariants: [] };
  return {
    featuredImages: (base.featuredImages || []).map((img: LocalProductImageItem) => ({
      ...img,
      urls: img.urls ? { ...img.urls } : { card: "", gallery: "" },
      file: img.file,
    })),
    colorVariants: (base.colorVariants || []).map((cv) => ({
      ...cv,
      images: (cv.images || []).map((img: LocalProductImageItem) => ({
        ...img,
        urls: img.urls ? { ...img.urls } : { card: "", gallery: "" },
        file: img.file,
      })),
    })),
  };
}

export function ProductMediaManager({
  productId,
  media,
  inventory,
  onChange,
  adminToken,
  pendingDeletions = [],
}: ProductMediaManagerProps) {
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const featured = (media?.featuredImages || []) as LocalProductImageItem[];
  const colorVariantsMedia = media?.colorVariants || [];

  // Extract unique colors across all sizes in inventory
  const uniqueColorsMap = new Map<string, string>(); // colorName -> hex
  if (inventory && typeof inventory === "object") {
    Object.values(inventory).forEach((colorGroup) => {
      if (colorGroup && typeof colorGroup === "object") {
        Object.entries(colorGroup).forEach(([colorName, details]) => {
          if (colorName && !uniqueColorsMap.has(colorName)) {
            uniqueColorsMap.set(colorName, details?.hex || "#800000");
          }
        });
      }
    });
  }
  const colorNames = Array.from(uniqueColorsMap.keys());

  // Extract all pending un-uploaded files for new product mode
  const extractPendingFiles = (currentMedia: ProductMediaSchema): PendingMediaFile[] => {
    const files: PendingMediaFile[] = [];
    if (Array.isArray(currentMedia.featuredImages)) {
      for (const img of currentMedia.featuredImages as LocalProductImageItem[]) {
        if (img.file) {
          files.push({ file: img.file, target: "featured" });
        }
      }
    }
    if (Array.isArray(currentMedia.colorVariants)) {
      for (const cv of currentMedia.colorVariants) {
        if (Array.isArray(cv.images)) {
          for (const img of cv.images as LocalProductImageItem[]) {
            if (img.file) {
              files.push({ file: img.file, target: "color", colorName: cv.color });
            }
          }
        }
      }
    }
    return files;
  };

  const handleFileUpload = (file: File, target: "featured" | "color", colorName?: string) => {
    setErrorMsg(null);
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg(`File '${file.name}' exceeds the 2 MB maximum upload limit.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newItem: LocalProductImageItem = {
      id: genId(),
      file,
      urls: {
        card: previewUrl,
        gallery: previewUrl,
        original: previewUrl,
      },
      sortOrder: Date.now(),
    };

    const nextMedia: ProductMediaSchema = cloneMediaSchema(media);

    if (target === "featured") {
      if ((nextMedia.featuredImages || []).length >= 3) {
        setErrorMsg("Maximum limit of 3 featured images reached.");
        return;
      }
      nextMedia.featuredImages.push(newItem);
    } else if (colorName) {
      let cv = nextMedia.colorVariants.find((c) => c.color.toLowerCase().trim() === colorName.toLowerCase().trim());
      if (!cv) {
        cv = { color: colorName.trim(), images: [] };
        nextMedia.colorVariants.push(cv);
      }
      if (cv.images.length >= 5) {
        setErrorMsg(`Maximum limit of 5 images for color '${colorName}' reached.`);
        return;
      }
      cv.images.push(newItem);
    }

    onChange(nextMedia, extractPendingFiles(nextMedia), pendingDeletions);
  };

  const handleDeleteImage = (imageId: string) => {
    setErrorMsg(null);
    const nextMedia: ProductMediaSchema = cloneMediaSchema(media);
    let targetItem: LocalProductImageItem | undefined;

    const featuredIdx = nextMedia.featuredImages.findIndex((img) => img.id === imageId);
    if (featuredIdx !== -1) {
      targetItem = nextMedia.featuredImages[featuredIdx] as LocalProductImageItem;
      nextMedia.featuredImages.splice(featuredIdx, 1);
    } else {
      for (const cv of nextMedia.colorVariants) {
        const idx = cv.images.findIndex((img) => img.id === imageId);
        if (idx !== -1) {
          targetItem = cv.images[idx] as LocalProductImageItem;
          cv.images.splice(idx, 1);
          break;
        }
      }
    }

    // Track pending deletion if deleting an existing uploaded image (no local file)
    let nextDeletions = [...pendingDeletions];
    if (targetItem && !targetItem.file && imageId) {
      if (!nextDeletions.includes(imageId)) {
        nextDeletions.push(imageId);
      }
    }

    onChange(nextMedia, extractPendingFiles(nextMedia), nextDeletions);
  };

  const handleMoveImage = (target: "featured" | "color", imageId: string, direction: "left" | "right", colorName?: string) => {
    const nextMedia: ProductMediaSchema = cloneMediaSchema(media);

    let list: ProductImageItem[] = [];
    if (target === "featured") {
      list = nextMedia.featuredImages;
    } else if (colorName) {
      const cv = nextMedia.colorVariants.find((c) => c.color.toLowerCase() === colorName.toLowerCase());
      if (cv) list = cv.images;
    }

    const idx = list.findIndex((x) => x.id === imageId);
    if (idx === -1) return;

    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[newIdx];
    list[newIdx] = temp;

    onChange(nextMedia, extractPendingFiles(nextMedia), pendingDeletions);
  };

  return (
    <div className="space-y-6 bg-pink-50/40 border border-pink-100 rounded-2xl p-5">
      <div>
        <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wide flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Product Images (Featured & Color Variants)
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload JPEG, PNG, or WebP images from your computer. Max 2 MB per file.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 1. FEATURED IMAGES SECTION (MIN 2, MAX 3) ────────────────────── */}
      <div className="bg-white border border-pink-100 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-900 uppercase">Featured Images</span>
            <p className="text-[11px] text-muted-foreground">Main card &amp; search thumbnail images <span className="font-semibold text-rose-500">(Min 2, Max 3)</span></p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${featured.length < 2 ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-green-100 text-green-700 border border-green-200"}`}>
            {featured.length} / 3 {featured.length < 2 ? "(Min 2)" : "✓"}
          </span>
        </div>

        {/* Thumbnail Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {featured.map((img, idx) => (
            <div key={img.id} className="relative rounded-xl overflow-hidden border border-pink-200 bg-pink-50 aspect-square group shadow-sm">
              <img
                src={img.urls?.card || img.urls?.gallery}
                alt={`Featured ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id)}
                  className="w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                  title="Delete Image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Reorder controls */}
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between items-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveImage("featured", img.id, "left")}
                  className="w-5 h-5 bg-black/60 text-white rounded flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </span>
                <button
                  type="button"
                  disabled={idx === featured.length - 1}
                  onClick={() => handleMoveImage("featured", img.id, "right")}
                  className="w-5 h-5 bg-black/60 text-white rounded flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Upload Button Tile */}
          {featured.length < 3 && (
            <label className="relative rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 hover:bg-pink-50 aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
              {uploadingTarget === "featured" ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <>
                  <Upload className="w-5 h-5 text-rose-500" />
                  <span className="text-[11px] font-bold text-rose-700">+ Add Featured</span>
                  <span className="text-[9px] text-muted-foreground">Max 2 MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingTarget === "featured"}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, "featured");
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* ── 2. COLOR VARIANT IMAGES SECTION (MIN 1, MAX 5 PER COLOR) ──────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-rose-900 uppercase">Color Variant Gallery Images</h4>
          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md border border-pink-200">
            Min 1, Max 5 images per color
          </span>
        </div>

        {colorNames.length === 0 ? (
          <p className="text-xs text-rose-400 font-medium bg-white rounded-xl p-4 border border-pink-100 text-center">
            No colors found in inventory. Add color swatches under Product Variations above first to upload color-specific images.
          </p>
        ) : (
          colorNames.map((colorName) => {
            const hex = uniqueColorsMap.get(colorName) || "#800000";
            const cvObj = colorVariantsMedia.find(
              (c) => c.color.toLowerCase().trim() === colorName.toLowerCase().trim()
            );
            const images = (cvObj?.images || []) as LocalProductImageItem[];

            return (
              <div key={colorName} className="bg-white border border-pink-100 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: hex }} />
                    <span className="text-xs font-bold text-rose-900">{colorName} Color Gallery</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${images.length < 1 ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"}`}>
                    {images.length} / 5 {images.length < 1 ? "(Min 1)" : "✓"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {images.map((img, idx) => (
                    <div key={img.id} className="relative rounded-xl overflow-hidden border border-pink-200 bg-pink-50 aspect-square group shadow-sm">
                      <img
                        src={img.urls?.card || img.urls?.gallery}
                        alt={`${colorName} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors z-10"
                        title="Delete Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Reorder controls */}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between items-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage("color", img.id, "left", colorName)}
                          className="w-5 h-5 bg-black/60 text-white rounded flex items-center justify-center disabled:opacity-30"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          disabled={idx === images.length - 1}
                          onClick={() => handleMoveImage("color", img.id, "right", colorName)}
                          className="w-5 h-5 bg-black/60 text-white rounded flex items-center justify-center disabled:opacity-30"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {images.length < 5 && (
                    <label className="relative rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 hover:bg-pink-50 aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
                      {uploadingTarget === `color-${colorName}` ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-rose-500" />
                          <span className="text-[11px] font-bold text-rose-700">+ Add {colorName}</span>
                          <span className="text-[9px] text-muted-foreground">Max 2 MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingTarget === `color-${colorName}`}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f, "color", colorName);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
