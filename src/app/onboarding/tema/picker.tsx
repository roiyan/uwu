"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveTemaAction } from "@/lib/actions/onboarding";
import { useToast } from "@/components/shared/Toast";

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

  // onSubmit + preventDefault (not <form action=>) so React 19's form-action
  // transition machinery doesn't interfere with router.push. Navigate
  // immediately; save fires in background. Selesai tolerates unset themeId.
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

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <input type="hidden" name="themeId" value={picked ?? ""} />
      <div className="grid gap-4 md:grid-cols-3">
        {themes.map((t) => {
          const palette = extractPalette(t.config);
          const isPicked = picked === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPicked(t.id)}
              className={`group flex flex-col overflow-hidden rounded-2xl border bg-[color:var(--color-dark-surface)] text-left shadow-2xl transition-all hover:-translate-y-0.5 ${
                isPicked
                  ? "border-transparent ring-2 ring-[color:var(--color-brand-lavender)]"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div
                className="flex h-36 items-center justify-center"
                style={{ background: palette.secondary }}
              >
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-lg"
                  style={{ background: palette.primary }}
                >
                  ♡
                </div>
              </div>
              <div className="flex-1 space-y-1 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg text-white">{t.name}</h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{ background: palette.accent, color: "#1A1A2E" }}
                  >
                    {tierLabel[t.tier] ?? t.tier}
                  </span>
                </div>
                <p className="text-sm text-white/60">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <Link
          href="/onboarding/jadwal"
          className="rounded-xl border border-white/[0.12] px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-white"
        >
          ← Kembali
        </Link>
        <button
          type="submit"
          disabled={pending || !picked}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-8 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02] disabled:opacity-60"
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
