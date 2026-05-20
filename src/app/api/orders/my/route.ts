import { NextRequest, NextResponse } from "next/server";
import { db, ordersTable } from "@/db";
import { eq, or, desc } from "drizzle-orm";
import { logger } from "@/lib/serverLogger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone")?.trim() || "";
    const userIdStr = searchParams.get("userId");
    const userIdRaw = userIdStr ? parseInt(userIdStr, 10) : NaN;
    const userId = isNaN(userIdRaw) ? null : userIdRaw;

    if (!phone && !userId) {
      return NextResponse.json({ error: "phone or userId query param required" }, { status: 400 });
    }

    let orders;
    if (userId && phone) {
      orders = await db
        .select()
        .from(ordersTable)
        .where(or(eq(ordersTable.userId, userId), eq(ordersTable.phone, phone)))
        .orderBy(desc(ordersTable.createdAt));
    } else if (userId) {
      orders = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.userId, userId))
        .orderBy(desc(ordersTable.createdAt));
    } else {
      orders = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.phone, phone))
        .orderBy(desc(ordersTable.createdAt));
    }

    return NextResponse.json(orders);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to fetch my orders");
    return NextResponse.json({ error: "Failed to fetch orders", message: error.message }, { status: 500 });
  }
}
