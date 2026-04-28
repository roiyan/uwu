import Link from "next/link";

export function TamuStatCard({
  count,
  limit,
  packageName,
  attendingPax,
  attendingGuests,
}: {
  count: number;
  limit: number;
  packageName: string;
  /** Sum of `rsvp_attendees` across guests with status `hadir`.
   *  Surfaced here (and not in the journey card) because it's a
   *  detail breakdown — useful for catering headcount, not a funnel
   *  step. Optional: when undefined, the line is hidden. */
  attendingPax?: number;
  /** Unique guest count whose status is `hadir` — paired with
   *  `attendingPax` so the line reads "9 orang dari 6 tamu yang
   *  konfirmasi hadir". */
  attendingGuests?: number;
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

      {attendingPax !== undefined &&
        attendingGuests !== undefined &&
        attendingGuests > 0 && (
          <div className="mt-4 border-t border-[var(--d-line)] pt-3">
            <p className="d-serif text-[13px] text-[var(--d-ink-dim)]">
              Total kehadiran:{" "}
              <strong className="font-medium text-[var(--d-ink)]">
                {attendingPax} orang
              </strong>
            </p>
            <p className="d-serif mt-0.5 text-[11px] italic text-[var(--d-ink-faint)]">
              dari {attendingGuests} tamu yang konfirmasi hadir
            </p>
          </div>
        )}

      <Link
        href="/dashboard/guests"
        className="d-mono mt-4 inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.22em] text-[var(--d-coral)] transition-all hover:gap-2.5 hover:text-[var(--d-peach)]"
      >
        Kelola Tamu <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
