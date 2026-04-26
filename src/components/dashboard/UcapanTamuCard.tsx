import Link from "next/link";

type Wish = {
  id: string;
  name: string;
  message: string | null;
  groupName: string | null;
  groupColor: string | null;
  rsvpedAt: Date | null;
};

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function formatShortDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`;
}

export function UcapanTamuCard({
  wishes,
  totalWishes,
  totalGuests,
}: {
  wishes: Wish[];
  totalWishes: number;
  totalGuests: number;
}) {
  if (wishes.length === 0) {
    return (
      <section className="mt-8 rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 lg:p-8">
        <p className="d-mono text-[10px] uppercase tracking-[0.26em] text-[var(--d-coral)]">
          Ucapan Tamu
        </p>
        <h2 className="d-serif mt-3 text-[20px] font-light text-[var(--d-ink)]">
          Belum ada{" "}
          <em className="d-serif italic text-[var(--d-coral)]">ucapan</em>.
        </h2>
        <p className="d-serif mt-2 text-[12.5px] italic text-[var(--d-ink-faint)]">
          Ucapan dari tamu akan muncul di sini saat mereka mengisi RSVP.
        </p>
      </section>
    );
  }

  const [featured, ...rest] = wishes;
  const smallWishes = rest.slice(0, 2);

  return (
    <section className="mt-8 rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 lg:p-8">
      <p className="d-mono text-[10px] uppercase tracking-[0.26em] text-[var(--d-coral)]">
        Ucapan Tamu
      </p>
      <h2 className="d-serif mt-3 text-[22px] font-light leading-[1.3] text-[var(--d-ink)] lg:text-[24px]">
        Kata-kata{" "}
        <em className="d-serif italic text-[var(--d-coral)]">terindah</em> dari
        mereka yang mendoakan.
      </h2>

      <article
        className="mt-5 rounded-[14px] border border-[var(--d-line)] px-5 py-5 lg:px-6 lg:py-6"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <p className="d-serif text-[15px] italic leading-[1.6] text-[var(--d-ink)] lg:text-[16px]">
          <span
            aria-hidden
            className="d-serif mr-1 align-text-top text-[20px] leading-none text-[var(--d-coral)] opacity-40"
          >
            “
          </span>
          {featured.message}
        </p>
        <FooterLine
          name={featured.name}
          groupName={featured.groupName}
          groupColor={featured.groupColor}
          rsvpedAt={featured.rsvpedAt}
        />
      </article>

      {smallWishes.length > 0 && (
        <div
          className={`custom-scroll mt-3.5 grid gap-3.5 ${smallWishes.length === 1 ? "" : "md:grid-cols-2"}`}
        >
          {smallWishes.map((w) => (
            <article
              key={w.id}
              className="rounded-[12px] border border-[var(--d-line)] px-[18px] py-4"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p
                className="d-serif text-[13px] italic leading-[1.5] text-[var(--d-ink-dim)]"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                <span
                  aria-hidden
                  className="d-serif mr-0.5 align-text-top text-[16px] leading-none text-[var(--d-coral)] opacity-40"
                >
                  “
                </span>
                {w.message}
              </p>
              <FooterLine
                name={w.name}
                groupName={w.groupName}
                groupColor={w.groupColor}
                rsvpedAt={null}
                compact
              />
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-[var(--d-line)] pt-3.5">
        <span className="d-mono text-[10px] uppercase tracking-[0.16em] text-[var(--d-ink-faint)]">
          {totalWishes} ucapan dari{" "}
          <em className="not-italic text-[var(--d-coral)]">{totalGuests}</em>{" "}
          tamu
        </span>
        <Link
          href="/dashboard/guests?tab=ucapan"
          className="d-mono text-[10px] uppercase tracking-[0.16em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-ink)]"
        >
          Lihat semua →
        </Link>
      </div>
    </section>
  );
}

function FooterLine({
  name,
  groupName,
  groupColor,
  rsvpedAt,
  compact = false,
}: {
  name: string;
  groupName: string | null;
  groupColor: string | null;
  rsvpedAt: Date | null;
  compact?: boolean;
}) {
  const dateStr = formatShortDate(rsvpedAt);
  return (
    <div className={`mt-${compact ? 2.5 : 3.5} flex flex-wrap items-center gap-2`}>
      <span
        className={`text-[var(--d-ink-dim)] ${compact ? "text-[12px]" : "text-[13px]"}`}
      >
        — {name}
      </span>
      {groupName && (
        <>
          <span
            aria-hidden
            className="shrink-0 rounded-full"
            style={{
              width: compact ? 4 : 5,
              height: compact ? 4 : 5,
              background: groupColor ?? "var(--d-ink-faint)",
            }}
          />
          <span
            className={`d-mono uppercase tracking-[0.18em] text-[var(--d-ink-faint)] ${compact ? "text-[8.5px]" : "text-[9px]"}`}
          >
            {groupName}
            {dateStr ? ` · ${dateStr}` : ""}
          </span>
        </>
      )}
    </div>
  );
}

export function UcapanTamuSkeleton() {
  return (
    <section className="mt-8 rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 lg:p-8">
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-5 h-32 animate-pulse rounded-[14px] bg-[var(--d-bg-2)]" />
      <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
        <div className="h-24 animate-pulse rounded-[12px] bg-[var(--d-bg-2)]" />
        <div className="h-24 animate-pulse rounded-[12px] bg-[var(--d-bg-2)]" />
      </div>
    </section>
  );
}
