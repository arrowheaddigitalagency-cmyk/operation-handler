"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/services", label: "Services" },
  { href: "/process", label: "Process" },
  { href: "/assess", label: "AI Assess" },
  { href: "/book", label: "Book" },
  { href: "/track", label: "Track" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/portal", label: "Portal" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        isHome
          ? "border-transparent bg-gradient-to-b from-black/50 to-transparent"
          : "border-[var(--line)] bg-[color-mix(in_srgb,var(--asphalt)_92%,transparent)] backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="group flex flex-col leading-none">
          <span className="font-display text-xl font-extrabold tracking-tight text-[var(--mist)] transition group-hover:text-white">
            Cars Compound
          </span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--steel)]">
            Smart Customer Experience
          </span>
        </Link>

        <button
          type="button"
          className="rounded-sm border border-[var(--line)] px-3 py-1.5 text-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          Menu
        </button>

        <nav
          className={`${
            open ? "flex" : "hidden"
          } absolute left-0 right-0 top-full max-h-[80vh] flex-col gap-1 overflow-y-auto border-b border-[var(--line)] bg-[var(--asphalt)] p-4 md:static md:flex md:max-h-none md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-x-4 md:gap-y-2 md:overflow-visible md:border-0 md:bg-transparent md:p-0 lg:gap-x-5`}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`text-sm font-medium transition-colors md:text-[13px] lg:text-sm ${
                pathname?.startsWith(l.href)
                  ? "text-[var(--copper-hot)]"
                  : "text-[var(--steel)] hover:text-[var(--mist)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="btn-primary mt-2 px-4 py-2 md:mt-0">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
