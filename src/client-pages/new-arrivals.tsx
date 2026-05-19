import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Loader2, Sparkles } from "lucide-react";

export default function NewArrivals() {
  const { data: products, isLoading } = useListProducts();

  const fresh = products?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50 py-14 px-4">
          <div className="container mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 text-rose-500 font-semibold tracking-wider uppercase text-xs mb-3 bg-rose-100 border border-rose-200 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" /> Just Arrived
            </span>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-rose-900 mb-3">New Arrivals</h1>
            <p className="text-rose-600/80 max-w-xl mx-auto">
              Fresh stock of traditional Indian cotton nightgowns. Be the first to own our newest styles.
            </p>
          </div>
        </section>

        <section className="py-16 container mx-auto px-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {fresh.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
