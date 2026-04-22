import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { themes } from "@/lib/db/schema";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { ThemePreviewCard } from "@/components/public/ThemePreviewCard";
import { getAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";

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

  // M-06 fix: if the viewer is logged in and has an event set up, show a
  // preview card personalised with their own couple. Anonymous viewers see
  // the generic demo names.
  let brideLabel = "Anisa";
  let groomLabel = "Rizky";
  let dateLabel = "Sabtu, 15 November 2026";
  try {
    const user = await getAuthedUser();
    if (user) {
      const current = await getCurrentEventForUser(user.id);
      if (current) {
        const bundle = await getEventBundle(current.event.id);
        if (bundle?.couple) {
          brideLabel =
            bundle.couple.brideNickname ?? bundle.couple.brideName.split(" ")[0];
          groomLabel =
            bundle.couple.groomNickname ?? bundle.couple.groomName.split(" ")[0];
        }
        if (bundle?.schedules[0]) {
          const d = bundle.schedules[0].eventDate;
          const [y, m, dy] = d.split("-").map((x) => parseInt(x, 10));
          dateLabel = new Date(Date.UTC(y, m - 1, dy)).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          });
        }
      }
    }
  } catch {
    // Anonymous viewer path — keep the demo couple.
  }

  const palette = extractPalette(t.config);
  const sections = extractSections(t.config);

  return (
    <main className="px-6 pb-24 pt-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/tema"
          className="text-sm text-[color:var(--color-dark-text-secondary)] hover:text-white"
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
              <h1 className="mt-4 font-display text-4xl text-white md:text-5xl">
                {t.name}
              </h1>
              <p className="mt-3 text-[color:var(--color-dark-text-secondary)]">
                {t.description}
              </p>

              <section className="mt-8">
                <h2 className="text-xs uppercase tracking-wide text-[color:var(--color-dark-text-muted)]">
                  Palet Warna
                </h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {Object.entries(palette).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span
                        className="h-8 w-8 rounded-full border border-[color:var(--dark-border-hover)]"
                        style={{ background: v }}
                      />
                      <span className="text-xs">
                        <span className="block font-medium capitalize text-white">
                          {k}
                        </span>
                        <span className="block font-mono text-[color:var(--color-dark-text-muted)]">
                          {v}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-xs uppercase tracking-wide text-[color:var(--color-dark-text-muted)]">
                  Bagian yang Tersedia
                </h2>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {sections.map((s) => (
                    <li
                      key={s}
                      className="flex items-center gap-2 rounded-lg border border-[color:var(--dark-border)] bg-[color:var(--color-dark-surface)] px-3 py-2 text-[color:var(--color-dark-text)]"
                    >
                      <span className="text-[color:var(--color-gold)]">♡</span>
                      <span>{SECTION_LABEL[s] ?? s}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-brand px-8 py-3 text-center text-sm font-medium text-white transition-transform hover:scale-105"
                >
                  Gunakan Tema Ini
                </Link>
                <Link
                  href="/tema"
                  className="rounded-full border border-[color:var(--dark-border-hover)] px-6 py-3 text-center text-sm font-medium text-[color:var(--color-dark-text)] transition-colors hover:bg-[color:var(--color-dark-surface)]"
                >
                  Lihat Tema Lain
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <ThemePreviewCard
              palette={palette}
              bride={brideLabel}
              groom={groomLabel}
              date={dateLabel}
            />
          </ScrollReveal>
        </div>
      </div>
    </main>
  );
}
