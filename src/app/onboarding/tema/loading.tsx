export default function TemaLoading() {
  return (
    <div>
      <div className="h-10 w-full animate-pulse rounded-full bg-white/5" />
      <div className="mt-10 space-y-3">
        <div className="h-10 w-2/3 animate-pulse rounded-md bg-white/5" />
        <div className="h-5 w-1/2 animate-pulse rounded-md bg-white/5" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
