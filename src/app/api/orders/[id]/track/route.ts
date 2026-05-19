import { NextRequest, NextResponse } from "next/server";
import { db, ordersTable } from "@/db";
import { eq } from "drizzle-orm";
import { trackShipment } from "@/services/shipping";
import { logger } from "@/lib/serverLogger";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.awbNumber) {
      return NextResponse.json({ error: "Tracking number (AWB) not found for this order" }, { status: 400 });
    }

    const trackingData = await trackShipment(order.awbNumber);

    return NextResponse.json({
      success: true,
      awbNumber: order.awbNumber,
      tracking: trackingData,
    });
  } catch (error: any) {
    logger.error({ orderId: (await params).id, error: error.message }, "Failed to track order");
    return NextResponse.json({ error: "Failed to track shipment", message: error.message }, { status: 500 });
  }
}
