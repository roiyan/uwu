import type { ReactNode } from "react";
import Link from "next/link";

// Hero block for the dashboard Beranda. Replaces the old "Selamat
// datang / {bride} & {groom}" header. Copy + eyebrow shift with the
// H-minus window so the page feels like it's reacting to time, not
// a static greeting.

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatIndonesianDate(iso: string | null): string {
  if (!iso) return "Tanggal belum diatur";
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return "Tanggal belum diatur";
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}

function getHMinus(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return null;
  const target = Date.UTC(y, m - 1, d);
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.round((target - todayUtc) / 86_400_000);
}

type Content = { eyebrow: string; title: ReactNode; subtitle: string };

function pickContent(hMinus: number | null): Content {
  if (hMinus === null) {
    return {
      eyebrow: "PERSIAPAN DIMULAI",
      title: (
        <>
          Mulai rangkai{" "}
          <em className="d-serif italic text-[var(--d-coral)]">cerita</em>{" "}
          kalian.
        </>
      ),
      subtitle: "Lengkapi data acara untuk melihat perjalanan undangan.",
    };
  }
  if (hMinus > 30) {
    return {
      eyebrow: "PERSIAPAN DIMULAI",
      title: (
        <>
          Mulai rangkai{" "}
          <em className="d-serif italic text-[var(--d-coral)]">cerita</em>{" "}
          kalian.
        </>
      ),
      subtitle: "Setiap langkah membawa kalian lebih dekat ke hari bahagia.",
    };
  }
  if (hMinus > 7) {
    return {
      eyebrow: `${hMinus} HARI LAGI`,
      title: (
        <>
          Undangan sudah menyebar — pastikan semua{" "}
          <em className="d-serif italic text-[var(--d-coral)]">siap</em>.
        </>
      ),
      subtitle: "Cek siapa yang belum membuka, dan siapkan hari H.",
    };
  }
  if (hMinus > 2) {
    return {
      eyebrow: "SEMINGGU LAGI",
      title: (
        <>
          Undangan sudah menyebar — pastikan semua{" "}
          <em className="d-serif italic text-[var(--d-coral)]">siap</em>.
        </>
      ),
      subtitle: "Cek siapa yang belum membuka, dan siapkan hari H.",
    };
  }
  if (hMinus > 0) {
    return {
      eyebrow: "HAMPIR TIBA",
      title: (
        <>
          Tinggal {hMinus} hari — ini yang perlu{" "}
          <em className="d-serif italic text-[var(--d-coral)]">dicek</em>.
        </>
      ),
      subtitle: "Kalian sudah hampir sampai. Sedikit lagi.",
    };
  }
  if (hMinus === 0) {
    return {
      eyebrow: "HARI INI",
      title: (
        <>
          Selamat menempuh{" "}
          <em className="d-serif italic text-[var(--d-coral)]">hidup baru</em>.
        </>
      ),
      subtitle: "Semua persiapan telah menjadi cerita. Nikmati hari ini.",
    };
  }
  return {
    eyebrow: "CERITA DIMULAI",
    title: (
      <>
        Terima kasih kepada semua yang{" "}
        <em className="d-serif italic text-[var(--d-coral)]">hadir</em>.
      </>
    ),
    subtitle: "Unduh kenangan hari kemarin — untuk diingat selamanya.",
  };
}

export function ContextualHero({
  eventDate,
  eventLabel,
}: {
  eventDate: string | null;
  eventLabel: string;
}) {
  const hMinus = getHMinus(eventDate);
  const c = pickContent(hMinus);
  return (
    <header className="mb-7 flex flex-col gap-3 lg:mb-10 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2.5 lg:gap-3">
          <span
            aria-hidden
            className="h-px w-7 lg:w-10"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
            }}
          />
          <p className="d-mono text-[9.5px] uppercase tracking-[0.26em] text-[var(--d-coral)]">
            {c.eyebrow}
          </p>
        </div>
        <h1 className="d-serif text-[26px] font-extralight leading-[1.15] tracking-[-0.01em] text-[var(--d-ink)] lg:text-[44px] lg:leading-[1.1]">
          {c.title}
        </h1>
        <p className="d-serif mt-2 text-[13px] italic text-[var(--d-ink-dim)] lg:text-[14px]">
          {c.subtitle}
        </p>
        <p className="d-mono mt-3 text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
          {eventLabel} · {formatIndonesianDate(eventDate)}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Link
          href="/preview"
          target="_blank"
          rel="noreferrer"
          className="d-mono inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--d-line-strong)] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] lg:flex-none lg:px-5 lg:py-2 lg:text-[11px]"
        >
          👁 Intip Undangan
        </Link>
        <Link
          href="/dashboard/website"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-3 py-1.5 text-[10px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 lg:flex-none lg:px-6 lg:py-2.5 lg:text-[12px]"
        >
          Edit Undangan →
        </Link>
      </div>
    </header>
  );
}
