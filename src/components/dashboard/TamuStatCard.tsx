import Link from "next/link";

export function TamuStatCard({
  count,
  limit,
  packageName,
}: {
  count: number;
  limit: number;
  packageName: string;
}) {
  // Treat very high limits as "unlimited" — Couture-tier packages can
  // have a numeric limit far above realistic guest counts.
  const isUnlimited = limit >= 9999;

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6">
      <p className="d-mono text-[10px] uppercase tracking-[0.24em] text-[var(--d-ink-faint)]">
        Tamu
      </p>
      <p className="mt-3 leading-none">
        <span className="d-serif text-[42px] font-extralight text-[var(--d-ink)]">
          {count}
        </span>
        {!isUnlimited && (
          <span className="d-serif ml-1.5 text-[18px] text-[var(--d-ink-dim)]">
            /{limit}
          </span>
        )}
        {isUnlimited && (
          <span className="d-serif ml-1.5 text-[18px] italic text-[var(--d-ink-dim)]">
            tanpa batas
          </span>
        )}
      </p>
      <p className="mt-3 text-[12px] text-[var(--d-ink-dim)]">
        Total tamu terdaftar dari paket{" "}
        <span className="text-[var(--d-ink)]">{packageName}</span>.
      </p>
      <Link
        href="/dashboard/guests"
        className="d-mono mt-4 inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.22em] text-[var(--d-coral)] transition-all hover:gap-2.5 hover:text-[var(--d-peach)]"
      >
        Kelola Tamu <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
