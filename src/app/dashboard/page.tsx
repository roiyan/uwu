import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftAccounts, messages } from "@/lib/db/schema";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import {
  countGuestWishes,
  countGuestsByStatus,
  countLiveGuests,
  getDailyOpens,
  getEventPackageLimit,
  getResponseFunnel,
  listGuestWishes,
  sumAttendees,
} from "@/lib/db/queries/guests";
import { getRecentActivity } from "@/lib/actions/activity";
import { ContextualHero } from "@/components/dashboard/ContextualHero";
import { JourneyKpi } from "@/components/dashboard/JourneyKpi";
import {
  DynamicChecklist,
  type ChecklistItem,
} from "@/components/dashboard/DynamicChecklist";
import { DailyOpensChart } from "@/components/dashboard/DailyOpensChart";
import { ResponseFunnel } from "@/components/dashboard/ResponseFunnel";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TamuStatCard } from "@/components/dashboard/TamuStatCard";
import {
  UcapanTamuCard,
  UcapanTamuSkeleton,
} from "@/components/dashboard/UcapanTamuCard";

// Page shell paints immediately. Each data-heavy section streams in
// independently via Suspense boundaries so one slow query doesn't
// block the entire page.
export default async function DashboardBerandaPage() {
  const user = await requireSessionUserFast();
  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <Suspense fallback={null}>
        <UnpublishedBanner userId={user.id} />
      </Suspense>

      <Suspense fallback={<HeaderSkeleton />}>
        <Hero userId={user.id} />
      </Suspense>

      <Suspense fallback={<JourneyKpiSkeleton />}>
        <JourneyKpiBlock userId={user.id} />
      </Suspense>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<ChecklistSkeleton />}>
            <ChecklistBlock userId={user.id} />
          </Suspense>

          {/* Bukaan + Perjalanan Respons. On mobile they stack with
              the funnel beneath the chart. */}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Suspense fallback={<ChartSkeleton />}>
              <ChartBlock userId={user.id} />
            </Suspense>
            <Suspense fallback={<FunnelSkeleton />}>
              <FunnelBlock userId={user.id} />
            </Suspense>
          </div>

          <Suspense fallback={<UcapanTamuSkeleton />}>
            <UcapanBlock userId={user.id} />
          </Suspense>
        </div>

        <div className="space-y-4">
          <Suspense fallback={<TamuSkeleton />}>
            <TamuBlock userId={user.id} />
          </Suspense>
          <Suspense fallback={<ActivitySkeleton />}>
            <ActivityBlock userId={user.id} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function UnpublishedBanner({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const bundle = await getEventBundle(current.event.id);
  if (!bundle || bundle.event.isPublished) return null;
  return (
    <Link
      href="/dashboard/settings?tab=acara#publikasi"
      className="mb-5 flex items-center justify-between gap-3 rounded-[14px] border px-5 py-3.5 transition-colors hover:bg-[var(--d-bg-2)] lg:mb-8"
      style={{
        background:
          "linear-gradient(115deg, rgba(240,160,156,0.08), rgba(244,184,163,0.08))",
        borderColor: "rgba(240,160,156,0.22)",
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="uwu-pulse"
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--d-coral)",
            boxShadow: "0 0 8px rgba(240,160,156,0.6)",
            flexShrink: 0,
          }}
        />
        <div className="min-w-0">
          <p className="d-serif text-[14px] leading-tight text-[var(--d-ink)]">
            Undangan belum tayang
          </p>
          <p className="d-serif mt-0.5 truncate text-[12px] italic text-[var(--d-ink-dim)]">
            Tamu yang menerima link belum bisa membuka undangan.
          </p>
        </div>
      </div>
      <span className="d-mono inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--d-coral)] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B0B15]">
        Tayangkan →
      </span>
    </Link>
  );
}

async function Hero({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");
  const firstSchedule = bundle.schedules[0];
  return (
    <ContextualHero
      eventDate={firstSchedule?.eventDate ?? null}
      eventLabel={firstSchedule?.label ?? "ACARA"}
    />
  );
}

async function JourneyKpiBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  // Single SQL aggregate + package limit so the Terdaftar cell can
  // render the quota ratio (14 / 25) instead of a flat 100%. Couture-
  // tier limits (>= 9999) are surfaced as null so the cell hides the
  // ratio rather than rendering "1%".
  const [funnel, packageInfo] = await Promise.all([
    getResponseFunnel(current.event.id),
    getEventPackageLimit(current.event.id),
  ]);
  const notOpened = Math.max(0, funnel.invited - funnel.opened);
  const quota =
    packageInfo.limit && packageInfo.limit < 9999 ? packageInfo.limit : null;

  return (
    <JourneyKpi
      total={funnel.total}
      opened={funnel.opened}
      responded={funnel.responded}
      notOpenedCount={notOpened}
      guestQuota={quota}
    />
  );
}

async function ChecklistBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) return null;
  const eventId = bundle.event.id;

  // Pull every input the checklist needs in parallel — broadcast +
  // gift counts come from raw aggregates so we don't hydrate full
  // rows.
  const [
    statusCounts,
    [{ count: broadcastCount }],
    [{ count: giftAccountCount }],
  ] = await Promise.all([
    countGuestsByStatus(eventId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(eq(messages.eventId, eventId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(giftAccounts)
      .where(eq(giftAccounts.eventId, eventId)),
  ]);

  const couple = bundle.couple;
  const hasCouple = Boolean(couple?.brideName && couple?.groomName);
  const hasCover = Boolean(couple?.coverPhotoUrl);
  const hasBroadcast = broadcastCount > 0;
  const notOpened = statusCounts.baru + statusCounts.diundang;
  const hasGifts = giftAccountCount > 0;

  const items: ChecklistItem[] = [
    {
      id: "couple",
      label: hasCouple
        ? "Data mempelai sudah lengkap"
        : "Lengkapi data mempelai",
      done: hasCouple,
      href: "/dashboard/website#mempelai",
      cta: hasCouple ? undefined : "Lengkapi →",
    },
    {
      id: "cover",
      label: hasCover ? "Foto sampul sudah diunggah" : "Unggah foto sampul undangan",
      done: hasCover,
      href: "/dashboard/website#foto-sampul",
      cta: hasCover ? undefined : "Unggah →",
    },
    {
      id: "publish",
      label: bundle.event.isPublished
        ? "Undangan sudah tayang"
        : "Tayangkan undangan — tamu belum bisa membuka",
      done: bundle.event.isPublished,
      href: "/dashboard/settings?tab=acara#publikasi",
      cta: bundle.event.isPublished ? undefined : "Tayangkan →",
    },
    {
      id: "broadcast",
      label: hasBroadcast
        ? "Undangan sudah dikirim ke tamu"
        : "Kirim undangan ke tamu — mereka menunggu kabar kalian",
      done: hasBroadcast,
      href: "/dashboard/messages",
      cta: hasBroadcast ? undefined : "Kirim →",
    },
  ];
  // Reminder slot only meaningful once a broadcast has gone out.
  if (hasBroadcast && notOpened > 0) {
    items.push({
      id: "reminder",
      label: `${notOpened} tamu belum membuka — mungkin butuh pengingat kecil`,
      done: false,
      href: "/dashboard/messages?tab=kirim-baru",
      cta: "Kirim Pengingat →",
      ariaLabel:
        "Kirim pengingat ke tamu yang belum membuka dari daftar persiapan",
    });
  }
  items.push({
    id: "checkin",
    label: bundle.event.checkinEnabled
      ? "Sambut Tamu sudah aktif"
      : "Siapkan Sambut Tamu — supaya hari H berjalan lancar",
    done: bundle.event.checkinEnabled,
    href: "/dashboard/checkin",
    cta: bundle.event.checkinEnabled ? undefined : "Aktifkan →",
  });
  items.push({
    id: "gift",
    label: hasGifts
      ? "Jembatan kasih sudah terbuka"
      : "Buka jembatan kasih — tamu ingin memberi, biarkan mereka",
    done: hasGifts,
    href: "/dashboard/amplop",
    cta: hasGifts ? undefined : "Buka →",
  });

  return <DynamicChecklist items={items} />;
}

async function ChartBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) return null;
  const data = await getDailyOpens(bundle.event.id, 7);
  return <DailyOpensChart data={data} />;
}

async function FunnelBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const [statusCounts, total] = await Promise.all([
    countGuestsByStatus(current.event.id),
    countLiveGuests(current.event.id),
  ]);
  return (
    <ResponseFunnel
      total={total}
      hadir={statusCounts.hadir}
      tidakHadir={statusCounts.tidak_hadir}
    />
  );
}

async function TamuBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const [count, packageInfo, attendingPax, statusCounts, funnel] =
    await Promise.all([
      countLiveGuests(current.event.id),
      getEventPackageLimit(current.event.id),
      sumAttendees(current.event.id),
      countGuestsByStatus(current.event.id),
      getResponseFunnel(current.event.id),
    ]);
  return (
    <TamuStatCard
      count={count}
      limit={packageInfo.limit}
      attendingPax={attendingPax}
      attendingGuests={statusCounts.hadir}
      invitedCount={funnel.invited}
    />
  );
}

async function ActivityBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const rows = await getRecentActivity(current.event.id, 12);
  return (
    <RecentActivity
      items={rows.map((r) => ({
        id: r.id,
        summary: r.summary,
        userName: r.userName,
        userEmail: r.userEmail,
        createdAt: r.createdAt,
      }))}
    />
  );
}

async function UcapanBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const [wishes, totalWishes, totalGuests] = await Promise.all([
    listGuestWishes(current.event.id, 3),
    countGuestWishes(current.event.id),
    countLiveGuests(current.event.id),
  ]);
  return (
    <UcapanTamuCard
      wishes={wishes}
      totalWishes={totalWishes}
      totalGuests={totalGuests}
    />
  );
}

function HeaderSkeleton() {
  return (
    <header className="mb-10 space-y-3">
      <div className="h-3 w-40 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="h-12 w-72 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="h-3 w-56 animate-pulse rounded bg-[var(--d-bg-2)]" />
    </header>
  );
}

function JourneyKpiSkeleton() {
  return (
    <section className="d-card h-[260px] animate-pulse" />
  );
}

function ChecklistSkeleton() {
  return (
    <section className="d-card p-7">
      <div className="h-3 w-32 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-[var(--d-bg-2)]" />
      <div className="mt-5 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-[12px] bg-[var(--d-bg-2)]"
          />
        ))}
      </div>
    </section>
  );
}

function ChartSkeleton() {
  return (
    <section
      className="d-card h-[300px] animate-pulse"
      style={{ background: "var(--d-bg-2)" }}
    />
  );
}

function FunnelSkeleton() {
  return (
    <section className="d-card p-7">
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-6 w-44 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-6 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-3 w-full animate-pulse rounded bg-[var(--d-bg-2)]" />
            <div className="mt-2 h-2 w-full animate-pulse rounded bg-[var(--d-bg-2)]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function TamuSkeleton() {
  return (
    <section className="d-card p-6">
      <div className="h-3 w-16 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-10 w-24 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-[var(--d-bg-2)]" />
    </section>
  );
}

function ActivitySkeleton() {
  return (
    <section className="d-card p-[22px]">
      <div className="h-4 w-32 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-3 w-full animate-pulse rounded bg-[var(--d-bg-2)]"
          />
        ))}
      </div>
    </section>
  );
}
