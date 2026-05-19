import { NextRequest, NextResponse } from "next/server";
import { db, categoriesTable } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
    }

    const [existing] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error("DEBUG: Failed to delete category:", error);
    return NextResponse.json({ error: "Failed to delete category", message: error.message }, { status: 500 });
  }
}
