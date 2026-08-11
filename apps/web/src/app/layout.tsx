import type { Metadata } from "next";
import { Montserrat, Manrope } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SitePreloader } from "@/components/site-preloader";
import { AiAssessWidget } from "@/components/ai-assess-widget";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cars Compound — Expert Auto Care in Marietta, GA",
  description:
    "Collision repair, paint & body, ADAS calibration, detailing, and AI damage assessment with live repair tracking in Marietta, GA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${manrope.variable}`} suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (e.g. wotdisconnected) mutate <body> before hydrate */}
      <body suppressHydrationWarning>
        <SitePreloader />
        <SmoothScroll>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          <AiAssessWidget />
        </SmoothScroll>
      </body>
    </html>
  );
}
