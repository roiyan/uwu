import Link from "next/link";

// Single unified KPI card. Three-stage funnel: Terdaftar → Membuka →
// Konfirmasi. The "Dikirimi" count moved off this card to the Tamu
// detail card because send count is a process metric, not a guest
// progress signal — and tracking it as a funnel stage made the chart
// look like the link was failing when sends were paused.

type Props = {
  /** Total live guests on the event (= countLiveGuests). */
  total: number;
  /** Guests with openedAt set — unique opens. */
  opened: number;
  /** Guests whose rsvpStatus is in ('hadir','tidak_hadir'). */
  responded: number;
  /** Subset of `total` that haven't opened yet — drives the
   *  "Ingatkan N tamu" CTA. */
  notOpenedCount: number;
  /** Guest cap from the active package. When provided, the first
   *  cell shows `total / quota` rather than a flat 100%. */
  guestQuota?: number | null;
};

export function JourneyKpi({
  total,
  opened,
  responded,
  notOpenedCount,
  guestQuota,
}: Props) {
  const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
  const respondRate = total > 0 ? Math.round((responded / total) * 100) : 0;
  const quotaPct =
    guestQuota && guestQuota > 0
      ? Math.round((total / guestQuota) * 100)
      : null;

  const seg1 = pct(opened, total);
  const seg2 = pct(responded, opened);

  return (
    <section className="d-card p-7 lg:p-8">
      <p className="d-mono text-[12px] uppercase tracking-[0.16em] text-[var(--d-coral)]">
        Perjalanan undangan
      </p>

      {/* Numbers — 3-up. Big serif numerals stay so the operator can
          glance the headline counts. */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        <KpiNumber
          value={total}
          sub={quotaPct !== null ? `${quotaPct}%` : undefined}
          label="Terdaftar"
          accent="var(--d-coral)"
        />
        <KpiNumber
          value={opened}
          sub={total > 0 ? `${openRate}%` : undefined}
          label="Membuka"
          accent="var(--d-lilac)"
        />
        <KpiNumber
          value={responded}
          sub={total > 0 ? `${respondRate}%` : undefined}
          label="Konfirmasi"
          accent="var(--d-green)"
        />
      </div>

      {/* Journey line — 3 dots + 2 segments. */}
      <div className="mt-7 flex items-center gap-0 px-1">
        <Dot active />
        <Line progress={seg1} />
        <Dot active={opened > 0} />
        <Line progress={seg2} />
        <Dot active={responded > 0} />
      </div>

      {/* Benchmark line + CTA — only meaningful once there are guests. */}
      {total > 0 && (
        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border px-4 py-3"
          style={{
            background: "rgba(240,160,156,0.04)",
            borderColor: "rgba(240,160,156,0.12)",
          }}
        >
          <p className="d-serif min-w-0 flex-1 text-[12.5px] italic text-[var(--d-ink-dim)]">
            <span aria-hidden className="mr-2">
              💡
            </span>
            {openRate >= 55
              ? `${openRate}% sudah membuka — di atas rata-rata di Indonesia.`
              : `${openRate}% sudah membuka — rata-rata di Indonesia 55%.`}
          </p>
          {notOpenedCount > 0 && (
            <Link
              href="/dashboard/messages?tab=kirim-baru"
              className="d-mono shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-[var(--d-coral)] underline-offset-4 transition-colors hover:text-[var(--d-peach)] hover:underline"
            >
              Kirim pengingat →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function pct(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.max(0, Math.min(100, (num / denom) * 100));
}

function KpiNumber({
  value,
  label,
  sub,
  subSmall,
  accent,
}: {
  value: number | string;
  label: string;
  sub?: string;
  /** Tertiary line — used by the Terdaftar cell to render
   *  "dari 25" (the package quota denominator). */
  subSmall?: string;
  accent: string;
}) {
  return (
    <div className="text-center">
      <p className="d-serif text-[36px] font-extralight leading-none text-[var(--d-ink)] sm:text-[40px]">
        {value}
      </p>
      {sub && (
        <p className="d-mono mt-1 text-[10px] text-[var(--d-ink-faint)]">
          {sub}
        </p>
      )}
      {subSmall && (
        <p className="d-mono mt-0.5 text-[9px] text-[var(--d-ink-faint)] opacity-70">
          {subSmall}
        </p>
      )}
      <span
        aria-hidden
        className="mx-auto mt-2.5 block h-[2px] w-6 rounded-full"
        style={{ background: accent }}
      />
      {/* WCAG 1.4.3 — bumped from 9px / faded ink-dim to 12px /
          inked opacity-70 for >= 4.5:1 contrast on the surface. */}
      <p className="d-mono mt-2 text-[12px] uppercase tracking-[0.10em] text-[var(--d-ink)] opacity-70">
        {label}
      </p>
    </div>
  );
}

function Dot({ active }: { active?: boolean }) {
  return (
    <span
      aria-hidden
      className="block h-[10px] w-[10px] shrink-0 rounded-full transition-all duration-300"
      style={{
        background: active ? "var(--d-coral)" : "var(--d-line)",
        boxShadow: active ? "0 0 8px rgba(240,160,156,0.4)" : "none",
      }}
    />
  );
}

function Line({ progress }: { progress: number }) {
  return (
    <span
      aria-hidden
      className="relative block h-[2px] flex-1 overflow-hidden rounded-full"
      style={{ background: "var(--d-line)" }}
    >
      <span
        className="absolute left-0 top-0 h-full rounded-full"
        style={{
          width: `${progress}%`,
          background: "var(--d-coral)",
          transition: "width 0.5s ease",
        }}
      />
    </span>
  );
}
