"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { canHoverMotion } from "./motion-utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees. */
  max?: number;
};

/** Subtle 3D lean plus a light sheen that tracks the cursor. */
export function TiltCard({ children, className = "", max = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canHoverMotion()) return;

    const rotX = gsap.quickTo(el, "rotateX", { duration: 0.5, ease: "power3.out" });
    const rotY = gsap.quickTo(el, "rotateY", { duration: 0.5, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      rotY((px - 0.5) * max * 2);
      rotX((0.5 - py) * max * 2);
      el.style.setProperty("--sheen-x", `${px * 100}%`);
      el.style.setProperty("--sheen-y", `${py * 100}%`);
    };

    const onEnter = () => el.classList.add("is-tilting");
    const onLeave = () => {
      el.classList.remove("is-tilting");
      rotX(0);
      rotY(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [max]);

  return (
    <div ref={ref} className={`tilt-card ${className}`.trim()}>
      {children}
    </div>
  );
}
