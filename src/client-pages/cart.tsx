import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Package, X, ChevronDown } from "lucide-react";
import { useCart, CartItem } from "@/context/cart";
import { Navbar } from "@/components/layout/navbar";
import { getApiBase } from "@/lib/api-config";
import { resolveImageUrl } from "@/components/product-gallery";
import { SHIPPING_FEE_PER_ITEM } from "@/config/shipping";

function formatINR(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

function CartItemRow({ item }: { item: CartItem }) {
  const { removeItem, updateQty, updateCartItem } = useCart();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSize, setEditSize] = useState(item.size);
  const [editColor, setEditColor] = useState(item.color);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (isEditModalOpen && !product) {
      const apiBase = getApiBase();
      fetch(`${apiBase}/api/products/${item.id}`)
        .then(r => r.json())
        .then(data => {
          const inv = typeof data.inventory === 'string' ? JSON.parse(data.inventory) : data.inventory;
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
          setProduct({ ...data, variants });
        })
        .catch(err => console.error("Error fetching product for edit:", err));
    }
  }, [isEditModalOpen, item.id, product]);

  const uniqueSizes = product ? Array.from(new Set(product.variants.map((v: any) => v.size))) : [];
  const uniqueColors = product ? Array.from(new Map(product.variants.map((v: any) => [v.color, { name: v.color, hex: v.hex }])).values()) : [];
  const selectedVariant = product?.variants.find((v: any) => v.size === editSize && v.color === editColor);

  const handleDone = () => {
    if (selectedVariant) {
      updateCartItem(item.cartItemId, {
        size: editSize ?? undefined,
        color: editColor ?? undefined,
        price: parseFloat(selectedVariant.price),
        mrp: parseFloat(selectedVariant.mrp),
        stock: selectedVariant.qty,
        colorHex: selectedVariant.hex
      });
      setIsEditModalOpen(false);
    }
  };

  const discount = Math.round(((item.mrp - item.price) / item.mrp) * 100);

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 flex items-center gap-4">
      {/* Image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-pink-50 flex-shrink-0 border border-pink-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-6 h-6 text-rose-200" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-rose-900 text-sm leading-snug line-clamp-2">{item.name}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {item.size && (
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-pink-50 px-2 py-1 rounded border border-pink-100 hover:bg-pink-100 transition-colors"
            >
              Size: {item.size} <ChevronDown className="w-3 h-3" />
            </button>
          )}
          {item.color && (
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-pink-50 px-2 py-1 rounded border border-pink-100 hover:bg-pink-100 transition-colors"
            >
              <div className="w-2.5 h-2.5 rounded-full border border-pink-200" style={{ backgroundColor: item.colorHex || '#ccc' }} />
              {item.color} <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-base font-bold text-rose-600">{formatINR(item.price)}</span>
          {discount > 0 && (
            <>
              <span className="text-xs text-gray-400 line-through">MRP {formatINR(item.mrp)}</span>
              <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">{discount}% OFF</span>
            </>
          )}
        </div>

        {/* Qty controls */}
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => updateQty(item.cartItemId, item.quantity - 1)}
            className="w-7 h-7 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-center text-rose-600 hover:bg-pink-100 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-8 text-center text-sm font-bold text-rose-800">{item.quantity}</span>
          <button
            onClick={() => updateQty(item.cartItemId, item.quantity + 1)}
            disabled={item.quantity >= item.stock}
            className="w-7 h-7 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-center text-rose-600 hover:bg-pink-100 transition-colors disabled:opacity-40"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Subtotal + Remove */}
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-rose-700 text-sm">{formatINR(item.price * item.quantity)}</p>
        <button
          onClick={() => removeItem(item.cartItemId)}
          className="mt-2 text-rose-200 hover:text-rose-400 transition-colors"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Edit Modal Portal */}
      {isEditModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-start gap-4">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
              
              <img 
                src={item.imageUrl} 
                alt={item.name}
                className="w-16 h-20 object-cover rounded-lg bg-pink-50"
              />
              
              <div className="flex-1 pr-8">
                <h4 className="font-bold text-rose-900 text-base line-clamp-1">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-lg font-bold text-rose-600">
                    {selectedVariant ? formatINR(parseFloat(selectedVariant.price)) : formatINR(item.price)}
                  </span>
                  {((selectedVariant ? parseFloat(selectedVariant.mrp) : item.mrp) > (selectedVariant ? parseFloat(selectedVariant.price) : item.price)) && (
                    <>
                      <span className="text-sm text-gray-400 line-through font-medium">
                        MRP {formatINR(selectedVariant ? parseFloat(selectedVariant.mrp) : item.mrp)}
                      </span>
                      <span className="text-xs font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">
                        {Math.round((((selectedVariant ? parseFloat(selectedVariant.mrp) : item.mrp) - (selectedVariant ? parseFloat(selectedVariant.price) : item.price)) / (selectedVariant ? parseFloat(selectedVariant.mrp) : item.mrp)) * 100)}% OFF
                      </span>
                    </>
                  )}
                </div>
                {selectedVariant && (
                  <p className="text-[10px] text-green-600 font-bold uppercase mt-1">
                    {selectedVariant.qty} items left in stock
                  </p>
                )}
              </div>
            </div>

            {/* Selection Body */}
            <div className="p-5 flex flex-col gap-6">
              {!product ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Sizes */}
                  <div>
                    <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Update Size</h5>
                    <div className="flex flex-wrap gap-3">
                      {uniqueSizes.map((size: any) => {
                        const isSelected = editSize === size;
                        return (
                          <button
                            key={size}
                            onClick={() => setEditSize(size)}
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
                    <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Update Color</h5>
                    <div className="flex flex-wrap gap-4">
                      {uniqueColors.map((color: any) => {
                        const isSelected = editColor === color.name;
                        return (
                          <div key={color.name} className="flex flex-col items-center gap-1.5">
                            <button
                              onClick={() => setEditColor(color.name)}
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
                </>
              )}
            </div>

            {/* Footer */}
            <button
              onClick={handleDone}
              disabled={!selectedVariant}
              className="w-full py-4 bg-[#db2777] hover:bg-[#be185d] active:bg-[#9d174d] disabled:bg-gray-300 text-white font-bold rounded-none uppercase tracking-widest text-sm transition-colors shadow-inner"
            >
              DONE
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function CartPage() {
  const { items, totalItems, totalPrice, updateQty } = useCart();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/40 to-rose-50/30">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 py-10 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-rose-900">My Cart</h1>
            <p className="text-sm text-muted-foreground">{totalItems} {totalItems === 1 ? "item" : "items"} in your cart</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-pink-100 shadow-sm py-20 text-center px-6">
            <Package className="w-16 h-16 mx-auto text-rose-100 mb-4" />
            <h2 className="font-serif text-2xl font-bold text-rose-900 mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground text-sm mb-6">Browse our collection of beautiful Indian nightwear.</p>
            <Link href="/">
              <button className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors">
                Explore Nighties
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items list */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => (
                <CartItemRow key={item.cartItemId} item={item} />
              ))}
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 sticky top-24">
                <h2 className="font-semibold text-rose-900 text-base mb-4">Order Summary</h2>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>{formatINR(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping (₹{SHIPPING_FEE_PER_ITEM}/item)</span>
                    <span>{formatINR(items.reduce((acc, i) => acc + (i.quantity * SHIPPING_FEE_PER_ITEM), 0))}</span>
                  </div>
                  <div className="border-t border-pink-100 pt-2.5 flex justify-between font-bold text-rose-900 text-base">
                    <span>Total</span>
                    <span className="text-primary">{formatINR(totalPrice + items.reduce((acc, i) => acc + (i.quantity * SHIPPING_FEE_PER_ITEM), 0))}</span>
                  </div>
                </div>

                <button
                  onClick={() => setLocation("/checkout")}
                  className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 shadow-sm shadow-rose-200 transition-colors"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>

                <Link href="/">
                  <button className="w-full mt-3 text-sm text-rose-500 hover:text-primary transition-colors text-center py-2">
                    ← Continue Shopping
                  </button>
                </Link>

                {/* Trust badges */}
                <div className="mt-5 pt-4 border-t border-pink-50 space-y-1.5">
                  {["Standard shipping across India", "Easy 7-day returns", "100% genuine products"].map((t) => (
                    <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
