/** Continuous premium ambient motion for dark sections */
export function AmbientBg({ variant = "orange" }: { variant?: "orange" | "cool" | "footer" }) {
  return (
    <div className={`ambient-bg ambient-${variant}`} aria-hidden>
      <span className="ambient-orb ambient-orb-a" />
      <span className="ambient-orb ambient-orb-b" />
      <span className="ambient-orb ambient-orb-c" />
      <span className="ambient-grid" />
      <span className="ambient-shine" />
    </div>
  );
}
