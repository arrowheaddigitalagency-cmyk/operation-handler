"use client";

const FAQS = [
  {
    q: "Is the AI estimate the final price?",
    a: "No. AI pricing uses Cars Compound configurable shop bands and is advisory only. Final cost is confirmed after physical inspection.",
  },
  {
    q: "How do I track my repair?",
    a: "Use your Tracking ID on the Track page, or sign in to the Customer Portal with email/password or tracking credentials.",
  },
  {
    q: "Will I get SMS updates?",
    a: "Email is primary. SMS is sent when configured and when you have opted in / provided a phone number.",
  },
  {
    q: "What if AI confidence is low?",
    a: "We ask for clearer photos from more angles instead of issuing an unreliable report. You can also book an inspection directly.",
  },
  {
    q: "Can I see past repairs?",
    a: "Yes. Your digital garage keeps permanent vehicle history, warranties, invoices, and documents.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound</p>
      <h1 className="font-display mt-2 text-4xl font-extrabold">FAQ</h1>
      <div className="mt-10 space-y-6">
        {FAQS.map((f) => (
          <div key={f.q} className="panel rounded-sm p-5">
            <h2 className="font-display text-lg font-semibold">{f.q}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--steel)]">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
