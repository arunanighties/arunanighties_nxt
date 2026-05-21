import { useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Package, RotateCcw, Clock, Shield } from "lucide-react";
import { SHIPPING_FEE_PER_ITEM } from "@/config/shipping";

const sections = [
  {
    icon: Package,
    title: "Shipping Policy",
    items: [
      { label: "Free Shipping", detail: "No free shipping available." },
      { label: "Standard Delivery", detail: `₹${SHIPPING_FEE_PER_ITEM} delivery fee per item.` },
      { label: "Processing Time", detail: "Orders are dispatched within 1–2 business days." },
      { label: "Delivery Time", detail: "5–7 business days across India." },
      { label: "Courier Partners", detail: "BlueDart, Delhivery, and India Post for remote areas." },
      { label: "Tracking", detail: "Tracking will be available on the website itself." },
    ],
  },
  {
    icon: RotateCcw,
    title: "Return & Exchange Policy",
    items: [
      { label: "Policy", detail: "No return, No Exchange, NO COD." },
      { label: "Assistance", detail: "For any assistance, you can contact the Admin through WhatsApp." },
    ],
  },
];

export default function ShippingReturns() {
  useEffect(() => {
    document.title = "Shipping & Easy Return Policies | Aruna Nighties";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', "Read about our pan-India courier partners, flat delivery rates per item, and strict no-return/no-exchange policy.");

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', "aruna nighties returns, shipping cost india, cash on delivery nighties, standard delivery speed, easy size exchange");
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50 py-14 px-4">
          <div className="container mx-auto text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-rose-900 mb-3">
              Shipping & Returns
            </h1>
            <p className="text-rose-600/80 max-w-xl mx-auto">
              Everything you need to know about delivery times, return eligibility, and refund policies.
            </p>
          </div>
        </section>

        <section className="py-14 container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { icon: Package, label: "Standard Delivery", sub: `₹${SHIPPING_FEE_PER_ITEM} per item` },
              { icon: Clock, label: "5–7 Day Delivery", sub: "Pan India" },
              { icon: Shield, label: "Final Sale", sub: "No Returns/Exchanges" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="bg-white border border-pink-100 rounded-2xl p-5 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-pink-50 rounded-full mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-semibold text-rose-800 text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          {sections.map(({ icon: Icon, title, items }) => (
            <div key={title} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-primary" />
                <h2 className="font-serif text-2xl font-bold text-rose-900">{title}</h2>
              </div>
              <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-sm">
                {items.map(({ label, detail }, i) => (
                  <div
                    key={label}
                    className={`flex gap-4 px-6 py-4 ${i !== items.length - 1 ? "border-b border-pink-50" : ""}`}
                  >
                    <span className="text-xs font-semibold text-primary w-36 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-rose-800/80">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-6 text-center mt-6">
            <p className="text-rose-700 font-medium mb-1">Need assistance with your order?</p>
            <p className="text-rose-600/70 text-sm">
              WhatsApp us at{" "}
              <a href="https://wa.me/918125210950" className="text-primary font-semibold underline">
                +91 81252 10950
              </a>{" "}
              or email{" "}
              <a href="mailto:arunanighties23@gmail.com" className="text-primary font-semibold underline">
                arunanighties23@gmail.com
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
