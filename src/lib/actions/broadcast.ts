"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  couples,
  eventSchedules,
  events,
  guests,
  messageDeliveries,
  messages,
} from "@/lib/db/schema";
import { withAuth, type ActionResult } from "@/lib/auth-guard";
import { broadcastInputSchema } from "@/lib/schemas/broadcast";
import { renderTemplate } from "@/lib/templates/messages";
import { sendWhatsAppText } from "@/lib/providers/whatsapp";
import { sendEmail } from "@/lib/providers/email";

const WA_RATE_LIMIT_MS = 1500;

async function resolveEventContext(eventId: string) {
  const [row] = await db
    .select({
      event: events,
      couple: couples,
    })
    .from(events)
    .leftJoin(couples, eq(couples.eventId, events.id))
    .where(eq(events.id, eventId))
    .limit(1);
  if (!row) throw new Error("Event not found");

  const schedules = await db
    .select()
    .from(eventSchedules)
    .where(eq(eventSchedules.eventId, eventId))
    .orderBy(asc(eventSchedules.sortOrder));

  return { event: row.event, couple: row.couple, firstSchedule: schedules[0] };
}

async function selectRecipients(
  eventId: string,
  channel: "whatsapp" | "email",
  audience: ReturnType<typeof JSON.parse>,
  resendMode: "new_only" | "include_sent" = "new_only",
) {
  const conditions = [eq(guests.eventId, eventId), isNull(guests.deletedAt)];
  if (audience.type === "group") {
    conditions.push(inArray(guests.groupId, audience.groupIds));
  } else if (audience.type === "status") {
    conditions.push(inArray(guests.rsvpStatus, audience.statuses));
  }
  // Default: skip guests already invited at least once. User can flip
  // this with the "Sertakan yang sudah diundang" toggle in the UI.
  if (resendMode === "new_only") {
    conditions.push(eq(guests.sendCount, 0));
  }
  const rows = await db
    .select()
    .from(guests)
    .where(and(...conditions));

  if (channel === "whatsapp") {
    return rows.filter((r) => r.phone && r.phone.trim().length > 0);
  }
  return rows.filter((r) => r.email && r.email.trim().length > 0);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function createBroadcastAction(
  eventId: string,
  _: ActionResult<{ messageId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ messageId: string }>> {
  const audienceRaw = formData.get("audience");
  let audience: unknown;
  try {
    audience = JSON.parse(String(audienceRaw ?? "{}"));
  } catch {
    return { ok: false, error: "Audiens tidak valid" };
  }

  const parsed = broadcastInputSchema.safeParse({
    channel: formData.get("channel"),
    templateSlug: formData.get("templateSlug"),
    subject: formData.get("subject") ?? "",
    body: formData.get("body"),
    audience,
    resendMode: formData.get("resendMode") ?? "new_only",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  return withAuth(eventId, "editor", async (userId) => {
    const ctx = await resolveEventContext(eventId);
    if (!ctx.couple) throw new Error("Detail mempelai belum diisi.");

    const recipients = await selectRecipients(
      eventId,
      parsed.data.channel,
      parsed.data.audience,
      parsed.data.resendMode,
    );
    if (recipients.length === 0) {
      throw new Error(
        parsed.data.channel === "whatsapp"
          ? "Tidak ada tamu dengan nomor WhatsApp pada audiens terpilih."
          : "Tidak ada tamu dengan email pada audiens terpilih.",
      );
    }

    const dateStr = ctx.firstSchedule
      ? formatDate(ctx.firstSchedule.eventDate)
      : "(tanggal menyusul)";
    const venueStr = ctx.firstSchedule?.venueName ?? "(lokasi menyusul)";

    const [created] = await db
      .insert(messages)
      .values({
        eventId,
        channel: parsed.data.channel,
        templateSlug: parsed.data.templateSlug,
        subject: parsed.data.subject || null,
        body: parsed.data.body,
        audience: parsed.data.audience,
        status: "queued",
        totalRecipients: recipients.length,
        createdByUserId: userId,
      })
      .returning({ id: messages.id });
    const messageId = created.id;

    await db.insert(messageDeliveries).values(
      recipients.map((g) => ({
        messageId,
        guestId: g.id,
        recipientName: g.name,
        recipientPhone: g.phone,
        recipientEmail: g.email,
        personalisedBody: renderTemplate(parsed.data.body, {
          name: g.name,
          nickname: g.nickname,
          bride: ctx.couple!.brideName,
          groom: ctx.couple!.groomName,
          date: dateStr,
          venue: venueStr,
          link: `${appUrl()}/${ctx.event.slug}?to=${g.token}`,
        }),
        status: "pending" as const,
      })),
    );

    return { messageId };
  }).then((r) => {
    if (r.ok) {
      revalidatePath("/dashboard/messages");
    }
    return r;
  });
}

async function processWhatsappBatch(messageId: string) {
  const pending = await db
    .select()
    .from(messageDeliveries)
    .where(
      and(
        eq(messageDeliveries.messageId, messageId),
        eq(messageDeliveries.status, "pending"),
      ),
    )
    .orderBy(asc(messageDeliveries.createdAt));

  for (const d of pending) {
    if (!d.recipientPhone) continue;
    const result = await sendWhatsAppText({
      to: d.recipientPhone,
      body: d.personalisedBody,
    });
    if (result.ok) {
      await db
        .update(messageDeliveries)
        .set({
          status: "sent",
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          attemptCount: sql`${messageDeliveries.attemptCount} + 1`,
        })
        .where(eq(messageDeliveries.id, d.id));
      // Bump guest status from 'baru' → 'diundang' and update the
      // denormalized per-guest send tracking (Sprint A).
      if (d.guestId) {
        await db
          .update(guests)
          .set({
            rsvpStatus: sql`case when ${guests.rsvpStatus} = 'baru' then 'diundang'::guest_rsvp_status else ${guests.rsvpStatus} end`,
            invitedAt: sql`coalesce(${guests.invitedAt}, now())`,
            sendCount: sql`${guests.sendCount} + 1`,
            lastSentAt: new Date(),
            lastSentVia: "whatsapp",
          })
          .where(eq(guests.id, d.guestId));
      }
    } else {
      await db
        .update(messageDeliveries)
        .set({
          status: "failed",
          errorMessage: result.error,
          failedAt: new Date(),
          attemptCount: sql`${messageDeliveries.attemptCount} + 1`,
        })
        .where(eq(messageDeliveries.id, d.id));
    }
    await new Promise((r) => setTimeout(r, WA_RATE_LIMIT_MS));
  }
}

async function processEmailBatch(messageId: string) {
  const [msg] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!msg) return;

  const pending = await db
    .select()
    .from(messageDeliveries)
    .where(
      and(
        eq(messageDeliveries.messageId, messageId),
        eq(messageDeliveries.status, "pending"),
      ),
    )
    .orderBy(asc(messageDeliveries.createdAt));

  for (const d of pending) {
    if (!d.recipientEmail) continue;
    const result = await sendEmail({
      to: d.recipientEmail,
      toName: d.recipientName,
      subject: msg.subject ?? "Undangan Pernikahan",
      bodyText: d.personalisedBody,
    });
    if (result.ok) {
      await db
        .update(messageDeliveries)
        .set({
          status: "sent",
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          attemptCount: sql`${messageDeliveries.attemptCount} + 1`,
        })
        .where(eq(messageDeliveries.id, d.id));
      if (d.guestId) {
        await db
          .update(guests)
          .set({
            rsvpStatus: sql`case when ${guests.rsvpStatus} = 'baru' then 'diundang'::guest_rsvp_status else ${guests.rsvpStatus} end`,
            invitedAt: sql`coalesce(${guests.invitedAt}, now())`,
            sendCount: sql`${guests.sendCount} + 1`,
            lastSentAt: new Date(),
            lastSentVia: "email",
          })
          .where(eq(guests.id, d.guestId));
      }
    } else {
      await db
        .update(messageDeliveries)
        .set({
          status: "failed",
          errorMessage: result.error,
          failedAt: new Date(),
          attemptCount: sql`${messageDeliveries.attemptCount} + 1`,
        })
        .where(eq(messageDeliveries.id, d.id));
    }
  }
}

export async function runBroadcastAction(
  eventId: string,
  messageId: string,
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    const [msg] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.eventId, eventId)))
      .limit(1);
    if (!msg) throw new Error("Broadcast tidak ditemukan");
    if (msg.status === "sending" || msg.status === "completed") {
      throw new Error("Broadcast sudah dijalankan.");
    }

    await db
      .update(messages)
      .set({ status: "sending", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(messages.id, messageId));

    if (msg.channel === "whatsapp") {
      await processWhatsappBatch(messageId);
    } else {
      await processEmailBatch(messageId);
    }

    const [counts] = await db
      .select({
        sent: sql<number>`count(*) filter (where status = 'sent')::int`,
        failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      })
      .from(messageDeliveries)
      .where(eq(messageDeliveries.messageId, messageId));

    await db
      .update(messages)
      .set({
        status: (counts?.failed ?? 0) > 0 && (counts?.sent ?? 0) === 0 ? "failed" : "completed",
        sentCount: counts?.sent ?? 0,
        failedCount: counts?.failed ?? 0,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }).then((r) => {
    // Broadcast send touches messages + guests (delivery status), not
    // sidebar data. Was previously also wiping the dashboard layout
    // subtree — removed to keep navigation cache warm.
    if (r.ok) {
      revalidatePath("/dashboard/messages");
      revalidatePath("/dashboard/guests");
    }
    return r;
  });
}

export async function retryFailedDeliveriesAction(
  eventId: string,
  messageId: string,
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    await db
      .update(messageDeliveries)
      .set({ status: "pending" })
      .where(
        and(
          eq(messageDeliveries.messageId, messageId),
          eq(messageDeliveries.status, "failed"),
        ),
      );
    await db
      .update(messages)
      .set({ status: "queued", updatedAt: new Date() })
      .where(eq(messages.id, messageId));
  }).then((r) => {
    if (r.ok) revalidatePath("/dashboard/messages");
    return r;
  });
}

export async function listBroadcastsForEvent(eventId: string) {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.eventId, eventId))
    .orderBy(desc(messages.createdAt))
    .limit(30);
  return rows;
}

export async function listDeliveriesForMessage(messageId: string) {
  return db
    .select()
    .from(messageDeliveries)
    .where(eq(messageDeliveries.messageId, messageId))
    .orderBy(asc(messageDeliveries.createdAt));
}

/**
 * Mark a single delivery as sent — used by the client-side WA fallback
 * sender (api.whatsapp.com/send tab opener mode). Mirrors the
 * bookkeeping that processWhatsappBatch / processEmailBatch do
 * server-side, but for one delivery at a time so the client can drive
 * the loop with user pacing.
 */
export async function markDeliverySentAction(
  eventId: string,
  deliveryId: string,
  channel: "whatsapp" | "email",
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    const [d] = await db
      .select()
      .from(messageDeliveries)
      .where(eq(messageDeliveries.id, deliveryId))
      .limit(1);
    if (!d) throw new Error("Delivery tidak ditemukan.");

    // Cross-check the delivery belongs to a message on this event so
    // a stray ID can't update someone else's data.
    const [msg] = await db
      .select({ id: messages.id, eventId: messages.eventId })
      .from(messages)
      .where(eq(messages.id, d.messageId))
      .limit(1);
    if (!msg || msg.eventId !== eventId) {
      throw new Error("Delivery bukan milik acara ini.");
    }

    await db
      .update(messageDeliveries)
      .set({
        status: "sent",
        sentAt: new Date(),
        attemptCount: sql`${messageDeliveries.attemptCount} + 1`,
      })
      .where(eq(messageDeliveries.id, deliveryId));

    if (d.guestId) {
      await db
        .update(guests)
        .set({
          rsvpStatus: sql`case when ${guests.rsvpStatus} = 'baru' then 'diundang'::guest_rsvp_status else ${guests.rsvpStatus} end`,
          invitedAt: sql`coalesce(${guests.invitedAt}, now())`,
          sendCount: sql`${guests.sendCount} + 1`,
          lastSentAt: new Date(),
          lastSentVia: channel,
        })
        .where(eq(guests.id, d.guestId));
    }

    // After the last delivery flips to sent/failed, mark the parent
    // message as completed so the history card stops showing "queued".
    const [{ pendingCount }] = await db
      .select({ pendingCount: sql<number>`count(*)::int` })
      .from(messageDeliveries)
      .where(
        and(
          eq(messageDeliveries.messageId, d.messageId),
          eq(messageDeliveries.status, "pending"),
        ),
      );

    if (pendingCount === 0) {
      const [{ sentCount }] = await db
        .select({ sentCount: sql<number>`count(*)::int` })
        .from(messageDeliveries)
        .where(
          and(
            eq(messageDeliveries.messageId, d.messageId),
            eq(messageDeliveries.status, "sent"),
          ),
        );
      await db
        .update(messages)
        .set({
          status: "completed",
          completedAt: new Date(),
          sentCount,
          updatedAt: new Date(),
        })
        .where(eq(messages.id, d.messageId));
    } else {
      // Keep the running tally fresh while we're mid-flight.
      await db
        .update(messages)
        .set({
          status: "sending",
          startedAt: sql`coalesce(${messages.startedAt}, now())`,
          sentCount: sql`(select count(*)::int from ${messageDeliveries} where ${messageDeliveries.messageId} = ${d.messageId} and ${messageDeliveries.status} = 'sent')`,
          updatedAt: new Date(),
        })
        .where(eq(messages.id, d.messageId));
    }
  });
}

/**
 * Mark a single delivery as skipped — used by the client-side WA
 * fallback when a guest has no phone or the user clicks Skip. Just
 * advances the delivery without bumping the guest's send_count.
 */
export async function markDeliverySkippedAction(
  eventId: string,
  deliveryId: string,
  reason: string,
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    const [d] = await db
      .select()
      .from(messageDeliveries)
      .where(eq(messageDeliveries.id, deliveryId))
      .limit(1);
    if (!d) throw new Error("Delivery tidak ditemukan.");

    const [msg] = await db
      .select({ id: messages.id, eventId: messages.eventId })
      .from(messages)
      .where(eq(messages.id, d.messageId))
      .limit(1);
    if (!msg || msg.eventId !== eventId) {
      throw new Error("Delivery bukan milik acara ini.");
    }

    await db
      .update(messageDeliveries)
      .set({
        status: "failed",
        failedAt: new Date(),
        errorMessage: reason.slice(0, 500),
        attemptCount: sql`${messageDeliveries.attemptCount} + 1`,
      })
      .where(eq(messageDeliveries.id, deliveryId));
  });
}
