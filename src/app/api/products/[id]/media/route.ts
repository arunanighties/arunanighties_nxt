import { NextRequest, NextResponse } from "next/server";
import { db, productsTable, ProductMediaSchema, ProductImageItem } from "@/db";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { r2StorageService, buildProductObjectKey } from "@/lib/storage/r2";
import { processImageVariants, validateImageBuffer, ImageValidationError } from "@/lib/storage/image-processor";
import { randomUUID } from "crypto";

type RouteParams = { params: Promise<{ id: string }> };

function normalizeMedia(media: any): ProductMediaSchema {
  if (!media || typeof media !== "object") {
    return { featuredImages: [], colorVariants: [] };
  }
  return {
    featuredImages: Array.isArray(media.featuredImages) ? media.featuredImages : [],
    colorVariants: Array.isArray(media.colorVariants) ? media.colorVariants : [],
  };
}

/**
 * Sync legacy `images` array and `imageUrl` string from the media object for backwards compatibility.
 */
function syncLegacyFields(media: ProductMediaSchema): { imageUrl: string; images: string[] } {
  const images: string[] = [];

  // Add featured images
  for (const item of media.featuredImages) {
    if (item?.urls?.gallery || item?.urls?.card) {
      images.push(item.urls.gallery || item.urls.card);
    }
  }

  // Add color variant images
  for (const cv of media.colorVariants) {
    for (const item of cv.images) {
      if (item?.urls?.gallery || item?.urls?.card) {
        images.push(item.urls.gallery || item.urls.card);
      }
    }
  }

  const primaryImage = media.featuredImages[0]?.urls?.gallery ||
    media.featuredImages[0]?.urls?.card ||
    images[0] ||
    "";

  return { imageUrl: primaryImage, images };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid product ID", code: "INVALID_PRODUCT" }, { status: 400 });
    }

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) {
      return NextResponse.json({ error: "Product not found", code: "INVALID_PRODUCT" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const target = (formData.get("target") as string || "featured").toLowerCase();
    const color = formData.get("color") as string || "";

    if (!file) {
      return NextResponse.json({ error: "No image file provided", code: "INVALID_IMAGE" }, { status: 400 });
    }

    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else if (file && typeof (file as any).arrayBuffer === "function") {
      const ab = await (file as any).arrayBuffer();
      buffer = Buffer.from(ab);
    } else if (file && typeof (file as any).stream === "function") {
      const chunks: Uint8Array[] = [];
      for await (const chunk of (file as any).stream()) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    } else {
      return NextResponse.json({ error: "Invalid file buffer payload", code: "INVALID_IMAGE" }, { status: 400 });
    }

    // Validate size & magic bytes
    await validateImageBuffer(buffer, file.type);

    const currentMedia = normalizeMedia(product.media);

    if (target === "featured") {
      if (currentMedia.featuredImages.length >= 3) {
        return NextResponse.json({
          error: "Maximum limit of 3 featured images reached.",
          code: "FEATURED_IMAGE_LIMIT"
        }, { status: 400 });
      }
    } else if (target === "color") {
      if (!color.trim()) {
        return NextResponse.json({ error: "Color name is required for color variant image", code: "INVALID_COLOR_VARIANT" }, { status: 400 });
      }
      const existingCv = currentMedia.colorVariants.find(
        (c) => c.color.toLowerCase().trim() === color.toLowerCase().trim()
      );
      if (existingCv && existingCv.images.length >= 5) {
        return NextResponse.json({
          error: `Maximum limit of 5 images for color '${color}' reached.`,
          code: "COLOR_IMAGE_LIMIT"
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Invalid target. Must be 'featured' or 'color'", code: "INVALID_TARGET" }, { status: 400 });
    }

    // Process image with Sharp
    const variants = await processImageVariants(buffer);
    const imageId = randomUUID();

    const category = target === "featured" ? "featured" : "colors";
    const cardKey = buildProductObjectKey({ productId: id, category, colorId: color, imageId, variant: "card" });
    const galleryKey = buildProductObjectKey({ productId: id, category, colorId: color, imageId, variant: "gallery" });
    const originalKey = buildProductObjectKey({ productId: id, category, colorId: color, imageId, variant: "original" });

    // Upload WebP variants to Cloudflare R2
    const cardUrl = await r2StorageService.upload(cardKey, variants.card, "image/webp");
    const galleryUrl = await r2StorageService.upload(galleryKey, variants.gallery, "image/webp");
    const originalUrl = await r2StorageService.upload(originalKey, variants.original, "image/webp");

    const newImageItem: ProductImageItem = {
      id: imageId,
      urls: {
        card: cardUrl,
        gallery: galleryUrl,
        original: originalUrl,
      },
      sortOrder: Date.now(),
    };

    if (target === "featured") {
      currentMedia.featuredImages.push(newImageItem);
    } else {
      let cvEntry = currentMedia.colorVariants.find(
        (c) => c.color.toLowerCase().trim() === color.toLowerCase().trim()
      );
      if (!cvEntry) {
        cvEntry = { color: color.trim(), images: [] };
        currentMedia.colorVariants.push(cvEntry);
      }
      cvEntry.images.push(newImageItem);
    }

    const { imageUrl: legacyImageUrl, images: legacyImages } = syncLegacyFields(currentMedia);

    await db
      .update(productsTable)
      .set({
        media: currentMedia,
        imageUrl: legacyImageUrl || product.imageUrl,
        images: legacyImages.length > 0 ? legacyImages : product.images,
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, id));

    return NextResponse.json({
      success: true,
      media: currentMedia,
      addedImage: newImageItem,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Error processing product image upload:", error);
    return NextResponse.json({ error: "Failed to process image upload", message: error.message, code: "UPLOAD_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid product ID", code: "INVALID_PRODUCT" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");
    if (!imageId) {
      return NextResponse.json({ error: "imageId parameter is required", code: "MISSING_IMAGE_ID" }, { status: 400 });
    }

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) {
      return NextResponse.json({ error: "Product not found", code: "INVALID_PRODUCT" }, { status: 404 });
    }

    const media = normalizeMedia(product.media);
    let removed = false;

    let targetItem: ProductImageItem | undefined;
    const featuredIndex = media.featuredImages.findIndex((img) => img.id === imageId);
    if (featuredIndex !== -1) {
      targetItem = media.featuredImages[featuredIndex];
      media.featuredImages.splice(featuredIndex, 1);
      removed = true;
    } else {
      // Check color variants
      for (const cv of media.colorVariants) {
        const idx = cv.images.findIndex((img) => img.id === imageId);
        if (idx !== -1) {
          targetItem = cv.images[idx];
          cv.images.splice(idx, 1);
          removed = true;
          break;
        }
      }
    }

    if (!removed) {
      return NextResponse.json({ error: "Image not found in product media", code: "IMAGE_NOT_FOUND" }, { status: 404 });
    }

    // Delete image files from Cloudflare R2 bucket
    if (targetItem && targetItem.urls) {
      const urls = [targetItem.urls.card, targetItem.urls.gallery, targetItem.urls.original].filter(Boolean) as string[];
      for (const u of urls) {
        try {
          const key = u.startsWith("http") ? new URL(u).pathname.replace(/^\/+/, "") : u.replace(/^\/+/, "");
          if (key) {
            await r2StorageService.delete(key);
          }
        } catch (err) {
          console.warn("[R2 Delete Warning] Failed to delete key from bucket:", u, err);
        }
      }
    }

    const { imageUrl: legacyImageUrl, images: legacyImages } = syncLegacyFields(media);

    await db
      .update(productsTable)
      .set({
        media,
        imageUrl: legacyImageUrl,
        images: legacyImages,
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, id));

    return NextResponse.json({ success: true, media });
  } catch (error: any) {
    console.error("Error deleting product image:", error);
    return NextResponse.json({ error: "Failed to delete image", message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid product ID", code: "INVALID_PRODUCT" }, { status: 400 });
    }

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) {
      return NextResponse.json({ error: "Product not found", code: "INVALID_PRODUCT" }, { status: 404 });
    }

    const body = await request.json();
    const { media } = body;

    if (!media || typeof media !== "object") {
      return NextResponse.json({ error: "Invalid media payload", code: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const normalized = normalizeMedia(media);
    if (normalized.featuredImages.length > 3) {
      return NextResponse.json({ error: "Featured images cannot exceed 3", code: "FEATURED_IMAGE_LIMIT" }, { status: 400 });
    }

    for (const cv of normalized.colorVariants) {
      if (cv.images.length > 5) {
        return NextResponse.json({ error: `Color variant '${cv.color}' images cannot exceed 5`, code: "COLOR_IMAGE_LIMIT" }, { status: 400 });
      }
    }

    const { imageUrl: legacyImageUrl, images: legacyImages } = syncLegacyFields(normalized);

    await db
      .update(productsTable)
      .set({
        media: normalized,
        imageUrl: legacyImageUrl || product.imageUrl,
        images: legacyImages.length > 0 ? legacyImages : product.images,
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, id));

    return NextResponse.json({ success: true, media: normalized });
  } catch (error: any) {
    console.error("Error updating product media order:", error);
    return NextResponse.json({ error: "Failed to update media", message: error.message }, { status: 500 });
  }
}
