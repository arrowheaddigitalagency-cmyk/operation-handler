"use client";

import { createElement, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DUR, EASE, prefersReducedMotion } from "./motion-utils";

gsap.registerPlugin(ScrollTrigger);

type TextRevealProps = {
  text: string;
  accent?: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  /** Start immediately (hero) instead of waiting for scroll. */
  immediate?: boolean;
  delay?: number;
  stagger?: number;
};

/**
 * Word-mask reveal: each word rises out of its own clipping box.
 * Reads as one continuous line of type, not a grid of animated chunks.
 */
export function TextReveal({
  text,
  accent,
  as: Tag = "h2",
  className = "",
  immediate = false,
  delay = 0,
  stagger = 0.055,
}: TextRevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const words = el.querySelectorAll<HTMLElement>(".tr-word");
    if (!words.length) return;

    if (prefersReducedMotion()) {
      gsap.set(words, { yPercent: 0, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      const tween = gsap.fromTo(
        words,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: DUR.slow,
          delay,
          ease: EASE.out,
          stagger,
          ...(immediate
            ? {}
            : {
                scrollTrigger: { trigger: el, start: "top 85%", once: true },
              }),
        },
      );
      return () => {
        tween.scrollTrigger?.kill();
      };
    }, el);

    return () => ctx.revert();
  }, [delay, immediate, stagger]);

  const render = (value: string, isAccent: boolean) =>
    value.split(/\s+/).filter(Boolean).map((word, i) => (
      <span className="tr-mask" key={`${isAccent ? "a" : "t"}-${word}-${i}`}>
        <span className={`tr-word${isAccent ? " accent-word" : ""}`}>{word}</span>
      </span>
    ));

  return createElement(
    Tag,
    { ref, className: `tr-root ${className}`.trim() },
    render(text, false),
    accent ? render(accent, true) : null,
  );
}
