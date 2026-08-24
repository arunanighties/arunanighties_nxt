import { NextResponse } from "next/server";
import { db, homeBannersTable } from "@/db";
import { ensureHomeBannersTableExist } from "@/lib/db-home-banners";
import { and, eq, isNull, lte, gte, or, asc } from "drizzle-orm";

export async function GET() {
  try {
    await ensureHomeBannersTableExist();
    const now = new Date();

    const banners = await db
      .select()
      .from(homeBannersTable)
      .where(
        and(
          eq(homeBannersTable.isActive, true),
          or(
            isNull(homeBannersTable.startsAt),
            lte(homeBannersTable.startsAt, now)
          ),
          or(
            isNull(homeBannersTable.endsAt),
            gte(homeBannersTable.endsAt, now)
          )
        )
      )
      .orderBy(asc(homeBannersTable.sortOrder), asc(homeBannersTable.id));

    return NextResponse.json(banners);
  } catch (error: any) {
    console.error("Failed to fetch storefront home banners:", error);
    return NextResponse.json({ error: "Failed to fetch banners", message: error.message }, { status: 500 });
  }
}
