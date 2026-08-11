"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE, isLightRoute } from "@/content/site";

const links = [
  { href: "/", label: "Home" },
  { href: "/assess", label: "AI Assess" },
  { href: "/track", label: "Track" },
  { href: "/services", label: "Services" },
  { href: "/process", label: "Process", desktop: "xl" as const },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6.6 3.2c.5-.5 1.3-.6 1.9-.2l2.3 1.5c.6.4.8 1.2.5 1.9l-1 2a1.4 1.4 0 0 0 .3 1.6l3.4 3.4c.4.4 1 .5 1.6.3l2-1c.7-.3 1.5-.1 1.9.5l1.5 2.3c.4.6.3 1.4-.2 1.9l-1.3 1.3c-.8.8-2 1.2-3.2.8-2.6-.8-5.7-3.1-8.4-5.8S3.9 9.1 3.1 6.5c-.4-1.2 0-2.4.8-3.2L6.6 3.2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const light = isLightRoute(pathname);
  const isHome = pathname === "/";

  useEffect(() => {
    document.body.classList.toggle("theme-light", light);
    return () => document.body.classList.remove("theme-light");
  }, [light]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    document.documentElement.classList.toggle("drawer-open", open);
    window.dispatchEvent(new CustomEvent("cc-drawer", { detail: { open } }));
    return () => {
      document.body.style.overflow = "";
      document.documentElement.classList.remove("drawer-open");
      window.dispatchEvent(new CustomEvent("cc-drawer", { detail: { open: false } }));
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`site-header ${isHome ? "fixed inset-x-0 top-0" : "sticky top-0"} z-50 text-white ${
          scrolled || !isHome ? "is-solid" : "is-top"
        }`}
      >
        <div className="nav-red-anim" aria-hidden />
        <div className="nav-shell">
          <Link href="/" className="nav-brand group" onClick={() => setOpen(false)} aria-label={SITE.name}>
            <Image
              src={SITE.logoSrc}
              alt={SITE.name}
              width={240}
              height={80}
              priority
              className="brand-logo transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </Link>

          <nav className="nav-center" aria-label="Primary">
            <div className="nav-pill">
              {links.map((l) => {
                const active = l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
                const hideUntilXl = "desktop" in l && l.desktop === "xl";
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`nav-link ${hideUntilXl ? "is-xl" : ""} ${active ? "is-active" : ""}`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="nav-end">
            <div className="nav-actions">
              <a
                href={`tel:${SITE.phoneTel}`}
                className="nav-phone-btn"
                aria-label={`Call ${SITE.phoneDisplay}`}
                title={SITE.phoneDisplay}
              >
                <PhoneIcon className="h-4 w-4" />
              </a>
              <Link
                href="/login"
                className={`nav-login ${pathname?.startsWith("/login") || pathname?.startsWith("/portal") || pathname?.startsWith("/staff") ? "is-active" : ""}`}
              >
                Login
              </Link>
              <Link href="/book" className="btn-primary btn-anim nav-book">
                Book Appointment
              </Link>
            </div>
            <div className="nav-actions-mobile">
              <a
                href={`tel:${SITE.phoneTel}`}
                className="nav-phone-btn"
                aria-label={`Call ${SITE.phoneDisplay}`}
                title={SITE.phoneDisplay}
              >
                <PhoneIcon className="h-4 w-4" />
              </a>
              <button
                type="button"
                className="hamburger"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={`mobile-drawer-root lg:hidden ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <button type="button" className="mobile-drawer-backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />
        <aside
          className="mobile-drawer-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
        >
          <div className="mobile-drawer-scroll" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <Image src={SITE.logoSrc} alt={SITE.name} width={168} height={56} className="h-11 w-auto object-contain" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-lg text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <nav className="flex flex-col gap-1 px-3 py-4">
              {[...links, { href: "/login", label: "Login / Portal" }].map((l, i) => {
                const active =
                  l.href === "/"
                    ? pathname === "/"
                    : l.href === "/login"
                      ? Boolean(pathname?.startsWith("/login") || pathname?.startsWith("/portal") || pathname?.startsWith("/staff"))
                      : pathname?.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    style={{ transitionDelay: open ? `${80 + i * 40}ms` : "0ms" }}
                    className={`drawer-link rounded-xl px-4 py-3.5 text-[15px] font-semibold tracking-wide ${
                      active ? "is-active" : ""
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3 border-t border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <a
                href={`tel:${SITE.phoneTel}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
              >
                <PhoneIcon className="h-4 w-4 text-[var(--accent)]" />
                {SITE.phoneDisplay}
              </a>
              <Link href="/login" onClick={() => setOpen(false)} className="btn-ghost btn-anim w-full">
                Login / Portal
              </Link>
              <Link href="/book" onClick={() => setOpen(false)} className="btn-primary btn-anim w-full">
                Book Appointment
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
