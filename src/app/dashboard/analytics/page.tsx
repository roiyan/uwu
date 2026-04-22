import { redirect } from "next/navigation";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import {
  countGuestsByStatus,
  countLiveGuests,
  sumAttendees,
} from "@/lib/db/queries/guests";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function AnalyticsPage() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");

  const [total, stats, confirmedAttendees] = await Promise.all([
    countLiveGuests(current.event.id),
    countGuestsByStatus(current.event.id),
    sumAttendees(current.event.id),
  ]);

  if (total === 0) {
    return (
      <main className="flex-1 px-6 py-8 lg:px-10">
        <header className="mb-8">
          <h1 className="font-display text-3xl text-navy">Analytics</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Pantau aktivitas undangan Anda.
          </p>
        </header>
        <EmptyState
          icon="📊"
          title="Belum ada data"
          description="Tambah tamu dan kirim undangan — statistik akan muncul otomatis di sini."
          actionLabel="Tambah Tamu"
          actionHref="/dashboard/guests"
        />
      </main>
    );
  }

  const opened = stats.dibuka + stats.hadir + stats.tidak_hadir;
  const responded = stats.hadir + stats.tidak_hadir;

  const pct = (v: number) => Math.round((v / total) * 100);

  const funnel = [
    { label: "Total Tamu", value: total, pct: 100, color: "#5A5A72" },
    { label: "Dibuka", value: opened, pct: pct(opened), color: "#8B9DC3" },
    { label: "Merespons", value: responded, pct: pct(responded), color: "#D4A574" },
    { label: "Hadir", value: stats.hadir, pct: pct(stats.hadir), color: "#3B7A57" },
  ];

  const statusBreakdown: { label: string; value: number; color: string }[] = [
    { label: "Baru", value: stats.baru, color: "#8A8A9A" },
    { label: "Diundang", value: stats.diundang, color: "#1E3A5F" },
    { label: "Dibuka", value: stats.dibuka, color: "#8B9DC3" },
    { label: "Hadir", value: stats.hadir, color: "#3B7A57" },
    { label: "Tidak Hadir", value: stats.tidak_hadir, color: "#C0392B" },
  ];

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-navy">Analytics</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Ringkasan respons tamu Anda.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Total Tamu" value={total} />
        <Kpi label="Dibuka" value={opened} hint={`${pct(opened)}%`} />
        <Kpi label="Hadir" value={stats.hadir} hint={`${pct(stats.hadir)}%`} />
        <Kpi label="Dikonfirmasi Hadir" value={confirmedAttendees} hint="orang" />
      </div>

      <section className="mt-8 rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Funnel Respons</h2>
        <p className="text-sm text-ink-muted">
          Perjalanan tamu dari undangan hingga konfirmasi kehadiran.
        </p>
        <ul className="mt-6 space-y-4">
          {funnel.map((step) => (
            <li key={step.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{step.label}</span>
                <span className="text-ink-muted">
                  {step.value} • {step.pct}%
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${step.pct}%`, background: step.color }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Status Tamu</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {statusBreakdown.map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-muted p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-xs uppercase tracking-wide text-ink-muted">
                  {s.label}
                </span>
              </div>
              <p className="mt-2 font-display text-2xl text-ink">{s.value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface-card p-5 shadow-ghost-sm">
      <p className="text-xs uppercase tracking-wide text-ink-hint">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink">{value}</p>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
