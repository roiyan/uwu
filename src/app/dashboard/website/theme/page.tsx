import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSessionUserFast } from "@/lib/auth-guard";
import {
  getCurrentEventForUser,
  getEventBundle,
  listThemes,
} from "@/lib/db/queries/events";
import { ThemeEditor } from "./editor";

export default async function ThemeEditorPage() {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  const themes = await listThemes();

  // Read the persisted overrides off the event's themeConfig blob.
  // Each editor panel consumes only its own slice — the action layer
  // merges siblings on save so each panel can write independently.
  const themeConfig = bundle.themeConfig?.config as
    | {
        palette?: Record<string, string>;
        palette6?: Record<string, string>;
        fonts?: { heading?: string; body?: string };
      }
    | null
    | undefined;
  const paletteOverride6 = (themeConfig?.palette6 ?? {}) as Record<
    string,
    string
  >;
  const fontsOverride = (themeConfig?.fonts ?? {}) as {
    heading?: string;
    body?: string;
  };

  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-px w-10"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
              }}
            />
            <p className="d-eyebrow">Tema Undangan</p>
          </div>
          <h1 className="d-serif mt-3 text-[40px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--d-ink)] md:text-[48px]">
            Pilih{" "}
            <em className="d-serif italic text-[var(--d-coral)]">mood</em>{" "}
            visual.
          </h1>
          <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
            Pilih suasana undangan kalian. Warna bisa disesuaikan di
            bawah.
          </p>
        </div>
        <Link
          href="/dashboard/website"
          className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)]"
        >
          ← Kembali ke Editor
        </Link>
      </header>

      <ThemeEditor
        eventId={bundle.event.id}
        selectedId={bundle.event.themeId}
        paletteOverride6={paletteOverride6}
        fontsOverride={fontsOverride}
        themes={themes.map((t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          tier: t.tier,
          description: t.description,
          previewImageUrl: t.previewImageUrl,
          config: t.config,
        }))}
      />
    </main>
  );
}
