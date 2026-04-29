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

type Cta = {
  label: string;
  href: string;
  /** When true, hide the secondary "Lihat Undangan" button — the
   *  primary CTA already points at the public preview, two buttons
   *  to the same place reads as redundant. */
  hideSecondary?: boolean;
};

type Content = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  cta: Cta;
};

// CTA destinations: H-30+ down to H-3 still point at the editor
// (couples are still tweaking content). H-1, H-0, H+ pivot to the
// public preview because last-minute editor sessions trigger
// last-minute perfectionism — exactly what you don't want a couple
// to do the night before. /preview is the dashboard's internal
// "open the rendered invitation" link, which always resolves to
// the same public page guests see.
const CTA_DESIGN: Cta = { label: "Mulai Mendesain →", href: "/dashboard/website" };
const CTA_EDIT: Cta = { label: "Sempurnakan →", href: "/dashboard/website" };
const CTA_CHECK: Cta = { label: "Cek Undangan →", href: "/preview" };
const CTA_VIEW: Cta = {
  label: "Lihat Undangan →",
  href: "/preview",
  hideSecondary: true,
};
const CTA_MEMORIES: Cta = {
  label: "Lihat Kenangan →",
  href: "/preview",
  hideSecondary: true,
};

function pickContent(hMinus: number | null): Content {
  if (hMinus === null || hMinus > 30) {
    return {
      eyebrow: "PERSIAPAN AWAL",
      title: (
        <>
          Masih ada waktu — mari mulai dari yang{" "}
          <em className="d-serif italic text-[var(--d-coral)]">penting</em>.
        </>
      ),
      subtitle: "Satu langkah kecil hari ini, ketenangan besar di hari H.",
      cta: CTA_DESIGN,
    };
  }
  if (hMinus > 7) {
    return {
      eyebrow: "DUA MINGGU LAGI",
      title: (
        <>
          Dua minggu lagi — waktunya memastikan{" "}
          <em className="d-serif italic text-[var(--d-coral)]">detail</em>.
        </>
      ),
      subtitle: "Fondasi sudah kuat. Sekarang saatnya poles.",
      cta: CTA_EDIT,
    };
  }
  if (hMinus > 3) {
    return {
      eyebrow: "SEMINGGU LAGI",
      title: (
        <>
          Seminggu lagi — mari cek kesiapan{" "}
          <em className="d-serif italic text-[var(--d-coral)]">akhir</em>.
        </>
      ),
      subtitle: "Kalian sudah melangkah jauh. Hampir sampai.",
      cta: CTA_EDIT,
    };
  }
  if (hMinus > 1) {
    return {
      eyebrow: "MENGHITUNG HARI",
      title: (
        <>
          Tinggal {hMinus} hari — pastikan semuanya{" "}
          <em className="d-serif italic text-[var(--d-coral)]">sempurna</em>.
        </>
      ),
      subtitle: "Kalian sudah hampir sampai. Tinggal sentuhan terakhir.",
      cta: CTA_EDIT,
    };
  }
  if (hMinus === 1) {
    return {
      eyebrow: "BESOK",
      title: (
        <>
          Besok hari besar kalian — semua{" "}
          <em className="d-serif italic text-[var(--d-coral)]">siap</em>?
        </>
      ),
      subtitle: "Tarik napas. Kalian sudah mempersiapkan ini dengan indah.",
      cta: CTA_CHECK,
    };
  }
  if (hMinus === 0) {
    return {
      eyebrow: "HARI INI ✨",
      title: (
        <>
          Hari ini milik{" "}
          <em className="d-serif italic text-[var(--d-coral)]">kalian</em>.
        </>
      ),
      subtitle: "Selamat menempuh kehidupan baru.",
      cta: CTA_VIEW,
    };
  }
  return {
    eyebrow: "SELAMAT!",
    title: (
      <>
        Resmi menjadi{" "}
        <em className="d-serif italic text-[var(--d-coral)]">keluarga</em> —
        selamat!
      </>
    ),
    subtitle: "Terima kasih sudah memilih UWU untuk hari istimewa kalian.",
    cta: CTA_MEMORIES,
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
        {!c.cta.hideSecondary && (
          <Link
            href="/preview"
            target="_blank"
            rel="noreferrer"
            className="d-mono inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--d-line-strong)] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] lg:flex-none lg:px-5 lg:py-2 lg:text-[11px]"
          >
            👁 Lihat Undangan
          </Link>
        )}
        <Link
          href={c.cta.href}
          {...(c.cta.href === "/preview"
            ? { target: "_blank", rel: "noreferrer" }
            : {})}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-3 py-1.5 text-[10px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 lg:flex-none lg:px-6 lg:py-2.5 lg:text-[12px]"
        >
          {c.cta.label}
        </Link>
      </div>
    </header>
  );
}
