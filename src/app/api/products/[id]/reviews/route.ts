import { NextRequest, NextResponse } from "next/server";
import { db, reviewsTable, productsTable } from "@/db";
import { eq, desc } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const productId = parseInt(idStr, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }
    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.productId, productId))
      .orderBy(desc(reviewsTable.createdAt));
    return NextResponse.json(reviews);
  } catch (error: any) {
    console.error("DEBUG: Failed to fetch reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews", message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const productId = parseInt(idStr, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body = await request.json();
    const { userId, userName, rating, title, comment, imageUrls } = body ?? {};

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }
    if (!comment || typeof comment !== "string" || comment.trim().length < 3) {
      return NextResponse.json({ error: "Review comment is required (min 3 chars)" }, { status: 400 });
    }

    const imageUrlsArr: string[] = Array.isArray(imageUrls)
      ? imageUrls.filter((u: unknown) => typeof u === "string")
      : [];

    await db
      .insert(reviewsTable)
      .values({
        productId,
        userId: userId ? parseInt(String(userId), 10) : null,
        userName: typeof userName === "string" && userName.trim() ? userName.trim() : "Customer",
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        title: typeof title === "string" ? title.trim().slice(0, 120) : "",
        comment: comment.trim(),
        imageUrls: imageUrlsArr,
        helpfulCount: 0,
      });

    const allReviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.productId, productId));

    const reviewCount = allReviews.length;
    const ratingSum = allReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0);
    const avgRating = reviewCount > 0 ? parseFloat((ratingSum / reviewCount).toFixed(1)) : 4.3;

    await db
      .update(productsTable)
      .set({
        rating: avgRating,
        reviewCount: reviewCount
      })
      .where(eq(productsTable.id, productId));

    const [review] = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.productId, productId))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(1);

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    console.error("DEBUG: Failed to post review:", error);
    return NextResponse.json({ error: "Failed to post review", message: error.message }, { status: 500 });
  }
}
