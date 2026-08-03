"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ReportPage() {
  const params = useParams<{ reportId: string }>();
  const [htmlUrl, setHtmlUrl] = useState("");

  useEffect(() => {
    setHtmlUrl(`/api/v1/ai/reports/${params.reportId}/html`);
  }, [params.reportId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">Cars Compound</p>
      <h1 className="font-display mt-2 text-3xl font-extrabold">Damage advisory report</h1>
      <p className="mt-2 text-sm text-[var(--steel)]">Report ID: {params.reportId}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {htmlUrl && (
          <a href={htmlUrl} target="_blank" rel="noreferrer" className="btn-primary">
            Open printable PDF report
          </a>
        )}
        <Link href="/book" className="btn-ghost">
          Book inspection
        </Link>
      </div>
      {htmlUrl && (
        <iframe title="Report" src={htmlUrl} className="mt-8 h-[70vh] w-full rounded-sm border border-[var(--line)] bg-white" />
      )}
    </div>
  );
}
