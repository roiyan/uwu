import { redirect } from "next/navigation";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { resolveSectionOrder } from "@/lib/theme/sections";
import { EditorSplit, type EditorDefaults } from "./EditorSplit";

function extractPalette(config: Record<string, unknown> | null | undefined) {
  const palette = (config?.palette ?? {}) as Record<string, string>;
  return {
    primary: palette.primary ?? "#C06070",
    secondary: palette.secondary ?? "#FAF6F1",
    accent: palette.accent ?? "#D4A574",
  };
}

export default async function WebsiteEditorPage() {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle?.couple) redirect("/onboarding");

  // Resolve the persisted section order; falls back to the default
  // permutation when no override is set or the stored value is dirty.
  const themeConfigRaw = bundle.themeConfig?.config as
    | { sectionOrder?: unknown }
    | null
    | undefined;
  const sectionOrder = [
    ...resolveSectionOrder(themeConfigRaw?.sectionOrder),
  ];

  const defaults: EditorDefaults = {
    event: {
      id: bundle.event.id,
      title: bundle.event.title,
      slug: bundle.event.slug,
      musicUrl: bundle.event.musicUrl,
    },
    sectionOrder,
    palette: extractPalette(bundle.theme?.config ?? null),
    couple: {
      brideName: bundle.couple.brideName,
      brideNickname: bundle.couple.brideNickname,
      bridePhotoUrl: bundle.couple.bridePhotoUrl,
      brideFatherName: bundle.couple.brideFatherName,
      brideMotherName: bundle.couple.brideMotherName,
      groomName: bundle.couple.groomName,
      groomNickname: bundle.couple.groomNickname,
      groomPhotoUrl: bundle.couple.groomPhotoUrl,
      groomFatherName: bundle.couple.groomFatherName,
      groomMotherName: bundle.couple.groomMotherName,
      coverPhotoUrl: bundle.couple.coverPhotoUrl,
      story: bundle.couple.story,
      quote: bundle.couple.quote,
    },
    schedules: bundle.schedules.map((s) => ({
      label: s.label,
      eventDate: s.eventDate,
      startTime: s.startTime,
      endTime: s.endTime,
      timezone: s.timezone,
      venueName: s.venueName,
      venueAddress: s.venueAddress,
      venueMapUrl: s.venueMapUrl,
    })),
  };

  return <EditorSplit defaults={defaults} />;
}
