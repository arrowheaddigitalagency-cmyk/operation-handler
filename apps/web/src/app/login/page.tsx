"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginWithPassword, loginWithTracking } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "tracking">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await loginWithPassword(String(fd.get("email")), String(fd.get("password")));
      router.push(res.user.role === "CUSTOMER" ? "/portal" : "/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onTracking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await loginWithTracking(String(fd.get("trackingId")).toUpperCase(), String(fd.get("phoneLast4")));
      router.push("/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[85svh] max-w-md flex-col justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 surface-grid opacity-20" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--copper-hot)]">
        Cars Compound
      </p>
      <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--steel)]">
        Staff console or customer garage — secure access to repair operations.
      </p>

      <div className="mt-8 flex gap-2 text-sm">
        {(["email", "tracking"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-sm px-3.5 py-2 transition ${
              mode === m
                ? "bg-[var(--copper)] text-white"
                : "border border-[var(--line)] text-[var(--steel)] hover:border-[var(--copper)]/50"
            }`}
          >
            {m === "email" ? "Email" : "Tracking ID"}
          </button>
        ))}
      </div>

      {mode === "email" ? (
        <form onSubmit={onEmail} className="panel mt-6 space-y-3 rounded-sm p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <input name="email" type="email" required placeholder="Email" className="field" autoComplete="username" />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="field"
            autoComplete="current-password"
          />
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={onTracking} className="panel mt-6 space-y-3 rounded-sm p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <input name="trackingId" required placeholder="CC-XXXXXX" className="field uppercase" />
          <input name="phoneLast4" required pattern="\d{4}" placeholder="Last 4 of phone" className="field" />
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Verifying…" : "Access portal"}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-1 text-xs text-[var(--steel)]">
        <p>
          <Link href="/forgot-password" className="text-[var(--copper-hot)]">
            Forgot password
          </Link>
          {" · "}
          <Link href="/register" className="text-[var(--copper-hot)]">
            Create account
          </Link>
        </p>
        {process.env.NODE_ENV !== "production" && (
          <p className="pt-2 text-[10px] opacity-70">
            Local demo accounts are listed in the project README (not shown in production).
          </p>
        )}
      </div>
    </div>
  );
}
