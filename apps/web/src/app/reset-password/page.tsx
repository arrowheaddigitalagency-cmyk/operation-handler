"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        json: { token, password: String(fd.get("password")) },
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  }

  if (!token) {
    return <p className="text-sm text-red-400">Missing reset token.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="panel mt-6 space-y-3 rounded-sm p-6">
      <input name="password" type="password" required minLength={8} placeholder="New password" className="field" />
      <button className="btn-primary w-full">Update password</button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound</p>
      <h1 className="font-display mt-2 text-3xl font-extrabold">Choose a new password</h1>
      <Suspense fallback={<p className="mt-6 text-[var(--steel)]">Loading…</p>}>
        <ResetForm />
      </Suspense>
      <Link href="/login" className="mt-4 inline-block text-sm text-[var(--copper-hot)]">
        Back to sign in
      </Link>
    </div>
  );
}
