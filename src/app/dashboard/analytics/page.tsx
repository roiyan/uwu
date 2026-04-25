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
import Link from "next/link";
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
      <main className="theme-dashboard flex-1 px-5 py-8 lg:px-12 lg:py-12">
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
          <section
            className="relative overflow-hidden rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-10 text-center"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-50 blur-[60px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(240,160,156,0.14), transparent 70%)",
              }}
            />
            <div
              aria-hidden
              className="d-mono relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--d-line-strong)] bg-[rgba(240,160,156,0.08)] text-[26px] text-[var(--d-coral)]"
            >
              📊
            </div>
            <h2 className="d-serif relative mt-5 text-[24px] font-extralight leading-tight tracking-[-0.015em] text-[var(--d-ink)]">
              Belum ada{" "}
              <em className="d-serif italic text-[var(--d-coral)]">data</em>.
            </h2>
            <p className="d-serif relative mx-auto mt-3 max-w-[44ch] text-[14px] italic leading-relaxed text-[var(--d-ink-dim)]">
              Tambah tamu dan kirim undangan — statistik akan muncul otomatis
              di sini.
            </p>
            <Link
              href="/dashboard/guests"
              className="d-mono relative mt-7 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
            >
              Tambah Tamu
            </Link>
          </section>
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
