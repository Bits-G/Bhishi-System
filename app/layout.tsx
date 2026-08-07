import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wani Summit System",
  description: "156 Members | 13 Winners Monthly | Wani Summit System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-ink-900 antialiased">{children}</body>
    </html>
  );
}
