"use client";

type MarqueeProps = {
  items: readonly string[];
  className?: string;
};

export function Marquee({ items, className = "" }: MarqueeProps) {
  const doubled = [...items, ...items];
  return (
    <div className={`marquee ${className}`.trim()} aria-hidden>
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="marquee-item">
            {item}
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}
