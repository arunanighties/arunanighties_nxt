import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCarousel } from "@/components/product-carousel";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Sparkles, RotateCcw, Phone } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { getApiBase } from "@/lib/api-config";

const DEFAULTS = {
// ... (rest of the file remains same, but fetch calls need updating)
  heroBadge: "New Collection 2025",
  heroTitle: "Sleep Beautifully,",
  heroTitleHighlight: "Every Night.",
  heroSubtitle: "Discover Aruna Nighties — soft Indian cotton nightgowns crafted for comfort, modesty, and elegance. Designed for every woman.",
  heroStartingPrice: "499",
  featuredSectionLabel: "Handpicked for You",
  featuredSectionTitle: "Top Featured Nighties",
  featuredSectionSubtitle: "Traditional Indian cotton nightgowns — soft, stylish, and made to last.",
};

type Settings = typeof DEFAULTS;

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

export default function Home() {
  const { data: allProducts, isLoading } = useListProducts();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  useEffect(() => {
    document.title = "Aruna Nighties | Premium Cotton Nighties & Nighty Dress Online";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', "Discover Aruna Nighties — premium quality soft Indian cotton nightgowns crafted for comfort, modesty, and elegance. Pure cotton nighties starting from ₹499.");

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', "aruna nighties, cotton nighties, premium nighties, nighty dress online, indian cotton nightgowns, comfortable sleepwear, women nightwear");
  }, []);

  useEffect(() => {
    fetch(`${getApiBase()}/api/settings`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setSettings({ ...DEFAULTS, ...data }); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetch(`${getApiBase()}/api/homepage-sections`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: HomepageSection[]) => setSections(Array.isArray(data) ? data : []))
      .catch(() => setSections([]))
      .finally(() => setSectionsLoading(false));
  }, []);

  const productsArray = Array.isArray(allProducts) ? allProducts : [];
  const sectionedProductIds = new Set(sections.flatMap((s) => s.products.map((p) => p.id)));
  const unsectionedProducts = productsArray.filter((p) => !sectionedProductIds.has(p.id));
  const hasSections = sections.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow">
        {/* ── Hero ─────────────────────────────────────── */}
        <section className="relative w-full min-h-[560px] flex items-center overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-pink-300/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-rose-200/40 rounded-full blur-2xl pointer-events-none" />

          <div className="container mx-auto px-4 md:px-6 relative z-10 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <span className="inline-flex items-center gap-1.5 text-rose-500 font-semibold tracking-wider uppercase text-xs mb-4 bg-rose-100 border border-rose-200 px-3 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" /> {settings.heroBadge}
                </span>
                <h1 className="font-serif text-4xl md:text-6xl font-bold text-rose-900 leading-tight mb-5">
                  {settings.heroTitle}<br />
                  <span className="text-primary">{settings.heroTitleHighlight}</span>
                </h1>
                <p className="text-rose-700/80 text-lg mb-8 max-w-md leading-relaxed">{settings.heroSubtitle}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <Link href="/new-arrivals">
                    <Button size="lg" className="bg-primary text-white hover:bg-primary/90 text-base px-8 h-12 rounded-full shadow-md shadow-rose-200 group">
                      Shop Nighties <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/collections">
                    <Button variant="outline" size="lg" className="border-rose-300 text-rose-700 hover:bg-rose-50 h-12 rounded-full">
                      View Collections
                    </Button>
                  </Link>
                </div>
                <div className="mt-8 flex items-center gap-6 text-xs text-rose-600/70 flex-wrap">
                  <span>✓ 100% Pure Cotton</span>
                </div>
              </div>

              <div className="hidden md:flex justify-center items-center animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-300/40 to-rose-200/40 rounded-3xl blur-xl scale-105" />
                  <img
                    src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80"
                    alt="Indian women's traditional nighty"
                    className="relative rounded-3xl w-80 h-96 object-cover shadow-xl shadow-rose-200/50 border-4 border-white/70"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).innerHTML =
                        '<div class="w-80 h-96 rounded-3xl bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center text-rose-400 text-6xl">🌸</div>';
                    }}
                  />
                  <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg px-4 py-3 border border-rose-100">
                    <p className="text-xs text-rose-400 font-medium">Starting from</p>
                    <p className="text-rose-700 font-bold text-lg">₹{settings.heroStartingPrice} only</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dynamic Sections ─────────────────────────── */}
        {sectionsLoading ? (
          <div className="py-24 flex justify-center bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {sections.map((section) => (
              section.products.length > 0 && (
                <section key={section.id} className="py-8 bg-background border-b border-pink-50 last:border-b-0">
                  <div className="container mx-auto px-4 md:px-6">
                    <div className="flex items-end justify-between mb-6">
                      <div>
                        <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">{section.name}</h2>
                      </div>
                      <Link href={`/collections/${section.id}`}>
                        <Button variant="link" className="hidden md:flex text-primary hover:text-primary/80">
                          View all <ArrowRight className="ml-1 w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="px-4 md:px-6">
                      <ProductCarousel products={section.products} />
                    </div>
                  </div>
                </section>
              )
            ))}
          </>
        )}

        {/* ── Why choose us ─────────────────────────────── */}
        <section className="bg-pink-50 border-y border-pink-100 py-10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 max-w-xl mx-auto gap-6 text-center">
              {[
                { icon: "🌸", title: "Pure Cotton", desc: "Breathable & skin-friendly" },
                { icon: "🔒", title: "Secure Payments", desc: "100% safe checkout" },
              ].map((item) => (
                <div key={item.title} className="flex flex-col items-center gap-2">
                  <span className="text-3xl">{item.icon}</span>
                  <p className="font-semibold text-rose-800 text-sm">{item.title}</p>
                  <p className="text-xs text-rose-600/70">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────── */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/shipping-returns">
                <Button variant="outline" size="lg" className="border-rose-300 text-rose-700 hover:bg-rose-50 rounded-full px-8 h-12 gap-2">
                  <RotateCcw className="w-4 h-4" /> Return &amp; Shipping
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" className="border-rose-300 text-rose-700 hover:bg-rose-50 rounded-full px-8 h-12 gap-2">
                  <Phone className="w-4 h-4" /> Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* ── WhatsApp FAB ──────────── */}
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
