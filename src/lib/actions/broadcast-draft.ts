"use server";

import { revalidatePath } from "next/cache";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { broadcastDrafts } from "@/lib/db/schema";
import { withAuth, type ActionResult } from "@/lib/auth-guard";

const MAX_DRAFTS_PER_EVENT = 10;

export type DraftRow = {
  id: string;
  name: string;
  channel: string;
  waMessage: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  aiTone: string | null;
  aiLanguage: string | null;
  aiCulture: string | null;
  aiLength: string | null;
};

export type DraftInput = {
  name?: string;
  channel: string;
  waMessage?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  aiTone?: string | null;
  aiLanguage?: string | null;
  aiCulture?: string | null;
  aiLength?: string | null;
};

/**
 * Persist a new draft for the active event. Caps at 10 per event so
 * the picker stays manageable; the user has to delete an old one to
 * make room. Editor-friendly fields (subject + WA body + email body +
 * AI knobs) all live on the same row so loading a draft restores the
 * full compose state in one query.
 */
export async function saveDraftAction(
  eventId: string,
  input: DraftInput,
): Promise<ActionResult<{ draftId: string }>> {
  return withAuth(eventId, "editor", async () => {
    const [{ total }] = await db
      .select({ total: count() })
      .from(broadcastDrafts)
      .where(eq(broadcastDrafts.eventId, eventId));
    if ((total ?? 0) >= MAX_DRAFTS_PER_EVENT) {
      throw new Error(
        `Maksimal ${MAX_DRAFTS_PER_EVENT} draft. Hapus draft lama dulu.`,
      );
    }

    const fallbackName =
      input.name?.trim() ||
      `Draft ${new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })}`;

    const [row] = await db
      .insert(broadcastDrafts)
      .values({
        eventId,
        name: fallbackName.slice(0, 100),
        channel: input.channel,
        waMessage: input.waMessage ?? null,
        emailSubject: input.emailSubject ?? null,
        emailBody: input.emailBody ?? null,
        aiTone: input.aiTone ?? null,
        aiLanguage: input.aiLanguage ?? null,
        aiCulture: input.aiCulture ?? null,
        aiLength: input.aiLength ?? null,
      })
      .returning({ id: broadcastDrafts.id });

    revalidatePath("/dashboard/messages");
    return { draftId: row.id };
  }) as Promise<ActionResult<{ draftId: string }>>;
}

export async function listDraftsAction(
  eventId: string,
): Promise<ActionResult<DraftRow[]>> {
  return withAuth(eventId, "viewer", async () => {
    const rows = await db
      .select({
        id: broadcastDrafts.id,
        name: broadcastDrafts.name,
        channel: broadcastDrafts.channel,
        waMessage: broadcastDrafts.waMessage,
        emailSubject: broadcastDrafts.emailSubject,
        emailBody: broadcastDrafts.emailBody,
        aiTone: broadcastDrafts.aiTone,
        aiLanguage: broadcastDrafts.aiLanguage,
        aiCulture: broadcastDrafts.aiCulture,
        aiLength: broadcastDrafts.aiLength,
      })
      .from(broadcastDrafts)
      .where(eq(broadcastDrafts.eventId, eventId))
      .orderBy(desc(broadcastDrafts.updatedAt))
      .limit(MAX_DRAFTS_PER_EVENT);
    return rows;
  }) as Promise<ActionResult<DraftRow[]>>;
}

/**
 * Overwrite an existing draft in place — used by the Save Draft modal
 * when the user picks "replace template lama". Atomic UPDATE keeps the
 * draft's id stable so any open dropdown rendering this row doesn't
 * have to remount.
 */
export async function updateDraftAction(
  eventId: string,
  draftId: string,
  input: DraftInput,
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    const fallbackName =
      input.name?.trim() ||
      `Draft ${new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })}`;
    await db
      .update(broadcastDrafts)
      .set({
        name: fallbackName.slice(0, 100),
        channel: input.channel,
        waMessage: input.waMessage ?? null,
        emailSubject: input.emailSubject ?? null,
        emailBody: input.emailBody ?? null,
        aiTone: input.aiTone ?? null,
        aiLanguage: input.aiLanguage ?? null,
        aiCulture: input.aiCulture ?? null,
        aiLength: input.aiLength ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(broadcastDrafts.id, draftId),
          eq(broadcastDrafts.eventId, eventId),
        ),
      );
    revalidatePath("/dashboard/messages");
  });
}

export async function deleteDraftAction(
  eventId: string,
  draftId: string,
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    await db
      .delete(broadcastDrafts)
      .where(
        and(
          eq(broadcastDrafts.id, draftId),
          eq(broadcastDrafts.eventId, eventId),
        ),
      );
    revalidatePath("/dashboard/messages");
  });
}
