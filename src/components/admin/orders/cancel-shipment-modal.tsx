"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface CancelShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  awbNumber: string;
  onConfirm: () => Promise<void>;
}

export function CancelShipmentModal({
  isOpen,
  onClose,
  awbNumber,
  onConfirm,
}: CancelShipmentModalProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear input when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setConfirmInput("");
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (confirmInput !== awbNumber) return;
    setLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Failed to cancel shipment:", err);
    } finally {
      setLoading(false);
    }
  };

  const isConfirmed = confirmInput === awbNumber;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border-pink-100 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-serif font-bold text-red-600 flex items-center gap-2">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            Cancel Shipment
          </DialogTitle>
          <DialogDescription className="text-rose-900/80 font-medium text-sm leading-relaxed">
            You are about to cancel the Xpressbees shipment for AWB:{" "}
            <strong className="font-mono text-rose-950 font-bold bg-pink-50/80 px-2 py-0.5 rounded border border-pink-100/50">
              {awbNumber}
            </strong>
            . This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1">
              Confirm AWB Number
            </label>
            <input
              type="text"
              placeholder="Type the AWB number to confirm"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={loading}
              className="w-full bg-white border border-pink-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 text-rose-900 transition-all shadow-sm placeholder:text-rose-200"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors uppercase tracking-wider disabled:opacity-50"
          >
            Keep Shipment
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed || loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-200 text-white font-bold rounded-xl px-6 py-2.5 text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider shadow-lg shadow-red-500/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Cancelling...
              </>
            ) : (
              "Cancel Shipment"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
