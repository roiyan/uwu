import { EmptyState } from "@/components/shared/EmptyState";

export default function GuestsPage() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-navy">Tamu</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Kelola daftar tamu undangan Anda.
        </p>
      </header>
      <EmptyState
        icon="👥"
        title="Belum ada tamu"
        description="Tambah tamu satu per satu atau import dari file .xlsx. Fitur tabel tamu dan import dijadwalkan pada Sprint 2."
        note="Tersedia segera di Sprint 2."
      />
    </main>
  );
}
