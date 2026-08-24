import { NextRequest, NextResponse } from "next/server";
import { db, homeBannersTable } from "@/db";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { ensureHomeBannersTableExist } from "@/lib/db-home-banners";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureHomeBannersTableExist();
    const body = await request.json();
    const items = body?.items;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const now = new Date();

    for (const item of items) {
      const bannerId = parseInt(String(item.id), 10);
      const sortOrder = parseInt(String(item.sortOrder), 10);

      if (!isNaN(bannerId) && !isNaN(sortOrder)) {
        await db
          .update(homeBannersTable)
          .set({ sortOrder, updatedAt: now })
          .where(eq(homeBannersTable.id, bannerId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to reorder home banners:", error);
    return NextResponse.json({ error: "Failed to reorder home banners", message: error.message }, { status: 500 });
  }
}
