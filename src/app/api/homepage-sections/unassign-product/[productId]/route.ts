import { NextRequest, NextResponse } from "next/server";
import { db, productsTable } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

type RouteParams = { params: Promise<{ productId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId: productIdStr } = await params;
    const productId = parseInt(productIdStr, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    await db
      .update(productsTable)
      .set({ sectionId: null })
      .where(eq(productsTable.id, productId));

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: any) {
    console.error("DEBUG: Failed to unassign product from section:", error);
    return NextResponse.json({ error: "Failed to unassign product", message: error.message }, { status: 500 });
  }
}
