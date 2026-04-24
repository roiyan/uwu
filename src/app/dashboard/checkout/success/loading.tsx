export default function CheckoutSuccessLoading() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-xl space-y-4 py-8 text-center">
        <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-surface-muted" />
        <div className="mx-auto h-8 w-64 animate-pulse rounded-md bg-surface-muted" />
        <div className="mx-auto h-4 w-80 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-surface-card/60" />
      </div>
    </main>
  );
}
