import { useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { motion } from "framer-motion";

export default function OurStory() {
  useEffect(() => {
    document.title = "Our Story & Heritage | Aruna Nighties";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', "Discover the vision, heritage, and craftsmanship behind Aruna Nighties. Trusted textile manufacturer from Suryapet with 25+ years of pure cotton expertise.");

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', "aruna nighties story, about aruna nighties, suryapet cotton nighties, pure indian cotton sleepwear, nighty legacy");
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow">
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
              {/* Image Side */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative group"
              >
                <div className="absolute -inset-4 bg-primary/10 rounded-[2rem] blur-2xl group-hover:bg-primary/20 transition-colors duration-500" />
                <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-[2rem] overflow-hidden shadow-2xl">
                  <img
                    src="/our-story.png"
                    alt="Aruna Nighties Craftsmanship"
                    className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1072&auto=format&fit=crop";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                {/* Floating badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl border border-pink-100 hidden md:block"
                >
                  <p className="font-serif text-primary text-xl font-bold italic">Est. 1995</p>
                  <p className="text-muted-foreground text-xs uppercase tracking-widest font-semibold mt-1">Heritage Brand</p>
                </motion.div>
              </motion.div>

              {/* Text Side */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col gap-8"
              >
                <div>
                  <h4 className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-4 flex items-center gap-3">
                    <span className="w-12 h-[1px] bg-primary/30" />
                    Our Philosophy
                  </h4>
                  <h1 className="font-serif text-4xl md:text-6xl text-foreground leading-[1.1] mb-6">
                    The Vision Behind <br />
                    <span className="text-primary italic">Aruna Nighties</span>
                  </h1>
                  <div className="w-20 h-1 bg-primary/20 mb-8 rounded-full" />
                </div>

                <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                  <p>
                    Aruna Nighties is a trusted textile business based in Suryapet, with over 25 years of experience in the industry. We specialize in high-quality cotton nightwear, offering a wide range of attractive prints that combine comfort and lasting durability.
                  </p>
                  <p>
                    As a reliable wholesale supplier, we are committed to delivering consistent quality and value to our customers. Built on trust and craftsmanship, Aruna Nighties meets evolving market needs with products designed for the modern woman's daily comfort.
                  </p>
                </div>

                <motion.div
                  whileHover={{ x: 10 }}
                  className="mt-4 p-8 border-l-4 border-primary/40 bg-primary/5 rounded-r-2xl"
                >
                  <p className="font-serif text-2xl text-foreground/80 italic leading-snug">
                    "We don't just sell clothes; we weave memories of comfort into every thread."
                  </p>
                  <p className="mt-4 text-sm font-bold text-primary uppercase tracking-wider">— Founder's Promise</p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Story Section 2 */}
        <section className="py-20 bg-pink-50/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h2 className="font-serif text-3xl md:text-4xl text-foreground">Crafted with Pure Indian Cotton</h2>
              <p className="text-muted-foreground text-lg">
                Our journey started with a simple mission: to provide high-quality, breathable nightwear for women across India. Today, we continue that legacy by sourcing only the finest cotton and working with skilled artisans who understand the nuances of comfort.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
                {[
                  { label: "Artisans", value: "50+" },
                  { label: "Designs", value: "200+" },
                  { label: "Happy Customers", value: "10k+" },
                  { label: "Years of Trust", value: "25+" },
                ].map((stat) => (
                  <div key={stat.label} className="p-6 bg-white rounded-2xl shadow-sm border border-pink-100/50">
                    <p className="text-3xl font-serif text-primary font-bold mb-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
