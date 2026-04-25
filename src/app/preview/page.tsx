import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionUserFast } from "@/lib/auth-guard";
import {
  getCurrentEventForUser,
  getEventBundle,
} from "@/lib/db/queries/events";
import { InvitationClient } from "@/app/(invitation)/[slug]/client";

// Authed preview — unlike /[slug] this never filters by is_published, so the
// couple can see their work-in-progress before they hit publish. Always
// rendered dynamically since it's always auth-gated.
export const dynamic = "force-dynamic";

function extractPalette(config: Record<string, unknown> | null | undefined) {
  const palette = (config?.palette ?? {}) as Record<string, string>;
  return {
    primary: palette.primary ?? "#C06070",
    secondary: palette.secondary ?? "#FAF6F1",
    accent: palette.accent ?? "#D4A574",
  };
}

export default async function PreviewPage() {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) notFound();
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) notFound();

  const palette = extractPalette(bundle.theme?.config ?? null);
  const isPublished = bundle.event.isPublished;

  return (
    <div className="relative">
      <PreviewBanner
        slug={bundle.event.slug}
        isPublished={isPublished}
      />
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
    </div>
  );
}

function PreviewBanner({
  slug,
  isPublished,
}: {
  slug: string;
  isPublished: boolean;
}) {
  return (
    <div
      className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 border-b border-[color:var(--border-ghost)] bg-gold-50 px-4 py-2 text-xs text-gold-dark backdrop-blur"
      role="status"
    >
      <span className="font-medium">
        {isPublished
          ? "🔍 Pratinjau — undangan Anda sudah dipublikasikan."
          : "🔍 Pratinjau — undangan belum dipublikasikan."}
      </span>
      <div className="flex gap-2">
        <Link
          href="/dashboard/website"
          className="rounded-full border border-[color:var(--border-medium)] bg-white px-3 py-1 font-medium text-navy transition-colors hover:bg-surface-muted"
        >
          ← Kembali ke Editor
        </Link>
        {isPublished ? (
          <Link
            href={`/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-navy px-3 py-1 font-medium text-white transition-colors hover:bg-navy-dark"
          >
            Buka versi publik ↗
          </Link>
        ) : (
          <Link
            href="/dashboard/settings?tab=acara"
            className="rounded-full bg-coral px-3 py-1 font-medium text-white transition-colors hover:bg-coral-dark"
          >
            Publikasikan Sekarang
          </Link>
        )}
      </div>
    </div>
  );
}
