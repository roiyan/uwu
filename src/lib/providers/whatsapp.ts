// WhatsApp Cloud API wrapper.
// If WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID are unset, the wrapper
// returns a simulated-success response so local/preview builds don't require
// provider credentials. In production those env vars must be set.

type SendTextArgs = {
  to: string; // E.164 without '+', e.g. 628123456789
  body: string;
};

type SendTextResult =
  | { ok: true; providerMessageId: string; simulated: boolean }
  | { ok: false; error: string };

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

export async function sendWhatsAppText(
  args: SendTextArgs,
): Promise<SendTextResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = normalisePhone(args.to);
  if (!to) return { ok: false, error: "Nomor tidak valid" };

  if (!token || !phoneId) {
    // Dev / preview mode
    return {
      ok: true,
      simulated: true,
      providerMessageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: true, body: args.body },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `WA API ${res.status}: ${text.slice(0, 120)}` };
    }

    const json = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    const id = json.messages?.[0]?.id;
    if (!id) {
      return { ok: false, error: json.error?.message ?? "WA response invalid" };
    }
    return { ok: true, providerMessageId: id, simulated: false };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "WA network error",
    };
  }
}

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}
