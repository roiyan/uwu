import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-3 text-xs uppercase tracking-[0.3em] text-ink-muted">
        A Love Story, Beautifully Told.
      </p>
      <h1 className="font-logo text-6xl text-navy">
        <span className="bg-gradient-to-r from-brand-blue via-brand-lavender to-brand-pink bg-clip-text text-transparent">
          uwu
        </span>
      </h1>
      <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted">
        Platform undangan pernikahan digital untuk pasangan Indonesia.
        Kelola tamu, kirim via WhatsApp, terima RSVP — semua di satu tempat.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/register"
          className="rounded-full bg-coral px-8 py-3 font-medium text-white transition-colors hover:bg-coral-dark"
        >
          Mulai Gratis
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-[color:var(--border-medium)] px-8 py-3 font-medium text-navy transition-colors hover:bg-surface-muted"
        >
          Masuk
        </Link>
      </div>

      <div className="mt-16 flex items-center gap-3 text-gold">
        <span className="h-px w-16 bg-current" />
        <span>♡</span>
        <span className="h-px w-16 bg-current" />
      </div>
    </main>
  );
}
