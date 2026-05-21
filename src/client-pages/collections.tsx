import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Loader2, Layers, ArrowRight } from "lucide-react";
import { resolveImageUrl } from "@/components/product-gallery";
import { getApiBase } from "@/lib/api-config";

interface SectionProduct {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
}

interface HomepageSection {
  id: number;
  name: string;
  position: number;
  products: SectionProduct[];
}

const BG_GRADIENTS = [
  "from-pink-100 to-rose-50",
  "from-purple-50 to-pink-50",
  "from-amber-50 to-orange-50",
  "from-rose-100 to-pink-50",
  "from-teal-50 to-cyan-50",
  "from-pink-50 to-fuchsia-50",
  "from-red-50 to-rose-50",
  "from-violet-50 to-purple-50",
];

const SECTION_ICONS = ["🌸", "✨", "🪡", "💐", "🖨️", "🤗", "🌺", "💫"];

export default function Collections() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiBase()}/api/homepage-sections`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: HomepageSection[]) => setSections(Array.isArray(data) ? data : []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow">
        {/* Hero banner */}
        <section className="bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50 py-14 px-4">
          <div className="container mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 text-rose-500 font-semibold tracking-wider uppercase text-xs mb-4 bg-rose-100 border border-rose-200 px-3 py-1 rounded-full">
              <Layers className="w-3 h-3" /> Curated For You
            </span>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-rose-900 mb-3">Collections</h1>
            <p className="text-rose-600/80 max-w-xl mx-auto">
              Explore our hand-curated collections of traditional Indian nightwear — crafted for every woman, every occasion.
            </p>
          </div>
        </section>

        {/* Sections grid */}
        <section className="py-16 container mx-auto px-4 md:px-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-20">
              <Layers className="w-12 h-12 mx-auto text-pink-200 mb-4" />
              <h2 className="font-serif text-2xl font-bold text-rose-900 mb-2">No collections yet</h2>
              <p className="text-muted-foreground">Check back soon — we're putting together beautiful new collections.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.map((section, idx) => (
                <Link href={`/collections/${section.id}`} key={section.id}>
                  <div className={`relative bg-gradient-to-br ${BG_GRADIENTS[idx % BG_GRADIENTS.length]} rounded-2xl border border-pink-100 p-6 cursor-pointer hover:shadow-lg hover:shadow-rose-100 transition-all duration-300 hover:-translate-y-1.5 group overflow-hidden`}>
                    {/* Decorative circle */}
                    <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/30 rounded-full blur-xl pointer-events-none" />

                    {/* Icon */}
                    <div className="text-4xl mb-4 relative">{SECTION_ICONS[idx % SECTION_ICONS.length]}</div>

                    {/* Section name — the primary content */}
                    <h3 className="font-serif text-2xl font-bold text-rose-900 mb-3 group-hover:text-primary transition-colors leading-tight">
                      {section.name}
                    </h3>

                    {/* Product count badge */}
                    <p className="text-rose-600/70 text-sm mb-4">
                      {section.products.length === 0
                        ? "Coming soon"
                        : `${section.products.length} ${section.products.length === 1 ? "nighty" : "nighties"}`}
                    </p>

                    {/* Preview thumbnails */}
                    {section.products.length > 0 && (
                      <div className="flex gap-1.5 mb-4">
                        {section.products.slice(0, 3).map((p) => (
                          <div key={p.id} className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/70 shadow-sm bg-pink-50 shrink-0">
                            {p.imageUrl ? (
                              <img
                                src={resolveImageUrl(p.imageUrl)}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-lg">🌸</span>
                            )}
                          </div>
                        ))}
                        {section.products.length > 3 && (
                          <div className="w-12 h-12 rounded-xl bg-white/60 border-2 border-white/70 flex items-center justify-center text-xs font-semibold text-rose-600 shrink-0">
                            +{section.products.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CTA link */}
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-white/70 border border-pink-200 px-3 py-1.5 rounded-full group-hover:bg-white transition-colors">
                      Browse collection <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
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
