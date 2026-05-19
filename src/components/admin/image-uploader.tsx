import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Upload, X, Crop as CropIcon, Check, AlertCircle,
  Loader2, ImageIcon, Eye, Link as LinkIcon, FileImage,
} from "lucide-react";

const MIN_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
const MIN_IMAGES = 3;
const MAX_IMAGES = 30;
const CROP_ASPECT = 1; // 1:1 square
const MIN_OUTPUT_PX = 1080; // HD minimum

import { getApiBase } from "@/lib/api-config";

const apiBase = getApiBase;

/* ── Types ─────────────────────────────────────────────────────────── */
interface ImageEntry {
  id: string;
  blob?: Blob;
  name: string;
  previewUrl: string;
  status: "needs_crop" | "uploading" | "done" | "error" | "url";
  progress: number;
  objectPath?: string; // Object Storage path OR external URL
  errorMsg?: string;
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ── Upload helpers ─────────────────────────────────────────────────── */
async function requestPresignedUrl(blob: Blob, name: string, adminToken: string) {
  const res = await fetch(`${apiBase()}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name, size: blob.size, contentType: blob.type || "image/webp" }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json() as Promise<{ uploadURL: string; objectPath: string }>;
}

function uploadToGCS(blob: Blob, url: string, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", blob.type || "image/webp");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(blob);
  });
}

/* ── Canvas helpers ─────────────────────────────────────────────────── */
/**
 * Render the cropped region onto a canvas at HD resolution (≥ MIN_OUTPUT_PX),
 * export as WebP quality=1.0, fallback to PNG (lossless).
 */
function getCroppedBlob(imgEl: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> {
  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;
  const srcW = Math.round(pixelCrop.width * scaleX);
  const srcH = Math.round(pixelCrop.height * scaleY);
  // Output at least MIN_OUTPUT_PX; never downscale what's already larger
  const outSize = Math.max(MIN_OUTPUT_PX, srcW, srcH);

  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    imgEl,
    pixelCrop.x * scaleX, pixelCrop.y * scaleY, srcW, srcH,
    0, 0, outSize, outSize,
  );

  return new Promise((resolve, reject) => {
    // Try WebP at 100% quality first (no compression artifacts)
    canvas.toBlob((b) => {
      if (b) return resolve(b);
      // PNG fallback (lossless)
      canvas.toBlob((b2) => b2 ? resolve(b2) : reject(new Error("Canvas export failed")), "image/png");
    }, "image/webp", 1.0);
  });
}

/** Small 240px preview for the live preview panel (fast, doesn't affect final quality) */
async function buildPreviewDataUrl(imgEl: HTMLImageElement, pixelCrop: PixelCrop): Promise<string> {
  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    imgEl,
    pixelCrop.x * scaleX, pixelCrop.y * scaleY,
    pixelCrop.width * scaleX, pixelCrop.height * scaleY,
    0, 0, 240, 240,
  );
  return canvas.toDataURL("image/jpeg", 0.92);
}

/* ── Public helper (used by admin-dashboard too) ─────────────────────── */
export function resolveImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("/objects/")) return `${apiBase()}/api/storage${path}`;
  return path;
}

/* ── Component ──────────────────────────────────────────────────────── */
interface ImageUploaderProps {
  initialObjectPaths?: string[];
  onChange: (objectPaths: string[]) => void;
  adminToken: string;
}

type UploadTab = "file" | "url";

export function ImageUploader({ initialObjectPaths = [], onChange, adminToken }: ImageUploaderProps) {
  const [entries, setEntries] = useState<ImageEntry[]>(() =>
    initialObjectPaths.map((op) => ({
      id: genId(), name: op, previewUrl: resolveImageUrl(op),
      status: "url" as const, progress: 100, objectPath: op,
    })),
  );

  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");

  /* Notify parent whenever "done" list changes */
  const doneObjectPaths = entries
    .filter((e) => (e.status === "done" || e.status === "url") && e.objectPath)
    .map((e) => e.objectPath!);

  useEffect(() => { onChange(doneObjectPaths); }, [JSON.stringify(doneObjectPaths)]);

  /* ── URL input flow ─────────────────────────────────────────────────── */
  const addImageUrl = () => {
    setUrlError("");
    const url = urlInput.trim();
    if (!url) { setUrlError("Please enter an image URL."); return; }
    if (!/^https?:\/\//i.test(url)) { setUrlError("URL must start with http:// or https://"); return; }
    if (entries.length >= MAX_IMAGES) { setUrlError("Maximum images reached."); return; }
    const id = genId();
    setEntries((prev) => [...prev, {
      id, name: url, previewUrl: url,
      status: "url" as const, progress: 100, objectPath: url,
    }]);
    setUrlInput("");
  };

  const handleRemove = (id: string) => {
    setEntries((prev) => {
      const e = prev.find((x) => x.id === id);
      if (e?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(e.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  /* ── Derived state ──────────────────────────────────────────────────── */
  const doneCount = entries.filter((e) => e.status === "done" || e.status === "url").length;
  const canAddMore = entries.length < MAX_IMAGES;

  return (
    <div className="space-y-3">
      {/* ── URL input ──────────────────────────────────────────────── */}
      {canAddMore && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
              onKeyDown={(e) => e.key === "Enter" && addImageUrl()}
              placeholder="https://example.com/image.jpg"
              className="flex-1 border border-pink-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-pink-50/30"
            />
            <button
              type="button"
              onClick={addImageUrl}
              className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 rounded-xl transition-colors shrink-0"
            >
              Add
            </button>
          </div>
          {urlError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {urlError}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Paste a direct image URL (CDN, Unsplash, etc.).
          </p>
        </div>
      )}

      {/* ── Thumbnail grid ──────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="relative rounded-xl overflow-hidden border border-pink-100 bg-pink-50 aspect-square group">
              <img
                src={entry.previewUrl}
                alt=""
                className="w-full h-full object-cover"
                style={{ imageRendering: "auto" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
              />

              <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                <Check className="w-3 h-3 text-white" strokeWidth={2} />
              </div>

              <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(entry.id); }} className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors">
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1.5 right-1.5 min-w-[18px] h-[18px] bg-black/50 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Progress indicator ──────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${doneCount >= MIN_IMAGES ? "text-green-600" : "text-orange-500"}`}>
          {doneCount}/{MIN_IMAGES} required · {doneCount}/{MAX_IMAGES} added
        </span>
      </div>
    </div>
  );
}
