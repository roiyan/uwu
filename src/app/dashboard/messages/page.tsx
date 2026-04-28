import { redirect } from "next/navigation";
import Link from "next/link";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { guests } from "@/lib/db/schema";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { listGuestGroups } from "@/lib/db/queries/guests";
import { getBroadcastHistory } from "@/lib/actions/broadcast";
import { listDraftsAction } from "@/lib/actions/broadcast-draft";
import { MESSAGE_TEMPLATES } from "@/lib/templates/messages";
import { isWhatsAppConfigured } from "@/lib/providers/whatsapp";
import { isEmailConfigured } from "@/lib/providers/email";
import { MessagesClient } from "./client";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  const params = await searchParams;
  const presetGroupId = params.group ?? null;

  const [groups, history, groupCounts, alreadySentRow, recipientSample] =
    await Promise.all([
    listGuestGroups(current.event.id),
    getBroadcastHistory(current.event.id),
    // Per-group live guest counts — rendered next to each checkbox so
    // the user can see group size before picking recipients.
    db
      .select({
        groupId: guests.groupId,
        liveCount: count(),
      })
      .from(guests)
      .where(
        and(
          eq(guests.eventId, current.event.id),
          isNull(guests.deletedAt),
          sql`${guests.groupId} IS NOT NULL`,
        ),
      )
      .groupBy(guests.groupId),
    // Count of guests already invited at least once. Used by the
    // "Sertakan yang sudah diundang" toggle info message.
    db
      .select({ total: count() })
      .from(guests)
      .where(
        and(
          eq(guests.eventId, current.event.id),
          isNull(guests.deletedAt),
          sql`${guests.sendCount} > 0`,
        ),
      ),
    // Recipient sample for the client-side preview/navigator. Capped
    // at 200 — keeps the payload small while covering realistic
    // wedding sizes; client filters this by audience selection.
    db
      .select({
        id: guests.id,
        name: guests.name,
        nickname: guests.nickname,
        phone: guests.phone,
        email: guests.email,
        token: guests.token,
        groupId: guests.groupId,
        rsvpStatus: guests.rsvpStatus,
        sendCount: guests.sendCount,
      })
      .from(guests)
      .where(
        and(eq(guests.eventId, current.event.id), isNull(guests.deletedAt)),
      )
      .orderBy(asc(guests.createdAt))
      .limit(200),
    ]);
  const countByGroupId = new Map(
    groupCounts.map((r) => [r.groupId!, r.liveCount]),
  );

  // Saved drafts for the "Pakai Template" picker. Soft-fail to []
  // so a slow auth check on this auxiliary fetch never blocks the
  // primary compose surface.
  const draftsRes = await listDraftsAction(current.event.id);
  const drafts = draftsRes.ok && draftsRes.data ? draftsRes.data : [];
  const alreadySentCount = alreadySentRow[0]?.total ?? 0;

  const cp = bundle.event.culturalPreference;

  // Event context used by the client-side preview renderer. We format
  // the date the same way broadcast.ts does so preview matches the
  // eventual server-personalised body.
  const firstSchedule = bundle.schedules[0];
  const dateStr = firstSchedule
    ? new Date(`${firstSchedule.eventDate}T00:00:00Z`).toLocaleDateString(
        "id-ID",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        },
      )
    : "(tanggal menyusul)";
  const venueStr = firstSchedule?.venueName ?? "(lokasi menyusul)";
  const eventContext = {
    slug: bundle.event.slug,
    bride: bundle.couple?.brideName ?? "Mempelai Wanita",
    groom: bundle.couple?.groomName ?? "Mempelai Pria",
    date: dateStr,
    venue: venueStr,
  };

  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-px w-7 bg-[var(--d-coral)]"
            />
            <p className="d-eyebrow">Broadcast · Personal &amp; Massal</p>
          </div>
          <h1 className="d-serif mt-3.5 text-[clamp(36px,4.5vw,54px)] font-extralight leading-[1] tracking-[-0.025em] text-[var(--d-ink)]">
            Sampaikan kabar{" "}
            <em className="d-serif italic text-[var(--d-coral)]">bahagia</em>{" "}
            kalian.
          </h1>
          <p className="d-serif mt-3.5 max-w-[60ch] text-[14px] italic leading-relaxed text-[var(--d-ink-dim)]">
            Kirim via WhatsApp atau Email — manual satu-per-satu, atau
            otomatis lewat WhatsApp Business API. Setiap pesan
            dipersonalisasi otomatis.
          </p>
        </div>
        <Link
          href="/dashboard/guests"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] bg-transparent px-[18px] py-[11px] text-[13px] text-[var(--d-ink)] transition-colors hover:border-[var(--d-ink-dim)] hover:bg-[rgba(255,255,255,0.03)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          Kelola Tamu
        </Link>
      </header>

      <MessagesClient
        eventId={bundle.event.id}
        isPublished={bundle.event.isPublished}
        culturalPreference={cp}
        templates={MESSAGE_TEMPLATES}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
          liveCount: countByGroupId.get(g.id) ?? 0,
        }))}
        // Pre-select audience from /dashboard/messages?group=<id> deep link
        // (the per-group "KIRIM GRUP" button on the Tamu page). Only applied
        // if the id matches an existing group.
        presetGroupId={
          presetGroupId &&
          groups.some((g) => g.id === presetGroupId)
            ? presetGroupId
            : null
        }
        alreadySentCount={alreadySentCount}
        recipientSample={recipientSample}
        eventContext={eventContext}
        drafts={drafts}
        history={history.map((h) => {
          // Resolve a friendly audience label so the riwayat list can
          // show "Grup: VIP, Keluarga" instead of raw JSON.
          let audienceLabel = "Semua tamu";
          if (h.audience.type === "group") {
            const names = h.audience.groupIds
              .map((gid) => groups.find((g) => g.id === gid)?.name)
              .filter((n): n is string => Boolean(n));
            audienceLabel =
              names.length > 0 ? `Grup: ${names.join(", ")}` : "Grup terpilih";
          } else if (h.audience.type === "status") {
            audienceLabel = `Status: ${h.audience.statuses.join(", ")}`;
          }
          return {
            id: h.id,
            channel: h.channel,
            templateSlug: h.templateSlug,
            status: h.status,
            totalRecipients: h.totalRecipients,
            sentCount: h.sentCount,
            failedCount: h.failedCount,
            createdAt: h.createdAt.toISOString(),
            scheduledAt: h.scheduledAt
              ? h.scheduledAt.toISOString()
              : null,
            subject: h.subject,
            audienceLabel,
          };
        })}
        providers={{
          whatsappConfigured: isWhatsAppConfigured(),
          emailConfigured: isEmailConfigured(),
          // Drives the "✨ Bantu Tulis" button visibility. We don't
          // ship the key to the client — just whether it exists.
          aiAvailable: Boolean(process.env.GEMINI_API_KEY),
        }}
      />
    </main>
  );
}
