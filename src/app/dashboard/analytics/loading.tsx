export default function AnalyticsLoading() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 space-y-2">
        <div className="h-10 w-48 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-surface-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-surface-card/60"
          />
        ))}
      </div>
      <div className="mt-8 h-80 animate-pulse rounded-2xl bg-surface-card/60" />
    </main>
  );
}
