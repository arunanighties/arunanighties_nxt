import { useState, useEffect, useCallback } from "react";
import { getApiBase } from "@/lib/api-config";
import { Link, useLocation, useParams } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product-card";
import { resolveImageUrl } from "@/components/product-gallery";
import { ReviewsSection } from "@/components/reviews-section";
import { useUser } from "@/context/user";
import { useCart } from "@/context/cart";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowLeft,
  ShoppingCart,
  Zap,
  Star,
  ChevronLeft,
  ChevronRight,
  Package,
  RotateCcw,
  Shield,
  Loader2,
} from "lucide-react";

interface ProductFull {
  id: number;
  name: string;
  description: string;
  price: string;
  mrp: string;
  imageUrl: string;
  images: string[];
  stock: number;
  sizes?: { size: string; quantity: number }[];
  inventory?: Record<string, Record<string, { hex: string; qty: number }>>;
  rating: string;
  reviewCount: number;
  reviewText: string;
  sectionId: number | null;
  categoryId: number | null;
  createdAt: string;
}

function computePricing(inventory: any, selectedSize?: string, selectedColor?: string, fallbackPrice?: string, fallbackMrp?: string | null) {
  let offer = 0;
  let mrp = 0;
  let isRange = false;
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  const inv = typeof inventory === "string" ? JSON.parse(inventory) : inventory;

  if (inv && typeof inv === "object" && Object.keys(inv).length > 0) {
    if (selectedSize && selectedColor && inv[selectedSize]?.[selectedColor]) {
      offer = parseFloat(inv[selectedSize][selectedColor].price);
      mrp = parseFloat(inv[selectedSize][selectedColor].mrp);
    } else {
      // Find min/max for "Starting at" display
      for (const s in inv) {
        for (const c in inv[s]) {
          const p = parseFloat(inv[s][c].price);
          const m = parseFloat(inv[s][c].mrp);
          if (p < minPrice) {
            minPrice = p;
            mrp = m; // Use MRP of the cheapest item as base
          }
          if (p > maxPrice) maxPrice = p;
        }
      }
      offer = minPrice;
      isRange = maxPrice > minPrice;
    }
  }

  if (offer === 0 || offer === Infinity) {
    offer = parseFloat(fallbackPrice || "0");
    mrp = fallbackMrp ? parseFloat(fallbackMrp) : Math.round(offer * 1.45);
  }

  const savings = Math.max(0, mrp - offer);
  const discountPct = mrp > 0 ? Math.round(((mrp - offer) / mrp) * 100) : 0;
  return { offer, mrp, savings, discountPct, isRange };
}

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);
  const cls = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
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

function DetailGallery({ images: rawImages, productName }: { images: string[]; productName: string }) {
  const images = Array.isArray(rawImages) ? rawImages : (typeof rawImages === "string" ? JSON.parse(rawImages) : []);
  const resolved = images.map(resolveImageUrl).filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: resolved.length > 1 });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  const scrollPrev = useCallback((e: React.MouseEvent) => { e.stopPropagation(); emblaApi?.scrollPrev(); }, [emblaApi]);
  const scrollNext = useCallback((e: React.MouseEvent) => { e.stopPropagation(); emblaApi?.scrollNext(); }, [emblaApi]);

  const selectThumb = (i: number) => {
    setActiveIndex(i);
    emblaApi?.scrollTo(i);
  };

  if (resolved.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center" style={{ aspectRatio: "3/4", maxHeight: 520 }}>
        <div className="flex flex-col items-center gap-2 opacity-50">
          <svg viewBox="0 0 100 160" className="w-20 h-32 text-rose-300" fill="none">
            <ellipse cx="50" cy="18" rx="12" ry="13" fill="currentColor" opacity="0.5" />
            <path d="M42 30 Q50 36 58 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <path d="M30 32 Q22 38 18 50 L12 140 Q50 152 88 140 L82 50 Q78 38 70 32 Q60 30 50 31 Q40 30 30 32Z" fill="currentColor" opacity="0.25" />
          </svg>
          <span className="text-xs text-rose-400 uppercase tracking-wide font-medium">Indian Cotton Nighty</span>
        </div>
      </div>
    );
  }

  const hasThumbs = resolved.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Main image carousel — 3:4 portrait, capped at 520px tall */}
      <div
        className="relative w-full overflow-hidden rounded-2xl group"
        style={{ aspectRatio: "3/4", maxHeight: 520, backgroundColor: "#fdf2f8" }}
      >
        <div ref={emblaRef} className="overflow-hidden w-full h-full">
          <div className="flex h-full">
            {resolved.map((src: string, i: number) => (
              <div key={i} className="flex-none w-full h-full" style={{ backgroundColor: "#fdf2f8" }}>
                <img
                  src={src}
                  alt={`${productName} - ${i + 1}`}
                  className="w-full h-full object-contain"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        </div>

        {hasThumbs && (
          <>
            <button onClick={scrollPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10" aria-label="Previous">
              <ChevronLeft className="w-5 h-5 text-rose-700" />
            </button>
            <button onClick={scrollNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10" aria-label="Next">
              <ChevronRight className="w-5 h-5 text-rose-700" />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {resolved.map((_: string, i: number) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); selectThumb(i); }} className={`h-1.5 rounded-full transition-all ${i === activeIndex ? "w-5 bg-white shadow" : "w-1.5 bg-white/60"}`} aria-label={`Image ${i + 1}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails — horizontal row below the main image */}
      {hasThumbs && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {resolved.map((src: string, i: number) => (
            <button
              key={i}
              onClick={() => selectThumb(i)}
              className={`flex-none rounded-xl overflow-hidden border-2 transition-all ${i === activeIndex
                ? "border-primary shadow-md shadow-rose-200"
                : "border-pink-100 hover:border-rose-300 opacity-60 hover:opacity-100"
                }`}
              style={{ width: 68, height: 88, aspectRatio: "3/4", backgroundColor: "#fdf2f8" }}
              aria-label={`View image ${i + 1}`}
            >
              <img src={src} alt={`${productName} ${i + 1}`} className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { user, openLogin } = useUser();
  const { addItem, items } = useCart();
  const { toast } = useToast();

  const [product, setProduct] = useState<ProductFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<ProductFull[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [reviews, setReviews] = useState<any[]>([]);

  const apiBase = getApiBase();

  useEffect(() => {
    if (!productId) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    setProduct(null);
    setNotFound(false);
    setQuantity(1);
    setReviews([]);

    // Fetch product details
    fetch(`${apiBase}/api/products/${productId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: ProductFull) => {
        // Safe JSON parsing for MySQL text columns
        const normalized = { ...data };
        if (typeof normalized.sizes === "string") {
          try { normalized.sizes = JSON.parse(normalized.sizes); } catch { normalized.sizes = []; }
        }
        if (!Array.isArray(normalized.sizes)) normalized.sizes = [];

        if (typeof normalized.inventory === "string") {
          try { normalized.inventory = JSON.parse(normalized.inventory); } catch { normalized.inventory = {}; }
        }
        if (!normalized.inventory || typeof normalized.inventory !== "object") normalized.inventory = {};

        if (typeof normalized.images === "string") {
          try { normalized.images = JSON.parse(normalized.images); } catch { normalized.images = []; }
        }
        if (!Array.isArray(normalized.images)) normalized.images = [];

        setProduct(normalized);

        // Fetch similar products
        return fetch(`${apiBase}/api/products`)
          .then((r) => r.ok ? r.json() : [])
          .then((all: ProductFull[]) => {
            const similar = all.filter((p) => {
              if (p.id === data.id) return false;
              if (data.sectionId && p.sectionId === data.sectionId) return true;
              if (data.categoryId && p.categoryId === data.categoryId) return true;
              return false;
            }).slice(0, 4);
            setSimilarProducts(similar);
          });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    // Fetch reviews to calculate dynamic rating/count
    fetch(`${apiBase}/api/products/${productId}/reviews`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) {
          setReviews(data);
        }
      })
      .catch(() => {});
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.name} | Aruna Nighties`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    const cleanDesc = (product.description || "").replace(/<[^>]*>/g, '');
    metaDesc.setAttribute('content', `Buy ${product.name} at Aruna Nighties. ${cleanDesc.slice(0, 140)}... Premium pure cotton daily wear nightgowns.`);

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', `${product.name}, buy ${product.name} online, aruna cotton nighties, traditional sleepwear, premium indian nightwear`);
  }, [product]);

  const handleAddToCart = (): boolean => {
    if (!user) { openLogin(); return false; }
    if (!product) return false;

    if (!selectedSize || !selectedColor) {
      toast({ 
        variant: "destructive", 
        title: "Selection Required", 
        description: "Please select both a size and a color before adding to cart." 
      });
      return false;
    }

    const hasInventory = product.inventory && Object.keys(product.inventory).length > 0;
    const hasSizes = product.sizes && product.sizes.length > 0;
    if (hasSizes && !selectedSize) {
      toast({ variant: "destructive", title: "Size required", description: "Please select a size before adding to cart." });
      return false;
    }

    const { offer, mrp: calculatedMrp } = computePricing(product.inventory, selectedSize, selectedColor, product.price, product.mrp);
    const images: string[] = product.images ?? [];
    const displayImages = images.length > 0 ? images : (product.imageUrl ? [product.imageUrl] : []);

    // determine max stock for this specific size/color
    let maxStock = product.stock ?? 99;
    if (hasInventory && selectedSize && selectedColor) {
      maxStock = product.inventory?.[selectedSize]?.[selectedColor]?.qty ?? 0;
    } else if (hasSizes && selectedSize) {
      const sizeObj = product.sizes?.find(s => s.size === selectedSize);
      if (sizeObj) maxStock = sizeObj.quantity;
    }

    if (maxStock <= 0) {
      toast({
        variant: "destructive",
        title: "Out of Stock",
        description: "This variation is currently out of stock."
      });
      return false;
    }

    const cartItemId = `${product.id}-${selectedSize || 'na'}-${selectedColor || 'na'}`;
    const existingCartItem = items.find((i) => i.cartItemId === cartItemId);
    const existingQty = existingCartItem ? existingCartItem.quantity : 0;

    if (existingQty + quantity > maxStock) {
      toast({
        variant: "destructive",
        title: "Limit Exceeded",
        description: `You already have ${existingQty} of this variation in your cart. Only ${maxStock} units are in stock, so you cannot add ${quantity} more.`
      });
      return false;
    }

    addItem(
      {
        id: product.id,
        name: product.name,
        price: offer,
        mrp: calculatedMrp,
        imageUrl: resolveImageUrl(displayImages[0] ?? ""),
        stock: maxStock,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        colorHex: (hasInventory && selectedSize && selectedColor) ? product.inventory?.[selectedSize]?.[selectedColor]?.hex : undefined
      },
      quantity,
    );
    toast({ title: "Added to cart!", description: `${quantity} × ${product.name}${selectedSize ? ` (${selectedSize}${selectedColor ? `, ${selectedColor}` : ""})` : ""}` });
    setQuantity(1);
    return true;
  };

  const handleBuyNow = () => {
    if (!user) { openLogin(); return; }
    if (!selectedSize || !selectedColor) {
      toast({ 
        variant: "destructive", 
        title: "Selection Required", 
        description: "Please select both a size and a color before buying." 
      });
      return;
    }
    const success = handleAddToCart();
    if (success) {
      setLocation("/checkout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center gap-4 px-4 text-center">
          <Package className="w-16 h-16 text-pink-200" />
          <h1 className="text-2xl font-bold text-rose-900">Product not found</h1>
          <p className="text-muted-foreground">This product may have been removed or the link is invalid.</p>
          <Link href="/">
            <button className="mt-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors">
              Back to Home
            </button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const images: string[] = product.images ?? [];
  const displayImages = images.length > 0 ? images : (product.imageUrl ? [product.imageUrl] : []);
  const { offer, mrp, savings, discountPct, isRange } = computePricing(product.inventory, selectedSize, selectedColor, product.price, product.mrp);
  const rating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
    : parseFloat(product.rating ?? "4.3");
  const reviewCount = reviews.length > 0
    ? reviews.length
    : Math.max(1, product.reviewCount ?? 10);
  const isOutOfStock = product.stock === 0;

  const hasInventory = product.inventory && Object.keys(product.inventory).length > 0;
  const hasSizes = product.sizes && product.sizes.length > 0;
  let selectedVariationStock = product.stock ?? 0;
  if (selectedSize && selectedColor && hasInventory) {
    selectedVariationStock = product.inventory?.[selectedSize]?.[selectedColor]?.qty ?? 0;
  } else if (selectedSize && hasSizes) {
    const sizeObj = product.sizes?.find(s => s.size === selectedSize);
    selectedVariationStock = sizeObj ? sizeObj.quantity : 0;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow">
        {/* Breadcrumb */}
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100 py-3 px-4">
          <div className="container mx-auto flex items-center gap-2 text-sm text-rose-500 flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors font-medium">Home</Link>
            <span className="text-rose-300">/</span>
            <Link href="/new-arrivals" className="hover:text-primary transition-colors font-medium">Products</Link>
            <span className="text-rose-300">/</span>
            <span className="text-rose-800 font-semibold line-clamp-1 max-w-xs">{product.name}</span>
          </div>
        </div>

        {/* Back button */}
        <div className="container mx-auto px-4 md:px-6 pt-5">
          <button
            onClick={() => history.back()}
            className="inline-flex items-center gap-1.5 text-rose-500 hover:text-primary text-sm font-medium transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* Main product layout */}
        <div className="container mx-auto px-4 md:px-6 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">

            {/* Left: Gallery */}
            <div>
              <DetailGallery images={displayImages} productName={product.name} />
            </div>

            {/* Right: Product Info */}
            <div className="flex flex-col gap-5">

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {!isOutOfStock && discountPct > 0 && (
                  <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {discountPct}% OFF
                  </span>
                )}
                {product.stock > 0 && product.stock < 5 && (
                  <span className="bg-orange-400 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Only {product.stock} left!
                  </span>
                )}
                {isOutOfStock && (
                  <span className="bg-rose-800 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Sold Out
                  </span>
                )}
                <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                  Genuine Indian Nightwear
                </span>
              </div>

              {/* Name */}
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-rose-900 leading-tight">
                {product.name}
              </h1>

              {/* Rating row */}
              <div className="flex items-center gap-3">
                <StarRating rating={rating} size="md" />
                <span className="text-sm font-semibold text-rose-700">{rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviewCount} reviews)</span>
              </div>

              {/* Pricing */}
              <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-extrabold text-rose-600">
                    {isRange && (!selectedSize || !selectedColor) ? `Starting from ${formatINR(offer)}` : formatINR(offer)}
                  </span>
                  <span className="text-base text-gray-400 line-through font-medium">MRP {formatINR(mrp)}</span>
                </div>
                {savings > 0 && (
                  <p className="text-sm font-semibold text-green-700">
                    You save {formatINR(savings)}
                    <span className="ml-2 text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">{discountPct}% OFF</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Inclusive of all taxes · Free shipping above ₹499</p>
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h2 className="text-sm font-bold text-rose-800 uppercase tracking-wider mb-1.5">Description</h2>
                  <p className="text-sm text-rose-700/80 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Size & Color Variations */}
              {!isOutOfStock && (
                <div className="space-y-6 py-2">
                  {/* Size Chips */}
                  {product.inventory && Object.keys(product.inventory).length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-rose-900 uppercase tracking-tight">1. Select Size</span>
                        {selectedSize ? (
                          <span className="text-[11px] font-medium text-rose-400 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">Selected: {selectedSize}</span>
                        ) : (
                          <span className="text-[11px] font-bold text-primary animate-pulse">Please select a size</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {Object.keys(product.inventory).map((size) => {
                          const totalQty = Object.values(product.inventory?.[size] ?? {}).reduce((acc, curr) => acc + curr.qty, 0);
                          const isSizeDisabled = totalQty === 0;
                          return (
                            <button
                              key={size}
                              type="button"
                              disabled={isSizeDisabled}
                              onClick={() => { setSelectedSize(size); setSelectedColor(""); setQuantity(1); }}
                              className={`
                                min-w-[3.5rem] h-10 px-4 flex items-center justify-center rounded-xl text-sm font-bold transition-all border-2
                                ${selectedSize === size
                                  ? "bg-primary border-primary text-white shadow-md shadow-rose-200 scale-105"
                                  : isSizeDisabled
                                    ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-60"
                                    : "bg-white border-pink-100 text-rose-700 hover:border-primary/40 hover:bg-pink-50/50"
                                }
                              `}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    product.sizes && product.sizes.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-rose-900 uppercase tracking-tight">Select Size</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {product.sizes.map((s) => (
                            <button
                              key={s.size}
                              type="button"
                              disabled={s.quantity === 0}
                              onClick={() => { setSelectedSize(s.size); setQuantity(1); }}
                              className={`
                                min-w-[3.5rem] h-10 px-4 flex items-center justify-center rounded-xl text-sm font-bold transition-all border-2
                                ${selectedSize === s.size
                                  ? "bg-primary border-primary text-white shadow-md shadow-rose-200"
                                  : s.quantity === 0
                                    ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-60 line-through"
                                    : "bg-white border-pink-100 text-rose-700 hover:border-primary/40"
                                }
                              `}
                            >
                              {s.size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {/* Color Swatches */}
                  {selectedSize && product.inventory?.[selectedSize] && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-rose-900 uppercase tracking-tight">2. Select Color</span>
                        {selectedColor ? (
                          <span className="text-[11px] font-medium text-rose-400 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            {selectedColor} — {product.inventory[selectedSize][selectedColor].qty} in stock
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-primary animate-pulse">Please select a color</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {Object.entries(product.inventory[selectedSize]).map(([colorName, details]) => {
                          const isColorDisabled = details.qty === 0;
                          const isSelected = selectedColor === colorName;
                          return (
                            <div key={colorName} className="flex flex-col items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isColorDisabled}
                                onClick={() => { setSelectedColor(colorName); setQuantity(1); }}
                                className={`
                                  relative w-10 h-10 rounded-full border-2 transition-all group
                                  ${isSelected
                                    ? "border-primary scale-110 shadow-lg shadow-rose-100 ring-2 ring-primary/20"
                                    : isColorDisabled
                                      ? "border-gray-200 opacity-40 cursor-not-allowed"
                                      : "border-pink-100 hover:border-primary/40 hover:scale-105"
                                  }
                                `}
                                style={{ backgroundColor: details.hex }}
                                title={colorName}
                              >
                                {isSelected && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                                  </div>
                                )}
                                {isColorDisabled && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-0.5 bg-gray-400 rotate-45 scale-x-110" />
                                  </div>
                                )}
                              </button>
                              <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSelected ? "text-primary" : "text-rose-400"}`}>
                                {colorName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity selector */}
              {!isOutOfStock && selectedVariationStock > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-rose-800">Quantity:</span>
                  <div className="flex items-center gap-0">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="flex items-center justify-center w-9 h-9 bg-pink-50 hover:bg-pink-100 disabled:opacity-40 rounded-l-xl border border-pink-200 text-rose-600 font-bold text-lg transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={selectedVariationStock > 0 ? selectedVariationStock : 1}
                      value={quantity}
                      onChange={(e) => {
                        const maxVal = selectedVariationStock > 0 ? selectedVariationStock : 1;
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1) setQuantity(Math.min(v, maxVal));
                      }}
                      className="w-14 h-9 text-center text-sm font-bold text-rose-800 border-y border-pink-200 bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const maxVal = selectedVariationStock > 0 ? selectedVariationStock : 1;
                        setQuantity((q) => Math.min(maxVal, q + 1));
                      }}
                      disabled={quantity >= (selectedVariationStock > 0 ? selectedVariationStock : 1)}
                      className="flex items-center justify-center w-9 h-9 bg-pink-50 hover:bg-pink-100 disabled:opacity-40 rounded-r-xl border border-pink-200 text-rose-600 font-bold text-lg transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || !!(selectedSize && selectedColor && selectedVariationStock === 0)}
                  className={`flex-1 flex items-center justify-center gap-2 border-2 border-primary text-primary hover:bg-primary/5 active:bg-primary/10 disabled:border-pink-200 disabled:text-pink-300 disabled:cursor-not-allowed font-bold py-3 rounded-xl transition-all text-sm ${(isOutOfStock || (selectedSize && selectedColor && selectedVariationStock === 0)) ? "opacity-100" : (!selectedSize || !selectedColor) ? "opacity-60" : "opacity-100"}`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {isOutOfStock || (selectedSize && selectedColor && selectedVariationStock === 0) ? "Out of Stock" : "Add to Cart"}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || !!(selectedSize && selectedColor && selectedVariationStock === 0)}
                  className={`flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:bg-pink-200 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-rose-200 ${(isOutOfStock || (selectedSize && selectedColor && selectedVariationStock === 0)) ? "opacity-100" : (!selectedSize || !selectedColor) ? "opacity-60" : "opacity-100"}`}
                >
                  <Zap className="w-4 h-4" />
                  {isOutOfStock || (selectedSize && selectedColor && selectedVariationStock === 0) ? "Out of Stock" : "Buy Now"}
                </button>
              </div>

              {/* Selection Helper Text */}
              {!isOutOfStock && selectedVariationStock > 0 && product.inventory && Object.keys(product.inventory).length > 0 && (!selectedSize || !selectedColor) && (
                <p className="text-[11px] font-bold text-rose-400 bg-rose-50/50 p-2 rounded-lg border border-pink-100 text-center animate-pulse">
                  Please pick a size and color to add this nighty to your cart.
                </p>
              )}

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { icon: <RotateCcw className="w-4 h-4" />, label: "Easy Returns", sub: "7-day policy" },
                  { icon: <Package className="w-4 h-4" />, label: "Free Shipping", sub: "On orders ₹499+" },
                  { icon: <Shield className="w-4 h-4" />, label: "100% Genuine", sub: "Quality assured" },
                ].map(({ icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center text-center gap-1 bg-pink-50/60 border border-pink-100 rounded-xl p-2.5">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-rose-600">{icon}</div>
                    <span className="text-xs font-semibold text-rose-800 leading-tight">{label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ReviewsSection
          productId={product.id}
          productRating={rating}
          reviewCount={reviewCount}
        />

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section className="py-12 px-4">
            <div className="container mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-bold text-rose-900">You May Also Like</h2>
                <Link href="/collections">
                  <span className="text-sm font-semibold text-primary hover:underline underline-offset-2 transition-colors">View all →</span>
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {similarProducts.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p as any}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/919704761386"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20b858] text-white rounded-full shadow-lg shadow-green-200 transition-transform hover:scale-110 active:scale-95"
        aria-label="Chat on WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>
    </div>
  );
}
