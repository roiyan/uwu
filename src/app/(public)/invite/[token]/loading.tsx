export default function InviteLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="w-full max-w-md animate-pulse space-y-4 rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-8">
        <div className="mx-auto h-16 w-16 rounded-full bg-white/5" />
        <div className="mx-auto h-8 w-3/4 rounded bg-white/5" />
        <div className="mx-auto h-4 w-2/3 rounded bg-white/5" />
        <div className="mt-6 h-10 w-full rounded-xl bg-white/5" />
      </div>
    </main>
  );
}
