import { redirect } from "next/navigation";
import Link from "next/link";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { guests } from "@/lib/db/schema";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { listGuestGroups } from "@/lib/db/queries/guests";
import { listBroadcastsForEvent } from "@/lib/actions/broadcast";
import { MESSAGE_TEMPLATES } from "@/lib/templates/messages";
import { isWhatsAppConfigured } from "@/lib/providers/whatsapp";
import { isEmailConfigured } from "@/lib/providers/email";
import { MessagesClient } from "./client";

export default async function MessagesPage() {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  const [groups, history, groupCounts, alreadySentRow, recipientSample] =
    await Promise.all([
    listGuestGroups(current.event.id),
    listBroadcastsForEvent(current.event.id),
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
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-navy">Kirim Undangan</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Kirim undangan via WhatsApp atau Email. Template otomatis disesuaikan
            dengan preferensi budaya acara Anda.
          </p>
        </div>
        <Link
          href="/dashboard/guests"
          className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
        >
          Kelola Tamu
        </Link>
      </header>

      <MessagesClient
        eventId={bundle.event.id}
        culturalPreference={cp}
        templates={MESSAGE_TEMPLATES}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
          liveCount: countByGroupId.get(g.id) ?? 0,
        }))}
        alreadySentCount={alreadySentCount}
        recipientSample={recipientSample}
        eventContext={eventContext}
        history={history.map((h) => ({
          id: h.id,
          channel: h.channel,
          templateSlug: h.templateSlug,
          status: h.status,
          totalRecipients: h.totalRecipients,
          sentCount: h.sentCount,
          failedCount: h.failedCount,
          createdAt: h.createdAt.toISOString(),
          scheduledAt: h.scheduledAt ? h.scheduledAt.toISOString() : null,
          subject: h.subject,
        }))}
        providers={{
          whatsappConfigured: isWhatsAppConfigured(),
          emailConfigured: isEmailConfigured(),
          // Drives the "✨ Bantu Tulis" button visibility. We don't
          // ship the key to the client — just whether it exists.
          aiAvailable: Boolean(process.env.ANTHROPIC_API_KEY),
        }}
      />
    </main>
  );
}
