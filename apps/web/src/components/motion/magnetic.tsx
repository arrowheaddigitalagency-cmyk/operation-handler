"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { canHoverMotion } from "./motion-utils";

type MagneticProps = {
  children: ReactNode;
  className?: string;
  /** How far the element leans toward the cursor, in px. */
  strength?: number;
};

/** Cursor-follow lean on hover. Mouse-only; touch keeps a plain button. */
export function Magnetic({ children, className = "", strength = 10 }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canHoverMotion()) return;

    const move = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const moveY = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      move(gsap.utils.clamp(-1, 1, relX) * strength);
      moveY(gsap.utils.clamp(-1, 1, relY) * strength * 0.6);
    };

    const onLeave = () => {
      move(0);
      moveY(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [strength]);

  return (
    <span ref={ref} className={`magnetic ${className}`.trim()}>
      {children}
    </span>
  );
}
