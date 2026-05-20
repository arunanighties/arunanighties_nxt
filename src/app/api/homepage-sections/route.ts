import { NextRequest, NextResponse } from "next/server";
import { db, homepageSectionsTable, productsTable } from "@/db";
import { eq, asc } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET() {
  try {
    const sections = await db
      .select()
      .from(homepageSectionsTable)
      .orderBy(asc(homepageSectionsTable.position), asc(homepageSectionsTable.createdAt));

    const products = await db.select().from(productsTable);

    const result = sections.map((section) => ({
      ...section,
      products: products.filter((p) => p.sectionId === section.id),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DEBUG: Failed to fetch homepage sections:", error);
    return NextResponse.json({ error: "Failed to fetch homepage sections", message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const position = typeof body?.position === "number" ? body.position : 0;

    if (!name) {
      return NextResponse.json({ error: "Section name is required." }, { status: 400 });
    }

    const [section] = await db
      .insert(homepageSectionsTable)
      .values({ name, position })
      .returning();
    return NextResponse.json({ ...section, products: [] }, { status: 201 });
  } catch (err: any) {
    console.error("DEBUG: Failed to create section:", err);
    const msg = err.message || "";
    if (msg.includes("unique")) {
      return NextResponse.json({ error: "A section with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create section.", message: msg }, { status: 500 });
  }
}
