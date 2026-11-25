import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EvoChronos — Multi-Scale Evolutionary Sandbox",
  description: "From Archean Geochemistry to Macroevolutionary Speciation across 29 Orders of Magnitude with Exact Atomic Conservation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
