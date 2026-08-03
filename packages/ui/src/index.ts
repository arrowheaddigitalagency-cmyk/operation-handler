import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }
>) {
  const styles =
    variant === "primary"
      ? "bg-[#1a3a4a] text-[#f3efe6] hover:bg-[#244b5e]"
      : variant === "secondary"
        ? "bg-[#c45c26] text-white hover:bg-[#a64c1f]"
        : "bg-transparent text-[#1a3a4a] hover:bg-black/5";
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-[#1a3a4a]/20 bg-white px-3 py-2 text-sm text-[#1a3a4a] outline-none focus:border-[#c45c26] ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-xl border border-[#1a3a4a]/10 bg-white/90 p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <span className={`inline-flex rounded-full bg-[#1a3a4a]/10 px-2.5 py-0.5 text-xs font-medium text-[#1a3a4a] ${className}`}>
      {children}
    </span>
  );
}
