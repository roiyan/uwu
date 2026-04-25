import { NextResponse } from "next/server";
import { runScheduledDueBroadcasts } from "@/lib/actions/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron handler. Schedule defined in vercel.json runs this every
 * 5 minutes. Vercel adds an Authorization header with `Bearer
 * ${CRON_SECRET}` when CRON_SECRET is set in env, so we verify that
 * header to keep the endpoint from being called externally.
 *
 * Falls back to allowing requests when CRON_SECRET is unset so local
 * dev (`pnpm dev` + `curl localhost:3000/api/cron/send-scheduled`)
 * still works without extra wiring.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runScheduledDueBroadcasts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/send-scheduled] failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
