/**
 * Utility to parse and sort Xpressbees tracking data.
 */

export interface TrackingEvent {
  id: string;
  awb_number: string;
  event_time: string;
  status_code: string;
  location: string;
  message: string;
  status: string;
  ship_status: string;
  rto_awb: string;
}

export const parseTrackingData = (
  trackingData: any,
  orderCreatedAt?: string | number,
  orderStatus?: string,
  shippingDetails?: any
): TrackingEvent[] => {
  const isCancelledByAdmin = orderStatus && orderStatus.toLowerCase() === "cancelled by admin";

  let allEvents: TrackingEvent[] = [];

  if (trackingData && typeof trackingData === "object") {
    const delivered = Array.isArray(trackingData.delivered) ? trackingData.delivered : [];
    const outForDelivery = Array.isArray(trackingData["out for delivery"]) ? trackingData["out for delivery"] : [];
    const inTransit = Array.isArray(trackingData["in transit"]) ? trackingData["in transit"] : [];
    const pendingPickup = Array.isArray(trackingData["pending pickup"]) ? trackingData["pending pickup"] : [];

    allEvents = [
      ...delivered,
      ...outForDelivery,
      ...inTransit,
      ...pendingPickup,
    ];

    // 1. Sort Xpressbees events by event_time descending (newest first)
    allEvents.sort((a, b) => {
      const timeA = parseInt(a.event_time, 10);
      const timeB = parseInt(b.event_time, 10);
      return timeB - timeA;
    });
  }

  // 2. AFTER sorting, push the static "Order Placed" event to the very end
  if (orderCreatedAt) {
    const initialTime = Math.floor(new Date(orderCreatedAt).getTime() / 1000) - 600;
    allEvents.push({
      id: "initial",
      awb_number: "",
      event_time: String(initialTime),
      status_code: "ORDERED",
      location: "",
      message: "Your order has been received.",
      status: "Order Placed",
      ship_status: "ordered",
      rto_awb: ""
    });
  }

  // 3. Prepend terminal cancellation event at the very beginning (newest event)
  if (isCancelledByAdmin) {
    let cancelReason = "Cancelled by admin.";
    if (shippingDetails) {
      try {
        const details = typeof shippingDetails === "string" ? JSON.parse(shippingDetails) : shippingDetails;
        if (details?.cancelReason) {
          cancelReason = `Reason: ${details.cancelReason}`;
        }
      } catch {}
    }
    allEvents.unshift({
      id: "cancelled-by-admin",
      awb_number: "",
      event_time: String(Math.floor(Date.now() / 1000)),
      status_code: "CANCELLED_BY_ADMIN",
      location: "Store",
      message: `${cancelReason} Refund will be credited in 5-7 working days.`,
      status: "Cancelled by Admin",
      ship_status: "cancelled by admin",
      rto_awb: ""
    });
  }

  return allEvents;
};

export const formatTrackingDate = (timestampStr: string): string => {
  const date = new Date(parseInt(timestampStr, 10) * 1000);
  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(",", "");
};
