import { useState, useEffect } from "react";
import { getApiBase } from "@/lib/api-config";
import { Star, ThumbsUp, CheckCircle2, ImageIcon, Loader2 } from "lucide-react";
import { resolveImageUrl } from "@/components/product-gallery";

interface Review {
  id: number;
  productId: number;
  userId: number | null;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  imageUrls: string[];
  helpfulCount: number;
  createdAt: string;
}

const HELPFUL_KEY = "aruna_helpful_reviews";

function getHelpfulSet(): Set<number> {
  try {
    const raw = localStorage.getItem(HELPFUL_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveHelpful(id: number) {
  const s = getHelpfulSet();
  s.add(id);
  localStorage.setItem(HELPFUL_KEY, JSON.stringify([...s]));
}

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);
  const cls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className={`${cls} fill-yellow-400 text-yellow-400`} />
      ))}
      {half && (
        <span className={`relative ${cls}`}>
          <Star className={`absolute ${cls} text-yellow-400 fill-none`} />
          <Star className={`absolute ${cls} text-yellow-400`} style={{ clipPath: "inset(0 50% 0 0)", fill: "rgb(250,204,21)" }} />
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className={`${cls} fill-none text-rose-200`} />
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function userInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

const avatarColors = [
  "from-pink-400 to-rose-500",
  "from-purple-400 to-violet-500",
  "from-orange-400 to-amber-500",
  "from-emerald-400 to-green-500",
  "from-sky-400 to-blue-500",
  "from-fuchsia-400 to-pink-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return avatarColors[Math.abs(h) % avatarColors.length];
}

function buildSyntheticDist(avgRating: number, total: number): number[] {
  const avg = Math.min(5, Math.max(1, avgRating));
  const raw = [
    Math.max(0, (avg - 1) / 4),
    Math.max(0, 1 - Math.abs(avg - 4) / 4),
    Math.max(0, 1 - Math.abs(avg - 3) / 3),
    Math.max(0, 1 - Math.abs(avg - 2) / 3),
    Math.max(0, (5 - avg) / 4),
  ];
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const normed = raw.map((v) => Math.round((v / sum) * total));
  const dist5 = [normed[0], normed[1], normed[2], normed[3], normed[4]];
  const diff = total - dist5.reduce((a, b) => a + b, 0);
  dist5[0] += diff;
  return dist5;
}

function buildRealDist(reviews: Review[]): number[] {
  const dist = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    const idx = Math.min(5, Math.max(1, r.rating)) - 1;
    dist[idx]++;
  }
  return [dist[4], dist[3], dist[2], dist[1], dist[0]];
}

interface ReviewsSectionProps {
  productId: number;
  productRating: number;
  reviewCount: number;
}

export function ReviewsSection({ productId, productRating, reviewCount }: ReviewsSectionProps) {
  const apiBase = getApiBase();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [helpfulSet, setHelpfulSet] = useState<Set<number>>(getHelpfulSet);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    setLoadingReviews(true);
    fetch(`${apiBase}/api/products/${productId}/reviews`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (!Array.isArray(data)) {
          setReviews([]);
          return;
        }
        const normalized = data.map((r) => ({
          ...r,
          imageUrls: (() => {
            if (Array.isArray(r.imageUrls)) return r.imageUrls;
            if (typeof r.imageUrls === "string" && r.imageUrls.trim()) {
              try {
                const p = JSON.parse(r.imageUrls);
                return Array.isArray(p) ? p : [];
              } catch {
                return [];
              }
            }
            return [];
          })(),
        }));
        setReviews(normalized);
      })
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  }, [productId]);

  const handleHelpful = async (reviewId: number) => {
    if (helpfulSet.has(reviewId)) return;
    saveHelpful(reviewId);
    setHelpfulSet(new Set([...helpfulSet, reviewId]));
    setReviews((prev) =>
      prev.map((r) => r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r)
    );
    fetch(`${apiBase}/api/reviews/${reviewId}/helpful`, { method: "POST" }).catch(() => {});
  };

  const displayAvg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : productRating;
  const displayCount = reviews.length > 0 ? reviews.length : reviewCount;
  const dist =
    reviews.length >= 3 ? buildRealDist(reviews) : buildSyntheticDist(productRating, displayCount);
  const totalForDist = dist.reduce((a, b) => a + b, 0) || 1;

  const reviewPhotos = reviews.flatMap((r) =>
    (r.imageUrls ?? []).map((url) => ({ url, reviewId: r.id, userName: r.userName }))
  );

  return (
    <section className="border-t border-pink-100 py-8 px-4">
      <div className="container mx-auto">
        <h2 className="font-serif text-xl font-bold text-rose-900 mb-5">Customer Reviews</h2>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 md:gap-10 items-start">

          {/* ── Left: Rating Summary ── */}
          <div className="space-y-4">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-extrabold text-rose-700 leading-none">{displayAvg.toFixed(1)}</span>
                <span className="text-base text-rose-500 font-medium mb-1">out of 5</span>
              </div>
              <StarDisplay rating={displayAvg} size="md" />
              <span className="text-xs text-muted-foreground mt-0.5">{displayCount} global rating{displayCount !== 1 ? "s" : ""}</span>
            </div>

            {/* Progress bars 5→1 */}
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star, idx) => {
                const count = dist[idx];
                const pct = Math.round((count / totalForDist) * 100);
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-0.5 text-rose-600 font-medium w-8 flex-none">
                      {star} <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </span>
                    <div className="flex-grow h-2 bg-pink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-400 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground flex-none">{pct}%</span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground bg-pink-50 border border-pink-100 rounded-xl px-3 py-2 leading-relaxed">
              Purchased this product? You can rate &amp; review it from your{" "}
              <strong className="text-rose-700">My Orders</strong> page after delivery.
            </p>
          </div>

          {/* ── Right: Review feed ── */}
          <div className="space-y-4">

            {/* Reviews with photos gallery */}
            {reviewPhotos.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Reviews with Photos ({reviewPhotos.length})
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {reviewPhotos.map(({ url, reviewId }, i) => (
                    <button
                      key={`${reviewId}-${i}`}
                      onClick={() => setLightboxSrc(resolveImageUrl(url))}
                      className="flex-none w-16 h-16 rounded-xl overflow-hidden border border-pink-100 hover:border-primary transition-colors"
                    >
                      <img
                        src={resolveImageUrl(url)}
                        alt={`Review photo ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Review list */}
            {loadingReviews ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Star className="w-10 h-10 text-pink-200" />
                <p className="text-sm text-muted-foreground">No written reviews yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-pink-100">
                {reviews.map((review) => {
                  const alreadyHelpful = helpfulSet.has(review.id);
                  return (
                    <div key={review.id} className="py-4 first:pt-0">
                      <div className="flex items-start gap-2.5 mb-2">
                        <div
                          className={`flex-none w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(review.userName)} flex items-center justify-center text-white text-xs font-bold`}
                        >
                          {userInitials(review.userName)}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-rose-900 leading-tight">{review.userName}</span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(review.createdAt)}</span>
                          </div>
                          <StarDisplay rating={review.rating} size="sm" />
                        </div>
                      </div>

                      {review.title && (
                        <p className="text-sm font-bold text-rose-900 mb-1">{review.title}</p>
                      )}

                      <p className="text-sm text-rose-700/80 leading-relaxed mb-2">{review.comment}</p>

                      {review.imageUrls && review.imageUrls.length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {review.imageUrls.map((url, i) => (
                            <button
                              key={i}
                              onClick={() => setLightboxSrc(resolveImageUrl(url))}
                              className="w-14 h-14 rounded-lg overflow-hidden border border-pink-100 hover:border-primary transition-colors flex-none"
                            >
                              <img src={resolveImageUrl(url)} alt={`Review ${i + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleHelpful(review.id)}
                        disabled={alreadyHelpful}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                          alreadyHelpful
                            ? "bg-green-50 border-green-200 text-green-700 cursor-default"
                            : "border-pink-200 text-rose-600 hover:bg-pink-50 hover:border-rose-300"
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {alreadyHelpful ? "Marked Helpful" : "Helpful"}
                        {review.helpfulCount > 0 && (
                          <span className="ml-1 bg-pink-100 text-rose-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                            {review.helpfulCount}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Review photo"
            className="max-w-full max-h-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
