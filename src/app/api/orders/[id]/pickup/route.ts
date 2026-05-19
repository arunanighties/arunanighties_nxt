import { NextRequest, NextResponse } from "next/server";
import { db, ordersTable } from "@/db";
import { eq } from "drizzle-orm";
import { requestPickup } from "@/services/shipping";
import { logger } from "@/lib/serverLogger";
import { isAdminAuthorized } from "@/lib/adminAuth";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      return NextResponse.json({ error: "AWB number not found" }, { status: 400 });
    }

    const pickupResult = await requestPickup(order.awbNumber);

    if (pickupResult.response === true || pickupResult.status === true) {
      let currentDetails = {};
      try {
        const raw = (order as any).shippingDetails;
        currentDetails = typeof raw === "string" ? JSON.parse(raw) : (raw || {});
      } catch (e) {
        logger.error({ orderId: id, error: e }, "Failed to parse shippingDetails for pickup update");
      }

      const updatedDetails = {
        ...currentDetails,
        manifest_url: pickupResult.data || pickupResult.manifest_url,
        pickupRequested: true
      };

      await db
        .update(ordersTable)
        .set({ shippingDetails: updatedDetails })
        .where(eq(ordersTable.id, id));

      const [updatedOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
      return NextResponse.json(updatedOrder);
    } else {
      return NextResponse.json({ error: pickupResult.message || "Pickup request failed" }, { status: 400 });
    }
  } catch (error: any) {
    logger.error({ orderId: (await params).id, error: error.message }, "Pickup request failed");
    return NextResponse.json({ error: "Pickup request failed", message: error.message }, { status: 500 });
  }
}
