import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { themes } from "@/lib/db/schema";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

export const revalidate = 3600;

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

function extractSections(config: Record<string, unknown>) {
  const sections = (config?.sections ?? []) as string[];
  return sections.length ? sections : ["hero", "couple", "schedule", "rsvp"];
}

const SECTION_LABEL: Record<string, string> = {
  hero: "Hero + Nama Mempelai",
  couple: "Profil Mempelai",
  story: "Cerita Cinta",
  schedule: "Rangkaian Acara",
  gallery: "Galeri Foto",
  gifts: "Amplop Digital",
  rsvp: "RSVP",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [t] = await db.select().from(themes).where(eq(themes.slug, slug)).limit(1);
  if (!t) return { title: "Tema tidak ditemukan" };
  return {
    title: `${t.name} — Tema uwu`,
    description: t.description ?? undefined,
  };
}

export default async function TemaDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [t] = await db
    .select()
    .from(themes)
    .where(eq(themes.slug, slug))
    .limit(1);
  if (!t || !t.isActive) notFound();

  const palette = extractPalette(t.config);
  const sections = extractSections(t.config);

  return (
    <main className="px-6 pb-20 pt-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/tema"
          className="text-sm text-ink-muted hover:text-navy"
        >
          ← Semua tema
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_420px]">
          <ScrollReveal>
            <div>
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide"
                style={{ background: palette.accent, color: "#1A1A2E" }}
              >
                {TIER_LABEL[t.tier] ?? t.tier}
              </span>
              <h1 className="mt-4 font-display text-4xl text-navy md:text-5xl">
                {t.name}
              </h1>
              <p className="mt-3 text-ink-muted">{t.description}</p>

              <section className="mt-8">
                <h2 className="text-xs uppercase tracking-wide text-ink-hint">
                  Palet Warna
                </h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {Object.entries(palette).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span
                        className="h-8 w-8 rounded-full border border-white/60 shadow-ghost-sm"
                        style={{ background: v }}
                      />
                      <span className="text-xs">
                        <span className="block font-medium capitalize text-ink">
                          {k}
                        </span>
                        <span className="block font-mono text-ink-hint">{v}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-xs uppercase tracking-wide text-ink-hint">
                  Bagian yang Tersedia
                </h2>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {sections.map((s) => (
                    <li
                      key={s}
                      className="flex items-center gap-2 rounded-lg bg-surface-muted/60 px-3 py-2"
                    >
                      <span className="text-gold-dark">♡</span>
                      <span>{SECTION_LABEL[s] ?? s}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="rounded-full bg-coral px-8 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-coral-dark"
                >
                  Gunakan Tema Ini
                </Link>
                <Link
                  href="/tema"
                  className="rounded-full border border-[color:var(--border-medium)] px-6 py-3 text-center text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
                >
                  Lihat Tema Lain
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div
              className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-3xl p-10 text-center shadow-ghost-md"
              style={{ background: palette.secondary }}
            >
              <p
                className="text-xs uppercase tracking-[0.3em]"
                style={{ color: palette.primary }}
              >
                The Wedding Of
              </p>
              <h3
                className="mt-4 font-display text-4xl italic"
                style={{ color: palette.primary }}
              >
                Anisa &amp; Rizky
              </h3>
              <p className="mt-4 text-sm" style={{ color: "#1A1A2E" }}>
                Sabtu, 15 November 2026
              </p>
              <div
                className="mt-8 flex items-center gap-3"
                style={{ color: palette.accent }}
              >
                <span className="h-px w-14 bg-current" />
                <span>♡</span>
                <span className="h-px w-14 bg-current" />
              </div>
              <div
                className="mt-8 flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-ghost-md"
                style={{ background: palette.primary }}
              >
                ♡
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </main>
  );
}
