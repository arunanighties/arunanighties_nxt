import type { Metadata } from "next";
import Script from "next/script";
import "../index.css";

export const metadata: Metadata = {
  title: "Aruna Nighties",
  description: "Traditional Indian cotton nightgowns — soft, stylish, and made to last.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
        <link rel="icon" type="image/icon" href="/favicon.ico" />
      </head>
      <body>
        <div id="root">{children}</div>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
