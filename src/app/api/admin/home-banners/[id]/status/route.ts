import { NextRequest, NextResponse } from "next/server";
import { db, homeBannersTable } from "@/db";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { ensureHomeBannersTableExist } from "@/lib/db-home-banners";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureHomeBannersTableExist();
    const { id: rawId } = await params;
    const bannerId = parseInt(rawId, 10);

    if (isNaN(bannerId)) {
      return NextResponse.json({ error: "Invalid banner ID" }, { status: 400 });
    }

    const body = await request.json();
    if (typeof body?.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(homeBannersTable)
      .where(eq(homeBannersTable.id, bannerId));

    if (!existing) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(homeBannersTable)
      .set({
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(eq(homeBannersTable.id, bannerId))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update banner status:", error);
    return NextResponse.json({ error: "Failed to update banner status", message: error.message }, { status: 500 });
  }
}
