import { useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Ruler } from "lucide-react";

const sizeChart = [
  { size: "XS", chest: "32–33", waist: "26–27", hips: "35–36", length: "52", fits: "Petite women" },
  { size: "S", chest: "34–35", waist: "28–29", hips: "37–38", length: "53", fits: "Slim build" },
  { size: "M", chest: "36–37", waist: "30–31", hips: "39–40", length: "54", fits: "Regular fit" },
  { size: "L", chest: "38–39", waist: "32–33", hips: "41–42", length: "55", fits: "Comfort fit" },
  { size: "XL", chest: "40–42", waist: "34–36", hips: "43–45", length: "56", fits: "Relaxed fit" },
  { size: "2XL", chest: "43–45", waist: "37–39", hips: "46–48", length: "57", fits: "Full size" },
  { size: "3XL", chest: "46–48", waist: "40–42", hips: "49–51", length: "58", fits: "Plus size" },
  { size: "4XL", chest: "49–51", waist: "43–45", hips: "52–54", length: "59", fits: "Plus size" },
  { size: "5XL", chest: "52–54", waist: "46–48", hips: "55–57", length: "60", fits: "Plus size" },
];

const tips = [
  { title: "Measure over light clothing", desc: "Wear minimal clothing when measuring — tight clothes add bulk." },
  { title: "Keep tape parallel to floor", desc: "Ensure the measuring tape is parallel to the ground, not tilted." },
  { title: "Don't pull too tight", desc: "The tape should be snug but not constricting. You should fit one finger underneath." },
  { title: "Our nighties run true to size", desc: "All Aruna Nighties are designed for a relaxed, comfortable fit. If you're between sizes, go one size up." },
];

export default function SizeGuide() {
  useEffect(() => {
    document.title = "Size Guide & Fitment Chart | Aruna Nighties";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', "Find your perfect cotton nighty fit with our official Aruna Nighties measurement chart. Detailed dimensions in chest, waist, hips, and length from XS to 5XL.");

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', "aruna nighties size chart, cotton nighty sizing, chest measurements, nightwear fitting guide, plus size cotton nighty");
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50 py-14 px-4">
          <div className="container mx-auto text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-pink-100 border border-pink-200 rounded-full mb-4">
              <Ruler className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-rose-900 mb-3">Size Guide</h1>
            <p className="text-rose-600/80 max-w-xl mx-auto">
              Find your perfect fit with our complete measurement chart. All measurements are in inches.
            </p>
          </div>
        </section>

        <section className="py-14 container mx-auto px-4 max-w-5xl">
          <h2 className="font-serif text-2xl font-bold text-rose-900 mb-6">Nighty Size Chart (Inches)</h2>
          <div className="overflow-x-auto rounded-2xl border border-pink-100 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-pink-50 border-b border-pink-100">
                  {["Size", "Chest", "Waist", "Hips", "Length", "Best Fits"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-rose-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeChart.map((row, i) => (
                  <tr
                    key={row.size}
                    className={`border-b border-pink-50 transition-colors hover:bg-pink-50/50 ${i % 2 === 0 ? "bg-white" : "bg-rose-50/20"}`}
                  >
                    <td className="px-5 py-3 font-bold text-primary">{row.size}</td>
                    <td className="px-5 py-3 text-rose-800">{row.chest}</td>
                    <td className="px-5 py-3 text-rose-800">{row.waist}</td>
                    <td className="px-5 py-3 text-rose-800">{row.hips}</td>
                    <td className="px-5 py-3 text-rose-800">{row.length}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{row.fits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12">
            <h2 className="font-serif text-2xl font-bold text-rose-900 mb-6">Measuring Tips</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tips.map((tip) => (
                <div key={tip.title} className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-rose-800 mb-1 text-sm">✓ {tip.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 bg-pink-50 border border-pink-100 rounded-2xl p-6 text-center">
            <p className="text-rose-700 font-medium text-sm mb-1">Still not sure about your size?</p>
            <p className="text-rose-600/70 text-xs">
              WhatsApp us at{" "}
              <a href="https://wa.me/918125210950" className="text-primary font-semibold underline">
                +91 81252 10950
              </a>{" "}
              — our team will help you choose the perfect fit.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
