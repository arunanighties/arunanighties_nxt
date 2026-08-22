"use client";

import { useState, useEffect } from "react";
import { History, Loader2, CheckCircle2, XCircle, Clock, FileText, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getApiBase } from "@/lib/api-config";

interface NdrHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  awbNumber: string;
}

interface ActionRecord {
  id: number;
  action: string;
  actionData: string | any;
  reAttemptDate?: string | null;
  remarks?: string | null;
  requestPayload?: string | any;
  responsePayload?: string | any;
  status: string;
  errorMessage?: string | null;
  submittedAt: string | number;
}

export function NdrHistoryModal({ isOpen, onClose, awbNumber }: NdrHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && awbNumber) {
      setLoading(true);
      setError(null);

      fetch(`${getApiBase()}/api/shipping/ndr/history?awb=${encodeURIComponent(awbNumber)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch NDR audit history");
          return res.json();
        })
        .then((data) => {
          setActions(data.actions || []);
        })
        .catch((err) => {
          setError(err.message || "Error loading audit history");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, awbNumber]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl bg-white border-pink-100 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col p-0 animate-in zoom-in-95 duration-200">
        <DialogHeader className="p-6 pb-4 border-b border-pink-50 bg-pink-50/20">
          <DialogTitle className="text-2xl font-serif font-bold text-rose-950 flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-100 text-rose-600 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            NDR Response Audit Trail
          </DialogTitle>
          <DialogDescription className="text-rose-900/80 font-medium text-sm mt-1">
            Complete persistent history of Admin instructions submitted for AWB:{" "}
            <strong className="font-mono text-rose-950 font-bold bg-pink-100/80 px-2 py-0.5 rounded border border-pink-200/50">
              {awbNumber}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
              <p className="text-xs font-bold text-rose-400 mt-3 uppercase tracking-wider">Loading history...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-pink-100 flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-12 bg-pink-50/20 rounded-2xl border border-pink-50 p-6">
              <FileText className="w-10 h-10 mx-auto text-rose-200 mb-3" />
              <p className="font-semibold text-rose-900 text-base mb-1">No Response Actions Logged</p>
              <p className="text-xs text-rose-400">
                No instructions have been submitted for this NDR exception yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {actions.map((act) => {
                let parsedActionData: any = {};
                try {
                  parsedActionData = typeof act.actionData === "string" ? JSON.parse(act.actionData) : act.actionData || {};
                } catch {
                  parsedActionData = {};
                }

                let parsedResponse: any = {};
                try {
                  parsedResponse = typeof act.responsePayload === "string" ? JSON.parse(act.responsePayload) : act.responsePayload || {};
                } catch {
                  parsedResponse = {};
                }

                const isSuccess = act.status === "success";
                const isPending = act.status === "pending";

                return (
                  <div
                    key={act.id}
                    className="p-5 rounded-2xl border bg-white shadow-sm transition-all border-pink-100 hover:border-pink-200 space-y-3"
                  >
                    {/* Header line: Action type + status badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-950 text-sm capitalize bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                          {act.action.replace("-", " ")}
                        </span>
                        {act.reAttemptDate && (
                          <span className="text-xs text-rose-500 font-semibold bg-pink-50 px-2 py-0.5 rounded border border-pink-100">
                            Date: {act.reAttemptDate}
                          </span>
                        )}
                      </div>

                      {/* Status pill */}
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full border ${
                          isSuccess
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isPending
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {isSuccess ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Submitted Successfully
                          </>
                        ) : isPending ? (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Provider Response
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Action Failed
                          </>
                        )}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <p className="text-[11px] text-muted-foreground">
                      Submitted on:{" "}
                      <span className="font-semibold text-rose-800">
                        {new Date(act.submittedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </p>

                    {/* Details: Action payload info */}
                    <div className="bg-pink-50/40 rounded-xl p-3 text-xs space-y-1 text-rose-900 border border-pink-100/60">
                      {act.action === "update-phone" && parsedActionData.new_phone_number && (
                        <p>
                          <strong className="text-rose-950">New Phone:</strong> {parsedActionData.new_phone_number}
                        </p>
                      )}
                      {act.action === "update-address" && parsedActionData.new_address && (
                        <p>
                          <strong className="text-rose-950">New Address:</strong> {parsedActionData.new_address}
                        </p>
                      )}
                      {act.action === "re-attempt" && parsedActionData.preferred_delivery_date && (
                        <p>
                          <strong className="text-rose-950">Preferred Date:</strong> {parsedActionData.preferred_delivery_date}
                        </p>
                      )}
                      {act.remarks && (
                        <p>
                          <strong className="text-rose-950">Admin Remarks:</strong> {act.remarks}
                        </p>
                      )}
                    </div>

                    {/* Provider response / error details */}
                    {(parsedResponse.message || act.errorMessage) && (
                      <div
                        className={`p-3 rounded-xl text-xs border ${
                          isSuccess ? "bg-emerald-50/60 border-emerald-100 text-emerald-900" : "bg-rose-50/60 border-rose-100 text-rose-900"
                        }`}
                      >
                        <p className="font-bold text-[11px] uppercase tracking-wider mb-0.5">
                          {isSuccess ? "Xpressbees Confirmation" : "Provider Error Details"}
                        </p>
                        <p className="font-medium">
                          {act.errorMessage || parsedResponse.message || "No message returned"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
