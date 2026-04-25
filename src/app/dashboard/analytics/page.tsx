import { redirect } from "next/navigation";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import {
  countGuestsByStatus,
  countLiveGuests,
  sumAttendees,
} from "@/lib/db/queries/guests";
import { EmptyState } from "@/components/shared/EmptyState";

// Editorial dark reskin. All data still comes from the same three
// queries the page used before — no new fetches, no new charts that
// would require new server data.
export default async function AnalyticsPage() {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");

  const [total, stats, confirmedAttendees] = await Promise.all([
    countLiveGuests(current.event.id),
    countGuestsByStatus(current.event.id),
    sumAttendees(current.event.id),
  ]);

  if (total === 0) {
    return (
      <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
        <Header />
        <div className="mt-12">
          <EmptyState
            icon="📊"
            title="Belum ada data"
            description="Tambah tamu dan kirim undangan — statistik akan muncul otomatis di sini."
            actionLabel="Tambah Tamu"
            actionHref="/dashboard/guests"
          />
        </div>
      </main>
    );
  }

  const opened = stats.dibuka + stats.hadir + stats.tidak_hadir;
  const responded = stats.hadir + stats.tidak_hadir;
  const pct = (v: number) => Math.round((v / Math.max(total, 1)) * 100);

  const funnel = [
    {
      label: "Total Tamu",
      value: total,
      pct: 100,
      color: "var(--d-blue)",
    },
    {
      label: "Dibuka",
      value: opened,
      pct: pct(opened),
      color: "var(--d-lilac)",
    },
    {
      label: "Merespons",
      value: responded,
      pct: pct(responded),
      color: "var(--d-gold)",
    },
    {
      label: "Hadir",
      value: stats.hadir,
      pct: pct(stats.hadir),
      color: "var(--d-green)",
    },
  ];

  const statusBreakdown: { label: string; value: number; color: string }[] = [
    { label: "Baru", value: stats.baru, color: "var(--d-ink-faint)" },
    { label: "Diundang", value: stats.diundang, color: "var(--d-blue)" },
    { label: "Dibuka", value: stats.dibuka, color: "var(--d-lilac)" },
    { label: "Hadir", value: stats.hadir, color: "var(--d-green)" },
    {
      label: "Tidak Hadir",
      value: stats.tidak_hadir,
      color: "var(--d-coral)",
    },
  ];

  // Lightweight RSVP horizontal-bar slice — same data as funnel but
  // framed against responded total so percentages compare like-for-like.
  const responseBreakdown = [
    {
      label: "Hadir",
      value: stats.hadir,
      color: "var(--d-green)",
    },
    {
      label: "Tidak Hadir",
      value: stats.tidak_hadir,
      color: "var(--d-coral)",
    },
    {
      label: "Belum Dijawab",
      value: total - responded,
      color: "var(--d-ink-faint)",
    },
  ];

  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <Header />

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total Tamu"
          value={total}
          accent="var(--d-coral)"
          foot={`${confirmedAttendees} orang dikonfirmasi`}
        />
        <Kpi
          label="Undangan Dibuka"
          value={opened}
          accent="var(--d-blue)"
          foot={`${pct(opened)}% dari total`}
        />
        <Kpi
          label="RSVP Hadir"
          value={stats.hadir}
          accent="var(--d-green)"
          foot={`${pct(stats.hadir)}% dari total`}
        />
        <Kpi
          label="Tidak Hadir"
          value={stats.tidak_hadir}
          accent="var(--d-coral)"
          foot={`${pct(stats.tidak_hadir)}% dari total`}
        />
      </section>

      <section className="mt-8 d-card p-7">
        <p className="d-eyebrow">Funnel respons</p>
        <h2 className="d-serif mt-2 text-[26px] font-extralight leading-tight text-[var(--d-ink)]">
          Perjalanan tamu dari undangan hingga{" "}
          <em className="d-serif italic text-[var(--d-coral)]">
            konfirmasi kehadiran.
          </em>
        </h2>
        <ul className="mt-7 space-y-5">
          {funnel.map((step) => (
            <li key={step.label}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[var(--d-ink)]">{step.label}</span>
                <span className="d-mono text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                  {step.value} · {step.pct}%
                </span>
              </div>
              <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[var(--d-bg-2)]">
                <div
                  className="d-bar-fill h-full rounded-full"
                  style={
                    {
                      width: `${step.pct}%`,
                      background: step.color,
                      boxShadow: `0 0 14px ${step.color}`,
                      "--w": step.pct / 100,
                    } as React.CSSProperties
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="d-card p-7">
          <p className="d-eyebrow">Distribusi respons</p>
          <h2 className="d-serif mt-2 text-[22px] font-extralight text-[var(--d-ink)]">
            Hadir, tidak hadir, atau{" "}
            <em className="d-serif italic text-[var(--d-coral)]">menunggu</em>.
          </h2>
          <ul className="mt-5 space-y-4">
            {responseBreakdown.map((row) => {
              const rowPct = pct(row.value);
              return (
                <li key={row.label}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 text-[var(--d-ink-dim)]">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: row.color }}
                      />
                      {row.label}
                    </span>
                    <span className="d-mono uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                      {row.value} · {rowPct}%
                    </span>
                  </div>
                  <div className="mt-2 h-[4px] w-full overflow-hidden rounded-full bg-[var(--d-bg-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${rowPct}%`,
                        background: row.color,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="d-card p-7">
          <p className="d-eyebrow">Status tamu</p>
          <h2 className="d-serif mt-2 text-[22px] font-extralight text-[var(--d-ink)]">
            Sebaran <em className="d-serif italic text-[var(--d-coral)]">status</em>{" "}
            keseluruhan.
          </h2>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {statusBreakdown.map((s) => (
              <div
                key={s.label}
                className="rounded-md border border-[var(--d-line)] bg-[var(--d-bg-2)] p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: s.color,
                      boxShadow: `0 0 10px ${s.color}`,
                    }}
                  />
                  <span className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                    {s.label}
                  </span>
                </div>
                <p className="d-serif mt-2 text-[28px] font-extralight leading-none text-[var(--d-ink)]">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-px w-10"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
          }}
        />
        <p className="d-eyebrow">Analytics</p>
      </div>
      <h1 className="d-serif mt-3 text-[40px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--d-ink)] md:text-[48px]">
        Angka-angka yang{" "}
        <em className="d-serif italic text-[var(--d-coral)]">bercerita</em>.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
        Ringkasan respons tamu Anda — total terdaftar, undangan yang sudah
        terbuka, hingga konfirmasi kehadiran.
      </p>
    </header>
  );
}

function Kpi({
  label,
  value,
  accent,
  foot,
}: {
  label: string;
  value: number;
  accent: string;
  foot?: string;
}) {
  return (
    <div className="d-card p-5">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-3">
        <p className="d-serif text-[36px] font-extralight leading-none text-[var(--d-ink)]">
          {value}
        </p>
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{
            background: accent,
            boxShadow: `0 0 12px ${accent}`,
          }}
        />
      </div>
      {foot && (
        <p className="mt-3 text-[11px] text-[var(--d-ink-dim)]">{foot}</p>
      )}
    </div>
  );
}
