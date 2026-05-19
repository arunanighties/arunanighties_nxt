import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Package, CheckCircle2, Truck, MapPin, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { parseTrackingData, formatTrackingDate, type TrackingEvent } from "../../utils/tracking";
import { getApiBase } from "@/lib/api-config";

interface TrackingTimelineModalProps {
  orderId: number;
  isOpen: boolean;
  onClose: () => void;
  awbNumber: string;
  createdAt?: string | number;
  prefetchedTrackingData?: any;
  orderStatus?: string;
  shippingDetails?: any;
}

const apiBase = getApiBase;

export const TrackingTimelineModal = ({
  orderId,
  isOpen,
  onClose,
  awbNumber,
  createdAt,
  prefetchedTrackingData,
  orderStatus,
  shippingDetails
}: TrackingTimelineModalProps) => {
  const queryClient = useQueryClient();
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK_SHIPPING === 'true';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const res = await fetch(`${apiBase()}/api/orders/${orderId}/track`);
      if (!res.ok) throw new Error("Failed to fetch tracking data");
      return res.json();
    },
    enabled: isOpen && !!awbNumber && !prefetchedTrackingData,
    initialData: prefetchedTrackingData ? { tracking: { tracking_data: prefetchedTrackingData } } : undefined,
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase()}/api/orders/${orderId}/mock-advance`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to advance stage");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-tracking", orderId] });
    }
  });

  const rewindMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase()}/api/orders/${orderId}/mock-rewind`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to rewind stage");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-tracking", orderId] });
    }
  });

  const trackingData = data?.tracking?.tracking_data;
  const timeline = parseTrackingData(trackingData, createdAt, orderStatus, shippingDetails);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-rose-900">Shipment Timeline</DialogTitle>
          <DialogDescription className="text-xs text-rose-400">
            AWB: <span className="font-mono font-bold">{awbNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Fetching live status...</p>
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
              <p className="text-sm font-bold text-red-600">Error</p>
              <p className="text-xs text-red-400 mt-1">{(error as any).message || "Could not load tracking details."}</p>
            </div>
          ) : timeline.length === 0 ? (
            <div className="bg-pink-50 border border-pink-100 rounded-xl p-8 text-center">
              <Clock className="w-10 h-10 mx-auto text-rose-200 mb-3" />
              <p className="text-sm font-bold text-rose-900">No tracking data found</p>
              <p className="text-xs text-rose-400 mt-1">Data might take some time to appear after shipment.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 pb-4">
              {/* Vertical Line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-green-500 rounded-full opacity-30" />

              {timeline.map((event, idx) => {
                const isLatest = idx === 0;
                return (
                  <div key={idx} className="relative group animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                    {/* Dot */}
                    <div className={`absolute -left-[19px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${
                      isLatest ? "bg-green-500 ring-4 ring-green-100" : "bg-green-400"
                    }`} />

                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-4">
                        <h4 className={`text-sm font-bold uppercase tracking-tight ${isLatest ? "text-rose-900" : "text-rose-600"}`}>
                          {event.status}
                        </h4>
                        <span className="text-[10px] font-bold text-rose-400 whitespace-nowrap bg-pink-50 px-2 py-0.5 rounded-full">
                          {formatTrackingDate(event.event_time)}
                        </span>
                      </div>
                      
                      <div className="bg-white/50 rounded-lg p-2 -ml-2 border border-transparent group-hover:border-pink-50 group-hover:bg-pink-50/30 transition-all">
                        <p className="text-xs text-rose-700 leading-relaxed font-medium">
                          {event.message}
                        </p>
                        {event.location && (
                          <p className="text-[10px] text-rose-400 flex items-center gap-1 mt-1 font-bold italic">
                            <MapPin className="w-2.5 h-2.5" /> {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isMock && (
          <div className="flex gap-2 justify-between mt-4 p-4 border-t border-pink-100 bg-pink-50/30 rounded-b-xl">
            <button 
              onClick={() => rewindMutation.mutate()}
              disabled={rewindMutation.isPending}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-rose-600 bg-white border border-pink-200 px-3 py-2 rounded-lg hover:bg-pink-50 disabled:opacity-50 transition-all"
            >
              <ArrowLeft className="w-3 h-3" />
              Previous Stage
            </button>
            <button 
              onClick={() => advanceMutation.mutate()}
              disabled={advanceMutation.isPending}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-white bg-primary px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              Next Stage
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
