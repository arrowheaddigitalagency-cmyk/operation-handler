"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./motion-utils";

gsap.registerPlugin(ScrollTrigger);

/** Hairline read-progress bar pinned under the header. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const st = ScrollTrigger.create({
      start: 0,
      end: () => ScrollTrigger.maxScroll(window),
      onUpdate: (self) => {
        gsap.set(el, { scaleX: self.progress });
      },
    });

    return () => st.kill();
  }, []);

  return (
    <div className="scroll-progress" aria-hidden>
      <span ref={ref} />
    </div>
  );
}
