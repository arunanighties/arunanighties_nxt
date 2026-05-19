import { useEffect, useState, useRef, Fragment } from "react";
import { useLocation } from "wouter";
import {
  ShoppingBag, Package, ClipboardList, Loader2, ArrowRight,
  Star, Camera, X, CheckCircle2, AlertCircle, RefreshCw,
  User, Phone, Mail, Save, Edit2, XCircle, MapPin, Eye,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { parseTrackingData } from "../utils/tracking";

import { Navbar } from "@/components/layout/navbar";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/user";
import { getApiBase } from "@/lib/api-config";
import { TrackingTimelineModal } from "../components/orders/TrackingTimelineModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

function formatINR(n: number | string) {
  const num = typeof n === "string" ? parseFloat(n) : n;
  return `₹${num.toLocaleString("en-IN")}`;
}

interface OrderItem {
  id?: number;
  name: string;
  qty?: number;
  quantity?: number;
  price?: number;
  imageUrl?: string;
  image?: string;
  size?: string;
  color?: string;
}

interface Order {
  id: number;
  userId: number | null;
  customerName: string;
  phone: string | null;
  items: string | null;
  address: string | null;
  total: string;
  status: string;
  awbNumber?: string;
  createdAt: string;
  shippingDetails?: any;
  paymentStatus?: string;
}

interface UserProfile {
  id: number;
  phone: string;
  name: string | null;
  email: string | null;
  addresses: string | null;
}


const REVIEWED_KEY = "aruna_reviewed_items";

const apiBase = getApiBase;

function getReviewedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(REVIEWED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch { return new Set(); }
}

function markReviewed(key: string) {
  const s = getReviewedSet();
  s.add(key);
  localStorage.setItem(REVIEWED_KEY, JSON.stringify([...s]));
}

// ─── Order Status Bar ───────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: "ordered",          label: "Order Placed",     icon: "📦" },
  { key: "processing",       label: "Processing",       icon: "🧵" },
  { key: "shipped",          label: "Shipped",          icon: "🚚" },
  { key: "in transit",       label: "In Transit",       icon: "✈️" },
  { key: "out for delivery", label: "Out for Delivery", icon: "🛵" },
  { key: "delivered",        label: "Delivered",        icon: "✅" },
];

function OrderStatusBar({ status, trackingData, createdAt, shippingDetails }: { status: string, trackingData?: any, createdAt: string, shippingDetails?: any }) {
  const isCancelledByAdmin = status.toLowerCase() === "cancelled by admin";
  if (status.toLowerCase() === "cancelled" || isCancelledByAdmin) {
    let cancelReason = "";
    if (isCancelledByAdmin && shippingDetails) {
      try {
        const details = typeof shippingDetails === "string" ? JSON.parse(shippingDetails) : shippingDetails;
        cancelReason = details?.cancelReason || "";
      } catch {}
    }
    return (
      <div className="flex flex-col gap-1.5 px-5 py-4 bg-red-50/50 border-b border-red-100">
        <div className="flex items-center gap-2">
          <XCircle className="w-4.5 h-4.5 text-red-500 flex-none" />
          <span className="text-sm font-bold text-red-600">
            {isCancelledByAdmin ? "Order Cancelled by Admin" : "Order Cancelled"}
          </span>
        </div>
        {isCancelledByAdmin && (
          <div className="mt-1 pl-6 space-y-1.5 text-xs text-red-700">
            {cancelReason && (
              <p className="font-semibold">
                Reason: <span className="font-normal italic">"{cancelReason}"</span>
              </p>
            )}
            <p className="font-semibold text-red-800">
              Note: Refund will be credited in 5-7 working days.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Rank-based status calculation to find the "furthest" step reached
  const statusRanks: Record<string, number> = {
    'pending': 0, 'confirmed': 0,
    'processing': 1,
    'shipped': 2,
    'on the way': 3, 'in transit': 3,
    'out for delivery': 4,
    'delivered': 5, 'completed': 5
  };

  const xpressRanks: Record<string, number> = {
    'ordered': 1,
    'pending pickup': 2,
    'in transit': 3,
    'out for delivery': 4,
    'delivered': 5
  };

  let currentIdx = statusRanks[status.toLowerCase()] ?? 0;

  // If we have live tracking, take the maximum rank reached
  if (trackingData) {
    const timeline = parseTrackingData(trackingData, createdAt);
    const shippingEvents = timeline.filter(e => e.id !== "initial");
    const latestEvent = shippingEvents[0]; // newest first

    if (latestEvent && latestEvent.ship_status) {
      const liveRank = xpressRanks[latestEvent.ship_status.toLowerCase()] ?? 0;
      currentIdx = Math.max(currentIdx, liveRank);
    }
  }

  return (
    <div className="px-4 py-3 border-b border-pink-50 bg-white">
      <div className="flex items-start justify-between relative">
        {/* connecting line */}
        <div className="absolute top-3 left-0 right-0 flex items-center px-[calc(10%)] z-0">
          <div className="w-full h-0.5 bg-pink-100 relative overflow-hidden rounded-full">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {STATUS_STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1 z-10 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all ${
                  done
                    ? "bg-primary text-white shadow-sm shadow-rose-200"
                    : active
                    ? "bg-primary text-white ring-4 ring-pink-100 shadow-md shadow-rose-200"
                    : "bg-pink-50 border-2 border-pink-100 text-pink-300"
                }`}
              >
                {done ? "✓" : step.icon}
              </div>
              <span
                className={`text-[9px] font-semibold text-center leading-tight whitespace-nowrap ${
                  active ? "text-primary" : done ? "text-rose-500" : "text-rose-300"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Star Selector ──────────────────────────────────────────────────────
function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star className={`w-7 h-7 transition-colors ${n <= (hover || value) ? "fill-yellow-400 text-yellow-400" : "fill-none text-rose-200"}`} />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm font-semibold text-rose-700">
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
        </span>
      )}
    </div>
  );
}

// ─── Review Form ────────────────────────────────────────────────────────
interface ReviewFormProps {
  orderId: number;
  productId: number;
  productName: string;
  user: { id: number; name: string | null; phone: string };
  onDone: (key: string) => void;
  onCancel: () => void;
}

function ReviewForm({ orderId, productId, productName, user, onDone, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - images.length).slice(0, 3);
    const combined = [...images, ...files].slice(0, 3);
    setImages(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (i: number) => {
    const next = images.filter((_, idx) => idx !== i);
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const urlRes = await fetch(`${apiBase()}/api/storage/uploads/request-url`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) return null;
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
      const upRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!upRes.ok) return null;
      return objectPath;
    } catch { return null; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    if (comment.trim().length < 5) { setError("Please write at least a few words."); return; }
    setError("");
    setSubmitting(true);

    const uploadedUrls: string[] = [];
    for (const file of images) {
      const url = await uploadImage(file);
      if (url) uploadedUrls.push(url);
    }

    try {
      const res = await fetch(`${apiBase()}/api/products/${productId}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, userName: user.name ?? `User ${user.id}`, rating, title: title.trim(), comment: comment.trim(), imageUrls: uploadedUrls }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Failed to submit review."); return;
      }
      toast({ title: "Review submitted!", description: `Thank you for reviewing ${productName}.` });
      const key = `${orderId}:${productId}`;
      markReviewed(key);
      onDone(key);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-pink-50/60 border border-pink-200 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-bold text-rose-900">Your Review for <span className="text-primary">{productName}</span></p>
      <div>
        <label className="block text-xs font-semibold text-rose-700 mb-1">Star Rating *</label>
        <StarSelector value={rating} onChange={setRating} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-rose-700 mb-1">Review Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summarise your experience" maxLength={120}
          className="w-full border border-pink-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-rose-700 mb-1">Review Comment *</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share details of your experience..." rows={3}
          className="w-full border border-pink-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300 resize-none" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-rose-700 mb-2">Add Photos (optional, max 3)</label>
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-pink-200">
              <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-pink-300 flex flex-col items-center justify-center gap-0.5 text-rose-400 hover:border-primary hover:text-primary transition-colors">
              <Camera className="w-5 h-5" />
              <span className="text-[9px] font-semibold">Add</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-none" />{error}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-pink-200 text-rose-600 text-sm font-semibold hover:bg-pink-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting…</> : "Post Review"}
        </button>
      </div>
    </form>
  );
}

// ─── Order Item Card ──────────────────────────────────────────────────────
function OrderItemCard({ order, user, reviewedSet, setReviewedSet, activeForm, setActiveForm, handleCancel, cancelling, setTrackingModalOrder, productsMap }: { 
  order: Order, 
  user: any, 
  reviewedSet: Set<string>, 
  setReviewedSet: any, 
  activeForm: string | null, 
  setActiveForm: any,
  handleCancel: any,
  cancelling: number | null,
  setTrackingModalOrder: any,
  productsMap: Record<number, string>
}) {
  const { data: trackingResponse } = useQuery({
    queryKey: ["order-tracking", order.id],
    queryFn: async () => {
      const res = await fetch(`${getApiBase()}/api/orders/${order.id}/track`);
      if (!res.ok) throw new Error("Failed to fetch tracking");
      return res.json();
    },
    enabled: !!order.awbNumber,
    refetchInterval: 30000, // Refresh every 30s
  });

  const trackingData = trackingResponse?.tracking?.tracking_data;
  let parsedItems: OrderItem[] = [];
  try { parsedItems = JSON.parse(order.items ?? "[]"); } catch {}
  const derivedStatus = (() => {
    const dbStatus = order.status.toLowerCase();
    if (dbStatus === "cancelled by admin") {
      return "Cancelled by Admin";
    }
    if (dbStatus === "cancelled") {
      return "Cancelled";
    }

    const statusRanks: Record<string, number> = {
      'pending': 0, 'confirmed': 0, 'processing': 1, 'shipped': 2,
      'on the way': 3, 'in transit': 3, 'out for delivery': 4,
      'delivered': 5, 'completed': 5
    };
    const xpressRanks: Record<string, number> = {
      'ordered': 1, 'pending pickup': 2, 'in transit': 3, 'out for delivery': 4, 'delivered': 5
    };
    
    let currentIdx = statusRanks[dbStatus] ?? 0;

    // RULE: If DB status is already "On the Way" or further, trust it absolutely.
    if (currentIdx >= 3) {
      const steps = ['Order Placed', 'Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];
      return steps[currentIdx] || order.status;
    }

    // Otherwise, allow tracking data to UPGRADE the status if it's currently 'shipped' (rank 2)
    if (trackingData && dbStatus === 'shipped') {
      const timeline = parseTrackingData(trackingData, order.createdAt);
      const shipEvent = timeline.filter(e => e.id !== "initial")[0];
      if (shipEvent?.ship_status) {
        const liveRank = xpressRanks[shipEvent.ship_status.toLowerCase()] ?? 0;
        currentIdx = Math.max(currentIdx, liveRank);
      }
    }

    const steps = ['Order Placed', 'Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];
    return steps[currentIdx] || order.status;
  })();

  const isDelivered = order.status.toLowerCase() === "delivered";
  const cancellableStatuses = ["pending", "confirmed", "processing"];
  const canCancel = cancellableStatuses.includes(order.status.toLowerCase()) && cancelling !== order.id;

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
      {/* Order header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-pink-50/40 border-b border-pink-50">
        <div>
          <p className="font-bold text-primary text-sm">Order #{String(order.id).padStart(4, "0")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canCancel && (
            <button
              onClick={() => handleCancel(order)}
              disabled={cancelling === order.id}
              className="text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </button>
          )}
          <p className="font-bold text-rose-700 text-sm">{formatINR(order.total)}</p>
        </div>
      </div>

      {/* Status bar */}
      <OrderStatusBar status={order.status} trackingData={trackingData} createdAt={order.createdAt} shippingDetails={order.shippingDetails} />

      {/* Current Status Badge & Tracking Link */}
      <div className="px-5 py-2.5 bg-rose-50/30 flex items-center justify-between border-b border-pink-50">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] font-bold text-rose-900 uppercase tracking-[0.1em]">
            Current Status: <span className="text-primary">{derivedStatus}</span>
          </p>
        </div>
        {(order.awbNumber || order.status.toLowerCase() === "cancelled by admin") && (
          <button 
            onClick={() => setTrackingModalOrder({ 
              id: order.id, 
              awb: order.awbNumber || "", 
              createdAt: order.createdAt, 
              trackingData,
              status: order.status,
              shippingDetails: order.shippingDetails
            })}
            className="text-[10px] font-bold text-primary hover:text-primary/80 hover:underline flex items-center gap-1 transition-colors uppercase tracking-wider"
          >
            View Time Line <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="px-5 py-4 space-y-3">
        {parsedItems.length > 0 ? (
          parsedItems.map((item, i) => {
            const reviewKey = `${order.id}:${item.id}`;
            const alreadyReviewed = item.id ? reviewedSet.has(reviewKey) : false;
            const isFormOpen = activeForm === reviewKey;

            return (
              <div key={i}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1 min-w-0">
                    {(item.imageUrl || item.image || (item.id ? productsMap[item.id] : null)) ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-pink-100 flex-shrink-0 bg-pink-50">
                        <img 
                          src={item.imageUrl || item.image || (item.id ? productsMap[item.id] : undefined)} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-pink-100 flex-shrink-0 bg-pink-50 flex items-center justify-center">
                        <Package className="w-6 h-6 text-pink-200" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-bold text-rose-900 text-sm line-clamp-2">{item.name}</p>
                      <p className="text-[10px] text-rose-400 font-bold uppercase mt-0.5 tracking-wider">
                        {item.size || "DEFAULT"} / {item.color || "ANY"} — Qty: {item.qty || item.quantity || 1}
                      </p>
                      {item.price && (
                        <p className="text-rose-700 font-bold text-xs mt-1">
                          {formatINR(item.price * (item.qty ?? item.quantity ?? 1))}
                        </p>
                      )}
                    </div>
                  </div>
                  {isDelivered && item.id && (
                    alreadyReviewed ? (
                      <span className="flex-none flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Reviewed
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveForm(isFormOpen ? null : reviewKey)}
                        className={`flex-none flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          isFormOpen ? "bg-pink-50 border-rose-300 text-rose-600" : "border-primary text-primary hover:bg-primary/5"
                        }`}
                      >
                        <Star className="w-3 h-3" />
                        {isFormOpen ? "Cancel" : "Rate & Review"}
                      </button>
                    )
                  )}
                </div>
                {isFormOpen && item.id && !alreadyReviewed && (
                  <ReviewForm
                    orderId={order.id} productId={item.id} productName={item.name} user={user}
                    onDone={(key) => { setReviewedSet((prev: any) => new Set([...prev, key])); setActiveForm(null); }}
                    onCancel={() => setActiveForm(null)}
                  />
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">No item details available.</p>
        )}
      </div>

      {order.address && (
        <div className="px-5 pb-4 text-xs text-muted-foreground flex items-start gap-1.5">
          <span className="text-rose-300 mt-0.5">📍</span>
          <span>{order.address}</span>
        </div>
      )}


      {isDelivered && parsedItems.some((item) => item.id && !reviewedSet.has(`${order.id}:${item.id}`)) && (
        <div className="px-5 pb-4">
          <p className="text-xs text-rose-500 bg-pink-50 border border-pink-100 rounded-xl px-3 py-2">
            ✨ Your order is delivered! Click <strong>Rate &amp; Review</strong> next to each item to share your experience.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Orders Tab ─────────────────────────────────────────────────────────
function OrdersTab({ user }: { user: { id: number; phone: string; name?: string | null } }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewedSet, setReviewedSet] = useState<Set<string>>(getReviewedSet);
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [trackingModalOrder, setTrackingModalOrder] = useState<{ id: number; awb: string; createdAt: string; trackingData?: any; status?: string; shippingDetails?: any } | null>(null);
  const [productsMap, setProductsMap] = useState<Record<number, string>>({});
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);

  useEffect(() => {
    fetch(`${apiBase()}/api/products`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) {
          const map: Record<number, string> = {};
          data.forEach((p: any) => {
            if (p.id && p.imageUrl) {
              map[p.id] = p.imageUrl;
            }
          });
          setProductsMap(map);
        }
      })
      .catch(() => {});
  }, []);

  const fetchOrders = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (user.id) params.set("userId", String(user.id));
    if (user.phone) params.set("phone", user.phone);

    fetch(`${apiBase()}/api/orders/my?${params.toString()}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: Order[]) => {
        if (Array.isArray(data)) {
          const unique = Array.from(new Map(data.map((o) => [o.id, o])).values());
          setOrders(unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      })
      .catch(() => toast({ variant: "destructive", title: "Network error loading orders." }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    const handleVisibility = () => { if (document.visibilityState === "visible") fetchOrders(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const handleCancel = (order: Order) => {
    setCancellingOrder(order);
    setCancelConfirmId("");
  };

  const confirmCancellation = async () => {
    if (!cancellingOrder) return;
    setCancelSaving(true);
    setCancelling(cancellingOrder.id);
    try {
      const res = await fetch(`${apiBase()}/api/orders/${cancellingOrder.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, phone: user.phone }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast({ variant: "destructive", title: err.error ?? "Could not cancel order." });
        return;
      }
      toast({ title: "Order cancelled successfully." });
      setCancellingOrder(null);
      fetchOrders();
    } catch {
      toast({ variant: "destructive", title: "Network error. Please try again." });
    } finally {
      setCancelSaving(false);
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-pink-100 shadow-sm py-20 text-center px-6">
        <Package className="w-16 h-16 mx-auto text-rose-100 mb-4" />
        <h2 className="font-serif text-2xl font-bold text-rose-900 mb-2">No orders yet</h2>
        <p className="text-muted-foreground text-sm mb-6">Browse our beautiful nightwear collection and place your first order!</p>
        <button onClick={() => setLocation("/")}
          className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors inline-flex items-center gap-2">
          Shop Now <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const ORDERS_PER_PAGE = 20;
  const paginatedOrders = orders.slice((ordersCurrentPage - 1) * ORDERS_PER_PAGE, ordersCurrentPage * ORDERS_PER_PAGE);
  const totalOrderPages = Math.ceil(orders.length / ORDERS_PER_PAGE);

  return (
    <div className="space-y-4">
      {paginatedOrders.map((order) => (
        <OrderItemCard 
          key={order.id}
          order={order}
          user={user}
          reviewedSet={reviewedSet}
          setReviewedSet={setReviewedSet}
          activeForm={activeForm}
          setActiveForm={setActiveForm}
          handleCancel={handleCancel}
          cancelling={cancelling}
          setTrackingModalOrder={setTrackingModalOrder}
          productsMap={productsMap}
        />
      ))}

      {totalOrderPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-pink-100 pt-6 mt-2 gap-4">
          <p className="text-xs text-rose-500 font-medium">
            Showing {(ordersCurrentPage - 1) * ORDERS_PER_PAGE + 1} to {Math.min(ordersCurrentPage * ORDERS_PER_PAGE, orders.length)} of {orders.length} orders
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrdersCurrentPage(p => Math.max(1, p - 1))}
              disabled={ordersCurrentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-pink-200 text-xs font-semibold text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalOrderPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalOrderPages || Math.abs(p - ordersCurrentPage) <= 1)
                .map((p, i, arr) => (
                    <Fragment key={`page-wrapper-${p}`}>
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="text-rose-300 px-1">...</span>}
                      <button
                        onClick={() => setOrdersCurrentPage(p)}
                        className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition-colors ${
                          ordersCurrentPage === p 
                            ? "bg-primary text-white shadow-sm" 
                            : "text-rose-600 hover:bg-pink-50 border border-transparent hover:border-pink-200"
                        }`}
                      >
                        {p}
                      </button>
                    </Fragment>
                ))}
            </div>
            <button
              onClick={() => setOrdersCurrentPage(p => Math.min(totalOrderPages, p + 1))}
              disabled={ordersCurrentPage === totalOrderPages}
              className="px-3 py-1.5 rounded-xl border border-pink-200 text-xs font-semibold text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {trackingModalOrder && (
        <TrackingTimelineModal 
          isOpen={!!trackingModalOrder}
          onClose={() => setTrackingModalOrder(null)}
          orderId={trackingModalOrder.id}
          awbNumber={trackingModalOrder.awb}
          createdAt={trackingModalOrder.createdAt}
          prefetchedTrackingData={trackingModalOrder.trackingData}
          orderStatus={trackingModalOrder.status}
          shippingDetails={trackingModalOrder.shippingDetails}
        />
      )}

      {/* Cancellation Safeguard Modal */}
      <Dialog open={!!cancellingOrder} onOpenChange={(open) => !open && setCancellingOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-900 font-serif">Cancel Order</DialogTitle>
            <DialogDescription className="text-rose-400 text-sm">
              Are you sure you want to cancel this order? This action cannot be undone. Please type <strong className="text-rose-900">#{String(cancellingOrder?.id).padStart(4, "0")}</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">Order ID Confirmation</label>
            <input 
              type="text" 
              placeholder={`Type ${String(cancellingOrder?.id).padStart(4, "0")} here`}
              value={cancelConfirmId}
              onChange={(e) => setCancelConfirmId(e.target.value)}
              className="w-full border border-pink-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900 placeholder:text-rose-200"
            />
          </div>
          <DialogFooter className="gap-2">
            <button 
              onClick={() => setCancellingOrder(null)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-50 transition-colors"
            >
              Go Back
            </button>
            <button 
              disabled={cancelConfirmId !== String(cancellingOrder?.id).padStart(4, "0") || cancelSaving}
              onClick={confirmCancellation}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-200 text-white font-bold rounded-xl px-6 py-2 text-sm flex items-center gap-2 transition-all"
            >
              {cancelSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Cancellation"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Profile Details Tab ────────────────────────────────────────────────
function ProfileTab({ user: authUser }: { user: { id: number; phone: string; name?: string | null } }) {
  const { toast } = useToast();
  const { handleLogin } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  
  // New state for addresses
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddrIdx, setEditingAddrIdx] = useState<number | null>(null);
  const [addrForm, setAddrForm] = useState({ label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });

  useEffect(() => {
    fetch(`${apiBase()}/api/users/${authUser.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: UserProfile | null) => {
        if (data) {
          setProfile(data);
          setForm({ name: data.name ?? "", email: data.email ?? "" });
          try {

            const parsed = JSON.parse(data.addresses || "[]");
            setSavedAddresses(Array.isArray(parsed) ? parsed : []);
          } catch { setSavedAddresses([]); }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authUser.id]);

  const saveAddress = async () => {
    if (!addrForm.fullName || !addrForm.phone || !addrForm.line1 || !addrForm.city || !addrForm.pincode) {
      toast({ variant: "destructive", title: "Please fill all required address fields." });
      return;
    }
    if (addrForm.phone.length !== 10) {
      toast({ variant: "destructive", title: "Validation Error", description: "Phone number must be exactly 10 digits." });
      return;
    }
    
    let next = [...savedAddresses];
    if (editingAddrIdx !== null) {
      next[editingAddrIdx] = addrForm;
    } else {
      next.push(addrForm);
    }
    
    try {
      const res = await fetch(`${apiBase()}/api/users/${authUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: JSON.stringify(next) }),
      });
      if (!res.ok) throw new Error();
      setSavedAddresses(next);
      setShowAddrForm(false);
      toast({ title: "Address saved!" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save address." });
    }
  };

  const deleteAddress = async (idx: number) => {
    if (!confirm("Remove this address?")) return;
    const next = savedAddresses.filter((_, i) => i !== idx);
    try {
      const res = await fetch(`${apiBase()}/api/users/${authUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: JSON.stringify(next) }),
      });
      if (!res.ok) throw new Error();
      setSavedAddresses(next);
      toast({ title: "Address removed." });
    } catch {
      toast({ variant: "destructive", title: "Failed to remove address." });
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${apiBase()}/api/users/${authUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast({ variant: "destructive", title: err.error ?? "Failed to save profile." });
        return;
      }
      const updated: UserProfile = await res.json();
      setProfile(updated);
      setForm({ name: updated.name ?? "", email: updated.email ?? "" });
      // Sync updated name to localStorage session
      handleLogin({ id: updated.id, phone: updated.phone, name: updated.name }, false);
      setEditing(false);
      toast({ title: "Profile updated successfully!" });
    } catch {
      toast({ variant: "destructive", title: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayData = profile ?? { name: authUser.name ?? null, phone: authUser.phone, email: null };

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
      {/* Profile header */}
      <div className="px-6 py-5 bg-gradient-to-br from-pink-50 to-rose-50 border-b border-pink-100 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-none">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-bold text-rose-900 text-lg leading-tight truncate">
            {displayData.name || "Aruna Customer"}
          </h3>
          <p className="text-sm text-muted-foreground truncate">+91 {displayData.phone}</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-primary border border-primary/30 bg-white px-3 py-1.5 rounded-full hover:bg-pink-50 transition-colors"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        )}
      </div>

        {/* Form */}
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-rose-700 mb-1.5 uppercase tracking-wide">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                <input
                  type="text"
                  value={editing ? form.name : (displayData.name ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={!editing}
                  placeholder="Enter your full name"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:bg-pink-50/40 disabled:text-rose-700 disabled:cursor-default border-pink-200"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-rose-700 mb-1.5 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                <input
                  type="email"
                  value={editing ? form.email : (displayData.email ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={!editing}
                  placeholder="your@email.com (optional)"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:bg-pink-50/40 disabled:text-rose-700 disabled:cursor-default border-pink-200"
                />
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm({ name: profile?.name ?? "", email: profile?.email ?? "" });
                }}

                className="flex-1 py-2.5 rounded-xl border border-pink-200 text-rose-600 text-sm font-semibold hover:bg-pink-50 transition-colors"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          )}
        </form>

        <div className="px-6 pb-6 pt-2 border-t border-pink-50">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
               <MapPin className="w-4 h-4 text-primary" />
               <h4 className="font-serif font-bold text-rose-900">Saved Addresses</h4>
             </div>
             {savedAddresses.length < 3 && !showAddrForm && (
               <button 
                 onClick={() => { setAddrForm({ label: "Home", fullName: profile?.name || "", phone: profile?.phone || "", line1: "", line2: "", city: "", state: "", pincode: "" }); setShowAddrForm(true); setEditingAddrIdx(null); }}
                 className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
               >
                 + Add New
               </button>
             )}
           </div>

           {showAddrForm ? (
             <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-4 space-y-3 mb-4">
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Label</label>
                   <select 
                     value={addrForm.label} 
                     onChange={(e) => setAddrForm(f => ({ ...f, label: e.target.value }))}
                     className="w-full px-3 py-2 rounded-lg border border-pink-200 text-xs text-rose-900 bg-white"
                   >
                     <option>Home</option>
                     <option>Work</option>
                     <option>Other</option>
                   </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Full Name</label>
                    <input type="text" value={addrForm.fullName} onChange={(e) => setAddrForm(f => ({ ...f, fullName: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-pink-200 text-xs bg-white" placeholder="Recipient Name" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <div>
                     <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Phone</label>
                     <input 
                       type="tel" 
                       value={addrForm.phone} 
                       onChange={(e) => setAddrForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} 
                       className="w-full px-3 py-2 rounded-lg border border-pink-200 text-xs bg-white" 
                       placeholder="Mobile number" 
                       maxLength={10} 
                     />
                     <p className="text-xs text-gray-500 mt-1">Enter a 10-digit mobile number without +91</p>
                  </div>
                 <div>
                    <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">PIN Code</label>
                    <input type="text" value={addrForm.pincode} onChange={(e) => setAddrForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, "") }))} maxLength={6} className="w-full px-3 py-2 rounded-lg border border-pink-200 text-xs bg-white" placeholder="6 digits" />
                 </div>
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Address Line 1</label>
                  <input type="text" value={addrForm.line1} onChange={(e) => setAddrForm(f => ({ ...f, line1: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-pink-200 text-xs bg-white" placeholder="Flat, House no, Building" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Line 2 / Landmark</label>
                  <input type="text" value={addrForm.line2} onChange={(e) => setAddrForm(f => ({ ...f, line2: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-pink-200 text-xs bg-white" placeholder="Street, Area (optional)" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">City</label>
                    <input type="text" value={addrForm.city} onChange={(e) => setAddrForm(f => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-pink-200 text-xs bg-white" placeholder="City" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">State</label>
                    <input type="text" value={addrForm.state} onChange={(e) => setAddrForm(f => ({ ...f, state: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-pink-200 text-xs bg-white" placeholder="State" />
                 </div>
               </div>
               <div className="flex gap-2 pt-2">
                 <button onClick={() => setShowAddrForm(false)} className="flex-1 py-2 text-xs font-bold text-rose-400 hover:text-rose-600">Cancel</button>
                 <button onClick={saveAddress} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold">Save Address</button>
               </div>
             </div>
           ) : savedAddresses.length > 0 ? (
             <div className="space-y-3">
               {savedAddresses.map((addr, idx) => (
                 <div key={idx} className="group relative bg-white border border-pink-100 rounded-2xl p-4 hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-50 text-primary border border-pink-100">
                        {addr.label}
                      </span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setAddrForm(addr); setEditingAddrIdx(idx); setShowAddrForm(true); }} className="text-[10px] font-bold text-rose-400 hover:text-primary">Edit</button>
                        <button onClick={() => deleteAddress(idx)} className="text-[10px] font-bold text-rose-400 hover:text-red-500">Delete</button>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-rose-900">{addr.fullName} <span className="text-rose-400 font-normal ml-1">({addr.phone})</span></p>
                    <p className="text-[11px] text-rose-600 leading-relaxed mt-0.5">
                      {addr.line1}, {addr.line2 && `${addr.line2}, `}{addr.city}, {addr.state} - {addr.pincode}
                    </p>
                 </div>
               ))}
             </div>
           ) : (
             <p className="text-xs text-rose-300 italic py-4 text-center">No addresses saved yet.</p>
           )}
        </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const { user } = useUser();
  const userLoading = false;
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");
  const [, setLocation] = useLocation();

  if (userLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-rose-50 pb-20">
      <Navbar />
      
      <div className="max-w-xl mx-auto px-4 pt-24">
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-rose-900">My Account</h1>
            <p className="text-sm text-rose-400 font-medium">Welcome back, {user.name || "Customer"}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border border-pink-100 flex items-center justify-center shadow-sm">
            <User className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-white border border-pink-100 rounded-2xl shadow-sm mb-6">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === "orders" ? "bg-primary text-white shadow-md shadow-rose-100" : "text-rose-400 hover:text-rose-600"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            My Orders
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === "profile" ? "bg-primary text-white shadow-md shadow-rose-100" : "text-rose-400 hover:text-rose-600"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Profile
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "orders" ? <OrdersTab user={user} /> : <ProfileTab user={user} />}
      </div>
    </div>
  );
}
