"use client";

import Link from "next/link";

const SERVICES = [
  {
    title: "Collision & body repair",
    body: "Structural and cosmetic restoration with OEM-aware methods, from bumper covers to full panel replacement.",
  },
  {
    title: "Paint & refinish",
    body: "Color-matched clearcoat work with documented paint codes stored in your vehicle history.",
  },
  {
    title: "AI damage assessment",
    body: "Upload photos for an advisory report priced from Cars Compound shop bands — then book a physical inspection.",
  },
  {
    title: "Live repair tracking",
    body: "Secure Tracking IDs with stage-by-stage progress, photos, and notifications until delivery.",
  },
  {
    title: "Digital vehicle history",
    body: "Permanent records of repairs, warranties, invoices, and maintenance for every vehicle in your garage.",
  },
  {
    title: "Lifetime care reminders",
    body: "Automated oil, brake, alignment, and custom maintenance reminders after your vehicle leaves the bay.",
  },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound</p>
      <h1 className="font-display mt-2 text-4xl font-extrabold md:text-5xl">Services</h1>
      <p className="mt-3 max-w-2xl text-[var(--steel)]">
        Premium body repair with a fully digital customer experience — from first photo to lifetime care.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {SERVICES.map((s) => (
          <div key={s.title} className="panel rounded-sm p-6">
            <h2 className="font-display text-xl font-semibold">{s.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--steel)]">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/assess" className="btn-primary">
          Start AI assessment
        </Link>
        <Link href="/book" className="btn-ghost">
          Book inspection
        </Link>
      </div>
    </div>
  );
}
