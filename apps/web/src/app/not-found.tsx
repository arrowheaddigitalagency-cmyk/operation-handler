import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-lg flex-col justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--copper-hot)]">404</p>
      <h1 className="font-display mt-3 text-4xl font-extrabold">Page not found</h1>
      <p className="mt-3 text-sm text-[var(--steel)]">
        The page you requested does not exist or was moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Home
        </Link>
        <Link href="/track" className="btn-ghost">
          Track repair
        </Link>
      </div>
    </div>
  );
}
