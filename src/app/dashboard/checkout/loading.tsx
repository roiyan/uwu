export default function CheckoutLoading() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 space-y-2">
        <div className="h-10 w-48 animate-pulse rounded-md bg-[var(--d-bg-2)]" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-[var(--d-bg-2)]" />
      </div>
      <div className="mx-auto max-w-xl space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--d-bg-card)]/60" />
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--d-bg-card)]/60" />
        <div className="h-12 w-full animate-pulse rounded-full bg-[var(--d-bg-2)]" />
      </div>
    </main>
  );
}
