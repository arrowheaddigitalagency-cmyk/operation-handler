"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { IMAGES, SITE } from "@/content/site";

type Shop = {
  shopName: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
};

export default function ContactPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [sent, setSent] = useState<{ trackingId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Shop>("/settings/shop").then(setShop).catch(() => setShop(null));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api<{ trackingId: string }>("/appointments/book", {
        method: "POST",
        json: {
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          contactName: String(fd.get("name")),
          contactEmail: String(fd.get("email")),
          contactPhone: String(fd.get("phone")),
          notes: `Website contact form: ${String(fd.get("message"))}`,
        },
      });
      setSent({ trackingId: res.trackingId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  return (
    <div className="site-light">
      <section className="section-pad section-ambient">
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="eyebrow">Contact</p>
            <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">
              Request a quote or visit
            </h1>
            <p className="mt-5 text-[var(--muted)] leading-relaxed md:text-lg">
              Reach the {SITE.name} team—we create a CRM lead so no inquiry is lost. Prefer a scheduled bay
              visit?{" "}
              <Link href="/book" className="font-semibold text-[var(--copper)] underline-offset-2 hover:underline">
                Book an appointment
              </Link>
              .
            </p>

            <div className="media-frame relative mt-8 min-h-[220px] md:min-h-[280px]">
              <div
                className="media-bg absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${IMAGES.bay}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/75 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-sm text-white">
                  <p className="font-medium">{SITE.address}</p>
                  {shop?.supportEmail && <p className="mt-1 text-white/75">{shop.supportEmail}</p>}
                  {shop?.supportPhone && <p className="text-white/75">{shop.supportPhone}</p>}
                </div>
              </div>
            </div>
          </div>

          <div>
            {sent ? (
              <div className="surface space-y-3 rounded-xl p-8 text-[var(--ink)]">
                <p>Thanks—we received your message and will follow up shortly.</p>
                <p>
                  Tracking ID:{" "}
                  <span className="font-mono font-semibold text-[var(--copper)]">{sent.trackingId}</span>
                </p>
                <Link href={`/track?id=${encodeURIComponent(sent.trackingId)}`} className="inline-block text-sm font-semibold text-[var(--copper)] underline-offset-2 hover:underline">
                  Track status
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="surface space-y-3 rounded-xl p-6 md:p-8">
                <input name="name" required placeholder="Full name" className="field" />
                <input name="email" type="email" required placeholder="Email" className="field" />
                <input name="phone" required minLength={7} placeholder="Phone" className="field" />
                <textarea name="message" required rows={4} placeholder="How can we help?" className="field" />
                <button className="btn-primary w-full sm:w-auto">Send message</button>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
