"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { useRouter } from "next/navigation";

const NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/staff", label: "Overview", exact: true },
  { href: "/staff/leads", label: "Leads" },
  { href: "/staff/intake", label: "Intake" },
  { href: "/staff/settings", label: "Settings" },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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
        <aside className="staff-ops-side">
          <div className="staff-ops-brand">
            <p className="staff-ops-kicker">Cars Compound</p>
            <h1 className="staff-ops-title">Ops Console</h1>
          </div>
          <nav className="staff-ops-nav" aria-label="Staff">
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
          <div className="staff-ops-side-foot">
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
