import { redirect } from "next/navigation";
import { requireAuthedUser } from "@/lib/auth-guard";
import {
  getCurrentEventForUser,
  getEventBundle,
  listThemes,
} from "@/lib/db/queries/events";
import { Stepper } from "@/components/onboarding/Stepper";
import { TemaPicker } from "./picker";

export default async function TemaStep() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");

  const bundle = await getEventBundle(current.event.id);
  if (!bundle || !bundle.couple) redirect("/onboarding/mempelai");
  if (bundle.schedules.length === 0) redirect("/onboarding/jadwal");

  const themes = await listThemes();
  const reached: ("mempelai" | "jadwal" | "tema" | "selesai")[] = [
    "mempelai",
    "jadwal",
    "tema",
  ];
  if (bundle.event.themeId) reached.push("selesai");

  return (
    <div>
      <Stepper current="tema" reached={reached} />
      <section className="mt-10">
        <h1 className="font-display text-3xl text-ink">Pilih tema undangan</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Anda bisa mengubah tema setelah ini. Tema akan mewarnai halaman undangan tamu.
        </p>
      </section>
      <TemaPicker
        themes={themes.map((t) => ({
          id: t.id,
          name: t.name,
          tier: t.tier,
          description: t.description,
          previewImageUrl: t.previewImageUrl,
          config: t.config,
        }))}
        selectedId={bundle.event.themeId}
      />
    </div>
  );
}
