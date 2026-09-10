/** Shared motion helpers — keep easing/timing identical across the site. */

export const EASE = {
  /** Primary entrance — decelerating, confident. */
  out: "power3.out",
  /** Long luxury glide for scrub-linked motion. */
  glide: "power2.out",
  /** Snappy interaction feedback. */
  snap: "power2.inOut",
} as const;

export const DUR = {
  fast: 0.45,
  base: 0.85,
  slow: 1.15,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Pointer devices only — skip hover-driven motion on touch. */
export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

type NavigatorLite = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** Phones, 4-core CPUs, Save-Data, and low RAM skip heavy compositor work. */
export function isLowPowerDevice(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as NavigatorLite;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const saveData = Boolean(nav.connection?.saveData);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 900px)").matches;
  return saveData || cores <= 4 || memory <= 4 || (coarse && narrow);
}

export function applyMotionFlags(): { reduced: boolean; lite: boolean } {
  const reduced = prefersReducedMotion();
  const lite = reduced || isLowPowerDevice();
  document.documentElement.classList.toggle("motion-reduced", reduced);
  document.documentElement.classList.toggle("motion-lite", lite);
  return { reduced, lite };
}

export function canHoverMotion(): boolean {
  return !prefersReducedMotion() && !isLowPowerDevice() && hasFinePointer();
}
