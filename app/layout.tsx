import type { Metadata } from "next";

import { CartIndicator } from "@/components/CartIndicator";

import "./globals.css";

export const metadata: Metadata = {
  title: "Aurora Supply Co.",
  description: "A small catalogue of considered desk tools.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="masthead">
          <div className="masthead__inner">
            <span className="masthead__wordmark">Aurora Supply Co.</span>
            {/* A client leaf in a server layout. The layout itself stays a
                server component — no `"use client"` belongs in this file. */}
            <CartIndicator />
          </div>
        </div>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
