export default function GuestsLoading() {
  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <div className="mb-8 space-y-3">
        <div className="h-3 w-32 animate-pulse rounded bg-[var(--d-bg-2)]" />
        <div className="h-12 w-72 animate-pulse rounded bg-[var(--d-bg-2)]" />
        <div className="h-3 w-56 animate-pulse rounded bg-[var(--d-bg-2)]" />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="d-card h-[112px] animate-pulse"
            style={{ background: "var(--d-bg-2)" }}
          />
        ))}
      </div>
      <div
        className="mb-6 d-card h-[64px] animate-pulse"
        style={{ background: "var(--d-bg-2)" }}
      />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="d-card h-14 animate-pulse"
            style={{ background: "var(--d-bg-2)" }}
          />
        ))}
      </div>
    </main>
  );
}
