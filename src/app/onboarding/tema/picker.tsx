"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveTemaAction } from "@/lib/actions/onboarding";
import { useToast } from "@/components/shared/Toast";
import {
  useOnboardingPreview,
  writePreview,
} from "../components/preview-store";

type ThemeOption = {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  previewImageUrl: string | null;
  config: Record<string, unknown>;
};

function extractPalette(config: Record<string, unknown>) {
  const palette = (config?.palette ?? {}) as Record<string, string>;
  return {
    primary: palette.primary ?? "#C06070",
    secondary: palette.secondary ?? "#FAF6F1",
    accent: palette.accent ?? "#D4A574",
  };
}

const tierLabel: Record<string, string> = {
  basic: "Gratis",
  standard: "Lite",
  premium: "Pro",
};

const tierAccent: Record<string, string> = {
  basic: "bg-[rgba(143,163,217,0.12)] text-[var(--ob-blue)]",
  standard: "bg-[rgba(184,157,212,0.14)] text-[var(--ob-lilac)]",
  premium: "bg-[rgba(240,160,156,0.14)] text-[var(--ob-coral)]",
};

function slugFromName(name: string): string {
  return name.toLowerCase().split(/\s+/)[0] ?? "ivory";
}

function formatDate(iso: string): string {
  if (!iso) return "Tanggal menyusul";
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TemaPicker({
  themes,
  selectedId,
}: {
  themes: ThemeOption[];
  selectedId: string | null;
}) {
  const [picked, setPicked] = useState<string | null>(selectedId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const preview = useOnboardingPreview();

  // onSubmit + preventDefault (not <form action=>) so React 19's
  // form-action transition machinery doesn't interfere with
  // router.push. Navigate immediately; save fires in background.
  // Selesai tolerates unset themeId.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || !picked) return;

    const form = new FormData(e.currentTarget);
    form.set("themeId", picked);

    setError(null);
    setPending(true);
    toast.success("Tersimpan");
    router.push("/onboarding/selesai");

    saveTemaAction(null, form)
      .then((res) => {
        if (!res.ok) {
          toast.error(res.error || "Gagal menyimpan.");
          router.push("/onboarding/tema");
          setError(res.error ?? null);
        }
      })
      .catch(() => {
        toast.error("Koneksi gagal. Silakan coba lagi.");
        router.push("/onboarding/tema");
      })
      .finally(() => setPending(false));
  }

  function selectTheme(t: ThemeOption) {
    setPicked(t.id);
    writePreview({ themeSlug: slugFromName(t.name) });
  }

  const brideLabel =
    preview.brideNickname || preview.brideName || "Mempelai Wanita";
  const groomLabel =
    preview.groomNickname || preview.groomName || "Mempelai Pria";
  const dateLabel = formatDate(preview.eventDate);

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-6">
      <input type="hidden" name="themeId" value={picked ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((t) => {
          const palette = extractPalette(t.config);
          const isPicked = picked === t.id;
          const tierKey = (t.tier ?? "basic").toLowerCase();
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTheme(t)}
              className={`group flex flex-col overflow-hidden rounded-[18px] border bg-[var(--ob-bg-card)] p-4 text-left transition-all hover:-translate-y-0.5 ${
                isPicked
                  ? "border-[var(--ob-coral)] shadow-[0_0_0_1px_var(--ob-coral)_inset,0_20px_50px_rgba(240,160,156,0.16)]"
                  : "border-[var(--ob-line)] hover:border-[var(--ob-line-strong)]"
              }`}
              aria-pressed={isPicked}
            >
              <div
                className="relative mb-4 flex aspect-[3/4] flex-col items-center justify-center rounded-[12px] p-5 text-center"
                style={{
                  background: `linear-gradient(135deg, ${palette.secondary} 0%, ${palette.accent} 100%)`,
                  color: "#2A1F1A",
                }}
              >
                <p
                  className="ob-mono text-[7.5px] uppercase tracking-[0.32em] opacity-60"
                >
                  The Wedding Of
                </p>
                <p
                  className="mt-2 text-[8px] tracking-[0.4em]"
                  style={{ color: palette.primary }}
                >
                  ✦ ⸻ ✦
                </p>
                <p className="ob-serif mt-2 text-[18px] font-light leading-tight">
                  {brideLabel}
                </p>
                <p className="ob-serif text-[18px] italic opacity-70">&</p>
                <p className="ob-serif text-[18px] font-light italic leading-tight">
                  {groomLabel}
                </p>
                <p className="ob-mono mt-3 text-[7.5px] uppercase tracking-[0.28em] opacity-70">
                  {dateLabel}
                </p>
                {isPicked && (
                  <span
                    aria-hidden
                    className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ob-coral)] text-[12px] text-white shadow"
                  >
                    ✓
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="ob-serif text-[17px] font-light text-[var(--ob-ink)]">
                    {t.name}
                  </h3>
                  <span
                    className={`ob-mono rounded-full px-2 py-0.5 text-[8.5px] uppercase tracking-[0.24em] ${
                      tierAccent[tierKey] ??
                      "bg-[rgba(143,163,217,0.12)] text-[var(--ob-blue)]"
                    }`}
                  >
                    {tierLabel[t.tier] ?? t.tier}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--ob-ink-dim)]">
                  {t.description ?? "Tema undangan."}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--ob-line)] pt-6">
        <Link
          href="/onboarding/jadwal"
          className="ob-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)] transition-colors hover:text-[var(--ob-ink)]"
        >
          ← Kembali
        </Link>
        <button
          type="submit"
          disabled={pending || !picked}
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-3 text-[13px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          <span>{pending ? "Menyimpan..." : "Gunakan tema ini →"}</span>
        </button>
      </div>
    </form>
  );
}
