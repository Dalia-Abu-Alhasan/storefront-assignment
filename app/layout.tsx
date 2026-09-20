import type { Metadata } from "next";

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
          <div className="masthead__inner">Aurora Supply Co.</div>
        </div>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
