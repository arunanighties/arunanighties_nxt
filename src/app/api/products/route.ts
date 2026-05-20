import { NextRequest, NextResponse } from "next/server";
import { db, productsTable } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET() {
  try {
    const products = await db.select().from(productsTable).orderBy(productsTable.createdAt);
    return NextResponse.json(products);
  } catch (error: any) {
    console.error("DEBUG: Failed to fetch products:", error);
    return NextResponse.json({ 
      error: "Failed to fetch products", 
      message: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const base = (body?.data && typeof body.data === "object") ? body.data : body;
    const { name, description, imageUrl, images, stock, categoryId, rating, reviewCount, reviewText, inventory, sizes } = base ?? {};

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

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

    let stockNum = typeof stock === "number" ? stock : parseInt(String(stock ?? 0), 10) || 0;

    if (finalInventory && typeof finalInventory === "object" && Object.keys(finalInventory).length > 0) {
      const derivedSizes: Record<string, number> = {};
      let totalStock = 0;
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
      sizesArr = Object.entries(derivedSizes).map(([size, quantity]) => ({ size, quantity }));
      stockNum = totalStock;
    }

    if (sizesArr.length === 0) {
      return NextResponse.json({ 
        error: "At least one size is required",
        debug: { 
          hasInventory: !!finalInventory, 
          hasSizes: !!finalSizes,
        }
      }, { status: 400 });
    }

    const imagesArr: string[] = Array.isArray(images) ? images.filter((u: unknown) => typeof u === "string") : [];
    const primaryImage = imagesArr[0] ?? (typeof imageUrl === "string" ? imageUrl.trim() : "");
    const reviewCountNum = reviewCount !== undefined ? parseInt(String(reviewCount), 10) || 1 : 1;

    const [newProduct] = await db
      .insert(productsTable)
      .values({
        name: String(name).trim(),
        description: typeof description === "string" ? description.trim() : "",
        imageUrl: primaryImage,
        images: imagesArr,
        sizes: sizesArr,
        inventory: finalInventory,
        stock: stockNum,
        categoryId: categoryId ? parseInt(String(categoryId), 10) : undefined,
        rating: rating !== undefined && !isNaN(parseFloat(rating)) ? parseFloat(parseFloat(rating).toFixed(1)) : 4.3,
        reviewCount: reviewCountNum,
        reviewText: typeof reviewText === "string" ? reviewText.trim() : "",
      })
      .returning();
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error("DEBUG: Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product", message: error.message }, { status: 500 });
  }
}
