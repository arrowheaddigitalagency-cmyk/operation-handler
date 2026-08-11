import Link from "next/link";
import { FAQS, IMAGES } from "@/content/site";

export default function FaqPage() {
  return (
    <div className="site-light">
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${IMAGES.showroom}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--paper)]/75 via-[var(--paper)]/90 to-[var(--paper)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow">FAQ</p>
          <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">
            Answers before you roll in
          </h1>
          <p className="mt-5 text-[var(--muted)] md:text-lg">
            Common questions about ADAS, AI estimates, tracking, and visiting our Marietta shop.
          </p>
        </div>
      </section>

      <section className="section-pad section-ambient !pt-4 md:!pt-8">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="surface rounded-xl p-5 md:p-6">
                <h2 className="font-display text-lg font-semibold md:text-xl">{f.q}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] md:text-[15px]">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/contact" className="btn-primary">
              Still have questions?
            </Link>
            <Link href="/book" className="btn-ghost">
              Book appointment
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
