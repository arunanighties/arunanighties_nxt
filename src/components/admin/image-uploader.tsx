import { useState, useEffect, useRef } from "react";
import { Upload, X, Check, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { getApiBase } from "@/lib/api-config";

const apiBase = getApiBase;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const MAX_IMAGES = 30;

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

export function getProductFirstImage(product: any): string | null {
  if (!product) return null;

  const extractUrl = (item: any): string | null => {
    if (!item) return null;
    if (typeof item === "string" && item.trim().length > 0) return item.trim();
    if (typeof item === "object") {
      const u = item.urls?.card || item.urls?.gallery || item.urls?.original || item.url;
      if (typeof u === "string" && u.trim().length > 0) return u.trim();
    }
    return null;
  };

  // 1. Check media (featuredImages first, then colorVariants)
  let media = product.media;
  if (typeof media === "string" && media.trim().length > 0) {
    try { media = JSON.parse(media); } catch { media = null; }
  }

  if (media && typeof media === "object") {
    // Check featuredImages first
    if (Array.isArray(media.featuredImages) && media.featuredImages.length > 0) {
      for (const img of media.featuredImages) {
        const url = extractUrl(img);
        if (url) return url;
      }
    }

    // Check colorVariants next
    if (Array.isArray(media.colorVariants) && media.colorVariants.length > 0) {
      for (const cv of media.colorVariants) {
        if (Array.isArray(cv?.images) && cv.images.length > 0) {
          for (const img of cv.images) {
            const url = extractUrl(img);
            if (url) return url;
          }
        }
      }
    }
  }

  // 2. Check direct imageUrl property on product
  if (typeof product.imageUrl === "string" && product.imageUrl.trim().length > 0) {
    return product.imageUrl.trim();
  }

  // 3. Check images array property on product
  let images = product.images;
  if (typeof images === "string" && images.trim().length > 0) {
    try { images = JSON.parse(images); } catch { images = []; }
  }
  if (Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      const url = extractUrl(img);
      if (url) return url;
    }
  }

  return null;
}

export interface ImageEntry {
  id: string;
  file?: File;
  previewUrl: string;
  objectPath?: string;
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface ImageUploaderProps {
  initialObjectPaths?: string[];
  onChange: (objectPaths: string[]) => void;
  onFilesSelected?: (files: File[]) => void;
  adminToken: string;
}

export function ImageUploader({
  initialObjectPaths = [],
  onChange,
  onFilesSelected,
  adminToken,
}: ImageUploaderProps) {
  const [entries, setEntries] = useState<ImageEntry[]>(() =>
    initialObjectPaths.map((op) => ({
      id: genId(),
      previewUrl: resolveImageUrl(op),
      objectPath: op,
    }))
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Notify parent whenever list changes */
  useEffect(() => {
    const donePaths = entries
      .map((e) => e.objectPath || e.previewUrl)
      .filter(Boolean);
    onChange(donePaths);

    const files = entries.map((e) => e.file).filter((f): f is File => !!f);
    if (onFilesSelected) {
      onFilesSelected(files);
    }
  }, [entries]);

  const handleFiles = (files: FileList | File[]) => {
    setErrorMsg(null);
    const fileArray = Array.from(files);

    if (entries.length + fileArray.length > MAX_IMAGES) {
      setErrorMsg(`Maximum limit of ${MAX_IMAGES} images reached.`);
      return;
    }

    const validNewEntries: ImageEntry[] = [];

    for (const file of fileArray) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrorMsg(`File '${file.name}' exceeds maximum 5 MB upload size limit.`);
        continue;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setErrorMsg(`File '${file.name}' format is unsupported. Please use JPEG, PNG, or WebP.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      validNewEntries.push({
        id: genId(),
        file,
        previewUrl,
        objectPath: previewUrl,
      });
    }

    if (validNewEntries.length > 0) {
      setEntries((prev) => [...prev, ...validNewEntries]);
    }
  };

  const handleRemove = (id: string) => {
    setEntries((prev) => {
      const e = prev.find((x) => x.id === id);
      if (e?.previewUrl && e.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(e.previewUrl);
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const canAddMore = entries.length < MAX_IMAGES;

  return (
    <div className="space-y-3">
      {/* ── Drag & Drop / File Input Box ────────────────────────────── */}
      {canAddMore && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
              handleFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
            isDragging
              ? "border-primary bg-rose-50/80 ring-2 ring-primary/20"
              : "border-pink-200 bg-pink-50/40 hover:bg-pink-50/80 hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                handleFiles(e.target.files);
              }
              e.target.value = "";
            }}
          />

          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-primary mb-1">
            <Upload className="w-5 h-5" />
          </div>

          <p className="text-xs font-bold text-rose-900">
            Click to upload images from your computer
          </p>
          <p className="text-[11px] text-muted-foreground">
            or drag & drop JPEG, PNG, or WebP files here (Max 5 MB per file)
          </p>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-red-600 flex items-center gap-1 font-medium bg-red-50 p-2 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          {errorMsg}
        </p>
      )}

      {/* ── Thumbnail Grid ──────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
          {entries.map((entry, idx) => (
            <div
              key={entry.id}
              className="relative rounded-xl overflow-hidden border border-pink-200 bg-pink-50 aspect-square group shadow-sm"
            >
              <img
                src={entry.previewUrl}
                alt={`Image ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                }}
              />

              <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(entry.id);
                }}
                className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>

              <span className="absolute bottom-1.5 right-1.5 min-w-[18px] h-[18px] bg-black/60 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Counter ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={entries.length >= 3 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
          {entries.length} / 3 min required · {entries.length} / {MAX_IMAGES} added
        </span>
      </div>
    </div>
  );
}
