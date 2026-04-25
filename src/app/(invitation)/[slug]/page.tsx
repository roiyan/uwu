import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedEventBySlug } from "@/lib/db/queries/events";
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

function extractPalette(config: Record<string, unknown> | null | undefined) {
  const palette = (config?.palette ?? {}) as Record<string, string>;
  return {
    primary: palette.primary ?? "#C06070",
    secondary: palette.secondary ?? "#FAF6F1",
    accent: palette.accent ?? "#D4A574",
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

  const palette = extractPalette(bundle.theme?.config ?? null);

  // NB: we deliberately do not read searchParams here so the page stays
  // static. Guest personalization is resolved on the client via a lightweight
  // server action that looks up by token.
  return (
    <InvitationClient
      event={{
        id: bundle.event.id,
        title: bundle.event.title,
        slug: bundle.event.slug,
        musicUrl: bundle.event.musicUrl,
        // Checkin feature ships separately — the schema column +
        // settings toggle land in a follow-up PR. Until then this
        // satisfies the prop type with the safe default (off).
        checkinEnabled: false,
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

