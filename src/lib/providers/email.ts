// SendGrid email wrapper. Env-gated fallback for local dev.

type SendEmailArgs = {
  to: string;
  toName?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
};

type SendEmailResult =
  | { ok: true; providerMessageId: string; simulated: boolean }
  | { ok: false; error: string };

function htmlFromText(text: string) {
  return text
    .split("\n")
    .map((line) => `<p>${line.replace(/</g, "&lt;").replace(/>/g, "&gt;") || "&nbsp;"}</p>`)
    .join("");
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME ?? "uwu Wedding Platform";

  if (!apiKey || !fromEmail) {
    return {
      ok: true,
      simulated: true,
      providerMessageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          { to: [{ email: args.to, name: args.toName }] },
        ],
        from: { email: fromEmail, name: fromName },
        subject: args.subject,
        content: [
          { type: "text/plain", value: args.bodyText },
          { type: "text/html", value: args.bodyHtml ?? htmlFromText(args.bodyText) },
        ],
      }),
    });

    if (res.status !== 202) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `SendGrid ${res.status}: ${text.slice(0, 120)}`,
      };
    }
    const headerId = res.headers.get("x-message-id") ?? `sg_${Date.now()}`;
    return { ok: true, providerMessageId: headerId, simulated: false };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SendGrid network error",
    };
  }
}

export function isEmailConfigured() {
  return Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
}
