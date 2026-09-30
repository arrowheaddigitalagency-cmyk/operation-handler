import type { Metadata } from "next";
import { Montserrat, Manrope } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SitePreloader } from "@/components/site-preloader";
import { SiteChrome } from "@/components/site-chrome";

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
          <SiteChrome>{children}</SiteChrome>
        </SmoothScroll>
      </body>
    </html>
  );
}
