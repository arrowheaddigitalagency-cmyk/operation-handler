export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="h-3 w-28 animate-pulse rounded-sm bg-white/10" />
      <div className="mt-4 h-10 w-2/3 animate-pulse rounded-sm bg-white/10" />
      <div className="mt-8 space-y-3">
        <div className="h-24 animate-pulse rounded-sm bg-white/5" />
        <div className="h-24 animate-pulse rounded-sm bg-white/5" />
        <div className="h-24 animate-pulse rounded-sm bg-white/5" />
      </div>
    </div>
  );
}
