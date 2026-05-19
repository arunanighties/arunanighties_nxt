import { NextRequest, NextResponse } from "next/server";
import { db, ordersTable } from "@/db";
import { eq } from "drizzle-orm";
import { restoreOrderStock } from "@/lib/orderHelpers";
import { logger } from "@/lib/serverLogger";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const body = await request.json();
    const userIdRaw = body?.userId;
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const userId = userIdRaw ? parseInt(String(userIdRaw), 10) : NaN;

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const ownsOrder =
      (!isNaN(userId) && order.userId === userId) ||
      (phone && order.phone === phone);
    if (!ownsOrder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cancellableStatuses = ["pending", "confirmed", "processing"];
    if (!cancellableStatuses.includes(order.status.toLowerCase())) {
      return NextResponse.json({ error: "Orders can only be cancelled before they are Shipped." }, { status: 400 });
    }

    await restoreOrderStock(order.items);

    await db
      .update(ordersTable)
      .set({ status: "cancelled" })
      .where(eq(ordersTable.id, id));

    const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ orderId: (await params).id, error: error.message }, "Failed to cancel order");
    return NextResponse.json({ error: "Failed to cancel order", message: error.message }, { status: 500 });
  }
}
export const POST = PATCH; // Handle POST too for robustness
