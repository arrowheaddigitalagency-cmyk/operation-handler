export function MechanicIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* wrench */}
      <path
        d="M14.7 6.3a4 4 0 0 0-5.6 5.5l-5.4 5.4a1.5 1.5 0 1 0 2.1 2.1l5.4-5.4a4 4 0 0 0 5.5-5.6l-2.2 2.2-1.8-.2-.2-1.8 2.2-2.2z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      {/* gear accent */}
      <circle cx="16.8" cy="7.2" r="1.15" fill="currentColor" />
    </svg>
  );
}
