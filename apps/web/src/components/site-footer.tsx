"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AmbientBg } from "@/components/ambient-bg";
import { SERVICES, SITE, isLightRoute } from "@/content/site";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/assess", label: "AI Damage Assess" },
  { href: "/book", label: "Book Appointment" },
  { href: "/track", label: "Track Repair" },
  { href: "/login", label: "Login / Portal" },
  { href: "/services", label: "Services" },
  { href: "/process", label: "Our Process" },
  { href: "/contact", label: "Contact" },
];

function SocialIcon({ type }: { type: "facebook" | "instagram" | "youtube" }) {
  const paths = {
    facebook:
      "M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.2l.8-3H13V9c0-.6.4-1 1-1z",
    instagram:
      "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm5.2-.9a1.05 1.05 0 1 0 1.05 1.05A1.05 1.05 0 0 0 17.2 6.6zM12 9.2A2.8 2.8 0 1 1 9.2 12 2.8 2.8 0 0 1 12 9.2z",
    youtube:
      "M22 12.2s0-3.2-.4-4.6c-.2-.8-.9-1.4-1.7-1.6C18.5 5.6 12 5.6 12 5.6s-6.5 0-7.9.4c-.8.2-1.5.8-1.7 1.6C2 9 2 12.2 2 12.2s0 3.2.4 4.6c.2.8.9 1.4 1.7 1.6 1.4.4 7.9.4 7.9.4s6.5 0 7.9-.4c.8-.2 1.5-.8 1.7-1.6.4-1.4.4-4.6.4-4.6zM10 15.1V9.3l5.2 2.9L10 15.1z",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d={paths[type]} />
    </svg>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  if (!isLightRoute(pathname)) return null;

  return (
    <footer className="site-footer relative overflow-hidden bg-[#080a0e] text-white">
      <AmbientBg variant="footer" />
      <div className="footer-red-anim" aria-hidden />
      <div className="relative z-[1] mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.15fr]">
        <div>
          <Image
            src={SITE.logoSrc}
            alt={SITE.name}
            width={260}
            height={84}
            className="brand-logo brand-logo-lg"
          />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
            Premier automotive care in {SITE.location}—collision, paint & body, ADAS, detailing, and digital repair
            tracking under one roof.
          </p>
          <div className="mt-6 flex gap-3">
            {[
              { type: "facebook" as const, href: "#" },
              { type: "instagram" as const, href: "#" },
              { type: "youtube" as const, href: "#" },
            ].map((s) => (
              <a
                key={s.type}
                href={s.href}
                aria-label={s.type}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <SocialIcon type={s.type} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-4">Quick links</p>
          <ul className="space-y-2.5 text-sm text-white/65">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-4">Services</p>
          <ul className="space-y-2.5 text-sm text-white/65">
            {SERVICES.slice(0, 6).map((s) => (
              <li key={s.title}>
                <Link href={s.href} className="transition hover:text-white">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-4">Contact us</p>
          <ul className="space-y-3 text-sm text-white/70">
            <li>
              <a href={`tel:${SITE.phoneTel}`} className="transition hover:text-white">
                {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={SITE.emailMailto} className="transition hover:text-white">
                {SITE.emailDisplay}
              </a>
            </li>
            <li className="leading-relaxed">{SITE.address}</li>
          </ul>
          <p className="eyebrow mt-7 mb-3">Business hours</p>
          <p className="text-sm text-white/65">
            Mon–Fri: 8:00 AM – 6:00 PM
            <br />
            Sat: 9:00 AM – 3:00 PM
            <br />
            Sun: Closed
          </p>
        </div>
      </div>

      <div className="relative z-[1] border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/contact" className="hover:text-white/80">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-white/80">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
