import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Star, X } from "lucide-react";
import type { Product } from "@workspace/api-client-react";
import { useCart } from "@/context/cart";
import { useUser } from "@/context/user";
import { ProductGallery, resolveImageUrl } from "@/components/product-gallery";
import { useLocation } from "wouter";

interface ProductCardProps {
  product: Product;
  index: number;
}

function computePricing(inventory: any, fallbackPrice?: string, fallbackMrp?: string | null) {
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let correspondingMrp = 0;

  const inv = typeof inventory === "string" ? JSON.parse(inventory) : inventory;
  
  if (inv && typeof inv === "object" && Object.keys(inv).length > 0) {
    for (const size in inv) {
      for (const color in inv[size]) {
        const p = parseFloat(inv[size][color].price);
        const m = parseFloat(inv[size][color].mrp);
        if (p < minPrice) {
          minPrice = p;
          correspondingMrp = m;
        }
        if (p > maxPrice) maxPrice = p;
      }
    }
  }

  if (minPrice === Infinity) {
    minPrice = parseFloat(fallbackPrice || "0");
    correspondingMrp = fallbackMrp ? parseFloat(fallbackMrp) : Math.round(minPrice * 1.45);
    maxPrice = minPrice;
  }

  const offer = minPrice;
  const mrp = correspondingMrp > offer ? correspondingMrp : Math.round(offer * 1.45);
  const savings = Math.max(0, mrp - offer);
  const discountPct = mrp > 0 ? Math.round(((mrp - offer) / mrp) * 100) : 0;
  
  return { offer, mrp, savings, discountPct, isRange: maxPrice > minPrice, minPrice, maxPrice };
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function StaticStarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        ))}
        {half && (
          <span className="relative w-3.5 h-3.5">
            <Star className="absolute w-3.5 h-3.5 text-yellow-400 fill-none" />
            <Star
              className="absolute w-3.5 h-3.5 text-yellow-400"
              style={{ clipPath: "inset(0 50% 0 0)", fill: "rgb(250,204,21)" }}
            />
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className="w-3.5 h-3.5 fill-none text-rose-200" />
        ))}
      </div>
      <span className="text-xs font-semibold text-rose-700">{rating.toFixed(1)}</span>
      {reviewCount > 0 && (
        <span className="text-xs text-muted-foreground">({reviewCount})</span>
      )}
    </div>
  );
}

export function ProductCard({ product, index }: ProductCardProps) {
  const { toast } = useToast();
  const { addItem } = useCart();
  const { user, openLogin } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isModalOpen) {
      setQuantity(1);
    }
  }, [isModalOpen]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedSize, selectedColor]);

  const inventory = (product as unknown as { inventory?: any }).inventory;
  const inv = typeof inventory === "string" ? JSON.parse(inventory) : inventory;
  
  // Extract variants for easier logic
  const variants: any[] = [];
  if (inv) {
    for (const size in inv) {
      for (const color in inv[size]) {
        variants.push({
          size,
          color,
          ...inv[size][color]
        });
      }
    }
  }

  const lowestPrice = variants.length > 0 
    ? Math.min(...variants.map(v => parseFloat(v.price))) 
    : parseFloat(product.price || "0");

  const goToDetail = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    setLocation(`/product/${product.id}`);
  };

  const productMrp = (product as unknown as { mrp?: string }).mrp ?? null;
  const { discountPct } = computePricing(inventory, product.price, productMrp);
  const rating = parseFloat((product as unknown as { rating?: string }).rating ?? "4.3");
  const reviewCount = Math.max(1, (product as unknown as { reviewCount?: number }).reviewCount ?? 10);
  const rawImages = (product as unknown as { images?: unknown }).images;
  const images: string[] = Array.isArray(rawImages) 
    ? rawImages 
    : typeof rawImages === "string" 
    ? (() => { try { const p = JSON.parse(rawImages); return Array.isArray(p) ? p : []; } catch { return []; } })()
    : [];
  const displayImages = images.length > 0 ? images : (product.imageUrl ? [product.imageUrl] : []);

  const isOutOfStock = variants.length > 0 
    ? variants.every(v => v.qty === 0) 
    : product.stock === 0;

  const handleQuickShop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openLogin();
      return;
    }
    setIsModalOpen(true);
  };

  const uniqueSizes = Array.from(new Set(variants.map(v => v.size)));
  const uniqueColors = Array.from(new Map(variants.map(v => [v.color, { name: v.color, hex: v.hex }])).values());

  const selectedVariant = variants.find(v => v.size === selectedSize && v.color === selectedColor);
  const availableStock = selectedVariant ? selectedVariant.qty : 0;

  const handleDone = () => {
    if (!selectedSize || !selectedColor) {
      toast({ variant: "destructive", title: "Selection Required", description: "Please pick a size and color." });
      return;
    }

    if (!selectedVariant) return;

    addItem(
      {
        id: product.id,
        name: product.name,
        price: parseFloat(selectedVariant.price),
        mrp: parseFloat(selectedVariant.mrp),
        imageUrl: resolveImageUrl(displayImages[0] ?? ""),
        stock: selectedVariant.qty,
        size: selectedSize,
        color: selectedColor,
        colorHex: selectedVariant.hex,
      },
      quantity
    );

    toast({
      title: "Added to cart!",
      description: `${product.name} (${selectedSize}, ${selectedColor})`,
    });
    
    setIsModalOpen(false);
    setSelectedSize(null);
    setSelectedColor(null);
  };

  return (
    <>
      <div
        className="flex flex-col h-full bg-white rounded-2xl border border-pink-100 shadow-sm hover:shadow-rose-200/60 hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-in fade-in slide-in-from-bottom-6 cursor-pointer"
        style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
        onClick={goToDetail}
      >
        {/* Product image */}
        <div className="relative w-full overflow-hidden bg-gradient-to-br from-pink-50 to-rose-100" style={{ aspectRatio: "3/4" }}>
          {displayImages.length > 0 ? (
            <ProductGallery
              images={displayImages}
              productName={product.name}
              className="absolute inset-0"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <svg viewBox="0 0 100 160" className="w-20 h-32 text-rose-300 opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="50" cy="18" rx="12" ry="13" fill="currentColor" opacity="0.5" />
                <path d="M42 30 Q50 36 58 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <path d="M30 32 Q22 38 18 50 L12 140 Q50 152 88 140 L82 50 Q78 38 70 32 Q60 30 50 31 Q40 30 30 32Z" fill="currentColor" opacity="0.25" />
                <path d="M30 32 Q15 40 10 55 Q18 60 28 52 Q30 42 36 36Z" fill="currentColor" opacity="0.3" />
                <path d="M70 32 Q85 40 90 55 Q82 60 72 52 Q70 42 64 36Z" fill="currentColor" opacity="0.3" />
                <path d="M12 140 Q50 155 88 140" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
              </svg>
              <span className="text-xs font-medium text-rose-300 tracking-wide uppercase">Indian Cotton Nighty</span>
            </div>
          )}

          {!isOutOfStock && discountPct > 0 && (
            <span className="absolute top-2.5 left-2.5 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {discountPct}% OFF
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/65 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-rose-700 text-white text-[10px] font-bold px-4 py-1 rounded-full tracking-widest uppercase">Sold Out</span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex flex-col flex-1 p-3.5 gap-2 bg-white">
          <div className="flex-1 flex flex-col gap-1.5">
            <StaticStarRating rating={rating} reviewCount={reviewCount} />
            <h3 className="font-semibold text-rose-900 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </h3>
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-400 font-medium">Starting at</span>
              <span className="text-lg font-bold text-rose-600">
                {formatINR(lowestPrice)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickShop}
            disabled={isOutOfStock}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:bg-pink-200 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-200 shadow-sm shadow-rose-200 uppercase tracking-wide"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {isOutOfStock ? "Sold Out" : "Add to Cart"}
          </button>
        </div>
      </div>

      {/* Quick Shop Modal Portal */}
      {isModalOpen && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if(e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-start gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
              
              <img 
                src={resolveImageUrl(displayImages[0] ?? "")} 
                alt={product.name}
                className="w-16 h-20 object-cover rounded-lg bg-pink-50"
              />
              
              <div className="flex-1 pr-8">
                <h4 className="font-bold text-rose-900 text-base line-clamp-1">{product.name}</h4>
                {(() => {
                  const currentPrice = selectedVariant ? parseFloat(selectedVariant.price) : lowestPrice;
                  const currentMrp = selectedVariant ? parseFloat(selectedVariant.mrp) : (productMrp ? parseFloat(productMrp) : currentPrice * 1.45);
                  const discount = Math.round(((currentMrp - currentPrice) / currentMrp) * 100);
                  
                  return (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-lg font-bold text-rose-600">{formatINR(currentPrice)}</span>
                      {discount > 0 && (
                        <>
                          <span className="text-xs text-gray-400 line-through font-medium">MRP {formatINR(currentMrp)}</span>
                          <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">{discount}% OFF</span>
                        </>
                      )}
                    </div>
                  );
                })()}
                {selectedVariant && (
                  <p className={`text-[10px] font-bold uppercase mt-1 ${selectedVariant.qty > 0 ? "text-green-600" : "text-rose-500"}`}>
                    {selectedVariant.qty > 0 ? `${selectedVariant.qty} items left in stock` : "Out of stock"}
                  </p>
                )}
              </div>
            </div>

            {/* Selection Body */}
            <div className="p-5 flex flex-col gap-6">
              {/* Sizes */}
              <div>
                <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Select Size</h5>
                <div className="flex flex-wrap gap-3">
                  {uniqueSizes.map(size => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`w-10 h-10 rounded-full border-2 text-xs font-bold transition-all flex items-center justify-center
                          ${isSelected 
                            ? "border-primary text-primary bg-rose-50 shadow-sm" 
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors */}
              <div>
                <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Select Color</h5>
                <div className="flex flex-wrap gap-4">
                  {uniqueColors.map(color => {
                    const isSelected = selectedColor === color.name;
                    return (
                      <div key={color.name} className="flex flex-col items-center gap-1.5">
                        <button
                          onClick={() => setSelectedColor(color.name)}
                          className={`w-8 h-8 rounded-full border-2 transition-all relative
                            ${isSelected 
                              ? "border-primary ring-2 ring-primary/20 scale-110 shadow-md" 
                              : "border-transparent hover:scale-105"
                            }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                            </div>
                          )}
                        </button>
                        <span className={`text-[9px] font-bold uppercase tracking-tighter ${isSelected ? "text-primary" : "text-gray-400"}`}>
                          {color.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedSize && selectedColor && (
                <div className="mt-6">
                  <p className="text-xs font-bold text-gray-500 tracking-wider mb-3 uppercase">Quantity</p>
                  <div className="flex items-center gap-4">
                    <button 
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                      disabled={quantity <= 1} 
                      className="w-8 h-8 rounded-full border border-pink-300 flex items-center justify-center text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="font-semibold text-gray-800 w-4 text-center">{quantity}</span>
                    <button 
                      type="button"
                      onClick={() => setQuantity(q => Math.min(availableStock, q + 1))} 
                      disabled={quantity >= availableStock} 
                      className="w-8 h-8 rounded-full border border-pink-300 flex items-center justify-center text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {(() => {
              const isVariantAvailable = selectedVariant && selectedVariant.qty > 0;
              const isSelectionComplete = selectedSize && selectedColor;
              const isDisabled = !isSelectionComplete || !isVariantAvailable;
              
              return (
                <button
                  onClick={handleDone}
                  disabled={isDisabled}
                  className={`w-full py-4 font-bold rounded-none uppercase tracking-widest text-sm transition-all shadow-inner
                    ${isDisabled 
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                      : "bg-[#db2777] text-white hover:bg-[#be185d] active:bg-[#9d174d]"
                    }`}
                >
                  {isSelectionComplete ? (isVariantAvailable ? "DONE" : "OUT OF STOCK") : "SELECT VARIANT"}
                </button>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
