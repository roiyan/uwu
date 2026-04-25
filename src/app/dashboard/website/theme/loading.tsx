export default function ThemeEditorLoading() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 h-10 w-40 animate-pulse rounded-md bg-[var(--d-bg-2)]" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl bg-[var(--d-bg-card)]/60"
          />
        ))}
      </div>
    </main>
  );
}
