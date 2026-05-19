import { NextRequest, NextResponse } from "next/server";
import { db, homepageSectionsTable } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const order: number[] = body?.order;
    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: "order must be a non-empty array of section ids" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < order.length; i++) {
        await tx
          .update(homepageSectionsTable)
          .set({ position: i })
          .where(eq(homepageSectionsTable.id, order[i]));
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DEBUG: Failed to reorder sections:", error);
    return NextResponse.json({ error: "Failed to reorder sections", message: error.message }, { status: 500 });
  }
}
