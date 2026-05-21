"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Calendar, Phone, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface NdrActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  awbNumber: string;
  onSuccess: () => void;
}

type ActionType = "re-attempt" | "update-phone" | "update-address";

export function NdrActionModal({
  isOpen,
  onClose,
  awbNumber,
  onSuccess,
}: NdrActionModalProps) {
  const { toast } = useToast();
  const [actionType, setActionType] = useState<ActionType>("re-attempt");
  const [loading, setLoading] = useState(false);

  // Field states
  const [preferredDate, setPreferredDate] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // Clear inputs when modal state changes
  useEffect(() => {
    if (!isOpen) {
      setPreferredDate("");
      setNewPhone("");
      setNewAddress("");
      setActionType("re-attempt");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    let actionData: any = {};
    if (actionType === "re-attempt") {
      if (!preferredDate) {
        toast({
          variant: "destructive",
          title: "Required Field",
          description: "Please select a preferred delivery date.",
        });
        return;
      }
      actionData = { preferred_delivery_date: preferredDate };
    } else if (actionType === "update-phone") {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(newPhone)) {
        toast({
          variant: "destructive",
          title: "Invalid Phone Number",
          description: "Please enter a valid 10-digit mobile number.",
        });
        return;
      }
      actionData = { new_phone_number: newPhone };
    } else if (actionType === "update-address") {
      if (newAddress.trim().length < 10) {
        toast({
          variant: "destructive",
          title: "Address Too Short",
          description: "Please enter a complete and detailed address (min 10 characters).",
        });
        return;
      }
      actionData = { new_address: newAddress.trim() };
    }

    setLoading(true);
    try {
      const response = await fetch("/api/shipping/ndr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          awb: awbNumber,
          action: actionType,
          action_data: actionData,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to submit NDR action");
      }

      toast({
        title: "Action Submitted",
        description: data.message || `Successfully submitted ${actionType} action for AWB ${awbNumber}`,
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("NDR action submit failed:", err);
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: err.message || "Something went wrong while submitting NDR instructions.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border-pink-100 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-serif font-bold text-rose-950 flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-pink-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            NDR Exception Action
          </DialogTitle>
          <DialogDescription className="text-rose-900/80 font-medium text-sm leading-relaxed">
            Provide instructions to the courier for delivery exception resolution. AWB:{" "}
            <strong className="font-mono text-rose-950 font-bold bg-pink-50/80 px-2 py-0.5 rounded border border-pink-100/50">
              {awbNumber}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {/* Action Type Selection */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1">
              Select Instruction Action
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              disabled={loading}
              className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 text-rose-900 transition-all shadow-sm cursor-pointer"
            >
              <option value="re-attempt">Re-attempt Delivery</option>
              <option value="update-phone">Update Phone Number</option>
              <option value="update-address">Update Address & Re-attempt</option>
            </select>
          </div>

          {/* Dynamic Fields */}
          {actionType === "re-attempt" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Preferred Delivery Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                disabled={loading}
                className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 text-rose-900 transition-all shadow-sm"
              />
            </div>
          )}

          {actionType === "update-phone" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> New Phone Number
              </label>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 text-rose-900 transition-all shadow-sm placeholder:text-rose-200"
              />
            </div>
          )}

          {actionType === "update-address" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> New Shipping Address
              </label>
              <textarea
                placeholder="Enter complete new delivery address with pincode and landmark"
                rows={3}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                disabled={loading}
                className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 text-rose-900 transition-all shadow-sm placeholder:text-rose-200 resize-none"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors uppercase tracking-wider disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-pink-600 hover:bg-pink-700 disabled:bg-pink-200 text-white font-bold rounded-xl px-6 py-2.5 text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider shadow-lg shadow-pink-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Instruction"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
