import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

const contactInfo = [
  { icon: Phone, label: "Phone", value: "+91 98765 43210", href: "tel:+919876543210" },
  { icon: MessageCircle, label: "WhatsApp", value: "+91 98765 43210", href: "https://wa.me/919876543210" },
  { icon: Mail, label: "Email", value: "support@arunanighties.in", href: "mailto:support@arunanighties.in" },
  { icon: MapPin, label: "Address", value: "123, Cotton Mills Road, Coimbatore – 641001, Tamil Nadu", href: undefined },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Contact Us | Aruna Nighties";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', "Get in touch with Aruna Nighties for wholesale orders, queries, custom fits, or support. WhatsApp/call us at +91 98765 43210.");

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', "aruna nighties contact, cotton nighties wholesale, customer care, support, customized fitting queries");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50 py-14 px-4">
          <div className="container mx-auto text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-rose-900 mb-3">Contact Us</h1>
            <p className="text-rose-600/80 max-w-xl mx-auto">
              We'd love to hear from you. Reach out for orders, queries, or just to say hello!
            </p>
          </div>
        </section>

        <section className="py-14 container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h2 className="font-serif text-2xl font-bold text-rose-900 mb-6">Get in Touch</h2>
              <div className="space-y-4">
                {contactInfo.map(({ icon: Icon, label, value, href }) => (
                  <div key={label} className="flex items-start gap-4 bg-white border border-pink-100 rounded-2xl p-4 shadow-sm">
                    <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-0.5">{label}</p>
                      {href ? (
                        <a href={href} className="text-sm font-medium text-rose-800 hover:text-primary transition-colors">
                          {value}
                        </a>
                      ) : (
                        <p className="text-sm text-rose-800">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-5">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">⏰ Business Hours</p>
                <p className="text-sm text-green-800">Monday – Saturday: 9 AM – 7 PM</p>
                <p className="text-sm text-green-800">Sunday: 10 AM – 4 PM</p>
              </div>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-bold text-rose-900 mb-6">Send a Message</h2>
              {sent ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <h3 className="font-semibold text-green-800 mb-1">Message sent!</h3>
                  <p className="text-sm text-green-700">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white border border-pink-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-rose-600 mb-1.5 uppercase tracking-wider">Your Name</label>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.slice(0, 30) }))}
                      placeholder="e.g. Priya Sharma"
                      className="w-full border border-pink-200 rounded-xl px-4 py-2.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rose-600 mb-1.5 uppercase tracking-wider">Phone / WhatsApp</label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm((f) => ({ ...f, phone: val }));
                      }}
                      placeholder="e.g. 9876543210"
                      className="w-full border border-pink-200 rounded-xl px-4 py-2.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rose-600 mb-1.5 uppercase tracking-wider">Message</label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Your question or message..."
                      className="w-full border border-pink-200 rounded-xl px-4 py-2.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
