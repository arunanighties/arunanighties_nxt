import { NextRequest, NextResponse } from "next/server";
import { db, categoriesTable } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET() {
  try {
    const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.createdAt);
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("DEBUG: Failed to fetch categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories", message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const icon = typeof body?.icon === "string" ? body.icon.trim() : "🌸";

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const [category] = await db
      .insert(categoriesTable)
      .values({ name, description, icon })
      .returning();
    return NextResponse.json(category, { status: 201 });
  } catch (err: any) {
    console.error("DEBUG: Failed to create category:", err);
    const msg = err.message || "";
    if (msg.includes("unique")) {
      return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create category.", message: msg }, { status: 500 });
  }
}
