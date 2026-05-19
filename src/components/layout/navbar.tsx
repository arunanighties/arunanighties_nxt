import { useLocation } from "wouter";
import { Search, ShoppingBag, Menu, X, User, LogOut, ClipboardList, BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/context/cart";
import { useUser } from "@/context/user";
import { useListProducts } from "@workspace/api-client-react";

const navLinks = [
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Collections", href: "/collections" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "Contact Us", href: "/contact" },
];

function getLowestPrice(product: any): number {
  let minPrice = Infinity;
  const inventory = typeof product.inventory === 'string' 
    ? JSON.parse(product.inventory) 
    : product.inventory;

  if (inventory && typeof inventory === 'object') {
    for (const size in inventory) {
      if (typeof inventory[size] !== 'object') continue;
      for (const color in inventory[size]) {
        const item = inventory[size][color];
        if (item && item.price) {
          const p = parseFloat(item.price);
          if (!isNaN(p) && p < minPrice) minPrice = p;
        }
      }
    }
  }

  if (minPrice === Infinity) {
    const p = parseFloat(product.price);
    return isNaN(p) ? 0 : p;
  }
  return minPrice;
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { totalItems } = useCart();
  const { user, openLogin, handleLogout } = useUser();

  const trimmedSearchQuery = searchQuery.trim().toLowerCase();
  const { data: products } = useListProducts({ query: { enabled: searchOpen && trimmedSearchQuery.length > 0, queryKey: ["/api/products"] } as any });

  const filteredProducts = trimmedSearchQuery.length > 1 && products
    ? products.filter((p) => p.name.toLowerCase().includes(trimmedSearchQuery))
    : [];

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };

  const handleCartClick = () => {
    if (!user) {
      openLogin();
      return;
    }
    setLocation("/cart");
  };

  const CartButton = ({ className }: { className?: string }) => (
    <button onClick={handleCartClick} className={className ?? "relative flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"}>
      <ShoppingBag className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-sm">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </button>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo + Nav links */}
          <div className="flex items-center gap-6 flex-shrink-0">
            <a href="/" className="flex items-center gap-2 font-serif text-xl md:text-2xl font-semibold tracking-wide text-primary" onClick={(e) => { e.preventDefault(); setLocation("/"); }}>
              <img src="/logo.png" alt="Aruna Nighties" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
              <span className="inline">Aruna Nighties</span>
            </a>
            <div className="hidden md:flex items-center gap-5 text-sm font-medium text-muted-foreground">
              {navLinks.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={(e) => { e.preventDefault(); setLocation(href); }}
                  className={`hover:text-primary transition-colors pb-0.5 ${location === href ? "text-primary border-b-2 border-primary" : ""}`}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Search Bar — desktop */}
          {searchOpen ? (
            <div className="hidden md:flex flex-1 max-w-sm relative">
              <div className="flex items-center w-full border border-pink-300 rounded-xl bg-pink-50 focus-within:ring-2 focus-within:ring-primary/30 overflow-hidden">
                <Search className="ml-3 w-4 h-4 text-rose-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search nighties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-rose-900 placeholder:text-rose-300"
                />
                <button onClick={closeSearch} className="mr-2 text-rose-300 hover:text-rose-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-pink-100 z-50 max-h-72 overflow-y-auto">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { closeSearch(); setLocation(`/product/${p.id}`); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-pink-50 transition-colors text-left"
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-pink-100 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-rose-900 truncate">{p.name}</p>
                        <p className="text-xs text-primary font-semibold">₹{getLowestPrice(p).toLocaleString("en-IN")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.length > 1 && filteredProducts.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-pink-100 z-50 px-4 py-4 text-sm text-muted-foreground text-center">
                  No nighties found for "{searchQuery}"
                </div>
              )}
            </div>
          ) : null}

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            {!searchOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary"
                onClick={() => setSearchOpen(true)}
                title="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* Cart icon */}
            <Button variant="ghost" size="icon" onClick={handleCartClick} className="text-muted-foreground hover:text-primary relative">
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-sm">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              className={`text-muted-foreground hover:text-primary flex items-center gap-2 px-3 h-9 ${location === "/our-story" ? "text-primary bg-muted/60" : ""}`}
              onClick={() => setLocation("/our-story")}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-sm font-medium">Our Story</span>
            </Button>


            {user ? (
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={() => setLocation("/my-orders")}
                  className="flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-pink-50 border border-pink-200 px-3 py-1.5 rounded-full hover:bg-pink-100 transition-colors"
                >
                  <User className="w-3 h-3" />
                  {user.name ?? user.phone}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLogoutConfirm(true)}
                  title="Logout"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={openLogin}
                size="sm"
                className="ml-1 bg-primary text-white hover:bg-primary/90 rounded-full px-5 h-9 font-semibold text-sm"
              >
                <User className="w-4 h-4 mr-1.5" />
                Login
              </Button>
            )}
          </div>

          {/* Mobile right */}
          <div className="md:hidden flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
              onClick={() => setSearchOpen((o) => !o)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Mobile cart */}
            <Button variant="ghost" size="icon" onClick={handleCartClick} className="text-muted-foreground hover:text-primary relative">
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-sm">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Button>

            {!user && (
              <Button
                size="sm"
                onClick={openLogin}
                className="bg-primary text-white hover:bg-primary/90 rounded-full px-4 h-8 text-xs font-semibold"
              >
                Login
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden border-t border-pink-100 px-4 py-3 relative">
            <div className="flex items-center border border-pink-200 rounded-xl bg-pink-50 focus-within:ring-2 focus-within:ring-primary/30 overflow-hidden">
              <Search className="ml-3 w-4 h-4 text-rose-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search nighties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-rose-900 placeholder:text-rose-300"
                autoFocus
              />
              <button onClick={closeSearch} className="mr-2 text-rose-300 hover:text-rose-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            {filteredProducts.length > 0 && (
              <div className="absolute top-full left-4 right-4 bg-white rounded-2xl shadow-xl border border-pink-100 z-50 max-h-64 overflow-y-auto mt-1">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { closeSearch(); setMobileMenuOpen(false); setLocation(`/product/${p.id}`); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 transition-colors text-left"
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-pink-100 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-rose-900">{p.name}</p>
                      <p className="text-xs text-primary font-semibold">₹{getLowestPrice(p).toLocaleString("en-IN")}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border p-4 flex flex-col gap-1 animate-in slide-in-from-top-2">
            {navLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => { e.preventDefault(); setLocation(href); setMobileMenuOpen(false); }}
                className={`text-sm font-medium py-2.5 px-3 rounded-lg transition-colors ${location === href ? "text-primary bg-pink-50 font-semibold" : "text-foreground hover:bg-muted/60"
                  }`}
              >
                {label}
              </a>
            ))}
            <a href="/our-story" onClick={(e) => { e.preventDefault(); setLocation("/our-story"); setMobileMenuOpen(false); }} className={`text-sm font-medium py-2.5 px-3 rounded-lg transition-colors flex items-center gap-2 ${location === "/our-story" ? "text-primary bg-pink-50 font-semibold" : "text-foreground hover:bg-muted/60"}`}>
              <BookOpen className="w-4 h-4" /> Our Story
            </a>
            <a href="/shipping-returns" onClick={(e) => { e.preventDefault(); setLocation("/shipping-returns"); setMobileMenuOpen(false); }} className="text-sm font-medium py-2.5 px-3 rounded-lg text-foreground hover:bg-muted/60 transition-colors">
              Shipping & Returns
            </a>

            {user && (
              <>
                <button
                  onClick={() => { setLocation("/my-orders"); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 text-sm font-medium py-2.5 px-3 rounded-lg text-rose-700 hover:bg-pink-50 transition-colors text-left"
                >
                  <ClipboardList className="w-4 h-4" /> My Orders
                </button>
                <button
                  onClick={() => { setShowLogoutConfirm(true); }}
                  className="text-sm font-medium py-2.5 px-3 rounded-lg text-destructive hover:bg-red-50 text-left transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-pink-100 shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-rose-900">Are you sure you want to log out?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">You will need to verify your phone number again to log back in.</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-pink-200 hover:bg-pink-50 text-rose-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-100"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
