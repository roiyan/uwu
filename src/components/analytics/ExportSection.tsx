"use client";

import { useToast } from "@/components/shared/Toast";

type ExportOpt = {
  key: string;
  name: string;
  sub: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
};

const OPTIONS: ExportOpt[] = [
  {
    key: "pdf",
    name: "Laporan PDF",
    sub: "Full report · 8 halaman",
    iconColor: "var(--d-coral)",
    iconBg: "rgba(240,160,156,0.14)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    key: "xlsx",
    name: "Data Excel",
    sub: "Raw data · daftar tamu + events",
    iconColor: "var(--d-green)",
    iconBg: "rgba(126,211,164,0.14)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M3 9h18M3 15h18M15 3v18" />
      </svg>
    ),
  },
  {
    key: "png",
    name: "Infografis PNG",
    sub: "Share-ready · 1200×1500",
    iconColor: "var(--d-blue)",
    iconBg: "rgba(143,163,217,0.14)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
];

export function ExportSection() {
  const toast = useToast();

  function notReady(name: string) {
    toast.success(`Ekspor ${name} segera hadir — kami sedang menyiapkannya.`);
  }

  return (
    <section
      className="relative overflow-hidden rounded-[18px] border border-[var(--d-line)] p-7"
      style={{
        background:
          "linear-gradient(115deg, rgba(143,163,217,0.06), rgba(184,157,212,0.06) 50%, rgba(240,160,156,0.08))",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-60 blur-[50px]"
        style={{
          background:
            "radial-gradient(circle, rgba(240,160,156,0.16), transparent 70%)",
        }}
      />
      <div className="relative grid items-center gap-7 lg:grid-cols-[1fr_auto] lg:gap-10">
        <div>
          <p className="d-mono text-[10.5px] uppercase tracking-[0.26em] text-[var(--d-coral)]">
            Ekspor Laporan
          </p>
          <h2 className="d-serif mt-3 max-w-[520px] text-[22px] font-light leading-[1.2] tracking-[-0.015em] text-[var(--d-ink)] lg:text-[26px]">
            Simpan ringkasan ini sebagai{" "}
            <em className="d-serif italic text-[var(--d-coral)]">kenangan</em>,
            atau kirim ke vendor kalian.
          </h2>
          <p className="mt-2 max-w-[500px] text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
            Semua metrik, funnel, dan daftar tamu dalam satu dokumen — siap
            dicetak atau dibagikan.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => notReady(o.name)}
              className="group flex min-w-[260px] items-center gap-3 rounded-[10px] border border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.04)] px-4 py-3 transition-all hover:-translate-y-px hover:border-[var(--d-ink-dim)] hover:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
                style={{
                  background: o.iconBg,
                  color: o.iconColor,
                }}
              >
                {o.icon}
              </span>
              <span className="flex-1 text-left">
                <span className="block text-[13.5px] text-[var(--d-ink)]">
                  {o.name}
                </span>
                <span className="d-mono mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-[var(--d-ink-faint)]">
                  {o.sub}
                </span>
              </span>
              <span
                aria-hidden
                className="text-[var(--d-ink-faint)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--d-coral)]"
              >
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
