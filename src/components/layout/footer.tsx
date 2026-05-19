import { Link } from "wouter";
import { useState } from "react";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <footer className="bg-primary text-primary-foreground pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-wide mb-3 inline-block">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain brightness-0 invert" />
              <span>Aruna Nighties</span>
            </Link>
            <p className="text-primary-foreground/70 text-sm max-w-xs leading-relaxed">
              Soft, comfortable nightwear for every woman. Crafted for peaceful nights and beautiful mornings.
            </p>
          </div>

          {/* Shop links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-primary-foreground/60">Shop</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li><Link href="/new-arrivals" className="hover:text-white transition-colors">New Arrivals</Link></li>
              <li><Link href="/collections" className="hover:text-white transition-colors">Collections</Link></li>
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-primary-foreground/60">Support</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li><Link href="/size-guide" className="hover:text-white transition-colors">Size Guide</Link></li>
              <li><Link href="/shipping-returns" className="hover:text-white transition-colors">Shipping &amp; Returns</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Email subscribe */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-primary-foreground/60">Stay in Touch</h4>
            <p className="text-sm text-primary-foreground/70 mb-4">
              Subscribe for exclusive deals, new arrivals and offers.
            </p>
            {subscribed ? (
              <p className="text-sm text-white font-medium bg-white/10 rounded-xl px-4 py-3 border border-white/20">
                🎉 Thanks for subscribing!
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex">
                <input
                  type="email"
                  required
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-none px-4 py-2 text-sm w-full rounded-l-xl focus:outline-none focus:ring-1 focus:ring-white/40 text-white placeholder:text-primary-foreground/50"
                />
                <button
                  type="submit"
                  className="bg-white text-primary px-4 py-2 text-sm font-semibold rounded-r-xl hover:bg-white/90 transition-colors whitespace-nowrap"
                >
                  Subscribe
                </button>
              </form>
            )}

            {/* WhatsApp CTA */}
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Chat with us on WhatsApp
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-primary-foreground/60">
          <p>© {new Date().getFullYear()} Aruna Nighties. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/admin" className="hover:text-white transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
