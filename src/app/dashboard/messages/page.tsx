import { EmptyState } from "@/components/shared/EmptyState";

export default function MessagesPage() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-navy">Kirim Undangan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Kirim undangan digital via WhatsApp, Email, atau QR cetak.
        </p>
      </header>
      <EmptyState
        icon="📨"
        title="Belum ada pengiriman"
        description="Tambah tamu terlebih dahulu, lalu kirim undangan massal via WhatsApp atau email."
        actionLabel="Kelola Tamu"
        actionHref="/dashboard/guests"
        note="Broadcast WhatsApp aktif mulai Sprint 3."
      />
    </main>
  );
}
