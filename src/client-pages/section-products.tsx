import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product-card";
import { Link, useParams } from "wouter";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBase } from "@/lib/api-config";

interface SectionProduct {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  stock: number;
  description: string;
  rating?: string;
  reviewCount?: number;
  sectionId?: number | null;
  categoryId?: number | null;
}

interface HomepageSection {
  id: number;
  name: string;
  position: number;
  products: SectionProduct[];
}

export default function SectionProducts() {
  const { id } = useParams<{ id: string }>();
  const sectionId = parseInt(id ?? "0", 10);

  const [section, setSection] = useState<HomepageSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!sectionId) { setNotFound(true); setLoading(false); return; }
    fetch(`${getApiBase()}/api/homepage-sections`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: HomepageSection[]) => {
        const found = Array.isArray(data) ? data.find((s) => s.id === sectionId) : null;
        if (found) setSection(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [sectionId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow">
        {/* Hero banner */}
        <section className="bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50 py-12 px-4">
          <div className="container mx-auto">
            <Link href="/collections">
              <button className="inline-flex items-center gap-1.5 text-rose-500 hover:text-primary text-sm font-medium mb-5 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Collections
              </button>
            </Link>
            {loading ? (
              <div className="h-10 w-48 bg-pink-200/50 rounded-xl animate-pulse" />
            ) : notFound ? (
              <h1 className="font-serif text-4xl font-bold text-rose-900">Collection not found</h1>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-rose-500 font-semibold tracking-wider uppercase text-xs mb-3 bg-rose-100 border border-rose-200 px-3 py-1 rounded-full">
                  <Layers className="w-3 h-3" /> Collection
                </span>
                <h1 className="font-serif text-4xl md:text-5xl font-bold text-rose-900">{section!.name}</h1>
                <p className="text-rose-600/70 mt-2 text-sm">
                  {section!.products.length === 0
                    ? "No nighties yet — check back soon."
                    : `${section!.products.length} ${section!.products.length === 1 ? "nighty" : "nighties"} in this collection`}
                </p>
              </>
            )}
          </div>
        </section>

        {/* Products grid */}
        <section className="py-14 container mx-auto px-4 md:px-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : notFound ? (
            <div className="text-center py-20">
              <Layers className="w-12 h-12 mx-auto text-pink-200 mb-4" />
              <p className="text-muted-foreground mb-6">That collection doesn't exist or has been removed.</p>
              <Link href="/collections">
                <Button className="bg-primary text-white rounded-full px-8">View all collections</Button>
              </Link>
            </div>
          ) : section!.products.length === 0 ? (
            <div className="text-center py-20">
              <Layers className="w-12 h-12 mx-auto text-pink-200 mb-4" />
              <p className="text-muted-foreground mb-6">No nighties in this collection yet.</p>
              <Link href="/collections">
                <Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50 rounded-full px-8">
                  Browse other collections
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {section!.products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product as Parameters<typeof ProductCard>[0]["product"]}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/918125210950"
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
