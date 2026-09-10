"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DUR, EASE, isLowPowerDevice } from "@/components/motion/motion-utils";

gsap.registerPlugin(ScrollTrigger);

export type RevealVariant = "up" | "fade" | "scale" | "blur" | "mask" | "left" | "right";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
  as?: "div" | "section" | "article" | "li" | "header" | "figure";
};

const FROM: Record<RevealVariant, gsap.TweenVars> = {
  up: { autoAlpha: 0, y: 32 },
  fade: { autoAlpha: 0 },
  scale: { autoAlpha: 0, y: 18 },
  blur: { autoAlpha: 0, y: 20 },
  mask: { autoAlpha: 0, y: 24 },
  left: { autoAlpha: 0, x: -28 },
  right: { autoAlpha: 0, x: 28 },
};

const TO: Record<RevealVariant, gsap.TweenVars> = {
  up: { autoAlpha: 1, y: 0 },
  fade: { autoAlpha: 1 },
  scale: { autoAlpha: 1, y: 0 },
  blur: { autoAlpha: 1, y: 0 },
  mask: { autoAlpha: 1, y: 0 },
  left: { autoAlpha: 1, x: 0 },
  right: { autoAlpha: 1, x: 0 },
};

export function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "up",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el, { autoAlpha: 1, clearProps: "transform" });
      return;
    }

    const tween = gsap.fromTo(el, FROM[variant], {
      ...TO[variant],
      duration: isLowPowerDevice() ? DUR.fast : DUR.base,
      delay: delay / 1000,
      ease: EASE.out,
      scrollTrigger: {
        trigger: el,
        start: "top 90%",
        once: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay, variant]);

  return (
    <Tag
      ref={ref as never}
      className={`reveal-gsap ${className}`.trim()}
      style={{ opacity: 0 } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
