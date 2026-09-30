"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AiAssessWidget } from "@/components/ai-assess-widget";
import { ScrollProgress } from "@/components/motion/scroll-progress";

/** Marketing chrome is hidden on app shells (staff / portal / auth). */
function isAppShell(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/staff") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const app = isAppShell(pathname);

  if (app) {
    return <main className="app-shell-main">{children}</main>;
  }

  return (
    <>
      <ScrollProgress />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <AiAssessWidget />
    </>
  );
}
