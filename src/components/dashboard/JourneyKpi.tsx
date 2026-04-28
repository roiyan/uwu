import Link from "next/link";

// Single unified KPI card. Replaces the four-tile StatHero —
// glanceable numbers preserved, but now connected by a journey
// line (rsvp funnel as a horizontal progression) plus a contextual
// benchmark + reminder CTA. The numbers stay big because that's
// what the operator scans first.

type Props = {
  totalGuests: number;
  opened: number;
  confirmed: number;
  daysLeft: number | null;
  notOpenedCount: number;
};

export function JourneyKpi({
  totalGuests,
  opened,
  confirmed,
  daysLeft,
  notOpenedCount,
}: Props) {
  const openRate =
    totalGuests > 0 ? Math.round((opened / totalGuests) * 100) : 0;

  // Segment progress for the journey line. Step 1: invited→opened.
  // Step 2: opened→confirmed. Step 3: confirmed→hari H (counts down
  // visually as daysLeft shrinks).
  const seg1 = totalGuests > 0 ? (opened / totalGuests) * 100 : 0;
  const seg2 = opened > 0 ? (confirmed / opened) * 100 : 0;
  const seg3 =
    daysLeft === null
      ? 0
      : daysLeft <= 0
        ? 100
        : daysLeft <= 2
          ? 80
          : daysLeft <= 7
            ? 60
            : daysLeft <= 30
              ? 30
              : 10;

  return (
    <section className="d-card p-7 lg:p-8">
      <p className="d-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Perjalanan undangan
      </p>

      {/* Numbers — 2×2 on mobile, 4-up on tablet+. Big serif numerals
          stay so the operator can glance the headline counts. */}
      <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-4">
        <KpiNumber
          value={totalGuests}
          label="Terdaftar"
          accent="var(--d-coral)"
        />
        <KpiNumber
          value={opened}
          sub={totalGuests > 0 ? `${openRate}%` : undefined}
          label="Membuka"
          accent="var(--d-lilac)"
        />
        <KpiNumber
          value={confirmed}
          label="Hadir"
          accent="var(--d-green)"
        />
        <KpiNumber
          value={daysLeft ?? "—"}
          label={daysLeft === null ? "Tanggal TBD" : "Hari Lagi"}
          accent="var(--d-gold)"
        />
      </div>

      {/* Journey line — dot ─ line ─ dot ─ line ─ dot ─ line ─ dot.
          Each line fills as that step's progress increases. Active
          dots glow coral; inactive dots stay grey. */}
      <div className="mt-7 flex items-center gap-0 px-1">
        <Dot active />
        <Line progress={seg1} />
        <Dot active={opened > 0} />
        <Line progress={seg2} />
        <Dot active={confirmed > 0} />
        <Line progress={seg3} />
        <Dot active={daysLeft !== null && daysLeft <= 0} />
      </div>

      {/* Benchmark line + CTA — only meaningful once there are guests. */}
      {totalGuests > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border px-4 py-3"
          style={{
            background: "rgba(240,160,156,0.04)",
            borderColor: "rgba(240,160,156,0.12)",
          }}
        >
          <p className="d-serif min-w-0 flex-1 text-[12.5px] italic text-[var(--d-ink-dim)]">
            <span aria-hidden className="mr-2">💡</span>
            {openRate >= 55
              ? `${openRate}% sudah membuka — di atas rata-rata undangan digital.`
              : `${openRate}% sudah membuka — rata-rata undangan digital ${55}%.`}
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
  const w = Math.max(0, Math.min(100, progress));
  return (
    <span
      aria-hidden
      className="relative block h-[2px] flex-1 overflow-hidden rounded-full"
      style={{ background: "var(--d-line)" }}
    >
      <span
        className="absolute left-0 top-0 h-full rounded-full"
        style={{
          width: `${w}%`,
          background: "var(--d-coral)",
          transition: "width 0.5s ease",
        }}
      />
    </span>
  );
}
