import Link from "next/link";
import { IMAGES, PROCESS_STEPS } from "@/content/site";

export default function ProcessPage() {
  return (
    <div className="site-light">
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${IMAGES.process}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--paper)]/75 via-[var(--paper)]/90 to-[var(--paper)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow">Process</p>
          <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">
            From first photo to lifetime care
          </h1>
          <p className="mt-5 text-[var(--muted)] leading-relaxed md:text-lg">
            A transparent path from your first website visit to vehicle delivery—and beyond with digital history.
          </p>
        </div>
      </section>

      <section className="section-pad section-ambient !pt-4 md:!pt-8">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <ol className="space-y-5">
            {PROCESS_STEPS.map(([title, body], i) => (
              <li key={title} className="surface relative rounded-xl p-6 pl-7 md:p-7">
                <span className="absolute left-0 top-6 h-10 w-1 rounded-r bg-[var(--copper)]" />
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--copper)]">Step {i + 1}</p>
                <h2 className="font-display mt-1 text-xl font-semibold md:text-2xl">
                  {title.replace(/^\d+\.\s*/, "")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] md:text-[15px]">{body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/assess" className="btn-primary">
              Start with AI Assess
            </Link>
            <Link href="/book" className="btn-ghost">
              Book inspection
            </Link>
            <Link href="/track" className="btn-ghost">
              Track a repair
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
