import Link from "next/link";
import { IMAGES, SERVICES, SITE } from "@/content/site";

export default function ServicesPage() {
  return (
    <div className="site-light">
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${IMAGES.bay}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--paper)]/70 via-[var(--paper)]/88 to-[var(--paper)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow">Services</p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Best quality automotive care
          </h1>
          <p className="mt-5 max-w-2xl text-[var(--muted)] leading-relaxed md:text-lg">
            From ADAS calibration and complete collision repair to detailing, AC, and digital tools—
            {SITE.name} is your one-stop shop in {SITE.location}.
          </p>
        </div>
      </section>

      <section className="section-pad section-ambient !pt-4 md:!pt-8">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Link key={s.title} href={s.href} className="service-tile group min-h-[300px] md:min-h-[340px]">
                <div className="service-tile-bg" style={{ backgroundImage: `url('${s.image}')` }} />
                <div className="service-tile-scrim" />
                <div className="service-tile-body">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--copper-hot)]">
                    Explore
                  </p>
                  <h2 className="font-display mt-2 text-xl font-semibold leading-snug">{s.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/75">{s.body}</p>
                  <span className="mt-4 inline-block text-xs font-bold uppercase tracking-wider text-white/90">
                    Continue →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="surface mt-14 rounded-xl p-7 md:flex md:items-center md:justify-between md:gap-8 md:p-10">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">Ready to schedule?</h2>
              <p className="mt-2 text-sm text-[var(--muted)] md:text-base">
                Book an inspection or start with an AI advisory assessment.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0">
              <Link href="/assess" className="btn-primary">
                AI Damage Assess
              </Link>
              <Link href="/book" className="btn-ghost">
                Book appointment
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
