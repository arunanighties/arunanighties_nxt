import { NextRequest, NextResponse } from "next/server";
import { db, productsTable } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: any) {
    console.error("DEBUG: Failed to fetch product:", error);
    return NextResponse.json({ error: "Failed to fetch product", message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const body = await request.json();
    const base = (body?.data && typeof body.data === "object") ? body.data : body;
    const { name, description, imageUrl, images, stock, categoryId, rating, reviewCount, reviewText, inventory, sizes } = base ?? {};

    let finalInventory = inventory;
    if (typeof inventory === "string" && inventory.trim()) {
      try { finalInventory = JSON.parse(inventory); } catch (e) {}
    } else if (!finalInventory && base.inventory) {
      finalInventory = base.inventory;
    }

    let finalSizes = sizes;
    if (typeof sizes === "string" && sizes.trim()) {
      try { finalSizes = JSON.parse(sizes); } catch (e) {}
    } else if (!finalSizes && base.sizes) {
      finalSizes = base.sizes;
    }

    let sizesArr = Array.isArray(finalSizes) ? finalSizes.map((s: any) => ({
      size: String(s.size || "").trim(),
      quantity: parseInt(String(s.quantity), 10) || 0
    })).filter((s: any) => s.size) : [];
    
    const updates: Record<string, unknown> = {};

    if (typeof name === "string") updates.name = name.trim();
    if (typeof description === "string") updates.description = description.trim();
    
    if (finalInventory !== undefined) {
      updates.inventory = finalInventory;
      const derivedSizes: Record<string, number> = {};
      let totalStock = 0;
      if (finalInventory && typeof finalInventory === "object") {
        for (const size in finalInventory) {
          let sizeQty = 0;
          const colors = (finalInventory as any)[size];
          if (colors && typeof colors === "object") {
            for (const colorName in colors) {
              const colorDetails = colors[colorName];
              if (colorDetails && typeof colorDetails === "object") {
                sizeQty += parseInt(String(colorDetails.qty ?? 0), 10) || 0;
              }
            }
          }
          derivedSizes[size] = sizeQty;
          totalStock += sizeQty;
        }
      }
      updates.sizes = Object.entries(derivedSizes).map(([size, quantity]) => ({ size, quantity }));
      updates.stock = totalStock;
    } else {
      let currentStock = stock !== undefined ? parseInt(String(stock), 10) || 0 : undefined;

      if (finalSizes !== undefined || currentStock !== undefined) {
        const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id));
        if (existing) {
          const checkSizes = finalSizes !== undefined ? sizesArr : (existing.sizes as any[] ?? []);
          const checkStock = currentStock !== undefined ? currentStock : existing.stock;
          
          if (checkSizes.length === 0) {
            return NextResponse.json({ error: "At least one size is required" }, { status: 400 });
          }

          const calculatedStock = checkSizes.reduce((sum, s) => sum + s.quantity, 0);
          if (checkStock !== calculatedStock) {
            return NextResponse.json({ error: `Overall stock (${checkStock}) must exactly equal the sum of size quantities (${calculatedStock})` }, { status: 400 });
          }
          if (finalSizes !== undefined) updates.sizes = checkSizes;
          if (currentStock !== undefined) updates.stock = checkStock;
        }
      }
    }

    if (categoryId !== undefined) updates.categoryId = categoryId ? parseInt(String(categoryId), 10) : null;
    if (rating !== undefined && !isNaN(parseFloat(rating))) updates.rating = String(parseFloat(rating).toFixed(1));
    if (reviewCount !== undefined) updates.reviewCount = Math.max(1, parseInt(String(reviewCount), 10) || 1);
    if (typeof reviewText === "string") updates.reviewText = reviewText.trim();

    if (Array.isArray(images)) {
      const imagesArr: string[] = images.filter((u: unknown) => typeof u === "string");
      updates.images = imagesArr;
      updates.imageUrl = imagesArr[0] ?? "";
    } else if (typeof imageUrl === "string") {
      updates.imageUrl = imageUrl.trim();
    }

    await db.update(productsTable).set(updates).where(eq(productsTable.id, id));
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: any) {
    console.error("DEBUG: Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product", message: error.message }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    await db.delete(productsTable).where(eq(productsTable.id, id));
    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error("DEBUG: Failed to delete product:", error);
    return NextResponse.json({ error: "Failed to delete product", message: error.message }, { status: 500 });
  }
}
