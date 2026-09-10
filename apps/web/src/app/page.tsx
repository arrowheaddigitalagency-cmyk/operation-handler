import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { StatCounter } from "@/components/stat-counter";
import { TestimonialSlider } from "@/components/testimonial-slider";
import { HomeHero } from "@/components/home-hero";
import { AmbientBg } from "@/components/ambient-bg";
import { StickyServices } from "@/components/sticky-services";
import { TextReveal } from "@/components/motion/text-reveal";
import { Magnetic } from "@/components/motion/magnetic";
import { TiltCard } from "@/components/motion/tilt-card";
import { Parallax } from "@/components/motion/parallax";
import { Marquee } from "@/components/motion/marquee";
import { ProcessJourney } from "@/components/process-journey";
import {
  ABOUT_POINTS,
  DIGITAL_FEATURES,
  IMAGES,
  SERVICES,
  SITE,
  STATS,
  WHY_POINTS,
} from "@/content/site";

function ArrowIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden>
      <path fill="currentColor" d="M8.2 13.6 4.7 10l1.3-1.3 2.2 2.2 5.8-5.9L15.3 6.3 8.2 13.6z" />
    </svg>
  );
}

const MARQUEE_ITEMS = [
  ...SERVICES.map((s) => s.title),
  "AI Damage Assess",
  "Live Tracking",
  "Customer Portal",
] as const;

export default function HomePage() {
  return (
    <div className="site-light">
      <HomeHero />

      <Marquee items={MARQUEE_ITEMS} />

      {/* Core product — AI Assess → Book → Track → Portal */}
      <section
        id="digital"
        className="section-pad relative scroll-mt-28 overflow-hidden bg-[#07090d] text-white"
      >
        <AmbientBg />
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow flex items-center gap-3">
                <span className="hero-rule" aria-hidden />
                Digital journey
              </p>
              <TextReveal
                as="h2"
                className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)]"
                text="From first photo to"
                accent="lifetime care."
              />
              <Reveal delay={80} variant="fade">
                <p className="mt-4 max-w-xl text-white/65">
                  The platform we built for Cars Compound—assess damage, book, track live stages, and keep your vehicle
                  history in one portal.
                </p>
              </Reveal>
            </div>
            <Reveal delay={140} variant="fade" className="hidden lg:block">
              <p className="max-w-[14rem] text-right text-[0.7rem] font-semibold uppercase leading-relaxed tracking-[0.22em] text-white/35">
                Four steps. One shop system.
              </p>
            </Reveal>
          </div>

          <div className="digital-grid mt-12 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {DIGITAL_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 90} variant="up">
                <TiltCard>
                  <Link href={f.href} className="glass-dark glass-feature group block h-full">
                    <p className="font-display text-3xl font-extrabold tracking-tight text-[var(--accent)]/45 transition duration-500 group-hover:text-[var(--accent)] sm:text-4xl">
                      {f.n}
                    </p>
                    <div className="mt-4 h-px w-10 origin-left bg-[var(--accent)] transition-all duration-500 group-hover:w-16" />
                    <h3 className="font-display mt-5 text-lg font-bold tracking-tight sm:text-xl">{f.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/65">{f.body}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)] transition-all duration-300 group-hover:gap-3">
                      {f.cta} <ArrowIcon />
                    </span>
                  </Link>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section-pad overflow-hidden bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:gap-12 sm:px-6 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="eyebrow">About Cars Compound</p>
            <TextReveal
              as="h2"
              className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)] text-[var(--ink)]"
              text="Driven by passion."
              accent="Focused on quality."
            />
            <Reveal delay={80} variant="fade">
              <p className="mt-5 max-w-xl text-[var(--muted)] leading-relaxed md:text-[1.05rem]">{SITE.aboutBlurb}</p>
            </Reveal>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {ABOUT_POINTS.slice(0, 4).map((p, i) => (
                <Reveal
                  key={p}
                  delay={i * 70}
                  variant="left"
                  as="li"
                  className="flex items-start gap-2.5 text-sm font-medium text-[var(--ink)]"
                >
                  <CheckIcon />
                  <span>{p}</span>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={160}>
              <Magnetic>
                <Link href="/about" className="btn-outline mt-9 inline-flex w-full sm:w-auto">
                  Learn More About Us <ArrowIcon />
                </Link>
              </Magnetic>
            </Reveal>
          </div>

          <Reveal delay={80} variant="scale" as="figure" className="about-media">
            <div className="about-media-frame relative min-h-[280px] w-full overflow-hidden bg-[#12161d] sm:min-h-[360px] lg:min-h-[480px]">
              <Parallax speed={-0.16} zoom={0.06} scope="parent" className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={IMAGES.shop}
                  alt="Cars Compound shop floor"
                  className="absolute inset-[-10%] h-[120%] w-[120%] max-w-none object-cover"
                />
              </Parallax>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
              <Link
                href="/about"
                className="group absolute bottom-5 left-5 z-[1] inline-flex items-center gap-3 text-sm font-bold tracking-wide text-white sm:bottom-7 sm:left-7"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--accent)] transition duration-300 group-hover:scale-105">
                  <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-current" aria-hidden>
                    <path d="M8 6.5v11l9-5.5-9-5.5z" />
                  </svg>
                </span>
                Watch Our Story
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <StickyServices />

      <ProcessJourney />

      {/* Why */}
      <section className="why-section relative overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[28rem] overflow-hidden bg-[var(--charcoal)] px-4 py-16 text-white sm:min-h-[34rem] sm:px-6 sm:py-20 md:px-8 lg:px-12 lg:py-[7.25rem] xl:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            <Parallax speed={0.12} zoom={0.08} className="pointer-events-none absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={IMAGES.why}
                alt=""
                className="absolute inset-[-12%] h-[124%] w-[124%] max-w-none object-cover opacity-45"
              />
            </Parallax>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e12] via-[#0c0e12]/82 to-[#0c0e12]/40" />
            <div className="relative max-w-xl">
              <p className="eyebrow flex items-center gap-3">
                <span className="hero-rule" aria-hidden />
                Why Choose Us
              </p>
              <TextReveal
                as="h2"
                className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)]"
                text="We don't just repair,"
                accent="we perfect."
              />
              <Reveal delay={80} variant="fade">
                <p className="mt-5 text-white/65 leading-relaxed">
                  Every vehicle leaves our shop inspected, finished, and ready for the road—with digital tracking from
                  intake to delivery.
                </p>
              </Reveal>
              <ul className="why-points mt-8">
                {WHY_POINTS.map((p, i) => (
                  <Reveal
                    key={p}
                    delay={i * 70}
                    variant="left"
                    as="li"
                    className="why-point"
                  >
                    <CheckIcon />
                    <span>{p}</span>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>

          <div className="why-stats section-pad px-4 text-[var(--ink)] sm:px-6 md:px-8 lg:px-12 xl:pr-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            <p className="eyebrow">By the numbers</p>
            <div className="why-stat-grid mt-8">
              {STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 90} variant="scale">
                  <div className="stat-tile">
                    <p className="stat-tile-value">
                      <StatCounter value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="stat-tile-label">{stat.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TestimonialSlider />

      {/* CTA */}
      <section className="home-cta relative min-h-[64vh] overflow-hidden text-white sm:min-h-[70vh]">
        <Parallax speed={0.18} zoom={0.08} className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMAGES.cta}
            alt=""
            className="absolute inset-[-12%] h-[124%] w-[124%] max-w-none object-cover"
          />
        </Parallax>
        <div className="home-cta-scrim absolute inset-0" />
        <div className="relative mx-auto flex min-h-[64vh] max-w-7xl flex-col items-start justify-center px-4 py-20 sm:min-h-[70vh] sm:px-6 sm:py-24 md:px-8">
          <p className="eyebrow flex items-center gap-3 text-[var(--accent-hot)]">
            <span className="hero-rule" aria-hidden />
            {SITE.location}
          </p>
          <TextReveal
            as="h2"
            className="section-title mt-4 max-w-3xl text-[clamp(2rem,5vw,3.6rem)]"
            text="Let's get your car back in"
            accent="perfect shape."
          />
          <Reveal delay={80} variant="fade">
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
              Book an inspection or call the shop — we&apos;ll confirm, open a case, and send your tracking ID.
            </p>
          </Reveal>
          <Reveal delay={140} className="cta-actions mt-8 flex w-full max-w-xl flex-col gap-3 sm:mt-9 sm:flex-row">
            <Magnetic>
              <Link href="/book" className="btn-primary btn-anim btn-sheen">
                Book an Appointment <ArrowIcon />
              </Link>
            </Magnetic>
            <Magnetic strength={7}>
              <a href={`tel:${SITE.phoneTel}`} className="btn-ghost btn-anim btn-ghost-invert">
                Call {SITE.phoneDisplay}
              </a>
            </Magnetic>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
