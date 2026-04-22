export default function DashboardLoading() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 h-10 w-64 animate-pulse rounded-md bg-surface-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="h-48 animate-pulse rounded-2xl bg-surface-card/60" />
          <div className="h-40 animate-pulse rounded-2xl bg-surface-card/60" />
        </div>
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-2xl bg-surface-card/60" />
          <div className="h-32 animate-pulse rounded-2xl bg-surface-card/60" />
        </div>
      </div>
    </main>
  );
}
