import { NextRequest, NextResponse } from "next/server";
import { db, productsTable } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

type RouteParams = { params: Promise<{ id: string; productId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: sectionIdStr, productId: productIdStr } = await params;
    const sectionId = parseInt(sectionIdStr, 10);
    const productId = parseInt(productIdStr, 10);
    if (isNaN(sectionId) || isNaN(productId)) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }

    await db
      .update(productsTable)
      .set({ sectionId })
      .where(eq(productsTable.id, productId));

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: any) {
    console.error("DEBUG: Failed to assign product to section:", error);
    return NextResponse.json({ error: "Failed to assign product", message: error.message }, { status: 500 });
  }
}
