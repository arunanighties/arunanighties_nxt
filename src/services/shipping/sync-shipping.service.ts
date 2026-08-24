import { db, ordersTable } from "@/db";
import { and, isNotNull, notInArray, eq } from "drizzle-orm";
import { trackShipment } from "./index";
import { logger } from "@/lib/serverLogger";
import { NotificationService } from "@/services/notification.service";

/**
 * Numeric status hierarchy used to prevent status downgrades.
 * Higher rank represents further progress in order lifecycle.
 */
export const STATUS_RANKS: Record<string, number> = {
  "pending": 0,
  "PENDING": 0,
  "confirmed": 1,
  "CONFIRMED": 1,
  "processing": 2,
  "PROCESSING": 2,
  "shipped": 3,
  "SHIPPED": 3,
  "in transit": 4,
  "IN TRANSIT": 4,
  "on the way": 4,
  "ON THE WAY": 4,
  "out for delivery": 5,
  "OUT FOR DELIVERY": 5,
  "delivered": 6,
  "DELIVERED": 6,
  "completed": 6,
  "COMPLETED": 6,
};

/**
 * Maps raw Xpressbees shipping status strings to internal database order status.
 * Returns null for unrecognized or unexpected statuses (skipped without error).
 */
export function mapXpressbeesStatusToInternal(shipStatusRaw?: string | null): string | null {
  if (!shipStatusRaw || typeof shipStatusRaw !== "string") {
    return null;
  }
  const shipStatus = shipStatusRaw.trim().toLowerCase();
  if (shipStatus === "delivered") {
    return "DELIVERED";
  }
  if (shipStatus === "out for delivery") {
    return "OUT FOR DELIVERY";
  }
  if (shipStatus === "in transit" || shipStatus === "on the way") {
    return "IN TRANSIT";
  }
  if (shipStatus === "pending pickup" || shipStatus === "manifested" || shipStatus === "booked") {
    return "SHIPPED";
  }
  return null;
}

/**
 * Compares two order statuses to determine if newStatus strictly progresses order lifecycle.
 */
export function isHigherStatus(currentStatus: string, newStatus: string): boolean {
  const currentRank = STATUS_RANKS[currentStatus] ?? 0;
  const newRank = STATUS_RANKS[newStatus] ?? 0;
  return newRank > currentRank;
}

export interface SyncOrderDetail {
  orderId: number;
  awb: string;
  previousStatus: string;
  mappedStatus: string | null;
  action: "updated" | "skipped_downgrade" | "skipped_unchanged" | "skipped_unknown_status" | "failed";
  error?: string;
}

export interface SyncShippingResult {
  success: boolean;
  total: number;
  updated: number;
  unchanged: number;
  failed: number;
  durationMs: number;
  details: SyncOrderDetail[];
  message?: string;
}

// Concurrency lock state
let isSyncInProgress = false;
let syncStartedAt = 0;
const SYNC_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max execution guard

/**
 * Synchronizes order shipping statuses with Xpressbees tracking provider.
 * Implements per-order error isolation, status downgrade protection, batch limits, and concurrency guards.
 */
export async function syncShippingStatuses(options?: { batchLimit?: number }): Promise<SyncShippingResult> {
  const startTime = Date.now();

  // Concurrency guard: check if a previous sync is active
  if (isSyncInProgress) {
    if (Date.now() - syncStartedAt < SYNC_LOCK_TIMEOUT_MS) {
      logger.warn("[SyncShipping] Synchronization already in progress. Skipping overlapping execution.");
      return {
        success: true,
        total: 0,
        updated: 0,
        unchanged: 0,
        failed: 0,
        durationMs: Date.now() - startTime,
        details: [],
        message: "Synchronization already in progress",
      };
    } else {
      logger.warn("[SyncShipping] Clearing stale synchronization lock after timeout.");
    }
  }

  isSyncInProgress = true;
  syncStartedAt = Date.now();

  const batchLimit = options?.batchLimit || parseInt(process.env.CRON_BATCH_LIMIT || "50", 10);
  const details: SyncOrderDetail[] = [];

  let updatedCount = 0;
  let unchangedCount = 0;
  let failedCount = 0;

  try {
    logger.info({ batchLimit }, "[SyncShipping] Shipping sync cycle started.");

    // Query active, non-terminal orders with an assigned AWB number
    const activeOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          isNotNull(ordersTable.awbNumber),
          notInArray(ordersTable.status, [
            "delivered",
            "DELIVERED",
            "completed",
            "COMPLETED",
            "cancelled",
            "CANCELLED",
            "cancelled by admin",
            "CANCELLED BY ADMIN",
          ])
        )
      )
      .limit(batchLimit);

    logger.info({ count: activeOrders.length }, "[SyncShipping] Found eligible active orders for tracking synchronization.");

    for (const order of activeOrders) {
      const awb = order.awbNumber;
      if (!awb) continue;

      try {
        const trackingResponse = await trackShipment(awb);
        const data = trackingResponse?.tracking_data || trackingResponse;

        if (!data || typeof data !== "object") {
          logger.warn({ orderId: order.id, awb }, "[SyncShipping] No tracking data returned from provider.");
          unchangedCount++;
          details.push({
            orderId: order.id,
            awb,
            previousStatus: order.status,
            mappedStatus: null,
            action: "skipped_unchanged",
          });
          continue;
        }

        // Collect and sort tracking events descending by event_time
        const allEvents = [
          ...(Array.isArray(data.delivered) ? data.delivered : []),
          ...(Array.isArray(data["out for delivery"]) ? data["out for delivery"] : []),
          ...(Array.isArray(data["in transit"]) ? data["in transit"] : []),
          ...(Array.isArray(data["pending pickup"]) ? data["pending pickup"] : []),
        ].filter((e: any) => e && e.event_time);

        allEvents.sort((a: any, b: any) => {
          const timeA = parseInt(String(a.event_time), 10) || 0;
          const timeB = parseInt(String(b.event_time), 10) || 0;
          return timeB - timeA;
        });

        const latestEvent = allEvents[0];
        const rawShipStatus = latestEvent?.ship_status || latestEvent?.status;
        const mappedStatus = mapXpressbeesStatusToInternal(rawShipStatus);

        if (!mappedStatus) {
          logger.info(
            { orderId: order.id, rawShipStatus: rawShipStatus || "UNKNOWN" },
            "[SyncShipping] Status mapping unrecognized or empty. Skipping order status update."
          );
          unchangedCount++;
          details.push({
            orderId: order.id,
            awb,
            previousStatus: order.status,
            mappedStatus: null,
            action: "skipped_unknown_status",
          });
          continue;
        }

        if (isHigherStatus(order.status, mappedStatus)) {
          logger.info(
            { orderId: order.id, previousStatus: order.status, newStatus: mappedStatus },
            "[SyncShipping] Status upgrade detected. Updating order status in database."
          );

          await db
            .update(ordersTable)
            .set({ status: mappedStatus })
            .where(eq(ordersTable.id, order.id));

          if (["delivered", "DELIVERED", "completed", "COMPLETED"].includes(mappedStatus)) {
            NotificationService.notifyOrderDelivered({ ...order, status: mappedStatus });
          }

          updatedCount++;
          details.push({
            orderId: order.id,
            awb,
            previousStatus: order.status,
            mappedStatus,
            action: "updated",
          });
        } else {
          logger.info(
            { orderId: order.id, currentStatus: order.status, mappedStatus },
            "[SyncShipping] Status update skipped to prevent status downgrade or redundant update."
          );
          unchangedCount++;
          details.push({
            orderId: order.id,
            awb,
            previousStatus: order.status,
            mappedStatus,
            action: mappedStatus === order.status ? "skipped_unchanged" : "skipped_downgrade",
          });
        }
      } catch (orderErr: any) {
        logger.error(
          { orderId: order.id, awb, error: orderErr.message },
          "[SyncShipping] Per-order failure during tracking synchronization."
        );
        failedCount++;
        details.push({
          orderId: order.id,
          awb,
          previousStatus: order.status,
          mappedStatus: null,
          action: "failed",
          error: "Tracking update failed for this order",
        });
      }
    }

    const durationMs = Date.now() - startTime;
    logger.info(
      { total: activeOrders.length, updated: updatedCount, unchanged: unchangedCount, failed: failedCount, durationMs },
      "[SyncShipping] Shipping sync cycle completed successfully."
    );

    return {
      success: true,
      total: activeOrders.length,
      updated: updatedCount,
      unchanged: unchangedCount,
      failed: failedCount,
      durationMs,
      details,
    };
  } catch (fatalaErr: any) {
    logger.error({ error: fatalaErr.message }, "[SyncShipping] Fatal error during shipping sync cycle.");
    return {
      success: false,
      total: 0,
      updated: updatedCount,
      unchanged: unchangedCount,
      failed: failedCount,
      durationMs: Date.now() - startTime,
      details,
      message: fatalaErr.message || "Fatal error during shipping sync",
    };
  } finally {
    isSyncInProgress = false;
  }
}
