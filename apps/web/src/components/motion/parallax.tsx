"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isLowPowerDevice, prefersReducedMotion } from "./motion-utils";

gsap.registerPlugin(ScrollTrigger);

type ParallaxProps = {
  children: ReactNode;
  className?: string;
  /** Negative drifts up (foreground), positive drifts down (background). */
  speed?: number;
  /** Scale up slightly across the scroll range — good for media plates. */
  zoom?: number;
  /** Element that defines the scroll range. Defaults to the wrapper itself. */
  scope?: "self" | "parent";
};

export function Parallax({
  children,
  className = "",
  speed = -0.12,
  zoom = 0,
  scope = "self",
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || isLowPowerDevice()) return;

    const trigger = scope === "parent" ? (el.parentElement ?? el) : el;

    const ctx = gsap.context(() => {
      const tween = gsap.fromTo(
        el,
        { yPercent: -speed * 50, scale: 1 },
        {
          yPercent: speed * 50,
          scale: 1 + zoom,
          ease: "none",
          scrollTrigger: {
            trigger,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );
      return () => {
        tween.scrollTrigger?.kill();
      };
    }, el);

    return () => ctx.revert();
  }, [speed, zoom, scope]);

  return (
    <div ref={ref} className={`parallax-layer ${className}`.trim()}>
      {children}
    </div>
  );
}
