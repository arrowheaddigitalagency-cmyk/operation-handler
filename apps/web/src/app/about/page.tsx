import Link from "next/link";
import { ABOUT_POINTS, IMAGES, SITE, WHY_US } from "@/content/site";

export default function AboutPage() {
  return (
    <div className="site-light">
      <section className="section-pad section-ambient">
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <p className="eyebrow">About us</p>
            <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">
              Premier auto care in Marietta
            </h1>
            <p className="mt-5 text-[var(--muted)] leading-relaxed md:text-lg">{SITE.aboutBlurb}</p>
            <p className="mt-5 text-sm font-medium text-[var(--ink)]">{SITE.address}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/book" className="btn-primary">
                Book appointment
              </Link>
              <Link href="/contact" className="btn-ghost">
                Contact
              </Link>
            </div>
          </div>

          <div className="media-frame relative min-h-[340px] md:min-h-[460px]">
            <div
              className="media-bg absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${IMAGES.shop}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <div className="text-white">
                <p className="font-display text-5xl font-extrabold">{SITE.yearsExperience}+</p>
                <p className="mt-1 text-sm text-white/80">Years serving Atlanta-area drivers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url('${IMAGES.paint}')` }}
        />
        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--paper-deep)_80%,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <p className="eyebrow">What we stand for</p>
          <h2 className="font-display mt-3 text-3xl font-bold md:text-5xl">Excellence at every turn</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ABOUT_POINTS.map((p) => (
              <li key={p} className="surface flex gap-3 rounded-xl px-5 py-4 text-sm text-[var(--ink)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--copper)]" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-pad section-ambient">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div
              className="media-frame min-h-[260px]"
              style={{ backgroundImage: `url('${IMAGES.tech}')`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
            <div>
              <p className="eyebrow">Why choose us</p>
              <h2 className="font-display mt-3 text-3xl font-bold md:text-4xl">
                Drive with confidence after expert repairs
              </h2>
              <div className="mt-8 grid gap-4">
                {WHY_US.map((w, i) => (
                  <div key={w.title} className="surface rounded-xl p-5">
                    <p className="font-display text-sm font-bold text-[var(--copper)]">0{i + 1}</p>
                    <h3 className="font-display mt-1 text-xl font-semibold">{w.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{w.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
