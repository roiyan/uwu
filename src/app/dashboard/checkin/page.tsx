import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import { listGuestGroups } from "@/lib/db/queries/guests";
import {
  getCheckinStats,
  getGroupCheckinBreakdown,
  listGuestsForCheckin,
  listRecentCheckins,
} from "@/lib/db/queries/checkin";
import { CheckinStation } from "@/components/checkin/checkin-station";
import { CheckinDisabledCard } from "@/components/checkin/checkin-disabled-card";

export const dynamic = "force-dynamic";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export default async function CheckinPage() {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");

  const eventId = current.event.id;

  if (!current.event.checkinEnabled) {
    return (
      <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
        <PageHeader />
        <CheckinDisabledCard />
      </main>
    );
  }

  // Fan out the operator-page reads in parallel — none depend on each
  // other and they're each a single round-trip.
  const [stats, guests, groupRows, recent, breakdown, profileRow] =
    await Promise.all([
      getCheckinStats(eventId),
      listGuestsForCheckin(eventId),
      listGuestGroups(eventId),
      listRecentCheckins(eventId, 10),
      getGroupCheckinBreakdown(eventId),
      db
        .select({ fullName: profiles.fullName, email: profiles.email })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);

  const defaultOperator =
    profileRow?.fullName ?? profileRow?.email ?? user.email ?? "Operator";

  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <PageHeader />
      <CheckinStation
        eventId={eventId}
        invitationOrigin={appUrl()}
        invitationSlug={current.event.slug}
        groups={groupRows.map((g) => ({ id: g.id, name: g.name }))}
        guests={guests}
        stats={stats}
        recent={recent}
        breakdown={breakdown}
        variant="dashboard"
        defaultOperator={defaultOperator}
      />
    </main>
  );
}

function PageHeader() {
  return (
    <header className="mb-10">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-px w-10"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
          }}
        />
        <p className="d-eyebrow">Hari Bahagia</p>
      </div>
      <h1 className="d-serif mt-3 text-[32px] font-extralight leading-[1.1] tracking-[-0.01em] text-[var(--d-ink)] md:text-[54px] md:leading-[1.05]">
        Sambut mereka{" "}
        <em className="d-serif italic text-[var(--d-coral)]">yang datang.</em>
      </h1>
      <p className="mt-4 max-w-[58ch] text-[14px] leading-relaxed text-[var(--d-ink-dim)] md:text-[15px]">
        Setiap tamu yang melangkah masuk adalah bukti — bahwa undangan
        kalian menyentuh hati.
      </p>
    </header>
  );
}
