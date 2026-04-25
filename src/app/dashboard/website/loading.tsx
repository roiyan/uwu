export default function WebsiteEditorLoading() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 space-y-2">
        <div className="h-10 w-56 animate-pulse rounded-md bg-[var(--d-bg-2)]" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-[var(--d-bg-2)]" />
      </div>
      <div className="space-y-6">
        <div className="h-80 animate-pulse rounded-2xl bg-[var(--d-bg-card)]/60" />
        <div className="h-80 animate-pulse rounded-2xl bg-[var(--d-bg-card)]/60" />
      </div>
    </main>
  );
}
