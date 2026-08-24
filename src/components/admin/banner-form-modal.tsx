import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle, Sparkles } from "lucide-react";
import { getApiBase } from "@/lib/api-config";
import { resolveImageUrl } from "@/components/admin/image-uploader";
import type { HomeBanner } from "@workspace/api-client-react";


const apiBase = getApiBase;
const MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface BannerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: any | null;
}

export function BannerFormModal({
  open,
  onClose,
  onSave,
  initialData,
}: BannerFormModalProps) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [desktopImageUrl, setDesktopImageUrl] = useState("");
  const [mobileImageUrl, setMobileImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [linkType, setLinkType] = useState<"internal" | "external">("internal");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");

  const [desktopUploading, setDesktopUploading] = useState(false);
  const [mobileUploading, setMobileUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setSubtitle(initialData.subtitle || "");
      setDesktopImageUrl(initialData.desktopImageUrl || "");
      setMobileImageUrl(initialData.mobileImageUrl || "");
      setCtaText(initialData.ctaText || "");
      setCtaUrl(initialData.ctaUrl || "");
      setLinkType(initialData.linkType === "external" ? "external" : "internal");
      setSortOrder(typeof initialData.sortOrder === "number" ? initialData.sortOrder : 0);
      setIsActive(initialData.isActive !== false);

      setStartsAt(
        initialData.startsAt
          ? new Date(initialData.startsAt).toISOString().slice(0, 16)
          : ""
      );
      setEndsAt(
        initialData.endsAt
          ? new Date(initialData.endsAt).toISOString().slice(0, 16)
          : ""
      );
    } else {
      setTitle("");
      setSubtitle("");
      setDesktopImageUrl("");
      setMobileImageUrl("");
      setCtaText("");
      setCtaUrl("");
      setLinkType("internal");
      setSortOrder(0);
      setIsActive(true);
      setStartsAt("");
      setEndsAt("");
    }
    setErrorMsg(null);
  }, [initialData, open]);

  const tempBannerIdRef = useRef<string | null>(null);

  const getBannerIdForUpload = () => {
    if (initialData?.id) return String(initialData.id);
    if (!tempBannerIdRef.current) {
      tempBannerIdRef.current = `banner-${Date.now()}`;
    }
    return tempBannerIdRef.current;
  };

  const uploadFileToStorage = async (file: File, variant: "desktop" | "mobile"): Promise<string | null> => {
    if (file.size > MAX_BANNER_SIZE_BYTES) {
      throw new Error(`File '${file.name}' exceeds maximum 5 MB upload size limit.`);
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error(`File '${file.name}' format is unsupported. Please use JPEG, PNG, or WebP.`);
    }

    const bannerId = getBannerIdForUpload();
    const customPath = `home-banners/${bannerId}/${variant}`;

    const urlRes = await fetch(`${apiBase()}/api/storage/uploads/request-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type,
        customPath,
      }),
    });

    if (!urlRes.ok) {
      throw new Error("Failed to request upload URL from server.");
    }

    const resData = await urlRes.json();
    const uploadURL = resData.uploadURL;
    const objectPath = resData.objectPath;

    const upRes = await fetch(uploadURL, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!upRes.ok) {
      throw new Error("Failed to upload image binary to Storage.");
    }

    // Return R2 public CDN URL if returned by server, otherwise relative object path
    return resData.url || objectPath;
  };

  const handleDesktopFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setDesktopUploading(true);
    try {
      const path = await uploadFileToStorage(file, "desktop");
      if (path) setDesktopImageUrl(path);
    } catch (err: any) {
      setErrorMsg(err.message || "Desktop image upload failed.");
    } finally {
      setDesktopUploading(false);
      if (desktopInputRef.current) desktopInputRef.current.value = "";
    }
  };

  const handleMobileFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setMobileUploading(true);
    try {
      const path = await uploadFileToStorage(file, "mobile");
      if (path) setMobileImageUrl(path);
    } catch (err: any) {
      setErrorMsg(err.message || "Mobile image upload failed.");
    } finally {
      setMobileUploading(false);
      if (mobileInputRef.current) mobileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!desktopImageUrl) {
      setErrorMsg("Desktop Banner Image is required.");
      return;
    }
    if (!mobileImageUrl) {
      setErrorMsg("Mobile Banner Image is required.");
      return;
    }

    if (startsAt && endsAt) {
      const s = new Date(startsAt).getTime();
      const eDate = new Date(endsAt).getTime();
      if (eDate < s) {
        setErrorMsg("End Date/Time must be greater than or equal to Start Date/Time.");
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        desktopImageUrl,
        mobileImageUrl,
        ctaText: ctaText.trim() || null,
        ctaUrl: ctaUrl.trim() || null,
        linkType,
        sortOrder: Number(sortOrder) || 0,
        isActive,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save banner.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-pink-100 rounded-2xl p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif font-bold text-rose-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {initialData ? "Edit Home Banner" : "Create Home Banner"}
          </DialogTitle>
          <DialogDescription className="text-xs text-rose-700/70">
            Configure promotional banner images, scheduling, CTAs, and publication status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── Banner Info ─────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 border-b border-pink-100 pb-1">
              Banner Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title" className="text-xs font-semibold text-rose-900">
                  Title (Optional)
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Summer Cotton Collection"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 border-pink-200 focus-visible:ring-primary text-sm"
                />
              </div>

              <div>
                <Label htmlFor="subtitle" className="text-xs font-semibold text-rose-900">
                  Subtitle (Optional)
                </Label>
                <Input
                  id="subtitle"
                  placeholder="e.g. Premium handcrafted nighties starting from ₹499"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="mt-1 border-pink-200 focus-visible:ring-primary text-sm"
                />
              </div>
            </div>
          </div>

          {/* ── Images Section ────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 border-b border-pink-100 pb-1">
              Banner Images (Max 5 MB each)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Desktop Image */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-rose-900 flex items-center justify-between">
                  <span>Desktop Banner Image *</span>
                  <span className="text-[10px] text-rose-400 font-normal">Aspect ratio ~16:6</span>
                </Label>

                <input
                  ref={desktopInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleDesktopFileSelect}
                />

                {desktopImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-pink-200 bg-pink-50 h-36 group shadow-sm">
                    <img
                      src={resolveImageUrl(desktopImageUrl)}
                      alt="Desktop Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setDesktopImageUrl("")}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                      Desktop View
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => !desktopUploading && desktopInputRef.current?.click()}
                    className="border-2 border-dashed border-pink-200 bg-pink-50/40 hover:bg-pink-50/80 hover:border-primary/50 rounded-xl h-36 flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center"
                  >
                    {desktopUploading ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-primary mb-1" />
                        <p className="text-xs font-bold text-rose-900">Upload Desktop Image</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG, WebP (Max 5 MB)</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Image */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-rose-900 flex items-center justify-between">
                  <span>Mobile Banner Image *</span>
                  <span className="text-[10px] text-rose-400 font-normal">Aspect ratio ~4:5 / 1:1</span>
                </Label>

                <input
                  ref={mobileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleMobileFileSelect}
                />

                {mobileImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-pink-200 bg-pink-50 h-36 group shadow-sm max-w-[200px] mx-auto md:mx-0">
                    <img
                      src={resolveImageUrl(mobileImageUrl)}
                      alt="Mobile Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setMobileImageUrl("")}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                      Mobile View
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => !mobileUploading && mobileInputRef.current?.click()}
                    className="border-2 border-dashed border-pink-200 bg-pink-50/40 hover:bg-pink-50/80 hover:border-primary/50 rounded-xl h-36 flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center"
                  >
                    {mobileUploading ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-primary mb-1" />
                        <p className="text-xs font-bold text-rose-900">Upload Mobile Image</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">JPEG, PNG, WebP (Max 5 MB)</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Call To Action ────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 border-b border-pink-100 pb-1">
              Call To Action (CTA)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ctaText" className="text-xs font-semibold text-rose-900">
                  CTA Button Text
                </Label>
                <Input
                  id="ctaText"
                  placeholder="e.g. Shop Now"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="mt-1 border-pink-200 focus-visible:ring-primary text-sm"
                />
              </div>

              <div>
                <Label htmlFor="ctaUrl" className="text-xs font-semibold text-rose-900">
                  Destination URL
                </Label>
                <Input
                  id="ctaUrl"
                  placeholder="e.g. /collections/cotton-nighties or https://..."
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  className="mt-1 border-pink-200 focus-visible:ring-primary text-sm"
                />
              </div>

              <div>
                <Label htmlFor="linkType" className="text-xs font-semibold text-rose-900">
                  Link Type
                </Label>
                <Select
                  value={linkType}
                  onValueChange={(val: "internal" | "external") => setLinkType(val)}
                >
                  <SelectTrigger className="mt-1 border-pink-200 text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Route (SPA)</SelectItem>
                    <SelectItem value="external">External Link (_blank)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Display Settings & Scheduling ───────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 border-b border-pink-100 pb-1">
              Display & Scheduling
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div>
                <Label htmlFor="sortOrder" className="text-xs font-semibold text-rose-900">
                  Display Sort Order
                </Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 border-pink-200 focus-visible:ring-primary text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive" className="text-xs font-semibold text-rose-900 cursor-pointer">
                  {isActive ? "Active (Publishable)" : "Inactive (Draft)"}
                </Label>
              </div>

              <div>
                <Label htmlFor="startsAt" className="text-xs font-semibold text-rose-900">
                  Start Date / Time (Optional)
                </Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-1 border-pink-200 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="endsAt" className="text-xs font-semibold text-rose-900">
                  End Date / Time (Optional)
                </Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1 border-pink-200 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-pink-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="border-pink-200 text-rose-700 hover:bg-pink-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || desktopUploading || mobileUploading}
              className="bg-primary text-white hover:bg-primary/90 min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Save Banner"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
