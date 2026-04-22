export default function DashboardBerandaPage() {
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-navy">Beranda</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Selamat datang kembali. Mari lanjutkan menyiapkan undangan Anda.
        </p>
      </header>

      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <h2 className="font-display text-xl text-ink">Langkah selanjutnya</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Acara, tema, dan daftar tamu belum dibuat. Mulai dengan mengisi detail mempelai.
        </p>
      </section>
    </main>
  );
}
