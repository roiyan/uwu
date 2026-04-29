import Link from "next/link";

export function TamuStatCard({
  count,
  limit,
  attendingPax,
  attendingGuests,
  invitedCount,
}: {
  count: number;
  limit: number;
  packageName?: string;
  /** Sum of `rsvp_attendees` across guests with status `hadir`. */
  attendingPax?: number;
  /** Unique guest count whose status is `hadir`. */
  attendingGuests?: number;
  /** Guests with at least one broadcast send. */
  invitedCount?: number;
}) {
  const isUnlimited = limit >= 9999;
  const pendamping =
    typeof attendingPax === "number" && typeof attendingGuests === "number"
      ? Math.max(0, attendingPax - attendingGuests)
      : 0;

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6">
      <p className="d-mono text-[12px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)] opacity-70">
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
      <p className="mt-2 text-[12px] text-[var(--d-ink-dim)]">Tamu terdaftar</p>

      {typeof invitedCount === "number" && count > 0 && (
        <>
          <p className="d-serif mt-3 text-[12px] italic text-[var(--d-ink-faint)]">
            {invitedCount} dari {count} sudah dikirimi undangan
          </p>
          {count - invitedCount > 0 && (
            <Link
              href="/dashboard/messages?tab=kirim-baru"
              aria-label={`Kirim undangan ke ${count - invitedCount} tamu yang belum menerima`}
              className="d-mono mt-1 inline-block text-[12px] uppercase tracking-[0.12em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-peach)]"
            >
              Kirim ke {count - invitedCount} lainnya →
            </Link>
          )}
        </>
      )}

      {typeof attendingGuests === "number" && attendingGuests > 0 && (
        <div className="mt-4 border-t border-[var(--d-line)] pt-3">
          <p className="d-serif text-[15px] text-[var(--d-ink)]">
            <strong className="font-medium">{attendingGuests}</strong> konfirmasi hadir
          </p>
          {pendamping > 0 && (
            <p
              className="d-serif mt-0.5 text-[11.5px] italic"
              style={{ color: "var(--d-ink-faint)", opacity: 0.85 }}
            >
              Bersama {pendamping} pendamping — total {attendingPax} orang
            </p>
          )}
        </div>
      )}

      <Link
        href="/dashboard/guests"
        className="d-mono mt-4 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.16em] text-[var(--d-coral)] transition-all hover:gap-2.5 hover:text-[var(--d-peach)]"
      >
        Kelola Tamu <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
