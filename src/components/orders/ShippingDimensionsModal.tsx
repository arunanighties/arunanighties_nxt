import { useState, useEffect } from "react";
import { Package, Info, Loader2, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getApiBase } from "@/lib/api-config";

interface Order { 
  id: number; 
  customerName: string; 
  email: string; 
  phone?: string; 
  items?: string; 
  address?: string; 
  total: string; 
  status: string; 
  awbNumber?: string; 
  shippingDetails?: any; 
  createdAt: string 
}

interface Courier {
  id: string;
  name: string;
}

export function ShippingDimensionsModal({
  order,
  onClose,
  onConfirm
}: {
  order: Order | null,
  onClose: () => void,
  onConfirm: (details: any) => Promise<void>
}) {
  const [details, setDetails] = useState({
    weight: "500",
    length: "12",
    breadth: "12",
    height: "12",
    courierId: "01",
    invoiceNumber: "",
    invoiceDate: ""
  });
  const [saving, setSaving] = useState(false);

  const adminFetch = (path: string, opts?: RequestInit) =>
    fetch(`${getApiBase()}/api${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        ...opts?.headers
      },
    });

  const { data: couriers = [], isLoading: couriersLoading } = useQuery<Courier[]>({
    queryKey: ["shipping-couriers"],
    queryFn: async () => {
      console.log("DEBUG: Fetching couriers...");
      const res = await adminFetch("/shipping/couriers");
      if (!res.ok) {
        const text = await res.text();
        console.error("DEBUG: Courier fetch failed:", text);
        throw new Error("Failed to fetch couriers");
      }
      const data = await res.json();
      console.log("DEBUG: Couriers fetched:", data);
      // Ensure all IDs are strings for Select component compatibility
      return (Array.isArray(data) ? data : []).map((c: any) => ({
        ...c,
        id: String(c.id)
      }));
    },
    enabled: !!order,
  });

  useEffect(() => {
    if (order) {
      setDetails(prev => ({
        ...prev,
        invoiceNumber: `INV-${order.id}`,
        invoiceDate: new Date().toISOString().split("T")[0]
      }));
    }
  }, [order]);

  useEffect(() => {
    if (couriers.length > 0 && (!details.courierId || !couriers.find(c => c.id === details.courierId))) {
      setDetails(prev => ({ ...prev, courierId: couriers[0].id }));
    }
  }, [couriers, details.courierId]);

  if (!order) return null;

  const LabelWithTooltip = ({ label, tooltip }: { label: string, tooltip: string }) => (
    <div className="flex items-center gap-1.5 ml-1 mb-2">
      <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{label}</label>
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-rose-300 cursor-help hover:text-primary transition-colors" />
          </TooltipTrigger>
          <TooltipContent className="bg-rose-900 text-white border-rose-800 text-[10px] py-1.5 px-3 max-w-[200px]">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onConfirm(details);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border-pink-100 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-serif font-bold text-rose-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
            Shipping Details
          </DialogTitle>
          <DialogDescription className="text-rose-400 font-medium">
            Enter shipping and invoice details for Order #{String(order.id).padStart(4, "0")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Dimensions Section */}
          <div className="bg-pink-50/50 rounded-2xl p-5 border border-pink-100 space-y-4">
            <p className="text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em] mb-2">Package Dimensions</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <LabelWithTooltip label="Weight (g)" tooltip="Total weight of the packed shipment in grams" />
                <input
                  type="number"
                  value={details.weight}
                  onChange={(e) => setDetails({ ...details, weight: e.target.value })}
                  className="w-full bg-white border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900 transition-all shadow-sm"
                  placeholder="500"
                  required
                />
              </div>
              <div className="space-y-1">
                <LabelWithTooltip label="Length (cm)" tooltip="Length of the package in centimeters" />
                <input
                  type="number"
                  value={details.length}
                  onChange={(e) => setDetails({ ...details, length: e.target.value })}
                  className="w-full bg-white border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900 transition-all shadow-sm"
                  placeholder="12"
                  required
                />
              </div>
              <div className="space-y-1">
                <LabelWithTooltip label="Breadth (cm)" tooltip="Breadth of the package in centimeters" />
                <input
                  type="number"
                  value={details.breadth}
                  onChange={(e) => setDetails({ ...details, breadth: e.target.value })}
                  className="w-full bg-white border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900 transition-all shadow-sm"
                  placeholder="12"
                  required
                />
              </div>
              <div className="space-y-1">
                <LabelWithTooltip label="Height (cm)" tooltip="Height of the package in centimeters" />
                <input
                  type="number"
                  value={details.height}
                  onChange={(e) => setDetails({ ...details, height: e.target.value })}
                  className="w-full bg-white border border-pink-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900 transition-all shadow-sm"
                  placeholder="12"
                  required
                />
              </div>
            </div>
          </div>

          {/* Courier Selection */}
          <div className="space-y-1 px-1">
            <LabelWithTooltip label="Courier Service" tooltip="Select the shipping provider for this AWB" />
            <Select
              value={details.courierId}
              onValueChange={(val) => setDetails({ ...details, courierId: val })}
            >
              <SelectTrigger className="w-full bg-white border border-pink-100 rounded-xl px-4 py-6 text-sm focus:ring-2 focus:ring-primary/20 text-rose-900 shadow-sm">
                <SelectValue placeholder="Select Courier" />
              </SelectTrigger>
              <SelectContent className="bg-white border-pink-100 rounded-xl">
                {couriersLoading ? (
                  <div className="p-2 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                ) : (
                  (Array.isArray(couriers) ? couriers : []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id} className="text-sm text-rose-900 focus:bg-rose-100 focus:text-rose-900 cursor-pointer">
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Section */}
          <div className="bg-white border border-pink-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <p className="text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em] mb-2">Invoice Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <LabelWithTooltip label="Invoice No." tooltip="Manual override for the invoice reference number" />
                <input
                  type="text"
                  value={details.invoiceNumber}
                  onChange={(e) => setDetails({ ...details, invoiceNumber: e.target.value })}
                  className="w-full bg-pink-50/50 border border-pink-100 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <LabelWithTooltip label="Invoice Date" tooltip="The legal date of sale" />
                <input
                  type="date"
                  value={details.invoiceDate}
                  min={order.createdAt.split("T")[0]}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDetails({ ...details, invoiceDate: e.target.value })}
                  className="w-full bg-pink-50/50 border border-pink-100 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl py-3.5 text-sm shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating AWB...</>
              ) : (
                <><Check className="w-4 h-4" /> Confirm & Generate AWB</>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
