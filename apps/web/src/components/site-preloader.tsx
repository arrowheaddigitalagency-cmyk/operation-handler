"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SITE } from "@/content/site";

export function SitePreloader() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minTime = reduced ? 400 : 1400;
    const start = performance.now();

    const finish = () => {
      const wait = Math.max(0, minTime - (performance.now() - start));
      window.setTimeout(() => {
        setLeaving(true);
        window.setTimeout(() => setVisible(false), 550);
      }, wait);
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    // Safety fallback
    const safety = window.setTimeout(finish, 3500);
    return () => window.clearTimeout(safety);
  }, []);

  if (!visible) return null;

  return (
    <div className={`site-preloader ${leaving ? "is-leaving" : ""}`} aria-hidden={leaving}>
      <div className="preloader-ring" />
      <div className="preloader-core">
        <Image src={SITE.logoSrc} alt="" width={180} height={60} priority className="h-12 w-auto object-contain sm:h-14" />
        <p className="preloader-text">Preparing your experience</p>
        <div className="preloader-bar">
          <span />
        </div>
      </div>
    </div>
  );
}
