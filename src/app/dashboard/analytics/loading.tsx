export default function AnalyticsLoading() {
  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <div className="space-y-3">
        <div className="h-3 w-32 animate-pulse rounded bg-[var(--d-bg-2)]" />
        <div className="h-12 w-72 animate-pulse rounded bg-[var(--d-bg-2)]" />
        <div className="h-3 w-80 animate-pulse rounded bg-[var(--d-bg-2)]" />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="d-card h-[112px] animate-pulse"
            style={{ background: "var(--d-bg-2)" }}
          />
        ))}
      </div>
      <div
        className="mt-8 d-card h-[300px] animate-pulse"
        style={{ background: "var(--d-bg-2)" }}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="d-card h-[260px] animate-pulse"
            style={{ background: "var(--d-bg-2)" }}
          />
        ))}
      </div>
    </main>
  );
}
