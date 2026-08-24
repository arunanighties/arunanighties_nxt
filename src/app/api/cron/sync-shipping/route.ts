import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { syncShippingStatuses } from "@/services/shipping/sync-shipping.service";
import { logger } from "@/lib/serverLogger";

/**
 * Endpoint for cron-job.org or external scheduler to trigger order shipping status synchronization.
 * Requires HTTP header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    logger.warn({ ip: request.headers.get("x-forwarded-for") || "unknown" }, "[CronRoute] Unauthorized access attempt to cron sync endpoint.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncShippingStatuses();
    return NextResponse.json(summary);
  } catch (error: any) {
    logger.error({ error: error.message }, "[CronRoute] Unexpected error in cron sync route handler.");
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Shipping status synchronization failed",
      },
      { status: 500 }
    );
  }
}

export const POST = GET;
