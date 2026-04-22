import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, orders } from "@/lib/db/schema";
import {
  mapMidtransStatus,
  verifyNotificationSignature,
} from "@/lib/providers/midtrans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Notification = {
  order_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  settlement_time?: string;
};

export async function POST(req: Request) {
  let body: Notification;
  try {
    body = (await req.json()) as Notification;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (
    !body.order_id ||
    !body.status_code ||
    !body.gross_amount ||
    !body.signature_key ||
    !body.transaction_status
  ) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }

  const valid = verifyNotificationSignature({
    order_id: body.order_id,
    status_code: body.status_code,
    gross_amount: body.gross_amount,
    signature_key: body.signature_key,
  });
  if (!valid) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderRef, body.order_id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "order not found" }, { status: 404 });
  }

  const nextStatus = mapMidtransStatus(
    body.transaction_status,
    body.fraud_status,
  );

  // Idempotent: only act on transitions
  if (existing.status === nextStatus && existing.midtransTransactionId === body.transaction_id) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const paidAt =
    nextStatus === "paid"
      ? body.settlement_time
        ? new Date(body.settlement_time)
        : new Date()
      : existing.paidAt ?? null;

  await db
    .update(orders)
    .set({
      status: nextStatus,
      midtransTransactionId: body.transaction_id ?? existing.midtransTransactionId,
      midtransPaymentType: body.payment_type ?? existing.midtransPaymentType,
      midtransRawSettlement: body as unknown as Record<string, unknown>,
      paidAt,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, existing.id));

  if (nextStatus === "paid" && existing.eventId) {
    await db
      .update(events)
      .set({ packageId: existing.packageId, updatedAt: new Date() })
      .where(and(eq(events.id, existing.eventId), eq(events.ownerId, existing.userId)));
  }

  return NextResponse.json({ ok: true });
}
