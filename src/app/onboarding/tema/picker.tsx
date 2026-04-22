"use client";

import { useState, useTransition } from "react";
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
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  // Fire-and-forget — tema step only UPDATEs events.themeId and upserts
  // event_theme_configs; navigating before it commits is safe.
  function handleSubmit(form: FormData) {
    setError(null);
    toast.success("Tersimpan");
    router.push("/onboarding/selesai");
    startTransition(async () => {
      const res = await saveTemaAction(null, form);
      if (!res.ok) {
        toast.error(res.error);
        router.push("/onboarding/tema");
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-6">
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
              className={`group flex flex-col overflow-hidden rounded-2xl bg-surface-card text-left shadow-ghost-sm transition-transform hover:-translate-y-0.5 ${
                isPicked ? "ring-2 ring-navy" : "ring-1 ring-[color:var(--border-ghost)]"
              }`}
            >
              <div
                className="flex h-36 items-center justify-center"
                style={{ background: palette.secondary }}
              >
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-ghost-md"
                  style={{ background: palette.primary }}
                >
                  ♡
                </div>
              </div>
              <div className="flex-1 space-y-1 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg text-ink">{t.name}</h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{ background: palette.accent, color: "#1A1A2E" }}
                  >
                    {tierLabel[t.tier] ?? t.tier}
                  </span>
                </div>
                <p className="text-sm text-ink-muted">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <Link
          href="/onboarding/jadwal"
          className="rounded-full border border-[color:var(--border-medium)] px-6 py-3 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
        >
          Kembali
        </Link>
        <button
          type="submit"
          disabled={pending || !picked}
          className="inline-flex items-center gap-2 rounded-full bg-navy px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          <span>{pending ? "Menyimpan..." : "Gunakan tema ini"}</span>
        </button>
      </div>
    </form>
  );
}
