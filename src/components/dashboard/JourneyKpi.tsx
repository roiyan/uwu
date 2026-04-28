import Link from "next/link";

// Single unified KPI card. Replaces the four-tile StatHero —
// glanceable numbers preserved, but now connected by a journey
// line rendering the actual RSVP funnel (Terdaftar → Dikirimi →
// Membuka → Konfirmasi). Numbers are always unique-guest counts so
// the funnel reads monotonically descending; the pax-sum lives on
// the Tamu card now.

type Props = {
  /** Total live guests on the event (= countLiveGuests). */
  total: number;
  /** Guests with at least one broadcast send (sendCount > 0). */
  invited: number;
  /** Guests with openedAt set — unique opens. */
  opened: number;
  /** Guests whose rsvpStatus is in ('hadir','tidak_hadir'). */
  responded: number;
  /** Subset of `total` that haven't opened yet — drives the
   *  "Ingatkan N tamu" CTA. */
  notOpenedCount: number;
};

export function JourneyKpi({
  total,
  invited,
  opened,
  responded,
  notOpenedCount,
}: Props) {
  const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;

  // Each segment fills relative to the previous step. Cap at 100%
  // for the case where the link spreads organically (opened >
  // invited): we still display the raw numbers, but the line never
  // overflows visually.
  const seg1 = pct(invited, total);
  const seg2 = pct(opened, invited);
  const seg3 = pct(responded, opened);

  return (
    <section className="d-card p-7 lg:p-8">
      <p className="d-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Perjalanan undangan
      </p>

      {/* Numbers — 2×2 on mobile, 4-up on tablet+. Big serif numerals
          stay so the operator can glance the headline counts. */}
      <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-4">
        <KpiNumber value={total} label="Terdaftar" accent="var(--d-coral)" />
        <KpiNumber value={invited} label="Dikirimi" accent="var(--d-blue)" />
        <KpiNumber
          value={opened}
          sub={total > 0 ? `${openRate}%` : undefined}
          label="Membuka"
          accent="var(--d-lilac)"
        />
        <KpiNumber
          value={responded}
          label="Konfirmasi"
          accent="var(--d-green)"
        />
      </div>

      {/* Journey line — dot ─ line ─ dot ─ line ─ dot ─ line ─ dot.
          Line widths reflect each step's ratio against the previous
          one; capped to keep the bar inside the card when organic
          shares push opens above invites. */}
      <div className="mt-7 flex items-center gap-0 px-1">
        <Dot active />
        <Line progress={seg1} />
        <Dot active={invited > 0} />
        <Line progress={seg2} />
        <Dot active={opened > 0} />
        <Line progress={seg3} />
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
              ? `${openRate}% sudah membuka — di atas rata-rata undangan digital.`
              : `${openRate}% sudah membuka — rata-rata undangan digital 55%.`}
          </p>
          {notOpenedCount > 0 && (
            <Link
              href="/dashboard/messages?tab=kirim-baru"
              className="d-mono shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-peach)]"
            >
              Ingatkan {notOpenedCount} tamu →
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
  accent,
}: {
  value: number | string;
  label: string;
  sub?: string;
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
      <span
        aria-hidden
        className="mx-auto mt-2.5 block h-[2px] w-6 rounded-full"
        style={{ background: accent }}
      />
      <p className="d-mono mt-2 text-[9px] uppercase tracking-[0.16em] text-[var(--d-ink-dim)]">
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
