import { NextRequest, NextResponse } from "next/server";
import { db, siteSettingsTable } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

const DEFAULT_SETTINGS: Record<string, string> = {
  heroTitle: "Sleep Beautifully,",
  heroTitleHighlight: "Every Night.",
  heroSubtitle: "Discover Aruna Nighties — soft Indian cotton nightgowns crafted for comfort, modesty, and elegance. Designed for every woman.",
  heroBadge: "New Collection 2025",
  heroStartingPrice: "499",
  featuredSectionLabel: "Handpicked for You",
  featuredSectionTitle: "Top Featured Nighties",
  featuredSectionSubtitle: "Traditional Indian cotton nightgowns — soft, stylish, and made to last.",
};

export async function GET() {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DEBUG: Failed to fetch settings:", error);
    return NextResponse.json({ 
      error: "Failed to fetch settings", 
      message: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updates = await request.json() as Record<string, string>;
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Body must be an object of key:value pairs" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== "string") continue;
      const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, key));
      } else {
        await db.insert(siteSettingsTable).values({ key, value });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DEBUG: Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings", message: error.message }, { status: 500 });
  }
}
export const PUT = POST; // Handle both PUT and POST for robustness
