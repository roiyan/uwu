import { EmptyState } from "@/components/shared/EmptyState";

export default function AnalyticsPage() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-navy">Analytics</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pantau aktivitas undangan Anda: pembukaan, RSVP, dan sumber tamu.
        </p>
      </header>
      <EmptyState
        icon="📊"
        title="Belum ada data"
        description="Statistik akan muncul setelah Anda mengirim undangan dan tamu mulai membuka."
        note="Chart & funnel analytics hadir di Sprint 4."
      />
    </main>
  );
}
