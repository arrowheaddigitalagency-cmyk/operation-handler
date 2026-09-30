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
    <div className="relative overflow-hidden rounded-xl border border-[var(--paper-line)] bg-[var(--paper-deep)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Damage photo" className="block w-full object-contain max-h-72" />
      {boxes.map((b, i) => (
        <div
          key={i}
          className="pointer-events-none absolute border-2"
          style={{
            left: `${b.bbox.x * 100}%`,
            top: `${b.bbox.y * 100}%`,
            width: `${b.bbox.w * 100}%`,
            height: `${b.bbox.h * 100}%`,
            borderColor: b.color ?? "#f59e0b",
          }}
          title={b.label}
        >
          <span className="absolute left-0 top-0 max-w-full truncate bg-black/70 px-1 text-[10px] text-white">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}
