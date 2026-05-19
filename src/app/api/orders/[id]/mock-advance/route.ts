import { NextRequest, NextResponse } from "next/server";
import { db, ordersTable } from "@/db";
import { eq } from "drizzle-orm";
import { advanceMockStage } from "@/services/shipping";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order || !order.awbNumber) {
      return NextResponse.json({ error: "Order or AWB not found" }, { status: 404 });
    }

    const success = advanceMockStage(order.awbNumber);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
