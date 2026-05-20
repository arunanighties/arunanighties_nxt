import { NextRequest, NextResponse } from "next/server";
import { db, ordersTable } from "@/db";
import { eq } from "drizzle-orm";
import { cancelShipment } from "@/services/shipping";
import { logger } from "@/lib/serverLogger";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, awbNumber } = body ?? {};

    if (!orderId || !awbNumber) {
      return NextResponse.json({ error: "Missing orderId or awbNumber" }, { status: 400 });
    }

    const id = parseInt(String(orderId), 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.awbNumber !== awbNumber) {
      return NextResponse.json({ error: "AWB number mismatch with order record" }, { status: 400 });
    }

    logger.info({ orderId: id, awbNumber }, "Initiating Xpressbees shipment cancellation");
    const cancelResult = await cancelShipment(awbNumber);

    if (cancelResult.response === true || cancelResult.status === true) {
      logger.info({ orderId: id, awbNumber }, "Shipment cancelled successfully with Xpressbees, updating database");
      
      await db
        .update(ordersTable)
        .set({
          awbNumber: null,
          status: "processing",
          shippingDetails: null
        })
        .where(eq(ordersTable.id, id));

      const [updatedOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
      return NextResponse.json(updatedOrder);
    } else {
      logger.error({ orderId: id, awbNumber, cancelResult }, "Xpressbees shipment cancellation failed");
      return NextResponse.json({ error: cancelResult.message || "Cancellation request failed" }, { status: 400 });
    }
  } catch (error: any) {
    logger.error({ error: error.message }, "Error during shipment cancellation");
    return NextResponse.json({ error: "Internal server error during cancellation", message: error.message }, { status: 500 });
  }
}
