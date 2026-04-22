import Link from "next/link";
import { listThemes } from "@/lib/db/queries/events";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

export const revalidate = 3600;

export const metadata = {
  title: "Tema — uwu Wedding Platform",
  description:
    "Pilih dari pustaka tema premium dan sesuaikan warna sesuai preferensi Anda.",
};

const TIER_LABEL: Record<string, string> = {
  basic: "Gratis",
  standard: "Lite",
  premium: "Pro",
};

function extractPalette(config: Record<string, unknown>) {
  const palette = (config?.palette ?? {}) as Record<string, string>;
  return {
    primary: palette.primary ?? "#C06070",
    secondary: palette.secondary ?? "#FAF6F1",
    accent: palette.accent ?? "#D4A574",
  };
}

export default async function TemaCatalog() {
  const themes = await listThemes();

  return (
    <main className="px-6 pb-20 pt-14">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-dark">
              Tema
            </p>
            <h1 className="mt-3 font-display text-4xl text-navy md:text-5xl">
              Temukan tema yang <span className="italic">mencerminkan Anda</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-ink-muted md:text-base">
              Setiap tema dirancang bersama desainer profesional. Semua
              responsif, teroptimasi untuk 4G, dan dapat disesuaikan warnanya.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => {
            const palette = extractPalette(t.config);
            return (
              <Link
                key={t.id}
                href={`/tema/${t.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl bg-surface-card shadow-ghost-sm transition-transform hover:-translate-y-0.5 hover:shadow-ghost-md"
              >
                <div
                  className="flex h-48 items-center justify-center"
                  style={{ background: palette.secondary }}
                >
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-full text-4xl text-white shadow-ghost-md transition-transform group-hover:scale-110"
                    style={{ background: palette.primary }}
                  >
                    ♡
                  </div>
                </div>
                <div className="flex-1 space-y-2 p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl text-ink">{t.name}</h2>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                      style={{ background: palette.accent, color: "#1A1A2E" }}
                    >
                      {TIER_LABEL[t.tier] ?? t.tier}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted">{t.description}</p>
                  <div className="flex gap-1.5 pt-2">
                    {Object.values(palette).map((c) => (
                      <span
                        key={c}
                        className="h-4 w-4 rounded-full border border-white/50"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-14 rounded-2xl bg-surface-card p-8 text-center shadow-ghost-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-gold-dark">
            Butuh yang lebih unik?
          </p>
          <h2 className="mt-3 font-display text-2xl text-ink">
            Paket Ultimate menyediakan tema eksklusif
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-muted">
            Dedicated designer akan membuat tema khusus untuk acara Anda.
          </p>
          <Link
            href="/harga"
            className="mt-5 inline-block rounded-full bg-navy px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-dark"
          >
            Lihat Paket Ultimate
          </Link>
        </div>
      </div>
    </main>
  );
}
