import Link from "next/link";

/**
 * Shown on /dashboard/checkin when the couple hasn't flipped the
 * `checkinEnabled` toggle on yet. Prompts them to head into Pengaturan
 * to turn it on. The matching public-route copy lives inline on
 * `/check-in/[eventId]/page.tsx` so unauthenticated visitors don't
 * see a CTA pointing them somewhere they can't reach.
 */
export function CheckinDisabledCard() {
  return (
    <section className="d-card mx-auto max-w-2xl p-8 text-center md:p-12">
      <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-gold)]">
        Belum Diaktifkan
      </p>
      <h2 className="d-serif mt-5 text-[26px] font-extralight leading-[1.2] text-[var(--d-ink)] md:text-[32px]">
        Stasiun penyambutan{" "}
        <em className="d-serif italic text-[var(--d-coral)]">
          masih tertutup.
        </em>
      </h2>
      <p className="mx-auto mt-4 max-w-[44ch] text-[14px] leading-relaxed text-[var(--d-ink-dim)]">
        Aktifkan check-in digital di Pengaturan agar Anda bisa memindai
        kode QR tamu di hari pernikahan. Sebelum diaktifkan, undangan tetap
        terkirim seperti biasa — fitur ini opsional.
      </p>
      <Link
        href="/dashboard/settings?tab=acara"
        className="d-mono mt-7 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
      >
        Buka Pengaturan
      </Link>
    </section>
  );
}
