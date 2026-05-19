import { NextRequest, NextResponse } from "next/server";
import { db, productsTable, ordersTable } from "@/db";
import { sql } from "drizzle-orm";
import { GetStatsResponse } from "@workspace/api-zod";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [productStats] = await db
      .select({
        totalProducts: sql<number>`count(*)`,
      })
      .from(productsTable);

    const [lowStock] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productsTable)
      .where(sql`${productsTable.stock} < 5`);

    const [orderStats] = await db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalRevenue: sql<string>`coalesce(sum(${ordersTable.total}), 0)`,
      })
      .from(ordersTable)
      .where(sql`${ordersTable.status} NOT IN ('cancelled', 'CANCELLED')`);

    return NextResponse.json(
      GetStatsResponse.parse({
        totalProducts: Number(productStats?.totalProducts ?? 0),
        totalOrders: Number(orderStats?.totalOrders ?? 0),
        totalRevenue: String(orderStats?.totalRevenue ?? "0"),
        lowStockCount: Number(lowStock?.count ?? 0),
      }),
    );
  } catch (error: any) {
    console.error("DEBUG: Failed to fetch stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats", message: error.message }, { status: 500 });
  }
}
