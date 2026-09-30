"use client";

type Props = { step: number; total: number; labels: string[] };

export function DeProgressBar({ step, total, labels }: Props) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span className="min-w-0 truncate">
          Step {step + 1} of {total}
          <span className="hidden sm:inline">: {labels[step]}</span>
        </span>
        <span className="shrink-0 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--paper-line)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--copper)] to-[var(--copper-hot)] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="mt-3 hidden gap-1 sm:grid sm:grid-cols-7">
        {labels.map((label, i) => (
          <li
            key={label}
            className={`truncate text-center text-[10px] uppercase tracking-wide ${
              i === step
                ? "font-semibold text-[var(--copper)]"
                : i < step
                  ? "text-[var(--ink)]"
                  : "text-[var(--muted)]"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-center text-xs font-medium text-[var(--copper)] sm:hidden">{labels[step]}</p>
    </div>
  );
}
