"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/lib/api";

const NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/staff", label: "Overview", exact: true },
  { href: "/staff/leads", label: "Leads" },
  { href: "/staff/intake", label: "Intake" },
  { href: "/staff/damage-estimates", label: "Estimates" },
  { href: "/staff/settings", label: "Settings" },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.body.classList.remove("theme-light");
    document.body.classList.add("theme-staff");
    return () => document.body.classList.remove("theme-staff");
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  async function onLogout() {
    try {
      await logout();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="staff-ops">
      <div className="staff-ops-bg" aria-hidden />
      <div className="staff-ops-frame">
        <aside className={`staff-ops-side ${navOpen ? "is-open" : ""}`}>
          <div className="staff-ops-brand">
            <div className="staff-ops-brand-row">
              <div>
                <p className="staff-ops-kicker">Cars Compound</p>
                <h1 className="staff-ops-title">Ops Console</h1>
              </div>
              <button
                type="button"
                className="staff-ops-menu-btn"
                aria-expanded={navOpen}
                aria-label={navOpen ? "Close menu" : "Open menu"}
                onClick={() => setNavOpen((v) => !v)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
          <nav className={`staff-ops-nav ${navOpen ? "is-open" : ""}`} aria-label="Staff">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : Boolean(pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`staff-ops-nav-link ${active ? "is-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className={`staff-ops-side-foot ${navOpen ? "is-open" : ""}`}>
            <Link href="/" className="staff-ops-nav-link">
              Marketing site
            </Link>
            <Link href="/track" className="staff-ops-nav-link">
              Public track
            </Link>
            <button type="button" className="staff-ops-nav-link staff-ops-logout" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </aside>
        <div className="staff-ops-main">{children}</div>
      </div>
    </div>
  );
}
