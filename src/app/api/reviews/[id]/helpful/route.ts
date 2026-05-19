import { NextRequest, NextResponse } from "next/server";
import { db, reviewsTable } from "@/db";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
    }

    const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    await db
      .update(reviewsTable)
      .set({ helpfulCount: (existing.helpfulCount ?? 0) + 1 })
      .where(eq(reviewsTable.id, id));

    const [updated] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("DEBUG: Failed to update helpful count:", error);
    return NextResponse.json({ error: "Failed to update helpful count", message: error.message }, { status: 500 });
  }
}
