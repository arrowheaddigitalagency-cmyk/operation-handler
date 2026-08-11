import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { StatCounter } from "@/components/stat-counter";
import { TestimonialSlider } from "@/components/testimonial-slider";
import { HomeHero } from "@/components/home-hero";
import { AmbientBg } from "@/components/ambient-bg";
import { StickyServices } from "@/components/sticky-services";
import {
  ABOUT_POINTS,
  DIGITAL_FEATURES,
  HOME_PROCESS,
  IMAGES,
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

export default function HomePage() {
  return (
    <div className="site-light">
      <HomeHero />

      {/* Core product — AI Assess → Book → Track → Portal */}
      <section
        id="digital"
        className="section-pad relative scroll-mt-28 overflow-hidden bg-[#07090d] text-white"
      >
        <AmbientBg />
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Digital journey</p>
            <h2 className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)]">
              From first photo to <span className="accent-word">lifetime care.</span>
            </h2>
            <p className="mt-4 text-white/65">
              The platform we built for Cars Compound—assess damage, book, track live stages, and keep your vehicle
              history in one portal.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {DIGITAL_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <Link href={f.href} className="glass-dark glass-feature group block h-full">
                  <p className="font-display text-3xl font-extrabold tracking-tight text-[var(--accent)]/45 transition group-hover:text-[var(--accent)] sm:text-4xl">
                    {f.n}
                  </p>
                  <div className="mt-4 h-px w-10 origin-left bg-[var(--accent)] transition-all duration-300 group-hover:w-16" />
                  <h3 className="font-display mt-5 text-lg font-bold tracking-tight sm:text-xl">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">{f.body}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)] transition group-hover:gap-3">
                    {f.cta} <ArrowIcon />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section-pad overflow-hidden bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:gap-12 sm:px-6 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">About Cars Compound</p>
            <h2 className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)] text-[var(--ink)]">
              Driven by passion. <span className="accent-word">Focused on quality.</span>
            </h2>
            <p className="mt-5 max-w-xl text-[var(--muted)] leading-relaxed md:text-[1.05rem]">{SITE.aboutBlurb}</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {ABOUT_POINTS.slice(0, 4).map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm font-medium text-[var(--ink)]">
                  <CheckIcon />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Link href="/about" className="btn-outline mt-9 inline-flex w-full sm:w-auto">
              Learn More About Us <ArrowIcon />
            </Link>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative min-h-[280px] w-full overflow-hidden sm:min-h-[360px] lg:min-h-[480px]">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-[1.03]"
                style={{ backgroundImage: `url('${IMAGES.shop}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <Link
                href="/about"
                className="group absolute bottom-5 left-5 inline-flex items-center gap-3 text-sm font-bold tracking-wide text-white sm:bottom-7 sm:left-7"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--accent)] transition group-hover:scale-105">
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

      {/* Process */}
      <section className="section-pad bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Our Process</p>
            <h2 className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)] text-[var(--ink)]">
              Simple steps, <span className="accent-word">perfect</span> results.
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-5 lg:gap-6">
            {HOME_PROCESS.map((step, i) => (
              <Reveal key={step.n} delay={i * 70} as="li" className="relative">
                <p className="font-display text-4xl font-extrabold tracking-tight text-[var(--accent)]/25 sm:text-5xl">
                  {step.n}
                </p>
                <h3 className="font-display mt-3 text-lg font-bold text-[var(--ink)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{step.body}</p>
                {i < HOME_PROCESS.length - 1 ? (
                  <span
                    className="absolute -right-3 top-6 hidden h-px w-6 bg-[var(--accent)]/35 lg:block"
                    aria-hidden
                  />
                ) : null}
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Why */}
      <section className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="relative section-pad bg-[var(--charcoal)] px-4 text-white sm:px-6 md:px-8 lg:px-12 xl:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.22]"
              style={{
                backgroundImage: `url('${IMAGES.why}')`,
                backgroundSize: "cover",
                backgroundPosition: "center right",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--charcoal)] via-[var(--charcoal)]/92 to-[var(--charcoal)]/75" />
            <Reveal className="relative max-w-xl">
              <p className="eyebrow">Why Choose Us</p>
              <h2 className="section-title mt-3 text-[clamp(1.85rem,4.5vw,3.25rem)]">
                We don&apos;t just repair, <span className="accent-word">we perfect.</span>
              </h2>
              <p className="mt-5 text-white/65 leading-relaxed">
                Every vehicle leaves our shop inspected, finished, and ready for the road—with digital tracking from
                intake to delivery.
              </p>
              <ul className="mt-8 space-y-3.5">
                {WHY_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm font-medium text-white/88">
                    <CheckIcon />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="section-pad bg-[var(--paper-deep)] px-4 text-[var(--ink)] sm:px-6 md:px-8 lg:px-12 xl:pr-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-10 sm:gap-y-14">
              {STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 70}>
                  <div>
                    <p className="font-display text-[clamp(2.4rem,6vw,3.75rem)] font-extrabold leading-none tracking-tight text-[var(--accent)]">
                      <StatCounter value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:text-sm sm:tracking-[0.12em] sm:normal-case sm:font-medium">
                      {stat.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="section-pad relative scroll-mt-28 overflow-hidden bg-[#f6f8fb]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(232,74,39,0.12),transparent_55%)]" aria-hidden />
        <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <TestimonialSlider />
        </div>
      </section>

      {/* CTA */}
      <section className="relative min-h-[48vh] overflow-hidden text-white sm:min-h-[52vh]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(100deg, rgba(8,10,14,0.9), rgba(8,10,14,0.42)), url('${IMAGES.cta}')`,
          }}
        />
        <div className="relative mx-auto flex min-h-[48vh] max-w-7xl flex-col items-start justify-center px-4 py-16 sm:min-h-[52vh] sm:px-6 sm:py-20 md:px-8">
          <Reveal>
            <h2 className="section-title max-w-3xl text-[clamp(1.85rem,4.5vw,3.4rem)]">
              Let&apos;s get your car back in <span className="accent-word">perfect shape.</span>
            </h2>
            <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link href="/book" className="btn-primary btn-anim">
                Book an Appointment <ArrowIcon />
              </Link>
              <a href={`tel:${SITE.phoneTel}`} className="btn-ghost btn-anim">
                Call Us Now
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
