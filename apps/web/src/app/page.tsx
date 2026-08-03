import Link from "next/link";

const HERO =
  "https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=2000&q=80";
const BODY =
  "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80";
const DETAIL =
  "https://images.unsplash.com/photo-1619642751034-765dfdf7c43e?auto=format&fit=crop&w=1600&q=80";

export default function HomePage() {
  return (
    <div className="bg-[var(--asphalt)] text-[var(--mist)]">
      <section className="relative min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 anim-hero-zoom bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(115deg, rgba(8,12,18,0.94) 0%, rgba(8,12,18,0.62) 42%, rgba(8,12,18,0.28) 100%), url('${HERO}')`,
          }}
        />
        <div className="absolute inset-0 surface-grid opacity-30" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--asphalt)] to-transparent" />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-20 pt-28 md:pb-24">
          <p className="anim-fade-up mb-4 text-[11px] font-semibold uppercase tracking-[0.38em] text-[var(--copper-hot)]">
            Automotive body & repair
          </p>
          <h1 className="anim-fade-up-delay font-display max-w-4xl text-5xl font-extrabold leading-[0.92] tracking-tight md:text-7xl lg:text-[5.5rem]">
            Cars Compound
          </h1>
          <p className="anim-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-[var(--steel)] md:text-lg">
            Instant damage assessment, live bay tracking, and a permanent digital history for every
            vehicle we restore.
          </p>
          <div className="anim-fade-up-delay-2 mt-10 flex flex-wrap gap-3">
            <Link href="/assess" className="btn-primary">
              Instant Damage Assessment
            </Link>
            <Link href="/book" className="btn-ghost">
              Book Inspection
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)]">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              From crushed panel to clearcoat — fully visible.
            </h2>
            <p className="mt-4 max-w-md text-[var(--steel)] leading-relaxed">
              Customers stop calling for updates. Staff push a stage once; the system notifies,
              documents, and remembers.
            </p>
          </div>
          <div
            className="relative min-h-[300px] overflow-hidden rounded-sm bg-cover bg-center ring-1 ring-white/10"
            style={{ backgroundImage: `url('${BODY}')` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--asphalt)] via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-sm">Body repair bay · Cars Compound</div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
          <h2 className="font-display text-3xl font-bold">The digital journey</h2>
          <p className="mt-3 max-w-2xl text-[var(--steel)]">
            AI report → lead → inspection → repair tracking → delivery → lifetime care.
          </p>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              ["AI Damage Report", "Upload panels, capture your contact, download a professional advisory report priced from shop bands."],
              ["Live Bay Tracking", "Every stage from intake through paint and road test — with ETA and technician notes."],
              ["Lifetime Retention", "Maintenance reminders and post-delivery follow-ups keep you connected after pickup."],
            ].map(([title, body]) => (
              <div key={title} className="border-t border-[var(--copper)] pt-5">
                <h3 className="font-display text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--steel)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative min-h-[58vh] overflow-hidden border-t border-[var(--line)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(95deg, rgba(8,12,18,0.9), rgba(8,12,18,0.35)), url('${DETAIL}')`,
          }}
        />
        <div className="relative mx-auto flex min-h-[58vh] max-w-6xl flex-col justify-center px-4 py-16">
          <h2 className="font-display max-w-xl text-4xl font-bold md:text-5xl">Built for the shop floor.</h2>
          <p className="mt-4 max-w-lg text-[var(--steel)] leading-relaxed">
            Staff push the stage. Customers see the truth. AI never pretends to replace a physical
            estimate.
          </p>
          <div className="mt-8">
            <Link href="/track" className="btn-primary">
              Track a Repair
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] px-4 py-10 text-center text-xs text-[var(--steel)]">
        <div className="mb-3 flex flex-wrap justify-center gap-4">
          <Link href="/services">Services</Link>
          <Link href="/process">Process</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/assess">AI Assess</Link>
        </div>
        Cars Compound · Smart Customer Experience
        <span className="mx-2 text-[var(--line)]">|</span>
        Portal by Arrowhead
      </footer>
    </div>
  );
}
