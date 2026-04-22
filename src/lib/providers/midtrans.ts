// Midtrans Snap wrapper.
// Production uses MIDTRANS_SERVER_KEY + MIDTRANS_IS_PRODUCTION='true'.
// When MIDTRANS_SERVER_KEY is unset, createSnapTransaction returns a
// simulated token so local runs can demo the checkout page without keys.
// Webhook signature verification still requires the real server key —
// handleNotificationSignature() returns false when key is missing.

import { createHash } from "node:crypto";

export type SnapCustomer = {
  firstName: string;
  email: string;
  phone?: string;
};

export type SnapItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type SnapTransactionResult =
  | { ok: true; token: string; redirectUrl: string; simulated: boolean }
  | { ok: false; error: string };

function baseUrl() {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd ? "https://app.midtrans.com/snap/v1" : "https://app.sandbox.midtrans.com/snap/v1";
}

function snapJsUrl() {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export function getMidtransClientKey() {
  return process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
}

export function getSnapJsUrl() {
  return snapJsUrl();
}

export async function createSnapTransaction(args: {
  orderRef: string;
  amountIdr: number;
  customer: SnapCustomer;
  items: SnapItem[];
  callbackUrl: string;
}): Promise<SnapTransactionResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return {
      ok: true,
      simulated: true,
      token: `sim_${args.orderRef}`,
      redirectUrl: `${args.callbackUrl}?order_id=${args.orderRef}&transaction_status=settlement&simulated=1`,
    };
  }

  try {
    const res = await fetch(`${baseUrl()}/transactions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: args.orderRef,
          gross_amount: args.amountIdr,
        },
        item_details: args.items,
        customer_details: {
          first_name: args.customer.firstName,
          email: args.customer.email,
          phone: args.customer.phone,
        },
        callbacks: { finish: args.callbackUrl },
        credit_card: { secure: true },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Midtrans ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { token: string; redirect_url: string };
    return {
      ok: true,
      token: json.token,
      redirectUrl: json.redirect_url,
      simulated: false,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Midtrans network error",
    };
  }
}

// Midtrans signature rule:
//   SHA512(order_id + status_code + gross_amount + server_key)
export function verifyNotificationSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;
  const expected = createHash("sha512")
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`,
    )
    .digest("hex");
  return expected === payload.signature_key;
}

export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus: string | undefined,
): "pending" | "paid" | "expired" | "canceled" | "failed" {
  switch (transactionStatus) {
    case "capture":
    case "settlement":
      return fraudStatus && fraudStatus !== "accept" ? "pending" : "paid";
    case "pending":
      return "pending";
    case "expire":
      return "expired";
    case "cancel":
      return "canceled";
    case "deny":
    case "failure":
      return "failed";
    default:
      return "pending";
  }
}

export function isMidtransConfigured() {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}
