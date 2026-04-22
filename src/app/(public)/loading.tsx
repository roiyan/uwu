export default function PublicLoading() {
  return (
    <main className="px-6 pb-20 pt-14">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="mx-auto h-12 w-96 max-w-full animate-pulse rounded-md bg-[color:var(--color-dark-surface)]" />
        <div className="mx-auto h-6 w-80 max-w-full animate-pulse rounded-md bg-[color:var(--color-dark-surface)]" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-60 animate-pulse rounded-2xl bg-[color:var(--color-dark-surface)]"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
