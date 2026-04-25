"use client";

import { usePathname } from "next/navigation";
import { useOnboardingPreview } from "./preview-store";
import { LivePreviewCard } from "./live-preview-card";

const SIDEBAR_COPY: Record<
  "mempelai" | "jadwal" | "tema" | "selesai",
  { chapter: string; title: React.ReactNode; lead: string }
> = {
  mempelai: {
    chapter: "Chapter 01 — Mempelai",
    title: (
      <>
        Cerita ini dimulai, dengan{" "}
        <em className="ob-serif italic text-[var(--ob-coral)]">dua nama.</em>
      </>
    ),
    lead: "Biarkan kami mengenal kalian berdua. Setiap detail yang kalian tuliskan — akan dirangkai menjadi undangan yang tak akan dilupakan.",
  },
  jadwal: {
    chapter: "Chapter 02 — Jadwal",
    title: (
      <>
        Sebuah hari,{" "}
        <em className="ob-serif italic text-[var(--ob-coral)]">
          beberapa acara.
        </em>
      </>
    ),
    lead: "Akad pagi, resepsi malam, atau intimate dinner — tambahkan setiap momen yang ingin dihadirkan.",
  },
  tema: {
    chapter: "Chapter 03 — Tema",
    title: (
      <>
        Temukan{" "}
        <em className="ob-serif italic text-[var(--ob-coral)]">mood</em>{" "}
        cerita kalian.
      </>
    ),
    lead: "Tiap tema adalah palet warna, tipografi, dan ornamen yang sudah dikurasi. Pilih satu untuk memulai.",
  },
  selesai: {
    chapter: "Epilogue — Selesai",
    title: (
      <>
        Bab pembuka{" "}
        <em className="ob-serif italic text-[var(--ob-coral)]">
          sudah ditulis.
        </em>
      </>
    ),
    lead: "Semua kepingan pertama sudah di tempatnya. Mari kita polish undangan kalian di dashboard.",
  },
};

export function OnboardingSidebar() {
  const pathname = usePathname();
  const slug =
    (["mempelai", "jadwal", "tema", "selesai"] as const).find((s) =>
      pathname?.includes(`/${s}`),
    ) ?? "mempelai";
  const copy = SIDEBAR_COPY[slug];
  const preview = useOnboardingPreview();

  return (
    <aside
      className="relative hidden overflow-hidden border-r border-[var(--ob-line)] bg-[var(--ob-bg-1)] lg:block"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 10%, rgba(184, 157, 212, 0.08), transparent 55%), radial-gradient(circle at 80% 90%, rgba(244, 184, 163, 0.07), transparent 55%)",
      }}
    >
      <div aria-hidden className="ob-stars" />
      <div className="sticky top-0 flex max-h-screen flex-col gap-10 overflow-y-auto px-12 py-14">
        <div>
          <p className="ob-mono text-[10px] uppercase tracking-[0.32em] text-[var(--ob-ink-dim)]">
            {copy.chapter}
          </p>
          <h1 className="ob-serif mt-6 text-[44px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--ob-ink)]">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-[var(--ob-ink-dim)]">
            {copy.lead}
          </p>
        </div>

        <LivePreviewCard preview={preview} />

        <div className="mt-auto flex items-center gap-2 text-[10px] tracking-[0.22em] text-[var(--ob-ink-faint)]">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ob-coral)]"
          />
          <span className="ob-mono uppercase">Tersimpan otomatis</span>
        </div>
      </div>
    </aside>
  );
}
