import { db, productsTable } from "@/db";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/serverLogger";

export async function restoreOrderStock(items: any) {
  try {
    let orderItemsArray: any[] = [];
    if (typeof items === "string") {
      try { orderItemsArray = JSON.parse(items); } catch { orderItemsArray = []; }
    } else if (Array.isArray(items)) {
      orderItemsArray = items;
    }

    for (const item of orderItemsArray) {
      const prodId = parseInt(String(item.id), 10);
      if (!prodId || isNaN(prodId)) continue;

      const qtyOrdered = parseInt(String(item.qty || item.quantity || 1), 10);
      const qtyToRestore = item.stock_decremented !== undefined ? parseInt(String(item.stock_decremented), 10) : qtyOrdered;
      if (qtyToRestore <= 0) continue;

      const [product] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, prodId))
        .limit(1);

      if (product) {
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

        const nextStock = currentStock + qtyToRestore;

        const nextSizes = currentSizes.map((s: any) => {
          if (item.size && String(s.size).toUpperCase() === String(item.size).toUpperCase()) {
            return { ...s, quantity: (s.quantity ?? 0) + qtyToRestore };
          }
          return s;
        });

        const nextInventory = { ...currentInventory } as any;
        if (item.size && item.color) {
          const sizeKeys = Object.keys(nextInventory);
          const matchedSizeKey = sizeKeys.find(k => k.toUpperCase() === String(item.size).toUpperCase());
          if (matchedSizeKey) {
            const colorKeys = Object.keys(nextInventory[matchedSizeKey] || {});
            const matchedColorKey = colorKeys.find(c => c.toUpperCase() === String(item.color).toUpperCase());
            if (matchedColorKey) {
              const currentQty = nextInventory[matchedSizeKey][matchedColorKey].qty ?? 0;
              nextInventory[matchedSizeKey][matchedColorKey].qty = currentQty + qtyToRestore;
            }
          }
        }

        await db
          .update(productsTable)
          .set({
            stock: nextStock,
            sizes: nextSizes,
            inventory: nextInventory,
          })
          .where(eq(productsTable.id, prodId));
      }
    }
  } catch (err: any) {
    logger.error({ error: err.message }, "Failed to restore stock for cancelled order");
  }
}
export const VALID_STATUSES = [
  "pending", "confirmed", "processing", "shipped", "in transit", "out for delivery", "delivered", "cancelled", "cancelled by admin",
  "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "IN TRANSIT", "OUT FOR DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED", "CANCELLED BY ADMIN"
] as const;
