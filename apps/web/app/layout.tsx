import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLP-1 Eligibility Screening | PhoenixLabs",
  description: "Confidential weight-loss medication eligibility screening powered by PhoenixLabs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
