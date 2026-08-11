"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TESTIMONIALS } from "@/content/site";

gsap.registerPlugin(ScrollTrigger);

const SLOTS = ["from-left", "from-right", "from-top", "from-bottom"] as const;

function Stars() {
  return (
    <div className="flex gap-0.5 text-[var(--accent)]" aria-label="5 star rating">
      {Array.from({ length: 5 }).map((_, s) => (
        <svg key={s} viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden>
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.52L10 14.27l-4.94 2.46.94-5.52-4-3.9 5.53-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialSlider() {
  const root = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".orbit-card");
      const center = el.querySelector(".orbit-center");

      if (!reduced) {
        gsap.from(center, {
          scale: 0.92,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 75%", once: true },
        });

        cards.forEach((card, i) => {
          const slot = SLOTS[i % SLOTS.length];
          const from =
            slot === "from-left"
              ? { x: -80, y: 0 }
              : slot === "from-right"
                ? { x: 80, y: 0 }
                : slot === "from-top"
                  ? { x: 0, y: -70 }
                  : { x: 0, y: 70 };

          gsap.from(card, {
            ...from,
            opacity: 0,
            rotate: slot === "from-left" || slot === "from-top" ? -3 : 3,
            duration: 0.9,
            delay: 0.12 + i * 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 70%", once: true },
          });

          gsap.to(card, {
            y: i % 2 === 0 ? -8 : 8,
            duration: 3.2 + i * 0.35,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * 0.2,
          });
        });
      }
    }, el);

    const id = window.setInterval(() => {
      setFocus((f) => (f + 1) % TESTIMONIALS.length);
    }, 4200);

    return () => {
      window.clearInterval(id);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={root} className="reviews-orbit">
      <div className="orbit-center">
        <p className="eyebrow">Customer Reviews</p>
        <h2 className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)] text-[var(--ink)]">
          What it&apos;s actually like <span className="accent-word accent-underline">here</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--muted)] sm:text-base">
          Real voices from drivers across Marietta and Atlanta.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          {TESTIMONIALS.map((t, i) => (
            <button
              key={t.name}
              type="button"
              aria-label={`Focus review ${i + 1}`}
              className={`t-dot ${i === focus ? "is-active" : ""}`}
              onClick={() => setFocus(i)}
            />
          ))}
        </div>
      </div>

      {TESTIMONIALS.map((t, i) => (
        <article
          key={t.name}
          className={`orbit-card ${SLOTS[i % SLOTS.length]} ${i === focus ? "is-focus" : ""}`}
          onMouseEnter={() => setFocus(i)}
        >
          <div className="orbit-card-inner">
            <div className="flex items-center justify-between gap-2">
              <span className="t-verified">Verified</span>
              <Stars />
            </div>
            <p className="orbit-quote">&ldquo;{t.quote}&rdquo;</p>
            <footer className="t-person">
              <div className="t-avatar">
                {t.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <p className="font-display text-sm font-bold text-[var(--ink)]">{t.name}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{t.role}</p>
              </div>
            </footer>
          </div>
        </article>
      ))}
    </div>
  );
}
