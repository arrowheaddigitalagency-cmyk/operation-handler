"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AiAssessWidget } from "@/components/ai-assess-widget";
import { ScrollProgress } from "@/components/motion/scroll-progress";

/** App shells: no marketing header/footer/widget. */
function isAppShell(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/staff") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/damage-estimate")
  );
}

function isLightAppShell(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/damage-estimate"));
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const app = isAppShell(pathname);
  const lightApp = isLightAppShell(pathname);

  useEffect(() => {
    if (!app) return;
    document.body.classList.toggle("theme-light", lightApp);
    document.body.classList.toggle("theme-staff", !lightApp);
    return () => {
      document.body.classList.remove("theme-staff");
      if (lightApp) document.body.classList.remove("theme-light");
    };
  }, [app, lightApp]);

  if (app) {
    return (
      <main className={`app-shell-main ${lightApp ? "app-shell-main--light" : ""}`}>
        {children}
      </main>
    );
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
