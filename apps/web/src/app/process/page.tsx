"use client";

const STEPS = [
  ["1. AI assess or book", "Upload damage photos or schedule a physical inspection online."],
  ["2. Lead & confirmation", "We capture your contact details as a CRM lead and confirm your visit."],
  ["3. Physical inspection", "Technicians verify damage and finalize a written estimate."],
  ["4. Repair order", "A secure Tracking ID is issued; you get email/SMS with portal access."],
  ["5. Live stages", "Track progress from intake through paint, polish, and road test."],
  ["6. Delivery & care", "Pickup with warranties on file, then automated follow-ups and maintenance reminders."],
];

export default function ProcessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound</p>
      <h1 className="font-display mt-2 text-4xl font-extrabold">Repair process</h1>
      <p className="mt-3 text-[var(--steel)]">
        A transparent path from first website visit to vehicle delivery — and beyond.
      </p>
      <ol className="mt-12 space-y-8">
        {STEPS.map(([title, body]) => (
          <li key={title} className="border-l-2 border-[var(--copper)] pl-5">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-[var(--steel)]">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
