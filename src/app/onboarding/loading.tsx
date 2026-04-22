export default function OnboardingLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:py-14">
      <div className="flex items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 flex-1 animate-pulse rounded-full bg-surface-muted"
          />
        ))}
      </div>
      <div className="mt-10 space-y-3">
        <div className="h-10 w-2/3 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-5 w-1/2 animate-pulse rounded-md bg-surface-muted" />
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-surface-card/60" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-card/60" />
      </div>
    </div>
  );
}
