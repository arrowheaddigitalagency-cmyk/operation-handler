"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HOME_PROCESS } from "@/content/site";
import { TextReveal } from "@/components/motion/text-reveal";
import { isLowPowerDevice, prefersReducedMotion } from "@/components/motion/motion-utils";

gsap.registerPlugin(ScrollTrigger);

export function ProcessJourney() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el.querySelectorAll(".process-card"), { autoAlpha: 1, y: 0 });
      gsap.set(el.querySelectorAll(".process-fill, .process-fill-v"), { scaleX: 1, scaleY: 1 });
      return;
    }

    const lite = isLowPowerDevice();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".process-fill, .process-fill-v",
        { scaleX: 0, scaleY: 0 },
        {
          scaleX: 1,
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 72%",
            end: "bottom 60%",
            scrub: lite ? true : 0.8,
          },
        },
      );

      gsap.fromTo(
        ".process-card",
        { y: 24, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: lite ? 0.45 : 0.75,
          stagger: lite ? 0.05 : 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 84%", once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="section-pad process-section relative overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow flex items-center gap-3">
              <span className="hero-rule" aria-hidden />
              Our Process
            </p>
            <TextReveal
              as="h2"
              className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)] text-[var(--ink)]"
              text="Simple steps,"
              accent="perfect results."
            />
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)] lg:text-right">
            From first look to keys-in-hand — every vehicle follows the same disciplined shop path.
          </p>
        </div>

        <div className="process-board mt-12 lg:mt-16">
          <span className="process-spine" aria-hidden>
            <i className="process-fill" />
            <b className="process-fill-v" />
          </span>
          <ol className="process-grid">
            {HOME_PROCESS.map((step) => (
              <li key={step.n} className="process-card">
                <span className="process-node" aria-hidden />
                <p className="process-num">{step.n}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
