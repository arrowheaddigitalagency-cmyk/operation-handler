"use client";

type Props = { step: number; total: number; labels: string[] };

export function DeProgressBar({ step, total, labels }: Props) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between text-xs text-[var(--steel)]">
        <span>
          Step {step + 1} of {total}: {labels[step]}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[var(--copper)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
