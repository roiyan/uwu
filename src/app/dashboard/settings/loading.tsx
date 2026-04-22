export default function SettingsLoading() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 space-y-2">
        <div className="h-10 w-48 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-surface-muted" />
      </div>
      <div className="mb-6 h-11 animate-pulse rounded-full bg-surface-card/60" />
      <div className="space-y-4">
        <div className="h-96 animate-pulse rounded-2xl bg-surface-card/60" />
      </div>
    </main>
  );
}
