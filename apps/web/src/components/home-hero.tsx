"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { HERO_FEATURES, IMAGES, SITE } from "@/content/site";

function ArrowIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeatureIcon({ type }: { type: (typeof HERO_FEATURES)[number]["icon"] }) {
  const common = "h-5 w-5 sm:h-6 sm:w-6 stroke-current";
  if (type === "tech") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M8 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" strokeWidth="1.6" />
        <path d="M11.5 12.5 14 14M10 16l2.2-1.2" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "gear") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <circle cx="12" cy="12" r="3.2" strokeWidth="1.6" />
        <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M12 3 5 6v5c0 4.4 2.8 7.8 7 9 4.2-1.2 7-4.6 7-9V6l-7-3z" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="m9.2 12 1.9 1.9 3.7-3.8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function HomeHero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-seq", {
        y: 36,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
      }).from(
        ".hero-feature",
        {
          y: 18,
          opacity: 0,
          duration: 0.65,
          stagger: 0.08,
        },
        "-=0.35",
      );

      gsap.to(".hero-media-zoom", {
        scale: 1.08,
        duration: 18,
        ease: "none",
        repeat: -1,
        yoyo: true,
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative min-h-[100svh] overflow-hidden bg-black text-white">
      <div className="hero-media-zoom absolute inset-0 origin-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${IMAGES.hero}')` }}
          aria-hidden
        />
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={IMAGES.hero}
          aria-hidden
        >
          <source src="/videos/hero-car.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.45)_38%,rgba(0,0,0,0.72)_100%)] md:bg-[linear-gradient(105deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.58)_45%,rgba(0,0,0,0.35)_70%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_40%,rgba(232,74,39,0.22),transparent_50%)]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col justify-end px-4 pb-[10.5rem] pt-28 sm:justify-center sm:px-6 sm:pb-44 md:px-8 lg:pb-36">
        <p className="hero-seq eyebrow text-[var(--accent-hot)]">{SITE.heroEyebrow}</p>

        <h1 className="hero-seq section-title mt-3 max-w-[13ch] text-[clamp(2.35rem,9.5vw,5.5rem)] leading-[0.95] text-white sm:mt-4">
          {SITE.heroTitle} <span className="accent-word">{SITE.heroTitleAccent}</span>
        </h1>

        <p className="hero-seq mt-4 max-w-md text-[0.95rem] leading-relaxed text-white/75 sm:mt-5 sm:max-w-lg sm:text-lg">
          {SITE.heroSupport}
        </p>

        <div className="hero-seq hero-cta-row mt-7 flex w-full flex-col gap-2.5 sm:mt-9 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-3">
          <Link href="/assess" className="btn-primary btn-anim">
            AI Damage Assess <ArrowIcon />
          </Link>
          <div className="grid grid-cols-2 gap-2.5 sm:contents">
            <Link href="/book" className="btn-ghost btn-anim">
              Book <span className="hidden sm:inline">Appointment</span> <ArrowIcon className="hidden sm:inline h-3.5 w-3.5" />
            </Link>
            <Link href="/track" className="btn-ghost btn-anim">
              Track <span className="hidden sm:inline">Repair</span> <ArrowIcon className="hidden sm:inline h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="feature-strip absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-3 gap-y-3 px-4 py-4 sm:gap-x-4 sm:gap-y-5 sm:px-6 sm:py-5 md:grid-cols-4 md:gap-6 md:px-8 md:py-7">
          {HERO_FEATURES.map((f) => (
            <div key={f.title} className="hero-feature flex items-center gap-2.5 sm:gap-3">
              <span className="feature-icon shrink-0">
                <FeatureIcon type={f.icon} />
              </span>
              <p className="text-[9px] font-semibold uppercase leading-snug tracking-[0.12em] text-white/85 sm:text-[11px] sm:tracking-[0.14em]">
                {f.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
