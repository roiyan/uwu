import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedEventBySlug } from "@/lib/db/queries/events";
import { listPublicGiftAccountsAction } from "@/lib/actions/gift";
import { listPublicGalleryImages } from "@/lib/actions/gallery";
import { InvitationClient } from "./client";

// Static shell revalidates every 5 min; guest personalisation is fetched per
// request client-side via ?to=<token>.
export const revalidate = 300;
export const dynamic = "force-static";
export const dynamicParams = true;

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getPublishedEventBySlug(slug);
  if (!bundle) return { title: "Undangan" };
  return {
    title: `${bundle.event.title} | Undangan Pernikahan`,
    description: `Anda diundang ke pernikahan ${bundle.event.title}.`,
  };
}

// Resolve the public invitation palette by layering, in order of
// precedence: the per-event override (`eventThemeConfigs.config`) on
// top of the theme default, falling back to a hard-coded ivory palette
// when neither is set. The override is what the Website Editor's
// "Kustomisasi Warna" panel writes — without merging it here the
// public invitation would always render the theme's seeded defaults.
function resolvePalette(
  themeConfig: Record<string, unknown> | null | undefined,
  override: Record<string, unknown> | null | undefined,
) {
  const themePalette = (themeConfig?.palette ?? {}) as Record<string, string>;
  const overridePalette = (override?.palette ?? {}) as Record<string, string>;
  return {
    primary:
      overridePalette.primary ?? themePalette.primary ?? "#C06070",
    secondary:
      overridePalette.secondary ?? themePalette.secondary ?? "#FAF6F1",
    accent:
      overridePalette.accent ?? themePalette.accent ?? "#D4A574",
  };
}

export default async function InvitationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const bundle = await getPublishedEventBySlug(slug);
  if (!bundle) notFound();

  const palette = resolvePalette(
    bundle.theme?.config ?? null,
    bundle.themeConfig?.config ?? null,
  );
  const [giftAccounts, galleryImages] = await Promise.all([
    listPublicGiftAccountsAction(bundle.event.id),
    listPublicGalleryImages(bundle.event.id),
  ]);

  // NB: we deliberately do not read searchParams here so the page stays
  // static. Guest personalization is resolved on the client via a lightweight
  // server action that looks up by token.
  return (
    <InvitationClient
      giftAccounts={giftAccounts}
      galleryImages={galleryImages}
      event={{
        id: bundle.event.id,
        title: bundle.event.title,
        slug: bundle.event.slug,
        musicUrl: bundle.event.musicUrl,
        checkinEnabled: bundle.event.checkinEnabled,
      }}
      palette={palette}
      couple={
        bundle.couple
          ? {
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
            }
          : null
      }
      schedules={bundle.schedules.map((s) => ({
        label: s.label,
        eventDate: s.eventDate,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: s.timezone,
        venueName: s.venueName,
        venueAddress: s.venueAddress,
        venueMapUrl: s.venueMapUrl,
      }))}
    />
  );
}

