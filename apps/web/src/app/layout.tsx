import type { Metadata } from "next";
import { Syne, Manrope } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cars Compound — Smart Customer Experience",
  description:
    "AI damage assessment, live repair tracking, and digital vehicle history for Cars Compound.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable}`}>
      <body
        style={
          {
            "--font-display": "var(--font-syne), sans-serif",
            "--font-body": "var(--font-manrope), sans-serif",
          } as React.CSSProperties
        }
      >
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
