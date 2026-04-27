import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAuthedUser } from "@/lib/auth-guard";
import {
  getCurrentEventForUser,
  getEventBundle,
  listThemes,
} from "@/lib/db/queries/events";
import { StepHeader } from "../components/step-header";
import { HydratePreview } from "../components/preview-store";
import { TemaPicker } from "./picker";

export default function TemaStep() {
  return (
    <div>
      <StepHeader
        eyebrow="Bab ketiga — palet & rasa"
        title={
          <>
            Temukan{" "}
            <em className="ob-serif italic text-[var(--ob-coral)]">mood</em>{" "}
            cerita kalian.
          </>
        }
        sub="Kalian bisa mengubah tema setelah ini. Tema akan mewarnai halaman undangan tamu."
      />
      <Suspense fallback={<PickerSkeleton />}>
        <TemaPickerLoader />
      </Suspense>
    </div>
  );
}

// Loader tolerates missing or still-propagating data — the previous step's
// UPDATE may still be committing when the user arrives (fire-and-forget).
async function TemaPickerLoader() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");

  const [bundle, themes] = await Promise.all([
    getEventBundle(current.event.id),
    listThemes(),
  ]);
  if (!bundle || !bundle.couple) redirect("/onboarding/mempelai");

  // Match the picked theme's name back to a slug for the live preview.
  const pickedTheme = themes.find((t) => t.id === bundle.event.themeId);
  const themeSlug = pickedTheme
    ? pickedTheme.name.toLowerCase().split(/\s+/)[0] ?? null
    : null;

  return (
    <>
      <HydratePreview
        brideName={bundle.couple.brideName}
        brideNickname={bundle.couple.brideNickname ?? ""}
        groomName={bundle.couple.groomName}
        groomNickname={bundle.couple.groomNickname ?? ""}
        eventDate={bundle.schedules[0]?.eventDate ?? ""}
        venue={bundle.schedules[0]?.venueName ?? ""}
        themeSlug={themeSlug}
      />
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
    </>
  );
}

function PickerSkeleton() {
  return (
    <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-80 animate-pulse rounded-[18px] border border-[var(--ob-line)] bg-[var(--ob-bg-card)]"
        />
      ))}
    </div>
  );
}
