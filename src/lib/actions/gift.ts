"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftAccounts, giftConfirmations } from "@/lib/db/schema";
import { withAuth, type ActionResult } from "@/lib/auth-guard";

const ALLOWED_TYPES = ["bank", "ewallet"] as const;

export type GiftAccountInput = {
  type: "bank" | "ewallet";
  provider: string;
  accountName: string;
  accountNumber: string;
};

export type GiftAccountRow = {
  id: string;
  type: string;
  provider: string;
  accountName: string;
  accountNumber: string;
  isActive: boolean;
  sortOrder: number;
};

function sanitize(s: string, max: number): string {
  return s.trim().slice(0, max);
}

// ---------------- Authenticated (dashboard) ----------------

export async function listGiftAccountsAction(
  eventId: string,
): Promise<ActionResult<GiftAccountRow[]>> {
  return withAuth(eventId, "viewer", async () => {
    const rows = await db
      .select()
      .from(giftAccounts)
      .where(eq(giftAccounts.eventId, eventId))
      .orderBy(asc(giftAccounts.sortOrder), asc(giftAccounts.createdAt));
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      provider: r.provider,
      accountName: r.accountName,
      accountNumber: r.accountNumber,
      isActive: r.isActive ?? true,
      sortOrder: r.sortOrder ?? 0,
    }));
  });
}

export async function addGiftAccountAction(
  eventId: string,
  input: GiftAccountInput,
): Promise<ActionResult<{ id: string }>> {
  if (!ALLOWED_TYPES.includes(input.type))
    return { ok: false, error: "Tipe tidak dikenali." };
  const provider = sanitize(input.provider, 50);
  const accountName = sanitize(input.accountName, 100);
  const accountNumber = sanitize(input.accountNumber, 50);
  if (!provider || !accountName || !accountNumber) {
    return { ok: false, error: "Semua kolom wajib diisi." };
  }
  return withAuth(eventId, "editor", async () => {
    const [row] = await db
      .insert(giftAccounts)
      .values({
        eventId,
        type: input.type,
        provider,
        accountName,
        accountNumber,
      })
      .returning({ id: giftAccounts.id });
    revalidatePath("/dashboard/amplop");
    return { id: row.id };
  });
}

export async function updateGiftAccountAction(
  eventId: string,
  id: string,
  input: Partial<GiftAccountInput> & { isActive?: boolean },
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.type && ALLOWED_TYPES.includes(input.type)) patch.type = input.type;
    if (input.provider) patch.provider = sanitize(input.provider, 50);
    if (input.accountName) patch.accountName = sanitize(input.accountName, 100);
    if (input.accountNumber)
      patch.accountNumber = sanitize(input.accountNumber, 50);
    if (typeof input.isActive === "boolean") patch.isActive = input.isActive;
    await db
      .update(giftAccounts)
      .set(patch)
      .where(
        and(eq(giftAccounts.id, id), eq(giftAccounts.eventId, eventId)),
      );
    revalidatePath("/dashboard/amplop");
  });
}

export async function deleteGiftAccountAction(
  eventId: string,
  id: string,
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    await db
      .delete(giftAccounts)
      .where(
        and(eq(giftAccounts.id, id), eq(giftAccounts.eventId, eventId)),
      );
    revalidatePath("/dashboard/amplop");
  });
}

export type GiftConfirmationRow = {
  id: string;
  guestName: string;
  guestMessage: string | null;
  accountProvider: string | null;
  accountName: string | null;
  amount: number | null;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
};

export async function listGiftConfirmationsAction(
  eventId: string,
): Promise<ActionResult<GiftConfirmationRow[]>> {
  return withAuth(eventId, "viewer", async () => {
    const rows = await db
      .select({
        id: giftConfirmations.id,
        guestName: giftConfirmations.guestName,
        guestMessage: giftConfirmations.guestMessage,
        amount: giftConfirmations.amount,
        status: giftConfirmations.status,
        createdAt: giftConfirmations.createdAt,
        confirmedAt: giftConfirmations.confirmedAt,
        accountProvider: giftAccounts.provider,
        accountName: giftAccounts.accountName,
      })
      .from(giftConfirmations)
      .leftJoin(
        giftAccounts,
        eq(giftAccounts.id, giftConfirmations.accountId),
      )
      .where(eq(giftConfirmations.eventId, eventId))
      .orderBy(desc(giftConfirmations.createdAt));
    return rows.map((r) => ({
      id: r.id,
      guestName: r.guestName,
      guestMessage: r.guestMessage,
      accountProvider: r.accountProvider,
      accountName: r.accountName,
      amount: r.amount,
      status: r.status ?? "pending",
      createdAt: (r.createdAt ?? new Date()).toISOString(),
      confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
    }));
  });
}

export async function setGiftConfirmationStatusAction(
  eventId: string,
  id: string,
  status: "pending" | "verified" | "rejected",
): Promise<ActionResult> {
  return withAuth(eventId, "editor", async () => {
    await db
      .update(giftConfirmations)
      .set({
        status,
        confirmedAt: status === "verified" ? new Date() : null,
      })
      .where(
        and(
          eq(giftConfirmations.id, id),
          eq(giftConfirmations.eventId, eventId),
        ),
      );
    revalidatePath("/dashboard/amplop");
  });
}

export async function getGiftStatsAction(
  eventId: string,
): Promise<
  ActionResult<{ total: number; verified: number; verifiedAmount: number }>
> {
  return withAuth(eventId, "viewer", async () => {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        verified: sql<number>`count(*) filter (where ${giftConfirmations.status} = 'verified')::int`,
        verifiedAmount: sql<number>`coalesce(sum(${giftConfirmations.amount}) filter (where ${giftConfirmations.status} = 'verified'), 0)::bigint`,
      })
      .from(giftConfirmations)
      .where(eq(giftConfirmations.eventId, eventId));
    return {
      total: row?.total ?? 0,
      verified: row?.verified ?? 0,
      verifiedAmount: Number(row?.verifiedAmount ?? 0),
    };
  });
}

// ---------------- Public (invitation page) ----------------

export type PublicGiftAccount = {
  id: string;
  type: string;
  provider: string;
  accountName: string;
  accountNumber: string;
};

export async function listPublicGiftAccountsAction(
  eventId: string,
): Promise<PublicGiftAccount[]> {
  const rows = await db
    .select({
      id: giftAccounts.id,
      type: giftAccounts.type,
      provider: giftAccounts.provider,
      accountName: giftAccounts.accountName,
      accountNumber: giftAccounts.accountNumber,
    })
    .from(giftAccounts)
    .where(
      and(
        eq(giftAccounts.eventId, eventId),
        eq(giftAccounts.isActive, true),
      ),
    )
    .orderBy(asc(giftAccounts.sortOrder), asc(giftAccounts.createdAt));
  return rows;
}

// In-memory rate limit — 10 confirmations per event per hour. Lightweight
// abuse cap; not a substitute for Cloudflare-level WAF in front of the
// public route, but enough to stop accidental spam.
const PUBLIC_SUBMIT_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_SUBMIT_LIMIT = 10;
const submitLog = new Map<string, number[]>();

function recordSubmission(eventId: string): boolean {
  const now = Date.now();
  const recent = (submitLog.get(eventId) ?? []).filter(
    (t) => now - t < PUBLIC_SUBMIT_WINDOW_MS,
  );
  if (recent.length >= PUBLIC_SUBMIT_LIMIT) {
    submitLog.set(eventId, recent);
    return false;
  }
  recent.push(now);
  submitLog.set(eventId, recent);
  return true;
}

export type SubmitGiftConfirmationInput = {
  eventId: string;
  guestName: string;
  guestMessage?: string;
  accountId?: string;
  amount?: number;
};

export async function submitGiftConfirmationAction(
  input: SubmitGiftConfirmationInput,
): Promise<ActionResult> {
  const guestName = sanitize(input.guestName ?? "", 100);
  if (!guestName) return { ok: false, error: "Nama wajib diisi." };
  if (!input.eventId) return { ok: false, error: "Acara tidak valid." };
  if (!recordSubmission(input.eventId)) {
    return {
      ok: false,
      error: "Terlalu banyak kiriman. Coba lagi sebentar.",
    };
  }
  const amount =
    typeof input.amount === "number" && input.amount > 0
      ? Math.min(Math.round(input.amount), 999_999_999_999)
      : null;
  await db.insert(giftConfirmations).values({
    eventId: input.eventId,
    guestName,
    guestMessage: input.guestMessage
      ? sanitize(input.guestMessage, 500)
      : null,
    accountId: input.accountId || null,
    amount,
    status: "pending",
  });
  return { ok: true };
}
