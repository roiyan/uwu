"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, orders, packages, profiles } from "@/lib/db/schema";
import { requireAuthedUser, type ActionResult } from "@/lib/auth-guard";
import { createSnapTransaction } from "@/lib/providers/midtrans";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function buildOrderRef(userSuffix: string) {
  const now = new Date();
  const yyyymmdd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `UWU-${yyyymmdd}-${userSuffix.slice(0, 4).toUpperCase()}-${rand}`;
}

export async function createCheckoutAction(
  packageTier: string,
): Promise<ActionResult<{ orderRef: string; token: string; redirectUrl: string; simulated: boolean }>> {
  const user = await requireAuthedUser();

  const [pkg] = await db
    .select()
    .from(packages)
    .where(eq(packages.tier, packageTier as "starter" | "lite" | "pro" | "premium" | "ultimate"))
    .limit(1);
  if (!pkg) return { ok: false, error: "Paket tidak ditemukan." };
  if (pkg.priceIdr <= 0) {
    return { ok: false, error: "Paket ini gratis dan tidak memerlukan pembayaran." };
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const [ev] = await db
    .select()
    .from(events)
    .where(eq(events.ownerId, user.id))
    .orderBy(desc(events.createdAt))
    .limit(1);

  const orderRef = buildOrderRef(user.id);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  const snap = await createSnapTransaction({
    orderRef,
    amountIdr: pkg.priceIdr,
    customer: {
      firstName: profile?.fullName?.split(" ")[0] ?? "Pelanggan",
      email: user.email ?? profile?.email ?? "noreply@uwu.id",
      phone: profile?.phone ?? undefined,
    },
    items: [
      {
        id: pkg.id,
        name: `Paket ${pkg.name}`,
        quantity: 1,
        price: pkg.priceIdr,
      },
    ],
    callbackUrl: `${appUrl()}/dashboard/checkout/success`,
  });

  if (!snap.ok) {
    return { ok: false, error: snap.error };
  }

  await db.insert(orders).values({
    userId: user.id,
    eventId: ev?.id ?? null,
    packageId: pkg.id,
    orderRef,
    amountIdr: pkg.priceIdr,
    status: "pending",
    midtransSnapToken: snap.token,
    expiresAt: expires,
  });

  revalidatePath("/dashboard/packages");

  return {
    ok: true,
    data: {
      orderRef,
      token: snap.token,
      redirectUrl: snap.redirectUrl,
      simulated: snap.simulated,
    },
  };
}

export async function getOrderByRefAction(orderRef: string) {
  const user = await requireAuthedUser();
  const [row] = await db
    .select({
      order: orders,
      pkg: packages,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(and(eq(orders.orderRef, orderRef), eq(orders.userId, user.id)))
    .limit(1);
  return row ?? null;
}

export async function listOrdersForUser() {
  const user = await requireAuthedUser();
  return db
    .select({ order: orders, pkg: packages })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt))
    .limit(20);
}

/**
 * Dev-only helper: in simulated mode (no Midtrans key configured), the callback
 * URL includes `simulated=1`. The success page calls this to finalize the
 * fake order so the user sees the upgraded package immediately.
 */
export async function simulateOrderSettlementAction(
  orderRef: string,
): Promise<ActionResult> {
  if (process.env.MIDTRANS_SERVER_KEY) {
    return {
      ok: false,
      error: "Simulasi hanya tersedia saat Midtrans belum dikonfigurasi.",
    };
  }
  const user = await requireAuthedUser();
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderRef, orderRef), eq(orders.userId, user.id)))
    .limit(1);
  if (!row) return { ok: false, error: "Order tidak ditemukan." };
  if (row.status === "paid") return { ok: true };

  await db
    .update(orders)
    .set({
      status: "paid",
      paidAt: new Date(),
      midtransPaymentType: "simulation",
      midtransTransactionId: `sim_tx_${orderRef}`,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, row.id));

  if (row.eventId) {
    await db
      .update(events)
      .set({ packageId: row.packageId, updatedAt: new Date() })
      .where(eq(events.id, row.eventId));
  }

  revalidatePath("/dashboard/packages");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
