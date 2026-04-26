import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { listGuestGroups } from "@/lib/db/queries/guests";
import {
  getCheckinEventGate,
  getCheckinStats,
  getGroupCheckinBreakdown,
  listGuestsForCheckin,
  listRecentCheckins,
} from "@/lib/db/queries/checkin";
import { PublicCheckinClient } from "./client";

export const dynamic = "force-dynamic";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// Public operator station — accessed by the couple's delegated greeter
// at the venue. Two access controls layer on top of each other:
//   1. Possession of `?token=…` matching events.operator_token
//   2. Knowledge of the 4-digit PIN (events.operator_pin)
// Both checks happen client-side via server actions inside
// OperatorPinGate. The page itself only verifies that the event exists
// and check-in is enabled — the gate handles the rest.
export default async function PublicCheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { eventId } = await params;
  const { token: rawToken } = await searchParams;
  const gate = await getCheckinEventGate(eventId);
  if (!gate) notFound();

  if (!gate.checkinEnabled) {
    return (
      <main
        className="theme-dashboard min-h-screen px-5 py-12"
        style={{ background: "var(--d-bg-0)", color: "var(--d-ink)" }}
      >
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--d-line)] bg-[var(--d-bg-card)] p-8 text-center md:p-12">
          <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-gold)]">
            Stasiun Tertutup
          </p>
          <h1 className="d-serif mt-5 text-[28px] font-extralight leading-[1.2] text-[var(--d-ink)] md:text-[36px]">
            Pintu penyambutan{" "}
            <em className="d-serif italic text-[var(--d-coral)]">
              belum dibuka.
            </em>
          </h1>
          <p className="mx-auto mt-4 max-w-[44ch] text-[14px] leading-relaxed text-[var(--d-ink-dim)]">
            Mempelai belum mengaktifkan check-in digital, atau acara sudah
            selesai. Hubungi pasangan untuk konfirmasi.
          </p>
        </div>
      </main>
    );
  }

  // Confirm the URL token matches what's stored. We don't bail early on
  // mismatch — the gate UI will show "Link tidak valid" with the
  // correct messaging. We do, however, only pass the token through
  // when it's actually valid, so a wrong/stale token can't reach the
  // PIN form.
  const [eventRow] = await db
    .select({ operatorToken: events.operatorToken })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const tokenIsValid =
    rawToken && eventRow?.operatorToken && rawToken === eventRow.operatorToken;
  const token = tokenIsValid ? rawToken : null;

  const [stats, guests, groupRows, recent, breakdown] = await Promise.all([
    getCheckinStats(eventId),
    listGuestsForCheckin(eventId),
    listGuestGroups(eventId),
    listRecentCheckins(eventId, 10),
    getGroupCheckinBreakdown(eventId),
  ]);

  return (
    <main
      className="theme-dashboard min-h-screen"
      style={{ background: "var(--d-bg-0)", color: "var(--d-ink)" }}
    >
      <PublicCheckinClient
        eventId={eventId}
        token={token}
        eventTitle={gate.title}
        stationProps={{
          eventId,
          invitationOrigin: appUrl(),
          invitationSlug: gate.slug,
          groups: groupRows.map((g) => ({ id: g.id, name: g.name })),
          guests,
          stats,
          recent,
          breakdown,
          variant: "public",
          defaultOperator: "",
          hideShare: true,
        }}
      />
    </main>
  );
}
