"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        json: { email: String(fd.get("email")) },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound</p>
      <h1 className="font-display mt-2 text-3xl font-extrabold">Reset password</h1>
      {done ? (
        <p className="panel mt-6 rounded-sm p-5 text-sm">
          If an account exists for that email, a reset link has been queued.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="panel mt-6 space-y-3 rounded-sm p-6">
          <input name="email" type="email" required placeholder="Email" className="field" />
          <button className="btn-primary w-full">Send reset link</button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}
      <Link href="/login" className="mt-4 inline-block text-sm text-[var(--copper-hot)]">
        Back to sign in
      </Link>
    </div>
  );
}
