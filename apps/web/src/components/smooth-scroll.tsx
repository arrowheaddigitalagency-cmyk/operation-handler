"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyMotionFlags } from "@/components/motion/motion-utils";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const { reduced, lite } = applyMotionFlags();
    if (reduced) return;

    document.documentElement.classList.add("lenis");

    // Higher lerp on lite devices: scroll settles faster so parallax/pin
    // work doesn't keep compositing after the wheel stops.
    const lenis = new Lenis({
      lerp: lite ? 0.14 : 0.078,
      smoothWheel: true,
      wheelMultiplier: lite ? 0.9 : 0.82,
      touchMultiplier: 1.2,
      syncTouch: !lite,
      syncTouchLerp: lite ? 0.12 : 0.07,
      autoRaf: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = anchor?.getAttribute("href");
      if (!anchor || !hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -96, duration: lite ? 0.85 : 1.2 });
    };
    document.addEventListener("click", onAnchorClick);

    const onScrollTo = (e: Event) => {
      const y = (e as CustomEvent<{ y?: number }>).detail?.y;
      if (typeof y !== "number") return;
      lenis.scrollTo(y, { duration: lite ? 0.8 : 1.1 });
    };
    window.addEventListener("cc-scroll-to", onScrollTo);

    const onDrawer = (e: Event) => {
      const open = Boolean((e as CustomEvent<{ open?: boolean }>).detail?.open);
      if (open) lenis.stop();
      else lenis.start();
    };
    window.addEventListener("cc-drawer", onDrawer);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
    };
    window.addEventListener("resize", onResize, { passive: true });
    requestAnimationFrame(() => ScrollTrigger.refresh());

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("cc-drawer", onDrawer);
      window.removeEventListener("cc-scroll-to", onScrollTo);
      document.removeEventListener("click", onAnchorClick);
      gsap.ticker.remove(tick);
      lenis.destroy();
      document.documentElement.classList.remove("lenis");
    };
  }, []);

  return <>{children}</>;
}
