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

  const paletteOverride =
    (bundle.themeConfig?.config as { palette?: Record<string, string> } | null)?.palette ??
    {};

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-navy">Tema Undangan</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Pilih dasar visual undangan. Anda dapat menyesuaikan warna di bawah.
          </p>
        </div>
        <Link
          href="/dashboard/website"
          className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
        >
          ← Kembali ke Editor
        </Link>
      </header>

      <ThemeEditor
        eventId={bundle.event.id}
        selectedId={bundle.event.themeId}
        paletteOverride={paletteOverride}
        themes={themes.map((t) => ({
          id: t.id,
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
