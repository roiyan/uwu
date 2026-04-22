import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAuthedUser } from "@/lib/auth-guard";
import {
  getCurrentEventForUser,
  getEventBundle,
  listThemes,
} from "@/lib/db/queries/events";
import { Stepper } from "@/components/onboarding/Stepper";
import { TemaPicker } from "./picker";

export default function TemaStep() {
  return (
    <div>
      <Stepper
        current="tema"
        reached={["mempelai", "jadwal", "tema"]}
      />
      <section className="mt-10">
        <h1 className="font-display text-3xl text-white">
          Pilih <span className="italic text-gradient">tema</span> undangan
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Anda bisa mengubah tema setelah ini. Tema akan mewarnai halaman undangan tamu.
        </p>
      </section>
      <Suspense fallback={<PickerSkeleton />}>
        <TemaPickerLoader />
      </Suspense>
    </div>
  );
}

// Loader tolerates missing or still-propagating data — the previous step's
// UPDATE may still be committing when the user arrives (fire-and-forget).
// Only bounce back when we're confident the event itself doesn't exist.
async function TemaPickerLoader() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");

  const [bundle, themes] = await Promise.all([
    getEventBundle(current.event.id),
    listThemes(),
  ]);
  if (!bundle || !bundle.couple) redirect("/onboarding/mempelai");

  return (
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
  );
}

function PickerSkeleton() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-72 animate-pulse rounded-2xl bg-white/5"
        />
      ))}
    </div>
  );
}
