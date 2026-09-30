"use client";

type BBox = { x: number; y: number; w: number; h: number };

export function PhotoWithOverlays({
  url,
  boxes,
}: {
  url: string;
  boxes: { bbox: BBox; label: string; color?: string }[];
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[var(--paper-line)] bg-[var(--paper-deep)]">
      {/* Width-driven image so absolute bboxes align to photo pixels (no letterbox mismatch). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Damage photo" className="block h-auto w-full" />
      {boxes.map((b, i) => (
        <div
          key={i}
          className="pointer-events-none absolute border-2 border-[var(--copper)] shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{
            left: `${b.bbox.x * 100}%`,
            top: `${b.bbox.y * 100}%`,
            width: `${Math.max(b.bbox.w, 0.04) * 100}%`,
            height: `${Math.max(b.bbox.h, 0.04) * 100}%`,
          }}
          title={b.label}
        >
          <span className="absolute left-0 top-0 z-[1] max-w-[min(100%,12rem)] truncate rounded-br bg-[var(--ink)]/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}
