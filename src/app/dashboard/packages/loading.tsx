export default function PackagesLoading() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 space-y-2">
        <div className="h-10 w-32 animate-pulse rounded-md bg-[var(--d-bg-2)]" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-[var(--d-bg-2)]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-2xl bg-[var(--d-bg-card)]/60"
          />
        ))}
      </div>
    </main>
  );
}
