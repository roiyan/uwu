"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLogs, profiles } from "@/lib/db/schema";
import { getSessionUserFast } from "@/lib/auth-guard";

export type ActivityAction =
  | "update_couple"
  | "update_schedule"
  | "update_theme"
  | "update_website"
  | "add_guest"
  | "update_guest"
  | "delete_guest"
  | "import_guests"
  | "send_broadcast"
  | "upload_photo"
  | "update_settings"
  | "publish_event"
  | "unpublish_event"
  | "checkin_guest"
  | "invite_partner"
  | "revoke_partner"
  | "accept_invite"
  | "leave_event"
  | "regenerate_link";

// Fire-and-forget activity log. NEVER blocks the calling action — wrap in
// try/catch and log silently on error. Call after the main operation
// succeeds; do not await from a hot path.
export async function logActivity(params: {
  eventId: string;
  action: ActivityAction;
  summary: string;
  targetType?: string;
  targetId?: string;
}): Promise<void> {
  try {
    const user = await getSessionUserFast();
    if (!user) return;

    // Pull the display name from profiles; fall back to email.
    const [profile] = await db
      .select({ fullName: profiles.fullName, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    await db.insert(activityLogs).values({
      eventId: params.eventId,
      userId: user.id,
      userEmail: profile?.email ?? user.email ?? "unknown",
      userName: profile?.fullName ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      summary: params.summary,
    });
  } catch (err) {
    console.error("[logActivity]", err);
  }
}

export async function getRecentActivity(eventId: string, limit = 10) {
  return db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.eventId, eventId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}
