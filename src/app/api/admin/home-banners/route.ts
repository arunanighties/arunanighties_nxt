import { NextRequest, NextResponse } from "next/server";
import { db, homeBannersTable } from "@/db";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { ensureHomeBannersTableExist } from "@/lib/db-home-banners";
import { asc, max } from "drizzle-orm";

function parseDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureHomeBannersTableExist();
    const banners = await db
      .select()
      .from(homeBannersTable)
      .orderBy(asc(homeBannersTable.sortOrder), asc(homeBannersTable.id));

    return NextResponse.json(banners);
  } catch (error: any) {
    console.error("Failed to fetch admin home banners:", error);
    return NextResponse.json({ error: "Failed to fetch banners", message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureHomeBannersTableExist();
    const body = await request.json();

    const desktopImageUrl = typeof body.desktopImageUrl === "string" ? body.desktopImageUrl.trim() : "";
    const mobileImageUrl = typeof body.mobileImageUrl === "string" ? body.mobileImageUrl.trim() : "";

    if (!desktopImageUrl || !mobileImageUrl) {
      return NextResponse.json(
        { error: "Both desktopImageUrl and mobileImageUrl are required." },
        { status: 400 }
      );
    }

    const title = typeof body.title === "string" ? body.title.trim() : null;
    const subtitle = typeof body.subtitle === "string" ? body.subtitle.trim() : null;
    const ctaText = typeof body.ctaText === "string" ? body.ctaText.trim() : null;
    const ctaUrl = typeof body.ctaUrl === "string" ? body.ctaUrl.trim() : null;
    const linkType = body.linkType === "external" ? "external" : "internal";

    const startsAt = parseDate(body.startsAt);
    const endsAt = parseDate(body.endsAt);

    if (startsAt && endsAt && endsAt.getTime() < startsAt.getTime()) {
      return NextResponse.json(
        { error: "End date must be greater than or equal to start date." },
        { status: 400 }
      );
    }

    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    // Calculate sort order if not provided
    let sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : undefined;
    if (sortOrder === undefined) {
      const [maxRes] = await db.select({ maxSort: max(homeBannersTable.sortOrder) }).from(homeBannersTable);
      sortOrder = (maxRes?.maxSort ?? -1) + 1;
    }

    const now = new Date();
    const [inserted] = await db
      .insert(homeBannersTable)
      .values({
        title,
        subtitle,
        desktopImageUrl,
        mobileImageUrl,
        ctaText,
        ctaUrl,
        linkType,
        sortOrder,
        isActive,
        startsAt,
        endsAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create home banner:", error);
    return NextResponse.json({ error: "Failed to create banner", message: error.message }, { status: 500 });
  }
}
