import Link from "next/link";

type Props = {
  /** Total live guests on the event. Bar percentages are relative to this. */
  total: number;
  /** Unique guests with rsvpStatus = 'hadir'. */
  hadir: number;
  /** Unique guests with rsvpStatus = 'tidak_hadir'. */
  tidakHadir: number;
};

/**
 * Ringkasan Konfirmasi — replaced the old 5-row "Perjalanan respons"
 * funnel that duplicated data already shown in the JourneyKpi card.
 * Three bars only — Hadir / Tidak Hadir / Belum Menjawab — answers
 * the actual question the couple asks at this point in the page.
 */
export function ResponseFunnel({ total, hadir, tidakHadir }: Props) {
  const belum = Math.max(0, total - hadir - tidakHadir);
  const pct = (n: number) =>
    total > 0 ? Math.round((n / total) * 100) : 0;

  const rows: { key: string; label: string; value: number; color: string }[] = [
    { key: "hadir", label: "Hadir", value: hadir, color: "var(--d-green)" },
    {
      key: "tidak_hadir",
      label: "Tidak Hadir",
      value: tidakHadir,
      color: "var(--d-line-strong)",
    },
    {
      key: "belum",
      label: "Belum Menjawab",
      value: belum,
      color: "var(--d-coral)",
    },
  ];

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <header>
        <p className="d-eyebrow">Konfirmasi</p>
        <h2 className="d-serif mt-2 text-[26px] font-extralight leading-tight text-[var(--d-ink)]">
          Siapa yang sudah{" "}
          <em className="d-serif italic text-[var(--d-coral)]">menjawab</em>?
        </h2>
      </header>

      <ul className="mt-6 space-y-4">
        {rows.map((row) => {
          const percent = pct(row.value);
          return (
            <li key={row.key}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-[var(--d-ink-dim)]">
                  <span
                    aria-hidden
                    className="h-[7px] w-[7px] rounded-full"
                    style={{ background: row.color }}
                  />
                  {row.label}
                </span>
                <span className="d-serif text-[15px] font-light text-[var(--d-ink)]">
                  {row.value} <span className="text-[12px] text-[var(--d-ink-faint)]">orang</span>
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--d-bg-2)]">
                <div
                  className="d-bar-fill h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    background: row.color,
                    transformOrigin: "left center",
                    transform: `scaleX(${percent / 100})`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {belum > 0 && (
        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-[12px] border px-4 py-3"
          style={{
            background: "rgba(240,160,156,0.04)",
            borderColor: "rgba(240,160,156,0.12)",
          }}
        >
          {/* basis-full keeps the message on its own row when the column
              is narrow, so the link wraps below cleanly instead of the
              text reflowing one word per line. The shortened copy
              ("8 belum menjawab — kirim pengingat.") fits the typical
              ResponseFunnel cell at 320 px without help, but the
              wrapping safety net is still here for very narrow rails. */}
          <p className="d-serif min-w-0 basis-full text-[12.5px] italic text-[var(--d-ink-dim)] sm:basis-auto sm:flex-1">
            <span aria-hidden className="mr-2">💡</span>
            {belum} belum menjawab — kirim pengingat.
          </p>
          <Link
            href="/dashboard/messages?tab=kirim-baru"
            aria-label="Kirim pengingat ke tamu yang belum menjawab dari ringkasan konfirmasi"
            className="d-mono shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-[var(--d-coral)] hover:text-[var(--d-peach)]"
          >
            Kirim pengingat →
          </Link>
        </div>
      )}
    </section>
  );
}
