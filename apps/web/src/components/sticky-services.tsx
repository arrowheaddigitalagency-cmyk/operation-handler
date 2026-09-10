"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SERVICES } from "@/content/site";
import { isLowPowerDevice, prefersReducedMotion } from "@/components/motion/motion-utils";

gsap.registerPlugin(ScrollTrigger);

function ArrowIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function scrollPinnedTo(rootEl: HTMLElement, index: number) {
  const st = ScrollTrigger.getAll().find((t) => t.vars.trigger === rootEl || t.trigger === rootEl);
  if (!st) return;
  const n = Math.max(SERVICES.length - 1, 1);
  const y = st.start + (st.end - st.start) * (index / n);
  window.dispatchEvent(new CustomEvent("cc-scroll-to", { detail: { y } }));
}

export function StickyServices() {
  const root = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const rootEl = root.current;
    const pinEl = pinRef.current;
    if (!rootEl || !pinEl) return;

    const slides = gsap.utils.toArray<HTMLElement>(pinEl.querySelectorAll(".svc-slide"));
    if (!slides.length) return;

    const reduced = prefersReducedMotion();
    const lite = isLowPowerDevice();
    slides.forEach((slide, i) => {
      gsap.set(slide, { autoAlpha: i === 0 ? 1 : 0, zIndex: i === 0 ? 3 : 1 });
    });

    if (reduced) {
      return;
    }

    let lastIndex = 0;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: rootEl,
          start: "top top",
          end: () => `+=${Math.max(SERVICES.length, 1) * window.innerHeight * (lite ? 0.85 : 1)}`,
          pin: pinEl,
          scrub: lite ? true : 1.05,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const n = Math.max(SERVICES.length - 1, 1);
            const i = Math.min(SERVICES.length - 1, Math.round(self.progress * n));
            if (trackRef.current) {
              trackRef.current.style.transform = `scaleX(${self.progress})`;
            }
            if (i !== lastIndex) {
              lastIndex = i;
              setActive(i);
            }
          },
        },
      });

      slides.forEach((slide, i) => {
        if (i === slides.length - 1) return;
        const next = slides[i + 1];
        const at = i;

        tl.to(slide, { autoAlpha: 0, duration: 1 }, at)
          .set(next, { zIndex: 4 }, at)
          .fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, immediateRender: false }, at)
          .set(slide, { zIndex: 1 }, at + 0.99);

        if (!lite) {
          const curImg = slide.querySelector(".svc-slide-img");
          const nextImg = next.querySelector(".svc-slide-img");
          const curCopy = slide.querySelectorAll(".svc-copy-seq");
          const nextCopy = next.querySelectorAll(".svc-copy-seq");
          tl.to(curImg, { scale: 1.08, duration: 1 }, at)
            .to(curCopy, { y: -16, autoAlpha: 0, duration: 0.5 }, at)
            .fromTo(nextImg, { scale: 1.08 }, { scale: 1, duration: 1, immediateRender: false }, at)
            .fromTo(
              nextCopy,
              { y: 20, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.55, immediateRender: false },
              at + 0.2,
            );
        }
      });
    }, rootEl);

    const refresh = () => ScrollTrigger.refresh();
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, 180);
    };
    window.addEventListener("resize", onResize, { passive: true });
    const t = window.setTimeout(refresh, 280);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(t);
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
                <i ref={trackRef} />
              </div>
            </div>
          </div>

          <div className="svc-stage relative mt-5 min-h-0 flex-1">
            {SERVICES.map((s, i) => (
              <article key={s.title} className={`svc-slide ${i === active ? "is-active" : ""}`}>
                <div className="svc-slide-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="svc-slide-img" src={s.image} alt="" />
                  <div className="svc-slide-scrim" />
                </div>
                <div className="svc-slide-copy">
                  <span className="svc-copy-seq svc-chip">Service {String(i + 1).padStart(2, "0")}</span>
                  <h3 className="svc-copy-seq">{s.title}</h3>
                  <p className="svc-copy-seq">{s.body}</p>
                  <Link href={s.href} className="svc-copy-seq svc-cta">
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
                    if (root.current) scrollPinnedTo(root.current, i);
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
