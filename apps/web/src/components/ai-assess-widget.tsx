"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MechanicIcon } from "@/components/mechanic-icon";

const POPUP_KEY = "cc_ai_popup_seen_v1";

export function AiAssessWidget() {
  const pathname = usePathname();
  const [popup, setPopup] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hideOnAssess = pathname?.startsWith("/assess");

  useEffect(() => {
    setMounted(true);
    if (pathname !== "/") return;
    try {
      if (sessionStorage.getItem(POPUP_KEY)) return;
    } catch {
      // ignore
    }
    const t = window.setTimeout(() => setPopup(true), 1800);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const dismiss = () => {
    setPopup(false);
    try {
      sessionStorage.setItem(POPUP_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!mounted || hideOnAssess) return null;

  return (
    <>
      {popup ? (
        <div className="ai-popup-root" role="dialog" aria-modal="true" aria-label="AI Damage Assess">
          <button type="button" className="ai-popup-backdrop" onClick={dismiss} aria-label="Close" />
          <div className="ai-popup-card">
            <button type="button" className="ai-popup-close" onClick={dismiss} aria-label="Close popup">
              ×
            </button>
            <div className="mb-4 flex items-center gap-3">
              <span className="ai-fab-icon grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-white shadow-[0_10px_30px_rgba(232,74,39,0.45)]">
                <MechanicIcon className="h-6 w-6 ai-mech-spin" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">AI Assess</p>
                <p className="font-display text-lg font-bold text-white">Need a quick damage estimate?</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/70">
              Upload a few photos and get an advisory estimate from Cars Compound shop bands—then book a physical
              inspection.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link href="/assess" onClick={dismiss} className="btn-primary btn-anim flex-1">
                Start AI Assess
              </Link>
              <button type="button" onClick={dismiss} className="btn-ghost btn-anim flex-1">
                Maybe later
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Link href="/assess" className="ai-fab" aria-label="Open AI Damage Assess">
        <span className="ai-fab-pulse" aria-hidden />
        <span className="ai-fab-ring" aria-hidden />
        <span className="ai-fab-core">
          <MechanicIcon className="h-6 w-6 ai-mech-spin" />
        </span>
        <span className="ai-fab-label">AI Assess</span>
      </Link>
    </>
  );
}
