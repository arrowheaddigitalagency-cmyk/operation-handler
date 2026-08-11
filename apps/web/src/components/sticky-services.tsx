"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SERVICES } from "@/content/site";

gsap.registerPlugin(ScrollTrigger);

function ArrowIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StickyServices() {
  const root = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    const rootEl = root.current;
    const pinEl = pinRef.current;
    if (!rootEl || !pinEl) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const slides = gsap.utils.toArray<HTMLElement>(pinEl.querySelectorAll(".svc-slide"));
    const dots = gsap.utils.toArray<HTMLElement>(pinEl.querySelectorAll(".svc-dot"));

    const show = (i: number) => {
      if (i === activeRef.current) return;
      activeRef.current = i;
      setActive(i);
      slides.forEach((slide, idx) => {
        slide.classList.toggle("is-active", idx === i);
      });
      dots.forEach((dot, idx) => {
        dot.classList.toggle("is-active", idx === i);
      });
    };

    slides.forEach((slide, idx) => {
      slide.classList.toggle("is-active", idx === 0);
    });

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: rootEl,
        start: "top top",
        end: () => `+=${Math.max(SERVICES.length, 1) * window.innerHeight * 0.85}`,
        pin: pinEl,
        scrub: 0.65,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const i = Math.min(SERVICES.length - 1, Math.floor(self.progress * SERVICES.length));
          show(i);
        },
      });
    }, rootEl);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("resize", refresh);
    const t = window.setTimeout(refresh, 200);
    const t2 = window.setTimeout(refresh, 800);

    return () => {
      window.removeEventListener("resize", refresh);
      window.clearTimeout(t);
      window.clearTimeout(t2);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={root} className="svc-pin-section relative bg-[#0b0e13] text-white">
      <div ref={pinRef} className="svc-pin-stage">
        <div className="pointer-events-none absolute inset-0 svc-ambient" aria-hidden />

        <div className="relative z-[1] mx-auto flex h-full max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 md:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow">Our Services</p>
              <h2 className="section-title mt-2 text-[clamp(1.7rem,4vw,3rem)]">
                Complete automotive <span className="accent-word">care.</span>
              </h2>
            </div>
            <div className="svc-progress">
              <span>
                {String(active + 1).padStart(2, "0")} / {String(SERVICES.length).padStart(2, "0")}
              </span>
              <div className="svc-progress-track">
                <i style={{ width: `${((active + 1) / SERVICES.length) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="relative mt-5 min-h-0 flex-1">
            {SERVICES.map((s, i) => (
              <article key={s.title} className={`svc-slide ${i === 0 ? "is-active" : ""}`}>
                <div className="svc-slide-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" />
                  <div className="svc-slide-scrim" />
                </div>
                <div className="svc-slide-copy">
                  <span className="svc-chip">Service {String(i + 1).padStart(2, "0")}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  <Link href={s.href} className="svc-cta">
                    Explore service <ArrowIcon />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  className={`svc-dot ${i === active ? "is-active" : ""}`}
                  aria-label={s.title}
                  onClick={() => {
                    const rootEl = root.current;
                    if (!rootEl) return;
                    const st = ScrollTrigger.getAll().find((t) => t.trigger === rootEl);
                    if (!st) return;
                    const p = (i + 0.5) / SERVICES.length;
                    const y = st.start + (st.end - st.start) * p;
                    window.scrollTo({ top: y, behavior: "smooth" });
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </button>
              ))}
            </div>
            <Link href="/services" className="btn-ghost btn-anim !w-auto !px-4 !py-2.5 !text-[11px]">
              View all <ArrowIcon />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
