import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  id: number;
  cartItemId: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  stock: number;
  size?: string;
  color?: string;
  colorHex?: string;
  mrp: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, "quantity" | "cartItemId">, qty?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQty: (cartItemId: string, qty: number) => void;
  updateCartItem: (cartItemId: string, updates: Partial<Omit<CartItem, "cartItemId" | "id">>) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "aruna_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const addItem = (item: Omit<CartItem, "quantity" | "cartItemId">, qty = 1) => {
    setItems((prev) => {
      const cartItemId = `${item.id}-${item.size || 'na'}-${item.color || 'na'}`;
      const existing = prev.find((i) => i.cartItemId === cartItemId);
      if (existing) {
        return prev.map((i) =>
          i.cartItemId === cartItemId
            ? { ...i, quantity: Math.min(i.quantity + qty, item.stock || 99) }
            : i
        );
      }
      return [...prev, { ...item, cartItemId, quantity: qty }];
    });
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const updateQty = (cartItemId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity: qty } : i))
    );
  };

  const updateCartItem = (cartItemId: string, updates: Partial<Omit<CartItem, "cartItemId" | "id">>) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.cartItemId === cartItemId) {
          const updatedItem = { ...i, ...updates };
          // Regenerate cartItemId if size or color changed
          const newCartItemId = `${i.id}-${updatedItem.size || 'na'}-${updatedItem.color || 'na'}`;
          return { ...updatedItem, cartItemId: newCartItemId };
        }
        return i;
      })
    );
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, totalItems, totalPrice, addItem, removeItem, updateQty, updateCartItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
