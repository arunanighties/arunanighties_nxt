import { NextRequest, NextResponse } from "next/server";
import { db, productsTable } from "@/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body ?? {};
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    for (const item of items) {
      const prodId = parseInt(String(item.id), 10);
      if (!prodId || isNaN(prodId)) {
        return NextResponse.json({ error: "Invalid product id for item " + (item.name || "") }, { status: 400 });
      }

      const qtyOrdered = parseInt(String(item.qty || item.quantity || 1), 10);

      const [product] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, prodId))
        .limit(1);

      if (!product) {
        return NextResponse.json({ error: `Product "${item.name || ""}" not found` }, { status: 404 });
      }

      let currentStock = product.stock ?? 0;
      let currentSizes = product.sizes;
      let currentInventory = product.inventory;

      if (typeof currentSizes === "string") {
        try { currentSizes = JSON.parse(currentSizes); } catch { currentSizes = []; }
      }
      if (!Array.isArray(currentSizes)) currentSizes = [];

      if (typeof currentInventory === "string") {
        try { currentInventory = JSON.parse(currentInventory); } catch { currentInventory = {}; }
      }
      if (!currentInventory || typeof currentInventory !== "object") currentInventory = {};

      if (currentStock < qtyOrdered) {
        return NextResponse.json({
          error: `Insufficient stock for "${product.name}". Only ${currentStock} left in stock.`
        }, { status: 400 });
      }

      if (item.size) {
        const matchedSize = currentSizes.find((s: any) => String(s.size).toUpperCase() === String(item.size).toUpperCase());
        const sizeQty = matchedSize ? (matchedSize.quantity ?? 0) : 0;
        if (sizeQty < qtyOrdered) {
          return NextResponse.json({
            error: `Insufficient stock for size "${item.size}" of "${product.name}". Only ${sizeQty} available.`
          }, { status: 400 });
        }
      }

      if (item.size && item.color) {
        const sizeKeys = Object.keys(currentInventory);
        const matchedSizeKey = sizeKeys.find(k => k.toUpperCase() === String(item.size).toUpperCase());
        if (matchedSizeKey) {
          const colorKeys = Object.keys(currentInventory[matchedSizeKey] || {});
          const matchedColorKey = colorKeys.find(c => c.toUpperCase() === String(item.color).toUpperCase());
          const variationQty = (matchedColorKey && currentInventory[matchedSizeKey][matchedColorKey]) 
            ? (currentInventory[matchedSizeKey][matchedColorKey].qty ?? 0) 
            : 0;

          if (variationQty < qtyOrdered) {
            return NextResponse.json({
              error: `Insufficient stock for variation "${item.color} (${item.size})" of "${product.name}". Only ${variationQty} available.`
            }, { status: 400 });
          }
        } else {
          return NextResponse.json({
            error: `Variation size "${item.size}" not found for "${product.name}".`
          }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ success: true, message: "All items are in stock" });
  } catch (error: any) {
    console.error("Check Stock Error:", error);
    return NextResponse.json({ error: "Failed to verify stock levels", message: error.message }, { status: 500 });
  }
}
