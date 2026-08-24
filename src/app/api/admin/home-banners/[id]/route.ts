import { NextRequest, NextResponse } from "next/server";
import { db, homeBannersTable } from "@/db";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { ensureHomeBannersTableExist } from "@/lib/db-home-banners";
import { eq } from "drizzle-orm";

function parseDate(val: any): Date | null {
  if (val === null || val === undefined) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(
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

    const [banner] = await db
      .select()
      .from(homeBannersTable)
      .where(eq(homeBannersTable.id, bannerId));

    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    return NextResponse.json(banner);
  } catch (error: any) {
    console.error("Failed to fetch home banner:", error);
    return NextResponse.json({ error: "Failed to fetch banner", message: error.message }, { status: 500 });
  }
}

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

    const [existing] = await db
      .select()
      .from(homeBannersTable)
      .where(eq(homeBannersTable.id, bannerId));

    if (!existing) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Partial<typeof homeBannersTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof body.desktopImageUrl === "string") {
      updateData.desktopImageUrl = body.desktopImageUrl.trim();
    }
    if (typeof body.mobileImageUrl === "string") {
      updateData.mobileImageUrl = body.mobileImageUrl.trim();
    }
    if (body.title !== undefined) {
      updateData.title = typeof body.title === "string" ? body.title.trim() : null;
    }
    if (body.subtitle !== undefined) {
      updateData.subtitle = typeof body.subtitle === "string" ? body.subtitle.trim() : null;
    }
    if (body.ctaText !== undefined) {
      updateData.ctaText = typeof body.ctaText === "string" ? body.ctaText.trim() : null;
    }
    if (body.ctaUrl !== undefined) {
      updateData.ctaUrl = typeof body.ctaUrl === "string" ? body.ctaUrl.trim() : null;
    }
    if (body.linkType !== undefined) {
      updateData.linkType = body.linkType === "external" ? "external" : "internal";
    }
    if (typeof body.sortOrder === "number") {
      updateData.sortOrder = body.sortOrder;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    const startsAt = body.startsAt !== undefined ? parseDate(body.startsAt) : existing.startsAt;
    const endsAt = body.endsAt !== undefined ? parseDate(body.endsAt) : existing.endsAt;

    if (startsAt && endsAt && endsAt.getTime() < startsAt.getTime()) {
      return NextResponse.json(
        { error: "End date must be greater than or equal to start date." },
        { status: 400 }
      );
    }

    if (body.startsAt !== undefined) updateData.startsAt = startsAt;
    if (body.endsAt !== undefined) updateData.endsAt = endsAt;

    const [updated] = await db
      .update(homeBannersTable)
      .set(updateData)
      .where(eq(homeBannersTable.id, bannerId))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update home banner:", error);
    return NextResponse.json({ error: "Failed to update banner", message: error.message }, { status: 500 });
  }
}

export async function DELETE(
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

    const [existing] = await db
      .select()
      .from(homeBannersTable)
      .where(eq(homeBannersTable.id, bannerId));

    if (!existing) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    await db.delete(homeBannersTable).where(eq(homeBannersTable.id, bannerId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete home banner:", error);
    return NextResponse.json({ error: "Failed to delete banner", message: error.message }, { status: 500 });
  }
}
