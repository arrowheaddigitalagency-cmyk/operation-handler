"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Shop = {
  shopName: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
};

export default function ContactPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Shop>("/settings/shop").then(setShop).catch(() => setShop(null));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      // Prefer authenticated support tickets when logged in; otherwise book-style lead via appointment notes
      await api("/appointments/book", {
        method: "POST",
        json: {
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          contactName: String(fd.get("name")),
          contactEmail: String(fd.get("email")),
          contactPhone: String(fd.get("phone")),
          notes: `Website contact form: ${String(fd.get("message"))}`,
        },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound</p>
      <h1 className="font-display mt-2 text-4xl font-extrabold">Contact</h1>
      <p className="mt-3 text-[var(--steel)]">
        Reach the shop team — we create a CRM lead so no inquiry is lost.
      </p>
      {shop && (
        <div className="mt-6 text-sm text-[var(--steel)]">
          {shop.supportEmail && <p>Email: {shop.supportEmail}</p>}
          {shop.supportPhone && <p>Phone: {shop.supportPhone}</p>}
        </div>
      )}
      {sent ? (
        <p className="panel mt-8 rounded-sm p-6">Thanks — we received your message and will follow up shortly.</p>
      ) : (
        <form onSubmit={onSubmit} className="panel mt-8 space-y-3 rounded-sm p-6">
          <input name="name" required placeholder="Full name" className="field" />
          <input name="email" type="email" required placeholder="Email" className="field" />
          <input name="phone" required placeholder="Phone" className="field" />
          <textarea name="message" required rows={4} placeholder="How can we help?" className="field" />
          <button className="btn-primary">Send message</button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
