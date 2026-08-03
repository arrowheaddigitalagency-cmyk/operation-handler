"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setStoredToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await api<{ token: string }>("/auth/register", {
        method: "POST",
        json: {
          firstName: String(fd.get("firstName")),
          lastName: String(fd.get("lastName")),
          email: String(fd.get("email")),
          phone: String(fd.get("phone") || "") || undefined,
          password: String(fd.get("password")),
        },
      });
      setStoredToken(result.token);
      router.push("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound</p>
      <h1 className="font-display mt-2 text-3xl font-extrabold">Create account</h1>
      <form onSubmit={onSubmit} className="panel mt-6 space-y-3 rounded-sm p-6">
        <div className="grid grid-cols-2 gap-2">
          <input name="firstName" required placeholder="First name" className="field" />
          <input name="lastName" required placeholder="Last name" className="field" />
        </div>
        <input name="email" type="email" required placeholder="Email" className="field" />
        <input name="phone" placeholder="Phone" className="field" />
        <input name="password" type="password" required minLength={8} placeholder="Password" className="field" />
        <button className="btn-primary w-full">Register</button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
      <p className="mt-4 text-sm text-[var(--steel)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--copper-hot)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
