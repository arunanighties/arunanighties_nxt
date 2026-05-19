import { NextRequest, NextResponse } from "next/server";
import { db, homepageSectionsTable, productsTable } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid section id" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (typeof body?.name === "string") updates.name = body.name.trim();
    if (typeof body?.position === "number") updates.position = body.position;

    await db
      .update(homepageSectionsTable)
      .set(updates)
      .where(eq(homepageSectionsTable.id, id));

    const [section] = await db.select().from(homepageSectionsTable).where(eq(homepageSectionsTable.id, id));
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }
    return NextResponse.json(section);
  } catch (error: any) {
    console.error("DEBUG: Failed to update section:", error);
    return NextResponse.json({ error: "Failed to update section", message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid section id" }, { status: 400 });
    }

    await db
      .update(productsTable)
      .set({ sectionId: null })
      .where(eq(productsTable.sectionId, id));

    const [deleted] = await db.select().from(homepageSectionsTable).where(eq(homepageSectionsTable.id, id));
    if (!deleted) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    await db
      .delete(homepageSectionsTable)
      .where(eq(homepageSectionsTable.id, id));

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error("DEBUG: Failed to delete section:", error);
    return NextResponse.json({ error: "Failed to delete section", message: error.message }, { status: 500 });
  }
}
