import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bhishi Management System",
  description: "144 Members | 12 Month Lucky Draw Bhishi System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-ink-900 antialiased">{children}</body>
    </html>
  );
}
