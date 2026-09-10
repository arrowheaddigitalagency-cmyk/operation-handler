"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TESTIMONIALS } from "@/content/site";
import { TextReveal } from "@/components/motion/text-reveal";
import { prefersReducedMotion } from "@/components/motion/motion-utils";

gsap.registerPlugin(ScrollTrigger);

function Stars() {
  return (
    <div className="flex gap-0.5 text-[var(--accent)]" aria-label="5 star rating">
      {Array.from({ length: 5 }).map((_, s) => (
        <svg key={s} viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.52L10 14.27l-4.94 2.46.94-5.52-4-3.9 5.53-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export function TestimonialSlider() {
  const root = useRef<HTMLElement>(null);
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const [focus, setFocus] = useState(0);
  const active = TESTIMONIALS[focus];

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from(".review-stage > *", {
        y: 28,
        autoAlpha: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 78%", once: true },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const q = quoteRef.current;
    if (!q || prefersReducedMotion()) return;
    gsap.fromTo(
      q,
      { y: 18, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.55, ease: "power3.out" },
    );
  }, [focus]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFocus((f) => (f + 1) % TESTIMONIALS.length);
    }, 5600);
    return () => window.clearInterval(id);
  }, [focus]);

  return (
    <section ref={root} id="reviews" className="section-pad review-section relative scroll-mt-28 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,74,39,0.1),transparent_50%)]" aria-hidden />
      <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="review-stage grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:items-center">
          <div>
            <p className="eyebrow flex items-center gap-3">
              <span className="hero-rule" aria-hidden />
              Customer Reviews
            </p>
            <TextReveal
              as="h2"
              className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)] text-[var(--ink)]"
              text="What it's actually like"
              accent="here."
            />

            <blockquote className="review-featured mt-8">
              <Stars />
              <p ref={quoteRef} className="review-quote">
                &ldquo;{active.quote}&rdquo;
              </p>
              <footer className="t-person">
                <div className="t-avatar">{initials(active.name)}</div>
                <div>
                  <p className="font-display text-sm font-bold text-[var(--ink)]">{active.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{active.role} · Verified visit</p>
                </div>
              </footer>
            </blockquote>
          </div>

          <ol className="review-list">
            {TESTIMONIALS.map((t, i) => (
              <li key={t.name}>
                <button
                  type="button"
                  className={`review-pick ${i === focus ? "is-active" : ""}`}
                  onClick={() => setFocus(i)}
                >
                  <span className="t-avatar">{initials(t.name)}</span>
                  <span className="review-pick-copy">
                    <strong>{t.name}</strong>
                    <small>{t.role}</small>
                  </span>
                  <span className="review-pick-index">{String(i + 1).padStart(2, "0")}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
