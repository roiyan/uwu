import { redirect } from "next/navigation";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import {
  countGuestWishes,
  countLiveGuests,
  getEventPackageLimit,
  getGroupEngagement,
  getOpenHeatmap,
  getResponseFunnel,
  getTrafficSourceBreakdown,
  getWeeklyTrend,
  listGuestGroups,
  listGuestWishes,
  listGuestsWithActivity,
  listTopOpeners,
  sumAttendees,
} from "@/lib/db/queries/guests";
import { EmptyState } from "@/components/shared/EmptyState";
import { AnalyticsClient } from "./client";

export default async function AnalyticsPage() {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");

  const eventId = current.event.id;

  const [
    total,
    confirmedAttendees,
    funnel,
    trend,
    responses,
    groups,
    packageInfo,
    trafficSource,
    groupEngagement,
    heatmapBuckets,
    topOpeners,
    wishes,
    wishesTotal,
  ] = await Promise.all([
    countLiveGuests(eventId),
    sumAttendees(eventId),
    getResponseFunnel(eventId),
    getWeeklyTrend(eventId, 7),
    listGuestsWithActivity(eventId),
    listGuestGroups(eventId),
    getEventPackageLimit(eventId),
    getTrafficSourceBreakdown(eventId),
    getGroupEngagement(eventId),
    getOpenHeatmap(eventId),
    listTopOpeners(eventId, 5),
    listGuestWishes(eventId, 3),
    countGuestWishes(eventId),
  ]);

  if (total === 0) {
    return (
      <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
        <header>
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-7 bg-[var(--d-coral)]" />
            <p className="d-eyebrow">Analytics</p>
          </div>
          <h1 className="d-serif mt-3 text-[clamp(36px,4.5vw,54px)] font-extralight leading-[1] tracking-[-0.025em] text-[var(--d-ink)]">
            Bagaimana tamu{" "}
            <em className="d-serif italic text-[var(--d-coral)]">menanggapi</em>
            ?
          </h1>
        </header>
        <div className="mt-12">
          <EmptyState
            icon="📊"
            title="Belum ada data"
            description="Tambah tamu dan kirim undangan — statistik akan muncul otomatis di sini."
            actionLabel="Tambah Tamu"
            actionHref="/dashboard/guests"
          />
        </div>
      </main>
    );
  }

  return (
    <AnalyticsClient
      total={total}
      guestLimit={packageInfo.limit}
      packageName={packageInfo.packageName}
      confirmedAttendees={confirmedAttendees}
      funnel={funnel}
      trend={trend}
      responses={responses}
      groups={groups.map((g) => ({
        id: g.id,
        name: g.name,
        color: g.color,
      }))}
      trafficSource={trafficSource}
      groupEngagement={groupEngagement}
      heatmapBuckets={heatmapBuckets}
      topOpeners={topOpeners}
      wishes={wishes}
      wishesTotal={wishesTotal}
      wishesGuestTotal={total}
    />
  );
}
