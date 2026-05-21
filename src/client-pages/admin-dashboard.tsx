import { useState, useEffect, useMemo, Fragment } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { parseTrackingData } from "../utils/tracking";
import { TrackingTimelineModal } from "../components/orders/TrackingTimelineModal";
import { useAdminMe, useAdminLogout, useListProducts, useCreateProduct, useDeleteProduct, usePatchProduct } from "@workspace/api-client-react";
import { ImageUploader, resolveImageUrl } from "@/components/admin/image-uploader";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, LogOut, Package, ShoppingCart, IndianRupee, CreditCard,
  AlertTriangle, Trash2, Users, Eye, LayoutDashboard, Tag,
  Settings, Pencil, Check, X, XCircle, Menu, Layers, Star, MessageSquare, GripVertical,
  ChevronDown, ChevronUp, Search, Clock, FileText, MapPin, Phone, Truck,
  Info, Download, BarChart3
} from "lucide-react";
import AdminSidebar, { type Tab as SidebarTab } from "../components/admin/admin-sidebar";
import ReportsPage from "./admin/reports";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { getApiBase } from "@/lib/api-config";
import { ShippingDimensionsModal } from "@/components/orders/ShippingDimensionsModal";
import { CancelShipmentModal } from "@/components/admin/orders/cancel-shipment-modal";

const apiBase = getApiBase;

function formatINR(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₹${n.toLocaleString("en-IN")}`;
}
function computeMRP(offerPrice: number) { return Math.round(offerPrice * 1.45); }

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-indigo-100 text-indigo-700 border-indigo-200",
  shipped: "bg-purple-100 text-purple-700 border-purple-200",
  "in transit": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "out for delivery": "bg-pink-100 text-pink-700 border-pink-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

/**
 * Maps granular database statuses to Tailwind CSS colors and labels for the Admin Dashboard.
 */
const getStatusBadgeConfig = (status: string) => {
  const normalizedStatus = (status || "").toUpperCase();

  switch (normalizedStatus) {
    case "CANCELLED":
      return { label: "CANCELLED", colorClass: "bg-red-100 text-red-700 border-red-200" };
    case "CANCELLED BY ADMIN":
      return { label: "CANCELLED BY ADMIN", colorClass: "bg-red-100 text-red-700 border-red-200 animate-pulse font-extrabold" };
    case "PENDING":
      return { label: "PENDING", colorClass: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    case "CONFIRMED":
      return { label: "CONFIRMED", colorClass: "bg-blue-100 text-blue-700 border-blue-200" };
    case "PROCESSING":
      return { label: "PROCESSING", colorClass: "bg-indigo-100 text-indigo-700 border-indigo-200" };
    case "SHIPPED":
      return { label: "SHIPPED", colorClass: "bg-purple-100 text-purple-700 border-purple-200" };
    case "ON THE WAY":
      return { label: "ON THE WAY", colorClass: "bg-blue-100 text-blue-700 border-blue-200" };
    case "OUT FOR DELIVERY":
      return { label: "OUT FOR DELIVERY", colorClass: "bg-pink-100 text-pink-700 border-pink-200" };
    case "DELIVERED":
      return { label: "DELIVERED", colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    default:
      return {
        label: status || "UNKNOWN",
        colorClass: "bg-gray-100 text-gray-600 border-gray-200"
      };
  }
};

/**
 * Analyzes the inventory JSON to find variant-level stock issues.
 */
function analyzeInventory(inventory: any) {
  let inv: any = {};
  try {
    inv = typeof inventory === "string" ? JSON.parse(inventory) : inventory;
  } catch {
    inv = {};
  }

  if (!inv || typeof inv !== 'object' || Object.keys(inv).length === 0) {
    return { worstStock: 0, lowVariants: [], isOutOfStock: true, isNearOut: false, totalStock: 0 };
  }

  let worstStock = Infinity;
  const lowVariants: string[] = [];
  let totalStock = 0;
  let hasAnyStock = false;

  Object.entries(inv).forEach(([size, colors]: [string, any]) => {
    if (!colors || typeof colors !== 'object') return;
    Object.entries(colors).forEach(([colorName, details]: [string, any]) => {
      const qty = parseInt(details.qty) || 0;
      totalStock += qty;
      if (qty > 0) hasAnyStock = true;
      if (qty < worstStock) worstStock = qty;

      if (qty === 0) {
        lowVariants.push(`${size} (${colorName}) - SOLD OUT`);
      } else if (qty < 5) {
        lowVariants.push(`${size} (${colorName}) - ${qty} left`);
      }
    });
  });

  const finalWorst = worstStock === Infinity ? 0 : worstStock;

  return {
    worstStock: finalWorst,
    lowVariants,
    isOutOfStock: !hasAnyStock || finalWorst === 0,
    isNearOut: finalWorst > 0 && finalWorst < 5,
    totalStock
  };
}


const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "cancelled", "cancelled by admin"] as const;



type Tab = SidebarTab;

interface Category { id: number; name: string; description: string; icon: string; createdAt: string }
interface Order { id: number; customerName: string; email: string; phone?: string; items?: string; address?: string; total: string; status: string; awbNumber?: string; shippingDetails?: any; createdAt: string; paymentStatus?: string; razorpayOrderId?: string; razorpayPaymentId?: string; }
interface SiteSettings { [key: string]: string }
interface SectionProduct { id: number; name: string; price: string; imageUrl: string; stock: number; inventory?: string | any }
interface HomepageSection { id: number; name: string; position: number; products: SectionProduct[] }
interface ProductRow { id: number; name: string; description: string; price: string; mrp?: string; imageUrl: string; stock: number; rating?: string; reviewCount?: number; reviewText?: string; images?: string[]; sizes?: { size: string; quantity: number }[]; inventory?: Record<string, Record<string, { hex: string; qty: number; price?: number; mrp?: number }>> }

function SortableItem({ id, children }: { id: number; children: (handleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

function AdminLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1.5">{children}</label>;
}
function AdminInput({ value, onChange, placeholder, type = "text", required, autoFocus, min, max, step, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
  autoFocus?: boolean; min?: string | number; max?: string | number; step?: string | number; error?: string;
}) {
  return (
    <div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        required={required} autoFocus={autoFocus} min={min} max={max} step={step}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 text-rose-900 placeholder:text-rose-300 transition-colors ${error ? "border-red-400 focus:ring-red-300/40 bg-red-50/30" : "border-pink-200 focus:ring-primary/30"
          }`}
      />
      {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><span>⚠</span> {error}</p>}
    </div>
  );
}

function ColorNameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [temp, setTemp] = useState(value);
  useEffect(() => { setTemp(value); }, [value]);
  return (
    <div className="flex-1">
      <input
        type="text"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={() => { if (temp.trim() && temp !== value) onChange(temp.trim()); }}
        placeholder="Color Name"
        className="w-full bg-pink-50/50 border border-pink-100 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
      />
    </div>
  );
}

function ProductVariations({
  inventory,
  onChange,
  error
}: {
  inventory: Record<string, Record<string, { hex: string; qty: number; price?: number; mrp?: number }>>;
  onChange: (inv: Record<string, Record<string, { hex: string; qty: number; price?: number; mrp?: number }>>) => void;
  error?: string;
}) {
  const safeInventory = (inventory && typeof inventory === "object" && !Array.isArray(inventory)) ? inventory : {};
  const sizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

  const addSize = (size: string) => {
    if (safeInventory[size]) return;
    onChange({ ...safeInventory, [size]: { "Default": { hex: "#800000", qty: 1, price: 0, mrp: 0 } } });
  };

  const removeSize = (size: string) => {
    const next = { ...safeInventory };
    delete next[size];
    onChange(next);
  };

  const addColor = (size: string) => {
    const next = { ...safeInventory };
    next[size] = { ...next[size], [`Color ${Object.keys(next[size]).length + 1}`]: { hex: "#000000", qty: 1, price: 0, mrp: 0 } };
    onChange(next);
  };

  const removeColor = (size: string, color: string) => {
    const next = { ...safeInventory };
    const sizeColors = { ...next[size] };
    delete sizeColors[color];
    if (Object.keys(sizeColors).length === 0) {
      delete next[size];
    } else {
      next[size] = sizeColors;
    }
    onChange(next);
  };

  const updateColor = (size: string, oldColor: string, newColor: string, hex: string, qty: number, price?: number, mrp?: number) => {
    const next = { ...safeInventory };
    const sizeColors = { ...next[size] };

    if (oldColor !== newColor) {
      // To preserve order and prevent focus loss, reconstruct the object with the new key in the same position
      const newSizeColors: Record<string, { hex: string; qty: number; price?: number; mrp?: number }> = {};
      Object.keys(sizeColors).forEach(k => {
        if (k === oldColor) {
          newSizeColors[newColor] = { hex, qty, price, mrp };
        } else {
          newSizeColors[k] = sizeColors[k];
        }
      });
      next[size] = newSizeColors;
    } else {
      sizeColors[newColor] = { hex, qty, price, mrp };
      next[size] = sizeColors;
    }
    onChange(next);
  };

  return (
    <div className={`border ${error ? "border-red-300 bg-red-50/20" : "border-pink-100 bg-white/50"} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <AdminLabel>Product Variations *</AdminLabel>
        <div className="flex gap-1 flex-wrap justify-end">
          {sizes.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addSize(s)}
              disabled={!!safeInventory[s]}
              className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold transition-all ${safeInventory[s] ? "bg-rose-200 text-white cursor-not-allowed" : "bg-pink-100 text-rose-600 hover:bg-pink-200"}`}
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(safeInventory).length === 0 ? (
        <p className="text-xs text-rose-400 font-medium bg-rose-50 rounded-xl p-4 border border-rose-100 text-center">
          No variations added. Select a size above to start.
        </p>
      ) : (
        <div className="space-y-3">
          {Object.entries(safeInventory).map(([size, colors]) => (
            <div key={size} className="bg-pink-50/50 border border-pink-100 rounded-xl p-2.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 bg-white px-2 py-0.5 rounded-lg border border-pink-100 shadow-sm">Size: {size}</span>
                <button type="button" onClick={() => removeSize(size)} className="text-[10px] text-red-400 hover:text-red-600 font-bold uppercase tracking-tighter">Remove Size</button>
              </div>

              <div className="space-y-3">
                {Object.entries(colors).map(([colorName, details], colorIdx) => {
                  const discPct = (details.mrp && details.price && details.mrp > details.price)
                    ? Math.round(((details.mrp - details.price) / details.mrp) * 100)
                    : 0;

                  return (
                    <div key={colorIdx} className="bg-white p-4 rounded-xl border border-pink-100 shadow-sm space-y-4 relative group">
                      <button
                        type="button"
                        onClick={() => removeColor(size, colorName)}
                        className="absolute right-2 top-2 text-rose-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Color & Stock Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-400 uppercase w-12 shrink-0">color:</span>
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <ColorNameInput
                              value={colorName}
                              onChange={(newVal) => updateColor(size, colorName, newVal, details.hex, details.qty, details.price, details.mrp)}
                            />
                            <div className="relative shrink-0">
                              <input
                                type="color"
                                value={details.hex}
                                onChange={(e) => updateColor(size, colorName, colorName, e.target.value, details.qty, details.price, details.mrp)}
                                className="w-8 h-8 rounded-lg border-2 border-pink-50 cursor-pointer p-0 overflow-hidden shadow-sm hover:scale-110 transition-transform"
                                title="Pick color"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-400 uppercase w-12 shrink-0">stock:</span>
                          <input
                            type="number"
                            min="0"
                            value={details.qty}
                            onChange={(e) => updateColor(size, colorName, colorName, details.hex, parseInt(e.target.value) || 0, details.price, details.mrp)}
                            className="flex-1 min-w-0 bg-pink-50/50 border border-pink-100 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Pricing Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-400 uppercase w-12 shrink-0">MRP:</span>
                          <input
                            type="number"
                            min="0"
                            value={details.mrp || 0}
                            onChange={(e) => updateColor(size, colorName, colorName, details.hex, details.qty, details.price, parseInt(e.target.value) || 0)}
                            className="flex-1 min-w-0 bg-pink-50/50 border border-pink-100 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="MRP"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-400 uppercase w-24 shrink-0 text-nowrap">selling Price:</span>
                          <input
                            type="number"
                            min="0"
                            value={details.price || 0}
                            onChange={(e) => updateColor(size, colorName, colorName, details.hex, details.qty, parseInt(e.target.value) || 0, details.mrp)}
                            className="flex-1 min-w-0 bg-pink-50/50 border border-pink-100 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="Price"
                          />
                        </div>
                      </div>

                      {/* Preview Row */}
                      <div className="pt-3 border-t border-pink-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-rose-300 uppercase tracking-widest">Live Preview:</span>
                          {details.price && details.mrp && details.price > details.mrp ? (
                            <div className="flex items-center gap-1.5 text-red-500 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold uppercase">Warning: Selling price cannot exceed MRP</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-rose-400 line-through">MRP ₹{details.mrp || 0}</span>
                              <span className="text-sm font-bold text-rose-900">₹{details.price || 0}</span>
                              {discPct > 0 && (
                                <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full animate-in zoom-in duration-300">
                                  {discPct}% off
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => addColor(size)}
                  className="w-full py-1 border border-dashed border-pink-200 rounded-lg text-[9px] font-bold text-rose-400 hover:bg-pink-50 transition-colors uppercase"
                >
                  + Add Color to {size}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><span>⚠</span> {error}</p>}
    </div>
  );
}

// ─── Admin Order Card ──────────────────────────────────────────────────
function AdminOrderCard({
  order,
  expandedOrderId,
  setExpandedOrderId,
  setOrders,
  setTrackingModalOrder,
  setCancellingOrder,
  setCancelConfirmId,
  setShippingDimensionsOrder,
  setCancelReason,
  toast
}: {
  order: Order,
  expandedOrderId: number | null,
  setExpandedOrderId: (id: number | null) => void,
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  setTrackingModalOrder: (o: any) => void,
  setCancellingOrder: (o: Order | null) => void,
  setCancelConfirmId: (s: string) => void,
  setShippingDimensionsOrder: (o: Order | null) => void,
  setCancelReason: (s: string) => void,
  toast: any
}) {
  const queryClient = useQueryClient();
  const isExpanded = expandedOrderId === order.id;
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleCancelShipment = async () => {
    try {
      const res = await adminFetch("/shipping/cancel", {
        method: "POST",
        body: JSON.stringify({
          orderId: order.id,
          awbNumber: order.awbNumber,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev: Order[]) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
        queryClient.invalidateQueries();
        toast({
          title: "Shipment Cancelled",
          description: `Shipment for order #${String(order.id).padStart(4, "0")} has been cancelled successfully.`,
        });
      } else {
        const err = await res.json();
        toast({
          variant: "destructive",
          title: "Cancellation Failed",
          description: err.error || err.message || "Failed to cancel shipment.",
        });
        throw new Error(err.error || "Failed to cancel shipment");
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Network Error",
        description: err.message || "Failed to connect to the server.",
      });
      throw err;
    }
  };
  const sDetailsRaw = order.shippingDetails || (order as any).shipping_details || "{}";
  const sDetails = typeof sDetailsRaw === "string" ? (sDetailsRaw.startsWith("{") ? JSON.parse(sDetailsRaw) : {}) : (sDetailsRaw || {});

  // New granular status mapping (strictly from database)
  const { label, colorClass } = getStatusBadgeConfig(order.status);

  let itemsArray: any[] = [];
  try { itemsArray = typeof order.items === "string" ? JSON.parse(order.items || "[]") : (order.items || []); } catch { }

  const adminFetch = (path: string, opts?: RequestInit) =>
    fetch(`${getApiBase()}/api${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        ...opts?.headers
      },
    });

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Accordion Header */}
      <div
        className="p-5 flex items-center justify-between cursor-pointer group"
        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
      >
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-rose-400 group-hover:text-primary transition-colors">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-lg font-bold text-rose-900">Order #{String(order.id).padStart(4, "0")}</h3>
              {/* Refactored Status Badge */}
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${colorClass}`}>
                {label}
              </span>
            </div>
            <p className="text-xs text-rose-400 mt-0.5 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              <span className="text-pink-200 hidden sm:inline">•</span>
              <span>Account Number: <span className="font-bold text-rose-700">{order.phone || "—"}</span></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest">Amount</p>
            <p className="text-xl font-bold text-rose-900 font-serif">₹{parseFloat(order.total).toLocaleString("en-IN")}</p>
          </div>
          <div className={`w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-rose-400 transition-transform duration-300 ${isExpanded ? "rotate-180 bg-primary text-white" : ""}`}>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Accordion Body */}
      {isExpanded && (
        <div className="p-6 pt-0 border-t border-pink-50 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            {/* Left Side: Customer & Address */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Customer Details
                </h4>
                <div className="bg-pink-50/50 rounded-xl p-4 border border-pink-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-rose-400">Name</span>
                    <span className="font-bold text-rose-900">{order.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-rose-400">Phone</span>
                    <a href={`tel:${order.phone}`} className="font-bold text-primary hover:underline flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {order.phone || "—"}
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Delivery Address
                </h4>
                <div className="bg-pink-50/50 rounded-xl p-4 border border-pink-100 space-y-3">
                  <p className="text-sm text-rose-900 leading-relaxed font-medium">
                    {order.address || "No address provided."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-pink-600 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Payment Details
                </h4>
                <div className="bg-white rounded-xl p-5 border border-pink-100 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest mb-1">Mode</p>
                      <p className="text-sm font-medium text-rose-900">Prepaid</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest mb-1">Status</p>
                      <p className={`text-sm font-bold uppercase ${
                        order.paymentStatus?.toLowerCase() === 'paid' ? 'text-green-600' : 
                        order.paymentStatus?.toLowerCase() === 'failed' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {order.paymentStatus || "Pending"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest mb-1">Amount Paid</p>
                      <p className="text-sm font-bold text-rose-900">₹{order.total}</p>
                    </div>
                    <div className="sm:col-span-1">
                      <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest mb-1">Razorpay Order ID</p>
                      <p className="text-xs font-medium text-rose-900 break-all">{order.razorpayOrderId || "N/A"}</p>
                    </div>
                    <div className="sm:col-span-1">
                      <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest mb-1">Razorpay Payment ID</p>
                      <p className="text-xs font-medium text-rose-900 break-all">{order.razorpayPaymentId || "Processing"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Items & Actions */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> Ordered Items
                </h4>
                <div className="space-y-3">
                  {itemsArray.map((item, idx) => (
                    <div key={idx} className="bg-white border border-pink-100 rounded-xl p-4 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="font-bold text-rose-900 text-sm">{item.name}</p>
                        <p className="text-[10px] text-rose-400 font-bold uppercase mt-0.5 tracking-wider">
                          {item.size || "DEFAULT"} / {item.color || "ANY"} — Qty: {item.qty || item.quantity || 1}
                        </p>
                      </div>
                      <p className="font-serif font-bold text-rose-900">
                        ₹{(parseFloat(item.price || "0") * (item.qty || item.quantity || 1)).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" /> Manage Status
                </h4>
                {order.status.toLowerCase() !== "shipped" && !["in transit", "out for delivery", "delivered", "completed"].includes(order.status.toLowerCase()) ? (
                  <div className="flex gap-2 flex-wrap">
                    {["pending", "confirmed", "processing", "shipped", "cancelled by admin"].map((status) => {
                      const orderStatusLower = order.status.toLowerCase();
                      const isDisabled = (["shipped", "in transit", "out for delivery", "delivered", "cancelled", "cancelled by admin"].includes(orderStatusLower) &&
                        ["pending", "confirmed", "processing"].includes(status)) ||
                        ((orderStatusLower === "cancelled" || orderStatusLower === "cancelled by admin") && status !== "cancelled by admin");

                      return (
                        <button
                          key={status}
                          disabled={isDisabled}
                          onClick={async () => {
                            if (status === "shipped") {
                              setShippingDimensionsOrder(order);
                              return;
                            }

                            if (status === "cancelled" || status === "cancelled by admin") {
                              setCancellingOrder(order);
                              setCancelConfirmId("");
                              setCancelReason("");
                              return;
                            }

                            const res = await adminFetch(`/orders/${order.id}/status`, {
                              method: "PATCH",
                              body: JSON.stringify({ status }),
                            });
                            if (res.ok) {
                              const updatedOrder = await res.json();
                              setOrders((prev: Order[]) => prev.map((o) => o.id === order.id ? updatedOrder : o));
                              queryClient.invalidateQueries();
                              toast({ title: `Order #${String(order.id).padStart(4, "0")} marked ${status}` });
                            } else {
                              const err = await res.json();
                              toast({ variant: "destructive", title: "Update failed", description: err.message });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${orderStatusLower === status
                            ? `${getStatusBadgeConfig(status).colorClass} shadow-inner scale-95`
                            : isDisabled
                              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                              : "bg-white text-rose-400 border-pink-100 hover:border-primary hover:text-primary"
                            }`}
                        >
                          {status === "shipped" && !order.awbNumber ? "Generate AWB" : status}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                    <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Manual status changes locked during shipping lifecycle</p>
                  </div>
                )}

                {order.awbNumber && (
                  <div className="mt-6 bg-purple-50/50 border border-purple-100 rounded-2xl p-6 animate-in zoom-in duration-300">
                    <div className="flex flex-col gap-6">

                      {/* Top Row: AWB & Tracking Link */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm shrink-0 border border-purple-100">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Tracking Number (AWB)</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="font-mono font-bold text-purple-900 text-base">{order.awbNumber}</p>
                            <a
                              href={`https://www.xpressbees.com/shipment/tracking?awbNo=${order.awbNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-600 hover:underline text-sm font-medium flex items-center gap-1"
                            >
                              Track on Xpressbees ↗
                            </a>
                            <span className="text-purple-200">•</span>
                            <button
                              type="button"
                              onClick={() => setIsCancelModalOpen(true)}
                              className="text-red-500 hover:text-red-700 hover:underline text-sm font-medium flex items-center gap-1"
                            >
                              Cancel Shipment
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Data Grid & View Label */}
                      <div className="space-y-4">
                        {/* Metadata Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {sDetails.shipping_id && (
                            <div>
                              <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Shipping ID</p>
                              <p className="font-bold text-rose-900 text-xs">{sDetails.shipping_id}</p>
                            </div>
                          )}
                          {sDetails.courier_id && (
                            <div>
                              <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Courier ID</p>
                              <p className="font-bold text-rose-900 text-xs">{sDetails.courier_id}</p>
                            </div>
                          )}
                          {sDetails.weight && (
                            <div>
                              <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Weight</p>
                              <p className="font-bold text-rose-900 text-xs">{sDetails.weight} gm</p>
                            </div>
                          )}
                          {(sDetails.length || sDetails.breadth || sDetails.height) && (
                            <div>
                              <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Dimensions (L/B/H)</p>
                              <p className="font-bold text-rose-900 text-xs">{sDetails.length} x {sDetails.breadth} x {sDetails.height} cm</p>
                            </div>
                          )}
                        </div>

                        {/* Invoice Row & View Label Button */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
                          <div className="flex gap-8">
                            {sDetails.invoiceNumber && (
                              <div>
                                <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Invoice No.</p>
                                <p className="font-bold text-rose-900 text-xs">{sDetails.invoiceNumber}</p>
                              </div>
                            )}
                            {sDetails.invoiceDate && (
                              <div>
                                <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Invoice Date</p>
                                <p className="font-bold text-rose-900 text-xs">{sDetails.invoiceDate}</p>
                              </div>
                            )}
                          </div>

                          {sDetails?.label && (
                            <a
                              href={sDetails.label}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:shadow-md active:scale-95 w-fit"
                            >
                              <Eye className="w-4 h-4" /> View Label (Paste on the package)
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <hr className="my-4 border-gray-200" />

                      {/* Pickup & Manifest Actions (Bottom Row) */}
                      <div className="flex flex-wrap items-center gap-4">
                        {!sDetails?.pickupRequested ? (
                          <button
                            onClick={async () => {
                              try {
                                const res = await adminFetch(`/orders/${order.id}/pickup`, { method: "POST" });
                                if (res.ok) {
                                  const updated = await res.json();
                                  setOrders((prev: Order[]) => prev.map((o) => o.id === updated.id ? updated : o));
                                  toast({ title: "Pickup Requested", description: "Manifest generated successfully." });
                                } else {
                                  const err = await res.json();
                                  toast({ variant: "destructive", title: "Pickup Failed", description: err.message });
                                }
                              } catch {
                                toast({ variant: "destructive", title: "Network Error" });
                              }
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                          >
                            <Truck className="w-4 h-4" /> Request Pickup
                          </button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                              <Check className="w-4 h-4 text-emerald-500" /> Pickup Requested
                            </div>
                            {sDetails.manifest_url && (
                              <a
                                href={sDetails.manifest_url}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" /> View Manifest
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {order.status.toLowerCase() === "cancelled by admin" && (
                  <div className="mt-6 bg-red-50/30 border border-red-100 rounded-2xl p-6 animate-in zoom-in duration-300">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm shrink-0 border border-red-100">
                          <XCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-none mb-1.5">Order Status</p>
                          <div className="flex items-center gap-3">
                            <p className="font-serif font-bold text-red-900 text-base">Cancelled by Admin</p>
                          </div>
                        </div>
                      </div>
                      <div className="pl-16 space-y-1 text-xs text-red-700">
                        {sDetails?.cancelReason && (
                          <p className="font-semibold">
                            Reason: <span className="font-normal italic">"{sDetails.cancelReason}"</span>
                          </p>
                        )}
                        <p className="font-semibold text-red-800">
                          Note: Refund will be credited in 5-7 working days.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setTrackingModalOrder({
                              id: order.id,
                              awb: order.awbNumber || "",
                              createdAt: order.createdAt,
                              status: order.status,
                              shippingDetails: order.shippingDetails
                            })
                          }
                          className="mt-2 text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter w-fit flex items-center gap-1"
                        >
                          View timeline →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {order.awbNumber && (
        <CancelShipmentModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          awbNumber={order.awbNumber}
          onConfirm={handleCancelShipment}
        />
      )}
    </div>
  );
}

function TrackingStatusBox({ orderId, awbNumber, createdAt, onViewFull }: { orderId: number; awbNumber: string; createdAt: string; onViewFull: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["order-current-status", orderId],
    queryFn: async () => {
      const res = await fetch(`${getApiBase()}/api/orders/${orderId}/track`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!awbNumber,
    refetchInterval: 300000, // Refresh every 5 mins
  });

  if (isLoading) return <div className="animate-pulse flex items-center gap-2 mt-1"><div className="w-2 h-2 bg-rose-200 rounded-full animate-bounce"></div><span className="text-[10px] text-rose-300 font-bold uppercase">Fetching live status...</span></div>;

  const trackingData = data?.tracking?.tracking_data;
  if (!trackingData) return null;

  const timeline = parseTrackingData(trackingData, createdAt);
  if (timeline.length === 0) return null;

  const current = timeline[0];

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Current Status:</span>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 animate-in fade-in duration-500">
          {current.ship_status} ({current.message})
        </span>
      </div>
      <button
        type="button"
        onClick={onViewFull}
        className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter w-fit"
      >
        View full timeline →
      </button>
    </div>
  );
}


export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTabState] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as Tab;
      if (tab) return tab;
      return (localStorage.getItem("adminActiveTab") as Tab) || "overview";
    }
    return "overview";
  });

  const setActiveTab = (tab: Tab) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminActiveTab", tab);
      window.location.href = `${window.location.pathname}?tab=${tab}`;
    } else {
      setActiveTabState(tab);
    }
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Orders + Stats
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStartDate, setOrderStartDate] = useState("");
  const [orderEndDate, setOrderEndDate] = useState("");
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [stats, setStats] = useState<{ totalRevenue: string; totalOrders: number; totalProducts: number; lowStockCount: number } | null>(null);
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "selling" | "near" | "out">("all");
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);

  useEffect(() => {
    setInventoryCurrentPage(1);
  }, [inventorySearchQuery, inventoryFilter]);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Tracking Modal State
  const [trackingModalOrder, setTrackingModalOrder] = useState<{ id: number; awb: string; createdAt: string; status?: string; shippingDetails?: any } | null>(null);

  // Cancellation Modal State
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Shipping Dimensions Modal State
  const [shippingDimensionsOrder, setShippingDimensionsOrder] = useState<Order | null>(null);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "", icon: "🌸" });
  const [catSaving, setCatSaving] = useState(false);

  const productMetrics = useMemo(() => {
    const metrics: Record<number, { sold: number; toDeliver: number }> = {};
    (orders || []).forEach(order => {
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items || "[]") : (order.items || []);
      } catch { }

      const status = order.status.toUpperCase();
      const isDelivered = status === "DELIVERED" || status === "COMPLETED";
      const isCancelled = status === "CANCELLED" || status === "CANCELLED BY ADMIN";
      const isActive = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "IN TRANSIT", "OUT FOR DELIVERY"].includes(status);

      items.forEach(item => {
        const pid = item.id;
        if (!pid) return;
        if (!metrics[pid]) metrics[pid] = { sold: 0, toDeliver: 0 };

        const qty = item.qty || item.quantity || 1;
        if (isDelivered) {
          metrics[pid].sold += qty;
        } else if (isActive) {
          metrics[pid].toDeliver += qty;
        }
      });
    });
    return metrics;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return (orders || []).filter((order) => {
      // 1. Search Query filter (matches order #, customer phone, or customer name)
      const matchesSearch = 
        !orderSearchQuery ||
        order.id.toString().includes(orderSearchQuery) ||
        (order.phone && order.phone.includes(orderSearchQuery)) ||
        order.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Date Range filter
      if (orderStartDate) {
        const start = new Date(orderStartDate);
        start.setHours(0, 0, 0, 0);
        const orderDate = new Date(order.createdAt);
        if (orderDate < start) return false;
      }
      if (orderEndDate) {
        const end = new Date(orderEndDate);
        end.setHours(23, 59, 59, 999);
        const orderDate = new Date(order.createdAt);
        if (orderDate > end) return false;
      }

      // 3. Status filter
      if (orderStatusFilter !== "all") {
        const status = (order.status || "").toLowerCase();
        if (orderStatusFilter === "pending") {
          return status === "pending";
        }
        if (orderStatusFilter === "confirmed") {
          return status === "confirmed" || status === "in order";
        }
        if (orderStatusFilter === "processing") {
          return status === "processing";
        }
        if (orderStatusFilter === "shipped_transit") {
          return ["shipped", "in transit", "on the way", "out for delivery"].includes(status);
        }
        if (orderStatusFilter === "delivered_completed") {
          return status === "delivered" || status === "completed" || status === "delivery successful";
        }
        if (orderStatusFilter === "cancelled") {
          return status === "cancelled" || status === "cancelled by admin";
        }
      }

      return true;
    });
  }, [orders, orderSearchQuery, orderStartDate, orderEndDate, orderStatusFilter]);

  const ORDERS_PER_PAGE = 20;
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((ordersCurrentPage - 1) * ORDERS_PER_PAGE, ordersCurrentPage * ORDERS_PER_PAGE);
  }, [filteredOrders, ordersCurrentPage]);
  const totalOrderPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  useEffect(() => {
    setOrdersCurrentPage(1);
  }, [orderSearchQuery, orderStatusFilter, orderStartDate, orderEndDate]);

  // Drag-and-drop sensors — must be at the very top before any conditional logic
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );
  const { data: auth, isLoading: authLoading, isError: authError } = useAdminMe();
  const logoutMutation = useAdminLogout();
  const { data: products, isLoading: productsLoading } = useListProducts({ query: { enabled: !!auth?.authenticated, queryKey: ["/api/products"] } as any });
  const createProductMutation = useCreateProduct();
  const patchProductMutation = usePatchProduct();
  const deleteProductMutation = useDeleteProduct();


  // Settings
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Homepage Sections
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionForm, setSectionForm] = useState({ name: "", position: "0" });
  const [sectionSaving, setSectionSaving] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [assignProductId, setAssignProductId] = useState<Record<number, string>>({});

  // Product form (add)
  const [form, setForm] = useState({
    name: "", description: "", stock: "0", rating: "4.3",
    reviewCount: "1", reviewText: "", sizes: [] as { size: string, quantity: number }[],
    inventory: {} as Record<string, Record<string, { hex: string; qty: number; price?: number; mrp?: number }>>
  });
  const [productImages, setProductImages] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Product edit modal
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", description: "", stock: "0", rating: "4.3",
    reviewCount: "1", reviewText: "", sizes: [] as { size: string, quantity: number }[],
    inventory: {} as Record<string, Record<string, { hex: string; qty: number; price?: number; mrp?: number }>>
  });
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});


  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const fetchWithAuth = (path: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return fetch(`${apiBase()}/api${path}`);
    return fetch(`${apiBase()}/api${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetchWithAuth("/orders");
      if (res.ok) setOrders((await res.json()).sort((a: any, b: any) => Number(b.id) - Number(a.id)));
    } finally { setOrdersLoading(false); }
  };

  const loadStats = async () => {
    try {
      const res = await fetchWithAuth("/stats");
      if (res.ok) setStats(await res.json());
    } catch { }
  };

  const loadCategories = async () => {
    setCatLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/categories`);
      if (res.ok) setCategories(await res.json());
    } finally { setCatLoading(false); }
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/settings`);
      if (res.ok) setSiteSettings(await res.json());
    } finally { setSettingsLoading(false); }
  };

  const loadSections = async () => {
    setSectionsLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/homepage-sections`);
      if (res.ok) setSections(await res.json());
    } finally { setSectionsLoading(false); }
  };

  useEffect(() => {
    if (!authLoading && (authError || (auth && !auth.authenticated))) {
      console.log("Admin session invalid, redirecting to login...");
      localStorage.removeItem("adminToken");
      setLocation("/admin/login");
    }
  }, [authLoading, auth, authError, setLocation]);

  useEffect(() => {
    if (auth?.authenticated) {
      loadOrders(); loadStats(); loadCategories(); loadSettings(); loadSections();
    }
  }, [auth?.authenticated]);

  // Keep stock in sync with size quantities for Add form
  useEffect(() => {
    let total = 0;
    if (Object.keys(form.inventory).length > 0) {
      for (const s in form.inventory) {
        for (const c in form.inventory[s]) {
          total += form.inventory[s][c].qty || 0;
        }
      }
    } else {
      total = form.sizes.reduce((sum, s) => sum + (s.quantity || 0), 0);
    }
    if (parseInt(form.stock) !== total) {
      setForm(f => ({ ...f, stock: String(total) }));
    }
  }, [form.sizes, form.inventory]);

  // Keep stock in sync with size quantities for Edit form
  useEffect(() => {
    let total = 0;
    if (Object.keys(editForm.inventory).length > 0) {
      for (const s in editForm.inventory) {
        for (const c in editForm.inventory[s]) {
          total += editForm.inventory[s][c].qty || 0;
        }
      }
    } else {
      total = editForm.sizes.reduce((sum, s) => sum + (s.quantity || 0), 0);
    }
    if (parseInt(editForm.stock) !== total) {
      setEditForm(f => ({ ...f, stock: String(total) }));
    }
  }, [editForm.sizes, editForm.inventory]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (authError || !auth?.authenticated) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => { localStorage.removeItem("adminToken"); queryClient.clear(); setLocation("/admin/login"); }
    });
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Product name is required.";
    const ratingVal = parseFloat(form.rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) errors.rating = "Rating must be between 1.0 and 5.0.";
    const stockVal = parseInt(form.stock, 10);
    if (isNaN(stockVal) || stockVal < 0) errors.stock = "Stock must be 0 or a positive number.";
    const calculatedStock = Object.keys(form.inventory).length > 0
      ? Object.values(form.inventory).reduce((s, colors) => s + Object.values(colors).reduce((c, val) => c + val.qty, 0), 0)
      : form.sizes.reduce((sum, s) => sum + (s.quantity || 0), 0);

    if (stockVal !== calculatedStock) errors.stock = `Overall stock (${stockVal}) must match sum of variations (${calculatedStock}).`;
    if (form.sizes.length === 0 && Object.keys(form.inventory).length === 0) errors.sizes = "At least one size/variation is required.";

    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    const reviewCountFinal = Math.max(1, parseInt(form.reviewCount, 10) || 1);
    createProductMutation.mutate(
      {
        data: {
          name: form.name.trim(),
          description: form.description.trim(),
          imageUrl: productImages[0] ?? "",
          price: "0",
          stock: parseInt(form.stock, 10) || 0,
          rating: form.rating || "4.3",
          reviewCount: reviewCountFinal,
          reviewText: form.reviewText.trim(),
          images: productImages,
          sizes: form.sizes,
          inventory: form.inventory,
        } as any,
      },
      {
        onSuccess: async () => {
          toast({ title: "Product added!", description: `${form.name} is now live on the website.` });
          setForm({ name: "", description: "", stock: "0", rating: "4.3", reviewCount: "1", reviewText: "", sizes: [], inventory: {} });
          setFormErrors({});
          setProductImages([]);
          queryClient.invalidateQueries();
          await loadStats();
        },
        onError: (err) => toast({ variant: "destructive", title: "Failed to add product", description: err.message }),
      }
    );
  };

  const openEditModal = (product: ProductRow) => {
    setEditFormErrors({});
    setEditingProduct(product);

    // Safe JSON parsing for MySQL text columns
    let safeSizes = product.sizes;
    if (typeof safeSizes === "string") {
      try { safeSizes = JSON.parse(safeSizes); } catch { safeSizes = []; }
    }
    if (!Array.isArray(safeSizes)) safeSizes = [];

    let safeInventory = product.inventory;
    if (typeof safeInventory === "string") {
      try { safeInventory = JSON.parse(safeInventory); } catch { safeInventory = {}; }
    }
    if (!safeInventory || typeof safeInventory !== "object") safeInventory = {};

    let safeImages = product.images;
    if (typeof safeImages === "string") {
      try { safeImages = JSON.parse(safeImages); } catch { safeImages = []; }
    }
    if (!Array.isArray(safeImages)) safeImages = [];

    setEditForm({
      name: product.name,
      description: product.description,
      stock: String(product.stock),
      rating: product.rating ?? "4.3",
      reviewCount: String(Math.max(1, product.reviewCount ?? 1)),
      reviewText: product.reviewText ?? "",
      sizes: safeSizes,
      inventory: safeInventory,
    });
    setEditImages(safeImages.length > 0 ? safeImages : (product.imageUrl ? [product.imageUrl] : []));
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const editErrors: Record<string, string> = {};
    if (!editForm.name.trim()) editErrors.name = "Product name is required.";
    const editRatingVal = parseFloat(editForm.rating);
    if (isNaN(editRatingVal) || editRatingVal < 1 || editRatingVal > 5) editErrors.rating = "Rating must be between 1.0 and 5.0.";
    const editStockVal = parseInt(editForm.stock, 10);
    if (isNaN(editStockVal) || editStockVal < 0) editErrors.stock = "Stock must be 0 or a positive number.";
    const calculatedEditStock = Object.keys(editForm.inventory).length > 0
      ? Object.values(editForm.inventory).reduce((s, colors) => s + Object.values(colors).reduce((c, val) => c + val.qty, 0), 0)
      : editForm.sizes.reduce((sum, s) => sum + (s.quantity || 0), 0);

    if (editStockVal !== calculatedEditStock) editErrors.stock = `Overall stock (${editStockVal}) must match sum of variations (${calculatedEditStock}).`;
    if (editForm.sizes.length === 0 && Object.keys(editForm.inventory).length === 0) editErrors.sizes = "At least one variation is required.";

    if (Object.keys(editErrors).length > 0) { setEditFormErrors(editErrors); return; }
    setEditFormErrors({});
    const editReviewCount = Math.max(1, parseInt(editForm.reviewCount, 10) || 1);
    setEditSaving(true);
    patchProductMutation.mutate(
      {
        id: editingProduct.id,
        data: {
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          images: editImages,
          imageUrl: editImages[0] ?? "",
          stock: parseInt(editForm.stock, 10) || 0,
          rating: editForm.rating || "4.3",
          reviewCount: editReviewCount,
          reviewText: editForm.reviewText.trim(),
          sizes: editForm.sizes,
          inventory: editForm.inventory,
        } as any,
      },
      {
        onSuccess: async () => {
          toast({ title: "Product updated!", description: `"${editForm.name}" saved successfully.` });
          setEditingProduct(null);
          queryClient.invalidateQueries();
          await loadStats();
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Update failed", description: (err as any).message });
        },
        onSettled: () => setEditSaving(false),
      }
    );
  };

  const handleDeleteProduct = (id: number, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteConfirming(true);
    deleteProductMutation.mutate({ id: deleteTarget.id }, {
      onSuccess: async () => {
        toast({ title: "Product deleted.", description: `"${deleteTarget.name}" has been removed.` });
        setDeleteTarget(null);
        queryClient.invalidateQueries();
        await loadStats();
      },
      onError: (err) => toast({ variant: "destructive", title: "Failed to delete product", description: err.message }),
      onSettled: () => setDeleteConfirming(false),
    });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) { toast({ variant: "destructive", title: "Category name is required." }); return; }
    setCatSaving(true);
    try {
      const res = await fetchWithAuth("/categories");
      const res2 = await fetch(`${apiBase()}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
        body: JSON.stringify(catForm),
      });
      void res;
      const body = await res2.json();
      if (!res2.ok) { toast({ variant: "destructive", title: body.error ?? "Failed to add category." }); return; }
      setCategories((prev) => [...prev, body]);
      setCatForm({ name: "", description: "", icon: "🌸" });
      toast({ title: "Category added!", description: body.name });
    } finally { setCatSaving(false); }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    const res = await fetch(`${apiBase()}/api/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
    });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Category deleted." });
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch(`${apiBase()}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
        body: JSON.stringify(siteSettings),
      });
      if (res.ok) toast({ title: "Settings saved!", description: "Homepage updated instantly." });
      else toast({ variant: "destructive", title: "Failed to save settings." });
    } finally { setSettingsSaving(false); }
  };

  const adminFetch = (path: string, opts?: RequestInit) =>
    fetch(`${apiBase()}/api${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("adminToken")}`, ...opts?.headers },
    });

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.name.trim()) { toast({ variant: "destructive", title: "Section name is required." }); return; }
    setSectionSaving(true);
    try {
      const res = await adminFetch("/homepage-sections", { method: "POST", body: JSON.stringify({ name: sectionForm.name.trim(), position: sections.length }) });
      const body = await res.json();
      if (!res.ok) { toast({ variant: "destructive", title: body.error ?? "Failed to add section." }); return; }
      setSections((prev) => [...prev, body].sort((a, b) => a.position - b.position));
      setSectionForm({ name: "", position: "0" });
      toast({ title: "Section created!", description: `"${body.name}" will now appear on the homepage.` });
    } finally { setSectionSaving(false); }
  };

  const handleDeleteSection = async (id: number, name: string) => {
    if (!confirm(`Delete section "${name}"? Products will be unlinked but not deleted.`)) return;
    const res = await adminFetch(`/homepage-sections/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setSections((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Section deleted.", description: `"${name}" removed from homepage.` });
    }
  };

  const handleRenameSectionSave = async (id: number) => {
    if (!editingSectionName.trim()) return;
    const res = await adminFetch(`/homepage-sections/${id}`, { method: "PATCH", body: JSON.stringify({ name: editingSectionName.trim() }) });
    if (res.ok) {
      const updated = await res.json();
      setSections((prev) => prev.map((s) => s.id === id ? { ...s, name: updated.name } : s));
      setEditingSectionId(null);
      toast({ title: "Section renamed!" });
    }
  };

  const handleAssignProduct = async (sectionId: number) => {
    const productId = parseInt(assignProductId[sectionId] || "");
    if (!productId) return;
    const res = await adminFetch(`/homepage-sections/${sectionId}/assign-product/${productId}`, { method: "PATCH" });
    if (res.ok) {
      setAssignProductId((p) => ({ ...p, [sectionId]: "" }));
      await loadSections();
      toast({ title: "Product assigned to section!" });
    }
  };

  const handleUnassignProduct = async (productId: number) => {
    const res = await adminFetch(`/homepage-sections/unassign-product/${productId}`, { method: "PATCH" });
    if (res.ok) { await loadSections(); toast({ title: "Product removed from section." }); }
  };

  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);
    await adminFetch("/homepage-sections/reorder", {
      method: "POST",
      body: JSON.stringify({ order: reordered.map((s) => s.id) }),
    });
  };

  const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "products", label: "Products", icon: Tag },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "collections", label: "Collections", icon: Tag },
    { id: "sections", label: "Sections", icon: Layers },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const statCards = [
    { label: "Total Revenue", value: stats ? formatINR(stats.totalRevenue ?? 0) : "—", icon: IndianRupee, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Total Orders", value: stats?.totalOrders ?? "—", icon: ShoppingCart, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Total Products", value: stats?.totalProducts ?? "—", icon: Package, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
    { label: "Low Stock", value: stats?.lowStockCount ?? "—", icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50", warn: true },
  ];

  return (
    <div className="min-h-screen flex bg-pink-50/60">
      {/* ── Sidebar ──────────────────────────────── */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* ── Main Content ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        {/* Admin Navbar / Header */}
        <header className="bg-white border-b border-pink-100 px-4 h-16 flex items-center justify-between sticky top-0 z-50 md:hidden">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-serif font-bold text-rose-900 text-lg">Aruna Admin</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === id ? "bg-primary text-white shadow-sm" : "text-rose-600 hover:bg-pink-50"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-rose-600 hover:bg-pink-50 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-pink-100 shadow-xl p-4 flex flex-col gap-2 z-50 animate-in slide-in-from-top-2">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === id ? "bg-primary text-white" : "text-rose-700 hover:bg-pink-50"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-50 transition-colors mt-2 border-t border-pink-50 pt-4"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 md:p-8">

          {/* ── OVERVIEW ─────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h1 className="font-serif text-3xl font-bold text-rose-900">Dashboard Overview</h1>
                <p className="text-rose-500 text-sm mt-1">Welcome back — here's your store at a glance.</p>
              </div>
              <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
                {statCards.map(({ label, value, icon: Icon, color, bg, warn }) => {
                  const isLowStock = warn;

                  // Use frontend calculated count for Low Stock if we have products loaded
                  let displayValue = value;
                  if (label === "Low Stock" && Array.isArray(products) && products.length > 0) {
                    const variantLowCount = products.filter(p => {
                      const analysis = analyzeInventory(p.inventory);
                      return analysis.isOutOfStock || analysis.isNearOut;
                    }).length;
                    displayValue = variantLowCount;
                  }

                  const cardContent = (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                      </div>
                      <p className={`text-3xl font-bold font-serif ${warn ? "text-orange-500" : "text-rose-900"}`}>{displayValue}</p>
                      {isLowStock && (
                        <p className="text-xs text-orange-400 mt-2 font-medium flex items-center gap-1">
                          View details →
                        </p>
                      )}
                    </>
                  );
                  return isLowStock ? (
                    <button key={label} onClick={() => setActiveTab("lowstock")}
                      className={`bg-white rounded-2xl border border-orange-200 p-5 shadow-sm hover:shadow-md hover:border-orange-300 hover:bg-orange-50/30 transition-all text-left w-full ring-0 focus:ring-2 focus:ring-orange-300 focus:outline-none`}>
                      {cardContent}
                    </button>
                  ) : (
                    <div key={label} className={`bg-white rounded-2xl border border-pink-100 p-5 shadow-sm hover:shadow-md transition-shadow`}>
                      {cardContent}
                    </div>
                  );
                })}
              </div>
              {/* Recent orders */}
              <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-pink-50 flex items-center justify-between">
                  <h2 className="font-semibold text-rose-900">Recent Orders</h2>
                  <button onClick={() => setActiveTab("orders")} className="text-xs text-primary hover:underline flex items-center gap-1">View all <Eye className="w-3 h-3" /></button>
                </div>
                <div className="divide-y divide-pink-50">
                  {ordersLoading ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                    : orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between px-6 py-3 hover:bg-pink-50/40">
                        <div>
                          <p className="text-sm font-medium text-rose-900">#{order.id.toString().padStart(4, "0")} — {order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{order.phone || order.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-rose-700">₹{parseFloat(order.total).toLocaleString("en-IN")}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[order.status.toLowerCase()] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>{order.status}</span>
                        </div>
                      </div>
                    ))
                  }
                  {!ordersLoading && orders.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No orders yet</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── REPORTS ───────────────────────────── */}
          {activeTab === "reports" && <ReportsPage />}

          {/* ── LOW STOCK DETAIL ─────────────────── */}
          {activeTab === "lowstock" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveTab("overview")}
                  className="p-2 rounded-xl text-rose-400 hover:bg-pink-100 transition-colors" title="Back to overview">
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="font-serif text-3xl font-bold text-rose-900">Low Stock Alert</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Products with fewer than 5 units in stock — restock soon to avoid lost sales.</p>
                </div>
              </div>

              {(() => {
                const lowStockProducts = (Array.isArray(products) ? products : [])
                  .filter((p: ProductRow) => {
                    const analysis = analyzeInventory(p.inventory);
                    return analysis.isOutOfStock || analysis.isNearOut;
                  })
                  .sort((a: ProductRow, b: ProductRow) => {
                    const aMin = analyzeInventory(a.inventory).worstStock;
                    const bMin = analyzeInventory(b.inventory).worstStock;
                    return aMin - bMin;
                  });
                return lowStockProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-16 text-center">
                    <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="font-serif text-xl font-bold text-rose-900 mb-2">All stocked up!</h2>
                    <p className="text-sm text-muted-foreground">Every product currently has 5 or more units in stock.</p>
                    <button onClick={() => setActiveTab("overview")} className="mt-5 inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90">
                      Back to Overview
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-orange-50 flex items-center justify-between bg-orange-50/40">
                      <div>
                        <h2 className="font-semibold text-orange-900">Inventory Alert</h2>
                        <p className="text-xs text-orange-600 mt-0.5">{lowStockProducts.length} product{lowStockProducts.length !== 1 ? "s" : ""} need restocking</p>
                      </div>
                      <button onClick={() => setActiveTab("products")}
                        className="text-xs bg-primary text-white font-semibold px-3 py-1.5 rounded-full hover:bg-primary/90 flex items-center gap-1.5">
                        <Package className="w-3 h-3" /> Manage Products
                      </button>
                    </div>
                    <div className="divide-y divide-orange-50">
                      {lowStockProducts.map((product: ProductRow) => {
                        const analysis = analyzeInventory(product.inventory);
                        const stock = analysis.worstStock;
                        const urgency = stock === 0 ? "Out of stock" : stock === 1 ? "Critical — 1 left" : `Low — ${stock} left`;
                        const urgencyColor = stock === 0 ? "bg-red-100 text-red-700 border-red-200" : stock <= 2 ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-yellow-100 text-yellow-700 border-yellow-200";
                        return (
                          <div key={product.id} className="flex items-center gap-4 px-6 py-4 hover:bg-orange-50/30">
                            <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-100 overflow-hidden flex-shrink-0">
                              {product.imageUrl
                                ? <img src={resolveImageUrl(product.imageUrl)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                                : <Package className="w-5 h-5 text-orange-300 m-auto mt-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-rose-900 text-sm truncate">{product.name}</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {analysis.lowVariants.slice(0, 3).map((v, i) => (
                                  <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-100">{v}</span>
                                ))}
                                {analysis.lowVariants.length > 3 && <span className="text-[9px] font-bold text-orange-400">+{analysis.lowVariants.length - 3} more</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${urgencyColor}`}>
                                {urgency}
                              </span>
                              <button
                                onClick={() => { setActiveTab("products"); setTimeout(() => openEditModal(product), 100); }}
                                className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-rose-600 border border-pink-100 transition-colors" title="Edit product">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-6 py-3 bg-orange-50/40 border-t border-orange-100 text-xs text-orange-600">
                      Tip: Click the pencil icon to update the stock count for any product.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── INVENTORY ─────────────────────────── */}
          {activeTab === "inventory" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-rose-900">Inventory Management</h1>
                  <p className="text-rose-500 text-sm mt-1">Real-time stock tracking and fulfillment metrics.</p>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={inventorySearchQuery}
                    onChange={(e) => setInventorySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-100 rounded-xl text-sm text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "ALL PRODUCTS", icon: Package },
                  { id: "selling", label: "MOST SELLING", icon: Star },
                  { id: "near", label: "NEAR OUT OF STOCK", icon: AlertTriangle },
                  { id: "out", label: "OUT OF STOCK", icon: X },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setInventoryFilter(f.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${inventoryFilter === f.id
                      ? "bg-rose-900 text-white border-rose-900 shadow-md"
                      : "bg-white text-rose-400 border-pink-100 hover:border-pink-200"
                      }`}
                  >
                    <f.icon className="w-3 h-3" />
                    {f.label}
                  </button>
                ))}
              </div>

              {(() => {
                const allProducts = Array.isArray(products) ? products : [];

                const filtered = allProducts.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(inventorySearchQuery.toLowerCase());
                  if (!matchesSearch) return false;

                  const analysis = analyzeInventory(p.inventory);
                  if (inventoryFilter === "selling") return (productMetrics[p.id]?.sold || 0) > 0;
                  if (inventoryFilter === "near") return analysis.isNearOut;
                  if (inventoryFilter === "out") return analysis.isOutOfStock;
                  return true;
                }).sort((a, b) => a.name.localeCompare(b.name));

                const INVENTORY_PER_PAGE = 20;
                const totalPages = Math.ceil(filtered.length / INVENTORY_PER_PAGE);
                const paginated = filtered.slice((inventoryCurrentPage - 1) * INVENTORY_PER_PAGE, inventoryCurrentPage * INVENTORY_PER_PAGE);

                if (filtered.length === 0) {
                  return (
                    <div className="py-16 text-center bg-white rounded-2xl border border-pink-100 shadow-sm">
                      <Package className="w-10 h-10 mx-auto text-rose-200 mb-3" />
                      <p className="font-medium text-rose-700">No products match your filters</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <h2 className="text-[10px] font-bold text-rose-900 uppercase tracking-widest">Inventory List, <span className="text-rose-400 font-medium">{filtered.length} Products</span></h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginated.map(p => {
                        const catId = (p as any).categoryId;
                        const cat = categories.find(c => c.id === catId);
                        const groupName = cat ? cat.name : "All Products";

                        const sold = productMetrics[p.id]?.sold || 0;
                        const toDeliver = productMetrics[p.id]?.toDeliver || 0;
                        const analysis = analyzeInventory(p.inventory);

                        // Extract price and variations
                        let offerPrice = 0;
                              const pInv = typeof p.inventory === "string" ? (p.inventory ? JSON.parse(p.inventory) : {}) : (p.inventory || {});
                              const pSizes = (pInv && typeof pInv === "object" && !Array.isArray(pInv)) ? Object.keys(pInv) : [];

                              if (pInv && typeof pInv === "object") {
                                const firstSize = Object.values(pInv)[0] as Record<string, any>;
                                if (firstSize) {
                                  const firstColor = Object.values(firstSize)[0];
                                  if (firstColor) offerPrice = firstColor.price || 0;
                                }
                              }

                              const variantMetrics: Record<string, Record<string, { sold: number; toDeliver: number }>> = {};
                              pSizes.forEach(sz => {
                                variantMetrics[sz] = {};
                                const colors = Object.keys(pInv[sz] ?? {});
                                colors.forEach(col => {
                                  variantMetrics[sz][col] = { sold: 0, toDeliver: 0 };
                                });
                              });

                              (orders || []).forEach(order => {
                                let items: any[] = [];
                                try {
                                  items = typeof order.items === "string" ? JSON.parse(order.items || "[]") : (order.items || []);
                                } catch { }

                                const status = order.status.toUpperCase();
                                const isDelivered = status === "DELIVERED" || status === "COMPLETED";
                                const isActive = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "IN TRANSIT", "OUT FOR DELIVERY"].includes(status);

                                items.forEach(item => {
                                  if (item.id === p.id && item.size) {
                                    const sz = String(item.size).toUpperCase();
                                    const matchedSizeKey = pSizes.find(k => k.toUpperCase() === sz);
                                    if (matchedSizeKey) {
                                      const orderColor = String(item.color || "Default").toUpperCase();
                                      const pColors = Object.keys(pInv[matchedSizeKey] ?? {});
                                      const matchedColorKey = pColors.find(c => c.toUpperCase() === orderColor) || "Default";
                                      
                                      if (!variantMetrics[matchedSizeKey][matchedColorKey]) {
                                        variantMetrics[matchedSizeKey][matchedColorKey] = { sold: 0, toDeliver: 0 };
                                      }

                                      const qty = item.qty || item.quantity || 1;
                                      if (isDelivered) {
                                        variantMetrics[matchedSizeKey][matchedColorKey].sold += qty;
                                      } else if (isActive) {
                                        variantMetrics[matchedSizeKey][matchedColorKey].toDeliver += qty;
                                      }
                                    }
                                  }
                                });
                              });

                              return (
                                <div key={p.id} className="bg-white rounded-3xl border border-pink-50 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                                  <div className="p-4 flex gap-4">
                                    <div className="w-24 h-24 rounded-2xl bg-pink-50 border border-pink-100 overflow-hidden shrink-0">
                                      {p.imageUrl ? (
                                        <img src={resolveImageUrl(p.imageUrl)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                      ) : <Package className="w-8 h-8 text-rose-200 m-auto mt-8" />}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                      <h3 className="font-bold text-rose-900 text-sm truncate">{p.name}</h3>
                                      <p className="text-[10px] font-bold text-rose-300 mt-0.5">
                                        ₹{offerPrice.toLocaleString("en-IN")} · <span className="uppercase">{groupName}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                                    <div className="bg-emerald-50/50 rounded-2xl p-2.5 text-center border border-emerald-100/50">
                                      <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter mb-1">Sold</p>
                                      <div className="flex items-center justify-center gap-1">
                                        <ChevronUp className="w-2.5 h-2.5 text-emerald-500" />
                                        <span className="text-sm font-bold text-emerald-700">{sold}</span>
                                      </div>
                                    </div>
                                    <div className="bg-gray-50/50 rounded-2xl p-2.5 text-center border border-gray-100/50">
                                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Stock Left</p>
                                      <p className={`text-sm font-bold ${p.stock === 0 ? "text-red-500 font-extrabold uppercase text-[10px]" : "text-gray-700"}`}>{p.stock === 0 ? "Out of Stock" : p.stock}</p>
                                    </div>
                                    <div className="bg-blue-50/50 rounded-2xl p-2.5 text-center border border-blue-100/50">
                                      <p className="text-[8px] font-bold text-blue-600 uppercase tracking-tighter mb-1">To Deliver</p>
                                      <div className="flex items-center justify-center gap-1">
                                        <Package className="w-2.5 h-2.5 text-blue-500" />
                                        <span className="text-sm font-bold text-blue-700">{toDeliver}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* VARIATIONS STOCK section */}
                                  <div className="border-t border-pink-50/80 px-4 py-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-primary" /> Variations Stock
                                      </span>
                                    </div>
                                    <div className="space-y-3">
                                      {pSizes.length === 0 ? (
                                        <p className="text-[10px] text-rose-400/80 italic pl-1">No variants defined.</p>
                                      ) : (
                                        pSizes.map((size) => {
                                          const colorsMap = pInv[size] ?? {};
                                          const colorsList = Object.keys(colorsMap);
                                          const sizeStock = Object.values(colorsMap).reduce((acc: number, curr: any) => acc + (curr.qty ?? 0), 0) as number;
                                          
                                          let sizeSold = 0;
                                          let sizeToDeliver = 0;
                                          colorsList.forEach(col => {
                                            sizeSold += variantMetrics[size]?.[col]?.sold || 0;
                                            sizeToDeliver += variantMetrics[size]?.[col]?.toDeliver || 0;
                                          });

                                          return (
                                            <div
                                              key={size}
                                              className="rounded-2xl border border-pink-100 bg-pink-50/10 hover:bg-pink-50/20 transition-colors overflow-hidden"
                                            >
                                              <div className="flex items-center justify-between p-3 border-b border-pink-50/50 bg-pink-50/10">
                                                <div className="w-16 h-8 shrink-0 flex items-center justify-center rounded-xl bg-white border border-pink-100 shadow-sm">
                                                  <span className="text-xs font-black text-rose-900">{size}</span>
                                                </div>
                                                <div className="flex-1 grid grid-cols-3 gap-2 pl-4 text-center">
                                                  <div>
                                                    <p className="text-[8px] font-bold text-rose-400 uppercase tracking-tighter text-nowrap">Stock Left</p>
                                                    <p className={`text-xs font-bold mt-0.5 ${sizeStock === 0 ? "text-red-500 font-extrabold uppercase text-[9px]" : "text-rose-900"}`}>{sizeStock === 0 ? "Out of Stock" : sizeStock}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-[8px] font-bold text-rose-400 uppercase tracking-tighter text-nowrap">Sold</p>
                                                    <p className="text-xs font-bold text-emerald-600 mt-0.5">{sizeSold}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-[8px] font-bold text-rose-400 uppercase tracking-tighter text-nowrap">To Deliver</p>
                                                    <p className="text-xs font-bold text-blue-600 mt-0.5">{sizeToDeliver}</p>
                                                  </div>
                                                </div>
                                              </div>
                                              {colorsList.length > 0 && (
                                                <div className="bg-white/40 px-3 py-2 space-y-1.5 divide-y divide-pink-50/50">
                                                  {colorsList.map((col) => {
                                                    const colDetails = colorsMap[col] || {};
                                                    const colStock = colDetails.qty ?? 0;
                                                    const colHex = colDetails.hex || "#000000";
                                                    const colSold = variantMetrics[size]?.[col]?.sold || 0;
                                                    const colToDeliver = variantMetrics[size]?.[col]?.toDeliver || 0;

                                                    return (
                                                      <div key={col} className="flex items-center justify-between pt-1.5 first:pt-0">
                                                        <div className="flex items-center gap-2 pl-1 shrink-0 w-24">
                                                          <div className="w-2.5 h-2.5 rounded-full border border-pink-200/50 shadow-inner shrink-0" style={{ backgroundColor: colHex }} />
                                                          <span className="text-[10px] font-bold text-rose-800/80 truncate capitalize">{col}</span>
                                                        </div>
                                                        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                                                          <span className={`text-[10px] font-bold ${colStock === 0 ? "text-red-500 font-extrabold uppercase text-[8px]" : "text-gray-600"}`}>
                                                            {colStock === 0 ? "Out of Stock" : `${colStock} left`}
                                                          </span>
                                                          <span className="text-[10px] font-bold text-emerald-600/80">
                                                            {colSold} sold
                                                          </span>
                                                          <span className="text-[10px] font-bold text-blue-600/80 text-nowrap">
                                                            {colToDeliver} pending
                                                          </span>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>

                                  {(analysis.isNearOut || analysis.isOutOfStock) && (
                                    <div className={`px-4 py-2 flex flex-col bg-red-500`}>
                                      <div className="flex items-center justify-center gap-1.5">
                                        <AlertTriangle className="w-3 h-3 text-white" />
                                        <span className="text-[8px] font-bold text-white uppercase tracking-widest">{analysis.isOutOfStock ? "OUT OF STOCK VARIANTS" : "LOW STOCK VARIANTS"}</span>
                                      </div>
                                      <div className="flex flex-wrap justify-center gap-1 mt-1">
                                        {analysis.lowVariants.slice(0, 2).map((v, i) => (
                                          <span key={i} className="text-[7px] font-bold bg-white/20 text-white px-1 rounded">{v}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                      })}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-pink-100 pt-6 mt-6 gap-4">
                        <p className="text-xs text-rose-500 font-medium">
                          Showing {(inventoryCurrentPage - 1) * INVENTORY_PER_PAGE + 1} to {Math.min(inventoryCurrentPage * INVENTORY_PER_PAGE, filtered.length)} of {filtered.length} products
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setInventoryCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={inventoryCurrentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-pink-200 text-xs font-semibold text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors"
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(page => page === 1 || page === totalPages || Math.abs(page - inventoryCurrentPage) <= 1)
                              .map((page, i, arr) => (
                                <Fragment key={`inv-page-${page}`}>
                                  {i > 0 && arr[i - 1] !== page - 1 && <span className="text-rose-300 px-1">...</span>}
                                  <button
                                    onClick={() => setInventoryCurrentPage(page)}
                                    className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-bold transition-colors ${
                                      inventoryCurrentPage === page 
                                        ? "bg-primary text-white shadow-sm" 
                                        : "text-rose-600 hover:bg-pink-50 border border-transparent hover:border-pink-200"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </Fragment>
                              ))}
                          </div>
                          <button
                            onClick={() => setInventoryCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={inventoryCurrentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-pink-200 text-xs font-semibold text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── PRODUCTS ─────────────────────────── */}
          {activeTab === "products" && (
            <>
              <div className="space-y-6 animate-in fade-in duration-300">
                <h1 className="font-serif text-3xl font-bold text-rose-900">Product Management</h1>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Add form */}
                  <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 sticky top-8">
                      <div className="flex items-center gap-2 mb-5">
                        <Plus className="w-4 h-4 text-primary" />
                        <h2 className="font-semibold text-rose-900 text-sm">Add New Product</h2>
                      </div>
                      <form onSubmit={handleSubmitProduct} className="space-y-4">
                        <div><AdminLabel>Nighty Name *</AdminLabel><AdminInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} placeholder="Kerala Cotton Kasavu Nighty" required /></div>

                        <div>
                          <AdminLabel>Product Images (min 3, max 30)</AdminLabel>
                          <ImageUploader
                            key={JSON.stringify(productImages.length === 0)}
                            initialObjectPaths={productImages.length > 0 ? productImages : []}
                            onChange={setProductImages}
                            adminToken={localStorage.getItem("adminToken") ?? ""}
                          />
                          {productImages.length > 0 && productImages.length < 3 && (
                            <p className="text-xs text-orange-500 mt-1.5">⚠ Add at least {3 - productImages.length} more image{3 - productImages.length !== 1 ? "s" : ""} before saving.</p>
                          )}
                        </div>


                        <div>
                          <AdminLabel>Overall Stock (Auto-calculated) *</AdminLabel>
                          <AdminInput type="number" min="0" step="1" value={form.stock} onChange={() => { }} error={formErrors.stock} placeholder="0" required />
                          <p className="text-[10px] text-rose-400 mt-1 uppercase tracking-tighter">Matches sum of sizes below</p>
                        </div>

                        <ProductVariations
                          inventory={form.inventory}
                          onChange={(inv) => setForm(f => ({ ...f, inventory: inv }))}
                          error={formErrors.sizes}
                        />


                        {/* Review / Rating fields */}
                        <div className="border-t border-pink-100 pt-4">
                          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-3">Ratings &amp; Reviews</p>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <AdminLabel>Avg. Rating (1.0 – 5.0) *</AdminLabel>
                              <AdminInput type="number" min="1" max="5" step="0.1" value={form.rating} onChange={(v) => { setForm(f => ({ ...f, rating: v })); setFormErrors(fe => ({ ...fe, rating: "" })); }} placeholder="4.3" error={formErrors.rating} />
                            </div>
                            <div>
                              <AdminLabel>No. of Reviews (min 1)</AdminLabel>
                              <AdminInput type="number" min="1" step="1" value={form.reviewCount} onChange={(v) => setForm(f => ({ ...f, reviewCount: String(Math.max(1, parseInt(v, 10) || 10)) }))} placeholder="10" />
                            </div>
                          </div>
                          <div>
                            <AdminLabel>Review Text</AdminLabel>
                            <textarea rows={2} value={form.reviewText} onChange={(e) => setForm(f => ({ ...f, reviewText: e.target.value }))}
                              placeholder="e.g. 'Very soft cotton, fits perfectly — loved it!'"
                              className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300 resize-none" />
                          </div>
                        </div>

                        <div>
                          <AdminLabel>Description</AdminLabel>
                          <textarea rows={3} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Fabric, style, size details..."
                            className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300 resize-none" />
                        </div>

                        <button type="submit" disabled={createProductMutation.isPending}
                          className="w-full bg-primary hover:bg-primary/90 disabled:bg-pink-200 text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 shadow-sm">
                          {createProductMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : <><Plus className="w-4 h-4" />Add to Store</>}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Product list */}
                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden flex flex-col lg:h-[calc(100vh-180px)]">
                      <div className="px-6 py-4 border-b border-pink-50 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <h2 className="font-semibold text-rose-900">Product Inventory</h2>
                          <p className="text-xs text-muted-foreground">{products?.length ?? 0} products in store</p>
                        </div>
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-pink-50/50 border border-pink-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto divide-y divide-pink-50">
                        {productsLoading ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                          : products && products.length > 0 ? (
                            <>
                              {[...products]
                                .sort((a, b) => b.id - a.id)
                                .filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
                                .map((product) => {
                                  // Extract price from inventory
                                  let offerPrice = 0;
                                  let mrp = 0;
                                  const inv = typeof product.inventory === "string" ? JSON.parse(product.inventory) : product.inventory;
                                  if (inv && typeof inv === "object") {
                                    const firstSize = Object.values(inv)[0] as Record<string, any>;
                                    if (firstSize) {
                                      const firstColor = Object.values(firstSize)[0];
                                      if (firstColor) {
                                        offerPrice = firstColor.price || 0;
                                        mrp = firstColor.mrp || 0;
                                      }
                                    }
                                  }
                                  const discPct = mrp > offerPrice ? Math.round(((mrp - offerPrice) / mrp) * 100) : 0;
                                  const p = product as typeof product & { categoryId?: number };
                                  const cat = categories.find((c) => c.id === p.categoryId);
                                  return (
                                    <div key={product.id} className="flex items-center gap-4 px-6 py-4 hover:bg-pink-50/40 transition-colors">
                                      <div className="w-14 h-14 rounded-xl bg-pink-50 border border-pink-100 overflow-hidden flex-shrink-0">
                                        {product.imageUrl ? <img src={resolveImageUrl(product.imageUrl)} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-rose-300 m-auto mt-4" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-rose-900 truncate">{product.name}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                          <span className="text-xs text-gray-400 line-through">MRP ₹{mrp.toLocaleString("en-IN")}</span>
                                          <span className="text-xs font-bold text-primary">₹{offerPrice.toLocaleString("en-IN")}</span>
                                          {discPct > 0 && <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">{discPct}% OFF</span>}
                                        </div>
                                        {(p as typeof p & { rating?: string; reviewCount?: number }).rating && (
                                          <div className="flex items-center gap-1 mt-0.5">
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                            <span className="text-xs text-amber-600">{(p as typeof p & { rating?: string }).rating}</span>
                                            <span className="text-xs text-muted-foreground">({(p as typeof p & { reviewCount?: number }).reviewCount ?? 0})</span>
                                          </div>
                                        )}
                                      </div>
                                      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${product.stock === 0 ? "bg-red-100 text-red-600" : product.stock < 5 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-700"}`}>
                                        {product.stock === 0 ? "Out" : `${product.stock} left`}
                                      </span>
                                      <button onClick={() => openEditModal(p as ProductRow)}
                                        className="text-blue-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0" title="Edit product">
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleDeleteProduct(product.id, product.name)} disabled={deleteProductMutation.isPending}
                                        className="text-rose-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0" title="Delete product">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                            </>
                          ) : (
                            <div className="py-16 text-center">
                              <Package className="w-10 h-10 mx-auto text-rose-200 mb-3" />
                              <p className="font-medium text-rose-700">No products yet</p>
                            </div>
                          )
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Edit Product Modal ── */}
              <Dialog open={!!editingProduct} onOpenChange={(open) => { if (!open) setEditingProduct(null); }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl text-rose-900">Edit Product</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Update details below. Changes appear on the homepage instantly.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateProduct} className="space-y-4 pt-1">
                    <div>
                      <AdminLabel>Nighty Name *</AdminLabel>
                      <AdminInput value={editForm.name} onChange={(v) => setEditForm(f => ({ ...f, name: v }))} placeholder="Kerala Cotton Kasavu Nighty" required />
                    </div>
                    <div>
                      <AdminLabel>Product Images (min 3, max 10)</AdminLabel>
                      <ImageUploader
                        key={editingProduct?.id}
                        initialObjectPaths={editImages}
                        onChange={setEditImages}
                        adminToken={localStorage.getItem("adminToken") ?? ""}
                      />
                      {editImages.length > 0 && editImages.length < 3 && (
                        <p className="text-xs text-orange-500 mt-1.5">⚠ Add at least {3 - editImages.length} more image{3 - editImages.length !== 1 ? "s" : ""}.</p>
                      )}
                    </div>
                    <div>
                      <AdminLabel>Overall Stock (Auto-calculated) *</AdminLabel>
                      <AdminInput type="number" min="0" step="1" value={editForm.stock} onChange={() => { }} error={editFormErrors.stock} placeholder="0" required />
                      <p className="text-[10px] text-rose-400 mt-1 uppercase tracking-tighter">Matches sum of sizes below</p>
                    </div>
                    <div className="col-span-2">
                      <ProductVariations
                        inventory={editForm.inventory}
                        onChange={(inv) => setEditForm(f => ({ ...f, inventory: inv }))}
                        error={editFormErrors.sizes}
                      />
                    </div>

                    <div>
                      <AdminLabel>Description</AdminLabel>
                      <textarea rows={2} value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300 resize-none" />
                    </div>
                    <div className="border-t border-pink-100 pt-3">
                      <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Ratings &amp; Reviews</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div><AdminLabel>Avg. Rating (1.0 – 5.0) *</AdminLabel><AdminInput type="number" min="1" max="5" step="0.1" value={editForm.rating} onChange={(v) => { setEditForm(f => ({ ...f, rating: v })); setEditFormErrors(fe => ({ ...fe, rating: "" })); }} placeholder="4.3" error={editFormErrors.rating} /></div>
                        <div><AdminLabel>No. of Reviews (min 1)</AdminLabel><AdminInput type="number" min="1" step="1" value={editForm.reviewCount} onChange={(v) => setEditForm(f => ({ ...f, reviewCount: String(Math.max(1, parseInt(v, 10) || 10)) }))} placeholder="10" /></div>
                      </div>
                      <div>
                        <AdminLabel>Review Text</AdminLabel>
                        <textarea rows={2} value={editForm.reviewText} onChange={(e) => setEditForm(f => ({ ...f, reviewText: e.target.value }))}
                          placeholder="e.g. 'Very soft cotton, fits perfectly!'"
                          className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300 resize-none" />
                      </div>
                    </div>
                    <DialogFooter className="pt-2 gap-2">
                      <button type="button" onClick={() => setEditingProduct(null)}
                        className="flex-1 border border-pink-200 text-rose-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-pink-50">
                        Cancel
                      </button>
                      <button type="submit" disabled={editSaving}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-pink-200 text-white font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2">
                        {editSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />Save Changes</>}
                      </button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* ── Delete Confirm Modal ── */}
              <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleteConfirming) setDeleteTarget(null); }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl text-rose-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" /> Delete Product?
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      This will permanently remove <span className="font-semibold text-rose-800">"{deleteTarget?.name}"</span> from the store. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 mt-2">
                    <button onClick={() => setDeleteTarget(null)} disabled={deleteConfirming}
                      className="flex-1 border border-pink-200 text-rose-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-pink-50">
                      Cancel
                    </button>
                    <button onClick={handleConfirmDelete} disabled={deleteConfirming}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2">
                      {deleteConfirming ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting...</> : <><Trash2 className="w-4 h-4" />Yes, Delete</>}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* ── SECTIONS ─────────────────────────── */}
          {activeTab === "sections" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h1 className="font-serif text-3xl font-bold text-rose-900">Collections</h1>
              <p className="text-sm text-muted-foreground -mt-4">Create and manage collections. Drag the ⠿ handle to reorder — the homepage and Collections page will update instantly.</p>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Create collection form */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6">
                    <h2 className="font-semibold text-rose-900 mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> New Collection</h2>
                    <form onSubmit={handleAddSection} className="space-y-4">
                      <div>
                        <AdminLabel>Collection Name *</AdminLabel>
                        <AdminInput value={sectionForm.name} onChange={(v) => setSectionForm(f => ({ ...f, name: v }))} placeholder="e.g. Summer Favourites" required autoFocus />
                      </div>
                      <button type="submit" disabled={sectionSaving}
                        className="w-full bg-primary hover:bg-primary/90 disabled:bg-pink-200 text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2">
                        {sectionSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : <><Plus className="w-4 h-4" />Create Collection</>}
                      </button>
                    </form>
                  </div>

                  {/* Tips card */}
                  <div className="mt-4 bg-pink-50 border border-pink-100 rounded-2xl p-4 text-xs text-rose-700 space-y-1.5">
                    <p className="font-semibold text-rose-800 text-sm">How it works</p>
                    <p>• Create named collections (e.g. "Best Sellers", "New Arrivals").</p>
                    <p>• Assign products to a collection using the dropdown on the right.</p>
                    <p>• Drag the ⠿ handle to reorder collections — changes save instantly.</p>
                    <p>• Order is reflected on the homepage and the Collections page.</p>
                  </div>
                </div>

                {/* Sections list — drag-and-drop */}
                <div className="lg:col-span-3 space-y-4">
                  {sectionsLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
                  ) : sections.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-10 text-center">
                      <Layers className="w-10 h-10 mx-auto text-pink-200 mb-3" />
                      <p className="text-rose-800 font-medium">No collections yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Create your first collection to organise the homepage.</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {sections.map((section) => {
                          const assignedIds = new Set(section.products.map(p => p.id));
                          const availableProducts = (Array.isArray(products) ? products : []).filter(p => !assignedIds.has(p.id));
                          return (
                            <SortableItem key={section.id} id={section.id}>
                              {(dragHandleProps) => (
                                <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
                                  {/* Section header */}
                                  <div className="flex items-center gap-2 px-4 py-4 border-b border-pink-50 bg-pink-50/50">
                                    <button
                                      {...dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-rose-300 hover:text-rose-400 hover:bg-pink-100 shrink-0 touch-none"
                                      title="Drag to reorder"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </button>
                                    <Layers className="w-4 h-4 text-primary shrink-0" />
                                    {editingSectionId === section.id ? (
                                      <>
                                        <input
                                          value={editingSectionName}
                                          onChange={(e) => setEditingSectionName(e.target.value)}
                                          className="flex-1 border border-pink-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                                          autoFocus
                                          onKeyDown={(e) => { if (e.key === "Enter") handleRenameSectionSave(section.id); if (e.key === "Escape") setEditingSectionId(null); }}
                                        />
                                        <button onClick={() => handleRenameSectionSave(section.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingSectionId(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-pink-50"><X className="w-4 h-4" /></button>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex-1 min-w-0">
                                          <span className="font-semibold text-rose-900 text-sm">{section.name}</span>
                                        </div>
                                        <button onClick={() => { setEditingSectionId(section.id); setEditingSectionName(section.name); }}
                                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-pink-100"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDeleteSection(section.id, section.name)}
                                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </>
                                    )}
                                  </div>

                                  {/* Assigned products */}
                                  <div className="px-5 py-3 space-y-2">
                                    {section.products.length === 0 ? (
                                      <p className="text-xs text-muted-foreground py-2">No products in this collection yet.</p>
                                    ) : section.products.map((p) => (
                                      <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-pink-50 last:border-0">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-pink-50 shrink-0 border border-pink-100">
                                          {p.imageUrl ? (
                                            <img src={resolveImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                                          ) : <span className="text-xl flex items-center justify-center h-full">🌸</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-rose-900 truncate">{p.name}</p>
                                          {(() => {
                                            let offerPrice = 0;
                                            const inv = typeof p.inventory === "string" ? JSON.parse(p.inventory) : p.inventory;
                                            if (inv && typeof inv === "object") {
                                              const firstSize = Object.values(inv)[0] as Record<string, any>;
                                              if (firstSize) {
                                                const firstColor = Object.values(firstSize)[0];
                                                if (firstColor) offerPrice = firstColor.price || 0;
                                              }
                                            }
                                            return <p className="text-xs text-muted-foreground">Starting at: ₹{offerPrice.toLocaleString("en-IN")}</p>;
                                          })()}
                                        </div>
                                        <button onClick={() => handleUnassignProduct(p.id)}
                                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 shrink-0" title="Remove from collection">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Assign product row */}
                                  {availableProducts.length > 0 && (
                                    <div className="px-5 pb-4 flex gap-2">
                                      <select
                                        value={assignProductId[section.id] || ""}
                                        onChange={(e) => setAssignProductId(p => ({ ...p, [section.id]: e.target.value }))}
                                        className="flex-1 border border-pink-200 rounded-xl px-3 py-2 text-xs bg-pink-50 text-rose-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                      >
                                        <option value="">— assign a product —</option>
                                        {availableProducts.map(p => (
                                          <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => handleAssignProduct(section.id)}
                                        disabled={!assignProductId[section.id]}
                                        className="bg-primary hover:bg-primary/90 disabled:bg-pink-200 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> Assign
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </SortableItem>
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── COLLECTIONS ───────────────────────── */}
          {activeTab === "collections" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="font-serif text-3xl font-bold text-rose-900">Collections</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  A read-only view of all active collections. To create, rename, or reorder, go to the{" "}
                  <button onClick={() => setActiveTab("sections")} className="text-primary underline underline-offset-2 font-medium hover:text-primary/80">
                    Sections
                  </button>{" "}
                  tab.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-pink-50 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-rose-900">Active Collections</h2>
                    <p className="text-xs text-muted-foreground">{sections.length} collection{sections.length !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-xs bg-pink-50 border border-pink-100 text-rose-500 px-3 py-1 rounded-full font-medium">Read-only</span>
                </div>

                {sectionsLoading ? (
                  <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : sections.length === 0 ? (
                  <div className="py-16 text-center">
                    <Tag className="w-10 h-10 mx-auto text-rose-200 mb-3" />
                    <p className="font-medium text-rose-700">No collections yet</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">Create sections in the Sections tab to populate this list.</p>
                    <button onClick={() => setActiveTab("sections")}
                      className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-primary/90">
                      <Layers className="w-3.5 h-3.5" /> Go to Sections
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-pink-50">
                    {sections.map((section, idx) => {
                      const ICONS = ["🌸", "✨", "🪡", "💐", "🖨️", "🤗", "🌺", "💫"];
                      const productCount = section.products.length;
                      return (
                        <div key={section.id} className="flex items-center gap-4 px-6 py-4 hover:bg-pink-50/40">
                          <span className="text-2xl flex-shrink-0">{ICONS[idx % ICONS.length]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-rose-900 text-sm">{section.name}</p>
                            <p className="text-xs text-rose-400">
                              {productCount} {productCount === 1 ? "nighty" : "nighties"} · position {section.position}
                            </p>
                          </div>
                          <span className="text-xs bg-pink-50 border border-pink-100 text-rose-500 px-2.5 py-1 rounded-full whitespace-nowrap">
                            #{section.id}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ORDERS ───────────────────────────── */}
          {activeTab === "orders" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="font-serif text-4xl font-bold text-rose-900 leading-tight">Order Fulfillment</h1>
                  <p className="text-rose-500 text-sm mt-1">Track and manage customer purchases and custom fits.</p>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                  <input
                    type="text"
                    placeholder="Search by order # or mobile..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-100 rounded-xl text-sm text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Status Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Pending", count: orders.filter(o => o.status.toUpperCase() === "PENDING").length, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
                  { label: "Confirmed", count: orders.filter(o => o.status.toUpperCase() === "CONFIRMED").length, icon: Check, color: "text-blue-500", bg: "bg-blue-50" },
                  { label: "Processing", count: orders.filter(o => o.status.toUpperCase() === "PROCESSING").length, icon: Package, color: "text-indigo-500", bg: "bg-indigo-50" },
                  { label: "Transit", count: orders.filter(o => ["SHIPPED", "IN TRANSIT", "OUT FOR DELIVERY"].includes(o.status.toUpperCase())).length, icon: Truck, color: "text-purple-500", bg: "bg-purple-50" },
                  { label: "Completed", count: orders.filter(o => ["DELIVERED", "COMPLETED"].includes(o.status.toUpperCase())).length, icon: ShoppingCart, color: "text-emerald-500", bg: "bg-emerald-50" },
                  { label: "Cancelled", count: orders.filter(o => o.status.toUpperCase() === "CANCELLED" || o.status.toUpperCase() === "CANCELLED BY ADMIN").length, icon: X, color: "text-red-500", bg: "bg-red-50" },
                ].map((s) => (
                  <div key={s.label} className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{s.label}</span>
                      <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center`}>
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-rose-900 font-serif">
                      {s.count} <span className="text-xs font-sans text-rose-400 font-normal">Orders</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Sleek Filter Controls Bar */}
              <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-pink-50 pb-3 mb-1">
                  <span className="w-1.5 h-3 bg-primary rounded-full" />
                  <h3 className="text-xs font-bold text-rose-800 uppercase tracking-widest">Filter Orders</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Status</label>
                    <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                      <SelectTrigger className="w-full bg-pink-50/30 border-pink-100 rounded-xl text-rose-900 focus:ring-primary/20">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">In Order / Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped_transit">In Transit / Shipped</SelectItem>
                        <SelectItem value="delivered_completed">Delivered Successful</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">From Date</label>
                    <input
                      type="date"
                      value={orderStartDate}
                      onChange={(e) => setOrderStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-pink-50/30 border border-pink-100 rounded-xl text-xs text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>

                  {/* End Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">To Date</label>
                    <input
                      type="date"
                      value={orderEndDate}
                      onChange={(e) => setOrderEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-pink-50/30 border border-pink-100 rounded-xl text-xs text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                  </div>

                  {/* Reset Filters button */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={!orderStartDate && !orderEndDate && orderStatusFilter === "all" && !orderSearchQuery}
                      onClick={() => {
                        setOrderStartDate("");
                        setOrderEndDate("");
                        setOrderStatusFilter("all");
                        setOrderSearchQuery("");
                      }}
                      className="w-full py-2 border border-pink-100 hover:border-primary text-rose-500 hover:text-primary disabled:border-pink-50 disabled:text-pink-200 disabled:cursor-not-allowed text-xs font-bold uppercase rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 h-[38px] bg-white hover:bg-pink-50/30"
                    >
                      <X className="w-3.5 h-3.5" /> Clear Filters
                    </button>
                  </div>
                </div>
              </div>

              {ordersLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="space-y-4">
                  {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-pink-100 p-16 text-center">
                      <Package className="w-10 h-10 mx-auto text-rose-200 mb-3" />
                      <p className="font-semibold text-rose-800">No orders match the selected filters</p>
                    </div>
                  ) : (
                    paginatedOrders.map((order) => (
                      <AdminOrderCard
                        key={order.id}
                        order={order}
                        expandedOrderId={expandedOrderId}
                        setExpandedOrderId={setExpandedOrderId}
                        setOrders={setOrders}
                        setTrackingModalOrder={setTrackingModalOrder}
                        setCancellingOrder={setCancellingOrder}
                        setCancelConfirmId={setCancelConfirmId}
                        setShippingDimensionsOrder={setShippingDimensionsOrder}
                        setCancelReason={setCancelReason}
                        toast={toast}
                      />
                    ))
                  )}
                </div>
                {totalOrderPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-pink-100 pt-6 mt-2 gap-4">
                    <p className="text-xs text-rose-500 font-medium">
                      Showing {(ordersCurrentPage - 1) * ORDERS_PER_PAGE + 1} to {Math.min(ordersCurrentPage * ORDERS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOrdersCurrentPage(p => Math.max(1, p - 1))}
                        disabled={ordersCurrentPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-pink-200 text-xs font-semibold text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors"
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
                                className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-bold transition-colors ${
                                  ordersCurrentPage === p 
                                    ? "bg-primary text-white shadow-sm" 
                                    : "text-rose-600 hover:bg-pink-50 border border-transparent hover:border-pink-200"
                                }`}>
                                {p}
                              </button>
                            </Fragment>
                          ))}
                      </div>
                      <button
                        onClick={() => setOrdersCurrentPage(p => Math.min(totalOrderPages, p + 1))}
                        disabled={ordersCurrentPage === totalOrderPages}
                        className="px-3 py-1.5 rounded-lg border border-pink-200 text-xs font-semibold text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}
            </div>
          )}


          {/* ── SETTINGS ─────────────────────────── */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-rose-900">Homepage Settings</h1>
                  <p className="text-rose-500 text-sm mt-1">Changes are reflected instantly on the customer-facing site.</p>
                </div>
                <button onClick={handleSaveSettings} disabled={settingsSaving}
                  className="bg-primary hover:bg-primary/90 disabled:bg-pink-200 text-white font-bold rounded-xl px-6 py-2.5 text-sm flex items-center gap-2">
                  {settingsSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />Save Changes</>}
                </button>
              </div>

              {settingsLoading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
                <div className="space-y-5">
                  {/* Hero Banner */}
                  <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6">
                    <h2 className="font-semibold text-rose-900 mb-4 flex items-center gap-2"><Pencil className="w-4 h-4 text-primary" />Hero Banner</h2>
                    <div className="space-y-4">
                      <div>
                        <AdminLabel>Badge Text</AdminLabel>
                        <AdminInput value={siteSettings.heroBadge ?? ""} onChange={(v) => setSiteSettings(s => ({ ...s, heroBadge: v }))} placeholder="New Collection 2025" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <AdminLabel>Headline Line 1</AdminLabel>
                          <AdminInput value={siteSettings.heroTitle ?? ""} onChange={(v) => setSiteSettings(s => ({ ...s, heroTitle: v }))} placeholder="Sleep Beautifully," />
                        </div>
                        <div>
                          <AdminLabel>Headline Line 2 (highlighted)</AdminLabel>
                          <AdminInput value={siteSettings.heroTitleHighlight ?? ""} onChange={(v) => setSiteSettings(s => ({ ...s, heroTitleHighlight: v }))} placeholder="Every Night." />
                        </div>
                      </div>
                      <div>
                        <AdminLabel>Subtitle / Description</AdminLabel>
                        <textarea rows={3} value={siteSettings.heroSubtitle ?? ""} onChange={(e) => setSiteSettings(s => ({ ...s, heroSubtitle: e.target.value }))}
                          className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300 resize-none" />
                      </div>
                      <div>
                        <AdminLabel>Starting Price (₹)</AdminLabel>
                        <AdminInput value={siteSettings.heroStartingPrice ?? ""} onChange={(v) => setSiteSettings(s => ({ ...s, heroStartingPrice: v }))} placeholder="499" type="number" />
                      </div>
                    </div>
                  </div>

                  {/* Featured Section */}
                  <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6">
                    <h2 className="font-semibold text-rose-900 mb-4 flex items-center gap-2"><Pencil className="w-4 h-4 text-primary" />Featured Products Section</h2>
                    <div className="space-y-4">
                      <div>
                        <AdminLabel>Section Label (small text above title)</AdminLabel>
                        <AdminInput value={siteSettings.featuredSectionLabel ?? ""} onChange={(v) => setSiteSettings(s => ({ ...s, featuredSectionLabel: v }))} placeholder="Handpicked for You" />
                      </div>
                      <div>
                        <AdminLabel>Section Title</AdminLabel>
                        <AdminInput value={siteSettings.featuredSectionTitle ?? ""} onChange={(v) => setSiteSettings(s => ({ ...s, featuredSectionTitle: v }))} placeholder="Top Featured Nighties" />
                      </div>
                      <div>
                        <AdminLabel>Section Subtitle</AdminLabel>
                        <AdminInput value={siteSettings.featuredSectionSubtitle ?? ""} onChange={(v) => setSiteSettings(s => ({ ...s, featuredSectionSubtitle: v }))} placeholder="Traditional Indian cotton nightgowns..." />
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200 rounded-2xl border border-pink-200 p-6">
                    <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-4">Live Preview</p>
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1 text-rose-500 font-semibold text-xs bg-rose-100 border border-rose-200 px-3 py-1 rounded-full">✨ {siteSettings.heroBadge || "New Collection 2025"}</span>
                      <h1 className="font-serif text-3xl font-bold text-rose-900 leading-tight">
                        {siteSettings.heroTitle || "Sleep Beautifully,"}<br />
                        <span className="text-primary">{siteSettings.heroTitleHighlight || "Every Night."}</span>
                      </h1>
                      <p className="text-rose-700/80 text-sm max-w-lg">{siteSettings.heroSubtitle || "Discover Aruna Nighties..."}</p>
                    </div>
                  </div>

                  <button onClick={handleSaveSettings} disabled={settingsSaving}
                    className="w-full bg-primary hover:bg-primary/90 disabled:bg-pink-200 text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2">
                    {settingsSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />Save All Settings</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {trackingModalOrder && (
        <TrackingTimelineModal
          isOpen={!!trackingModalOrder}
          onClose={() => setTrackingModalOrder(null)}
          orderId={trackingModalOrder.id}
          awbNumber={trackingModalOrder.awb}
          createdAt={trackingModalOrder.createdAt}
          orderStatus={trackingModalOrder.status}
          shippingDetails={trackingModalOrder.shippingDetails}
        />
      )}

      {/* Cancellation Safeguard Modal */}
      <Dialog open={!!cancellingOrder} onOpenChange={(open) => {
        if (!open) {
          setCancellingOrder(null);
          setCancelReason("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-900 font-serif">Cancel Order</DialogTitle>
            <DialogDescription className="text-rose-400 text-sm">
              Are you sure you want to cancel this order? This action cannot be undone. Please type <strong className="text-rose-900">#{cancellingOrder?.id}</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">Order ID Confirmation</label>
              <input
                type="text"
                placeholder={`Type ${cancellingOrder?.id} here`}
                value={cancelConfirmId}
                onChange={(e) => setCancelConfirmId(e.target.value)}
                className="w-full border border-pink-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900 placeholder:text-rose-200"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">Cancellation Reason / Message</label>
              <input
                type="text"
                placeholder="Enter cancellation reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-pink-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900 placeholder:text-rose-200"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => {
                setCancellingOrder(null);
                setCancelReason("");
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-50 transition-colors"
            >
              Go Back
            </button>
            <button
              disabled={cancelConfirmId !== String(cancellingOrder?.id) || cancelSaving}
              onClick={async () => {
                if (!cancellingOrder) return;
                setCancelSaving(true);
                try {
                  const res = await adminFetch(`/orders/${cancellingOrder.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ 
                      status: "cancelled by admin",
                      cancelReason: cancelReason || "Cancelled by admin"
                    }),
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                    queryClient.invalidateQueries();
                    toast({ title: "Order Cancelled by Admin", description: `Order #${cancellingOrder.id} has been cancelled.` });
                    setCancellingOrder(null);
                    setCancelReason("");
                  } else {
                    toast({ variant: "destructive", title: "Cancellation Failed" });
                  }
                } catch {
                  toast({ variant: "destructive", title: "Network Error" });
                } finally {
                  setCancelSaving(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-200 text-white font-bold rounded-xl px-6 py-2 text-sm flex items-center gap-2 transition-all"
            >
              {cancelSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Cancellation"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipping Dimensions Modal */}
      <ShippingDimensionsModal
        order={shippingDimensionsOrder}
        onClose={() => setShippingDimensionsOrder(null)}
        onConfirm={async (packageDetails) => {
          if (!shippingDimensionsOrder) return;
          const res = await adminFetch(`/orders/${shippingDimensionsOrder.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "shipped", packageDetails }),
          });
          if (res.ok) {
            const updatedOrder = await res.json();
            setOrders((prev: Order[]) => prev.map((o) => o.id === shippingDimensionsOrder.id ? updatedOrder : o));
            toast({ title: `Order #${String(shippingDimensionsOrder.id).padStart(4, "0")} marked shipped` });
            setShippingDimensionsOrder(null);
          } else {
            const err = await res.json();
            toast({ variant: "destructive", title: "Update failed", description: err.message });
          }
        }}
      />
    </div>
  );
}
