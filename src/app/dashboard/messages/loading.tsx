export default function MessagesLoading() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 space-y-2">
        <div className="h-10 w-56 animate-pulse rounded-md bg-[var(--d-bg-2)]" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-[var(--d-bg-2)]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-[560px] animate-pulse rounded-2xl bg-[var(--d-bg-card)]/60 lg:col-span-3" />
        <div className="h-[560px] animate-pulse rounded-2xl bg-[var(--d-bg-card)]/60 lg:col-span-2" />
      </div>
    </main>
  );
}
