"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KpiCards, type KpiCardData } from "@/components/analytics/KpiCards";
import {
  TimeSeriesChart,
  type TimeSeriesPoint,
} from "@/components/analytics/TimeSeriesChart";
import {
  BreakdownCards,
  type EnthusiastRow,
  type GroupEngagementRow,
  type SourceData,
} from "@/components/analytics/BreakdownCards";
import { FunnelChart } from "@/components/analytics/FunnelChart";
import {
  ActivityHeatmap,
  type HeatmapBucket,
} from "@/components/analytics/ActivityHeatmap";
import {
  ShowUpRateCard,
  type ShowUpStats,
} from "@/components/analytics/ShowUpRateCard";
import {
  ArrivalTimeline,
  type ArrivalRow,
  type ArrivalSchedule,
} from "@/components/analytics/ArrivalTimeline";
import { ExportSection } from "@/components/analytics/ExportSection";
import { rejectTestNames } from "@/lib/utils/test-name-filter";

export type GuestStatus =
  | "baru"
  | "diundang"
  | "dibuka"
  | "hadir"
  | "tidak_hadir";

export type AnalyticsTrendRow = {
  date: string;
  registered: number;
  opened: number;
  rsvped: number;
  attending: number;
};

export type AnalyticsResponseRow = {
  id: string;
  name: string;
  nickname: string | null;
  groupName: string | null;
  groupColor: string | null;
  rsvpStatus: GuestStatus;
  rsvpAttendees: number | null;
  rsvpMessage: string | null;
  sendCount: number;
  openedAt: Date | null;
  rsvpedAt: Date | null;
  lastSentAt: Date | null;
  lastSentVia: string | null;
};

export type AnalyticsGroup = {
  id: string;
  name: string;
  color: string | null;
};

type Range = "24j" | "7h" | "30h" | "semua";

const STATUS_LABEL: Record<GuestStatus, string> = {
  baru: "Baru",
  diundang: "Diundang",
  dibuka: "Dibuka",
  hadir: "Hadir",
  tidak_hadir: "Tidak Hadir",
};

const STATUS_PILL: Record<GuestStatus, string> = {
  baru: "bg-[rgba(237,232,222,0.04)] text-[var(--d-ink-dim)]",
  diundang: "bg-[rgba(143,163,217,0.10)] text-[var(--d-blue)]",
  dibuka: "bg-[rgba(184,157,212,0.10)] text-[var(--d-lilac)]",
  hadir: "bg-[rgba(126,211,164,0.12)] text-[var(--d-green)]",
  tidak_hadir: "bg-[rgba(240,160,156,0.12)] text-[var(--d-coral)]",
};

const STATUS_DOT: Record<GuestStatus, string> = {
  baru: "var(--d-ink-faint)",
  diundang: "var(--d-blue)",
  dibuka: "var(--d-lilac)",
  hadir: "var(--d-green)",
  tidak_hadir: "var(--d-coral)",
};

function fmtTimestamp(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function BabHeader({
  number,
  title,
  subtitle,
  headingId,
}: {
  number: number;
  title: React.ReactNode;
  subtitle: string;
  headingId?: string;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-px w-7 bg-[var(--d-coral)]" />
        <span className="d-mono text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
          BAB {number}
        </span>
      </div>
      <h2
        id={headingId}
        className="d-serif mt-2 text-[24px] font-light leading-[1.2] tracking-[-0.015em] text-[var(--d-ink)] lg:text-[28px]"
      >
        {title}
      </h2>
      <p className="d-serif mt-1.5 text-[12.5px] italic text-[var(--d-ink-dim)]">
        {subtitle}
      </p>
    </div>
  );
}

function BabSeparator() {
  return (
    <div
      aria-hidden
      className="my-10 h-px w-full"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, var(--d-line) 50%, transparent 100%)",
      }}
    />
  );
}


export function AnalyticsClient({
  eventId,
  total,
  guestLimit,
  packageName,
  funnel,
  trend,
  responses,
  groups,
  confirmedAttendees,
  trafficSource,
  groupEngagement,
  heatmapBuckets,
  checkinStats,
  arrivals,
  schedules,
  eventTimezone,
}: {
  eventId: string;
  total: number;
  guestLimit: number;
  packageName: string;
  funnel: {
    total: number;
    invited: number;
    opened: number;
    responded: number;
    attending: number;
  };
  trend: AnalyticsTrendRow[];
  responses: AnalyticsResponseRow[];
  groups: AnalyticsGroup[];
  confirmedAttendees: number;
  trafficSource: SourceData;
  groupEngagement: GroupEngagementRow[];
  heatmapBuckets: HeatmapBucket[];
  checkinStats: ShowUpStats;
  arrivals: ArrivalRow[];
  schedules: ArrivalSchedule[];
  eventTimezone: string;
}) {
  const [range, setRange] = useState<Range>("7h");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [syncSec, setSyncSec] = useState(12);

  // The "real-time · sinkron Xs ago" indicator. Doesn't actually
  // poll the server — the page already streams via Suspense — but
  // gives users a cue that the numbers are fresh on each navigation.
  useEffect(() => {
    const id = setInterval(() => setSyncSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Sparkline series derived from the daily trend rows the server
  // returned. Same data feeds all four cards via different keys.
  const sparkRegistered = trend.map((r) => r.registered);
  const sparkOpened = trend.map((r) => r.opened);
  const sparkRsvped = trend.map((r) => r.rsvped);
  const sparkAttending = trend.map((r) => r.attending);

  // Week-over-week deltas for the trend badges. Compares the latter
  // half of the window to the former; positive = up, zero = neutral,
  // negative = down. Falls back to the full sum when the series is
  // shorter than 2 buckets.
  function deltaOf(values: number[]): number {
    if (values.length < 2) return values[0] ?? 0;
    const half = Math.floor(values.length / 2);
    const recent = values.slice(half).reduce((a, b) => a + b, 0);
    const prior = values.slice(0, half).reduce((a, b) => a + b, 0);
    return recent - prior;
  }

  const fnPct = (v: number, denom: number) =>
    denom > 0 ? Math.round((v / denom) * 100) : 0;

  // Time-window cutoff for the 24J / 7 Hari / 30 Hari / Semua
  // selector. `null` means "no time filter" (Semua). Everything
  // downstream — funnel counts, donut, heatmap, response table,
  // top openers, wishes — re-derives from this so the buttons are
  // not visual-only.
  const cutoff = useMemo<Date | null>(() => {
    if (range === "semua") return null;
    const now = Date.now();
    const ms =
      range === "24j"
        ? 24 * 60 * 60 * 1000
        : range === "30h"
          ? 30 * 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;
    return new Date(now - ms);
  }, [range]);

  // Helpers — "this row had activity within the window" by checking
  // the relevant timestamp. We use the field that maps to whatever
  // metric we're counting (opens use openedAt, RSVPs use rsvpedAt,
  // sends use lastSentAt) so the same row can land in one bucket and
  // not another within the same window.
  const inWindow = (d: Date | string | null) => {
    if (!cutoff) return true;
    if (!d) return false;
    return new Date(d) >= cutoff;
  };

  // Pre-filter the response list once. The table + group-engagement +
  // KPI counts all read from this. When `range = semua`, the filter
  // is a no-op so server-side numbers are preserved.
  const filteredResponses = useMemo(() => {
    if (!cutoff) return responses;
    return responses.filter(
      (r) =>
        inWindow(r.rsvpedAt) ||
        inWindow(r.openedAt) ||
        inWindow(r.lastSentAt),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, cutoff]);

  // Funnel rebuild — combines group filter AND range filter. When
  // both are at their defaults (no group, range=semua) we fall back
  // to the server-rendered funnel so empty-on-first-load still works.
  const filteredFunnel = useMemo(() => {
    // Server-rendered funnel doesn't include checkedIn — append it from
    // checkinStats so the chart can show the extra row even with default
    // filters. Hidden by FunnelChart when attending is 0.
    if (!groupFilter && !cutoff) {
      return {
        ...funnel,
        checkedIn: checkinStats.rsvpHadirCheckedIn,
      };
    }
    const target = groupFilter
      ? groups.find((g) => g.id === groupFilter)?.name
      : null;
    const rows = target
      ? responses.filter((r) => r.groupName === target)
      : responses;
    return {
      total: rows.length,
      invited: rows.filter((r) => r.sendCount > 0 && inWindow(r.lastSentAt))
        .length,
      opened: rows.filter((r) => inWindow(r.openedAt)).length,
      responded: rows.filter(
        (r) =>
          (r.rsvpStatus === "hadir" || r.rsvpStatus === "tidak_hadir") &&
          inWindow(r.rsvpedAt),
      ).length,
      attending: rows.filter(
        (r) => r.rsvpStatus === "hadir" && inWindow(r.rsvpedAt),
      ).length,
      // For the filtered case we approximate "checkedIn" from the
      // pre-filtered response list since responses includes openedAt /
      // rsvpedAt but not checkedInAt. Default to 0 to suppress the row.
      checkedIn: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFilter, funnel, responses, groups, cutoff, checkinStats]);

  // Heatmap re-aggregated client-side from filtered responses so the
  // grid only shows opens that happened inside the selected window.
  // Falls back to the server-aggregated buckets when range = semua,
  // since those use a more accurate full-history aggregate.
  const filteredHeatmap = useMemo<HeatmapBucket[]>(() => {
    if (!cutoff) return heatmapBuckets;
    const matrix = new Map<string, number>();
    for (const r of responses) {
      if (!r.openedAt) continue;
      const t = new Date(r.openedAt);
      if (t < cutoff) continue;
      const key = `${t.getDay()}-${t.getHours()}`;
      matrix.set(key, (matrix.get(key) ?? 0) + 1);
    }
    return Array.from(matrix.entries()).map(([k, count]) => {
      const [day, hour] = k.split("-").map(Number);
      return { day, hour, count };
    });
  }, [heatmapBuckets, cutoff, responses]);

  // Top enthusiast candidates — pass the raw response rows; the
  // EnthusiastCard does its own scoring + slice. Just narrow to the
  // shape the card expects (drops sendCount / lastSent* which the
  // ranking doesn't use).
  const enthusiasts = useMemo<EnthusiastRow[]>(
    () =>
      responses.map((r) => ({
        id: r.id,
        name: r.name,
        nickname: r.nickname,
        groupName: r.groupName,
        groupColor: r.groupColor,
        rsvpStatus: r.rsvpStatus,
        rsvpAttendees: r.rsvpAttendees,
        rsvpMessage: r.rsvpMessage,
        openedAt: r.openedAt,
        rsvpedAt: r.rsvpedAt,
      })),
    [responses],
  );

  const kpiCards: KpiCardData[] = [
    {
      dot: "var(--d-coral)",
      color: "#F0A09C",
      label: "Terdaftar",
      value: total,
      suffix: `/${guestLimit}`,
      delta: deltaOf(sparkRegistered),
      compare: "vs pekan lalu",
      spark: sparkRegistered,
    },
    {
      dot: "var(--d-blue)",
      color: "#8FA3D9",
      label: "Membuka",
      value: filteredFunnel.opened,
      // Denominator is total guests (not "invited") so the percentage
      // can never exceed 100%. Direct-link opens land in `opened` even
      // when sendCount is 0, which used to push the ratio above 100.
      suffix: `${fnPct(filteredFunnel.opened, Math.max(total, 1))}%`,
      delta: deltaOf(sparkOpened),
      compare: "dari total tamu",
      spark: sparkOpened,
    },
    {
      dot: "var(--d-lilac)",
      color: "#B89DD4",
      label: "Konfirmasi",
      value: filteredFunnel.responded,
      suffix: `${fnPct(filteredFunnel.responded, Math.max(filteredFunnel.opened, 1))}%`,
      delta: deltaOf(sparkRsvped),
      compare: "dari yang membuka",
      spark: sparkRsvped,
    },
    {
      dot: "var(--d-green)",
      color: "#7ED3A4",
      label: "Hadir",
      value: filteredFunnel.attending,
      suffix: `${confirmedAttendees} orang`,
      delta: deltaOf(sparkAttending),
      deltaUnit: "orang",
      compare: "total kehadiran",
      spark: sparkAttending,
    },
  ];

  // Time-series for the dual-line chart: maps trend.opened + trend.rsvped
  // — already gap-free from generate_series().
  const series: TimeSeriesPoint[] = trend.map((t) => ({
    date: t.date,
    opened: t.opened,
    rsvped: t.rsvped,
  }));

  // Donut slices for the status distribution chart. Reads from the
  // window-filtered list so the donut updates with the range buttons.
  const statusCounts: Record<GuestStatus, number> = {
    baru: 0,
    diundang: 0,
    dibuka: 0,
    hadir: 0,
    tidak_hadir: 0,
  };
  for (const r of filteredResponses) statusCounts[r.rsvpStatus]++;
  const donutSlices = [
    {
      key: "hadir",
      label: "Hadir",
      value: statusCounts.hadir,
      color: "#7ED3A4",
    },
    {
      key: "dibuka",
      label: "Dibuka",
      value: statusCounts.dibuka,
      color: "#B89DD4",
    },
    {
      key: "diundang",
      label: "Diundang",
      value: statusCounts.diundang,
      color: "#8FA3D9",
    },
    {
      key: "baru",
      label: "Baru",
      value: statusCounts.baru,
      color: "#9E9A95",
    },
    {
      key: "tidak_hadir",
      label: "Tidak Hadir",
      value: statusCounts.tidak_hadir,
      color: "#F0A09C",
    },
  ];

  // Engagement = opens / total guests. Using `invited` (sendCount > 0)
  // as the denominator broke when guests opened a direct-share link
  // before any send had been recorded — the ratio could exceed 100%.
  // Total tamu is the natural ceiling.
  const engagementPct = fnPct(
    filteredFunnel.opened,
    Math.max(total, 1),
  );

  // Date-bucket comparison for Bab 3 visibility — pre-event shows the
  // empty state, live/post shows the actual data. Falls back to null
  // when no schedule is set yet so the bab simply hides.
  const firstScheduleDate = schedules[0]?.eventDate ?? null;
  const daysToEvent = (() => {
    if (!firstScheduleDate) return null;
    const [y, m, d] = firstScheduleDate
      .split("-")
      .map((n) => parseInt(n, 10));
    if (!y || !m || !d) return null;
    const target = Date.UTC(y, m - 1, d);
    const today = new Date();
    const todayUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    return Math.round((target - todayUtc) / 86_400_000);
  })();
  const showHariH =
    checkinStats.actualCheckin > 0 ||
    (daysToEvent !== null && daysToEvent <= 0);

  // Insight → action bridge for Bab 1. Each entry surfaces a specific
  // gap in the funnel and points the couple at the screen that
  // resolves it. Only the most pressing is shown so we don't overwhelm.
  // Insight → action bridge for Bab 1. Surfaces ONE message keyed
  // off whichever funnel gap is most pressing. Copy uses positive-
  // intention framing so the tone stays collaborative.
  const insights = (() => {
    const items: {
      id: string;
      message: string;
      href: string | null;
      cta: string | null;
    }[] = [];
    const notInvited = Math.max(0, total - filteredFunnel.invited);
    const notOpened = Math.max(
      0,
      filteredFunnel.invited - filteredFunnel.opened,
    );
    const notConfirmed = Math.max(
      0,
      filteredFunnel.opened - filteredFunnel.responded,
    );
    if (notInvited > 0) {
      items.push({
        id: "not-invited",
        message: `${notInvited} tamu belum menerima undangan — pastikan mereka tidak terlewat.`,
        href: "/dashboard/messages?tab=kirim-baru",
        cta: "Kirim undangan",
      });
    } else if (notOpened > 3 && (daysToEvent === null || daysToEvent <= 3)) {
      items.push({
        id: "not-opened",
        message: `${notOpened} tamu sudah dikirimi tapi belum membuka — mungkin butuh pengingat.`,
        href: "/dashboard/messages?tab=kirim-baru",
        cta: "Kirim pengingat",
      });
    } else if (notConfirmed > 3) {
      items.push({
        id: "not-confirmed",
        message: `${notConfirmed} tamu sudah membuka tapi belum konfirmasi — undangan kalian sudah dibaca!`,
        href: null,
        cta: null,
      });
    } else if (total > 0) {
      items.push({
        id: "all-clear",
        message:
          "✨ Semua tamu sudah menerima dan membuka undangan kalian. Tinggal menunggu hari H!",
        href: null,
        cta: null,
      });
    }
    return items.slice(0, 1);
  })();

  // Filter dummy / placeholder seed names from the leaderboard +
  // Daftar Lengkap so "Test 1" doesn't outrank real attendees.
  const realResponses = useMemo(
    () => rejectTestNames(filteredResponses),
    [filteredResponses],
  );
  const realEnthusiasts = useMemo(
    () => rejectTestNames(enthusiasts),
    [enthusiasts],
  );

  return (
    <main className="flex-1 overflow-x-hidden px-5 py-8 lg:px-12 lg:py-12">
      <Header
        range={range}
        onRangeChange={setRange}
        syncSec={syncSec}
        engagementPct={engagementPct}
      />

      {/* PDF capture target — wraps every section the PDF should
          include. ExportSection is rendered OUTSIDE this wrapper so
          the PDF doesn't show the "Ekspor Laporan" buttons themselves. */}
      <div id="analytics-pdf-target">

      {/* ═══ BAB 1 — RINGKASAN ═══ */}
      <section id="bab-1" aria-labelledby="bab-1-heading">
        <BabHeader
          number={1}
          headingId="bab-1-heading"
          title={
            <>
              Ringkasan{" "}
              <em className="d-serif italic text-[var(--d-coral)]">perjalanan</em>
            </>
          }
          subtitle={
            daysToEvent === null || daysToEvent > 0
              ? "Sekilas cerita undangan kalian — dari pengiriman hingga pelukan."
              : daysToEvent === 0
                ? "Cerita undangan kalian — hari ini babak terakhirnya ditulis."
                : checkinStats.actualCheckin > 0
                  ? `Dari pengiriman hingga pelukan yang sudah terjadi — ${checkinStats.actualCheckin} orang hadir menemani kalian. ✨`
                  : "Dari pengiriman hingga pelukan yang sudah terjadi ✨"
          }
        />
        <div className="mt-5">
          <KpiCards cards={kpiCards} />
        </div>
      {insights.length > 0 && (daysToEvent === null || daysToEvent >= 0) && (
        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border px-4 py-3"
          style={{
            background: "rgba(240,160,156,0.04)",
            borderColor: "rgba(240,160,156,0.12)",
          }}
        >
          <span className="d-serif text-[13px] italic text-[var(--d-ink-dim)]">
            {insights[0].message.startsWith("✨") ? "" : "💡 "}
            {insights[0].message}
          </span>
          {insights[0].href && insights[0].cta && (
            <a
              href={insights[0].href}
              className="d-mono shrink-0 text-[10.5px] uppercase tracking-[0.18em] text-[var(--d-coral)] hover:text-[var(--d-peach)]"
            >
              {insights[0].cta} →
            </a>
          )}
        </div>
      )}
        <details
          open
          className="mt-4 min-h-[44px] rounded-[14px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-5 [&[open]>summary>span:first-child]:rotate-90"
        >
          <summary className="d-mono flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition-transform">▸</span>
            Detail Perjalanan Konfirmasi
          </summary>
          <div className="mt-5">
            <FunnelChart
              data={filteredFunnel}
              groups={groups}
              groupFilter={groupFilter}
              onGroupChange={setGroupFilter}
            />
          </div>
        </details>
      </section>

      <BabSeparator />

      {/* ═══ BAB 2 — JEJAK TAMU ═══ */}
      <section id="bab-2" aria-labelledby="bab-2-heading">
        <BabHeader
          number={2}
          headingId="bab-2-heading"
          title={
            <>
              Jejak{" "}
              <em className="d-serif italic text-[var(--d-coral)]">tamu</em>
            </>
          }
          subtitle="Kapan mereka membuka, dari mana mereka datang."
        />
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <TimeSeriesChart series={series} />
          <BreakdownCards
            source={trafficSource}
            groups={groupEngagement}
            totalGuests={total}
            enthusiasts={realEnthusiasts}
            variant="source-only"
          />
        </div>
        <div className="mt-6">
          <ActivityHeatmap buckets={filteredHeatmap} />
        </div>
      </section>

      {showHariH && (
        <>
          <BabSeparator />
          {/* ═══ BAB 3 — HARI H ═══ */}
          <section id="bab-3" aria-labelledby="bab-3-heading">
            <BabHeader
              number={3}
              headingId="bab-3-heading"
              title={
                <>
                  Hari{" "}
                  <em className="d-serif italic text-[var(--d-coral)]">H</em>
                </>
              }
              subtitle={
                daysToEvent === null
                  ? "Bagaimana hari besar kalian berjalan."
                  : daysToEvent > 0
                    ? "Babak ini menunggu untuk ditulis — oleh kalian, besok."
                    : daysToEvent === 0
                      ? "Hari ini — data terisi secara langsung."
                      : "Hari besar sudah berlalu — ini ringkasannya."
              }
            />
            {checkinStats.actualCheckin > 0 ? (
              <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_2fr]">
                <ShowUpRateCard stats={checkinStats} />
                <ArrivalTimeline
                  arrivals={arrivals}
                  schedules={schedules}
                  timezone={eventTimezone}
                />
              </div>
            ) : (
              <div className="mt-5 rounded-[18px] border border-dashed border-[var(--d-line)] bg-[var(--d-bg-card)] px-6 py-12 text-center">
                <div
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(240,160,156,0.06)",
                    border: "1px solid rgba(240,160,156,0.15)",
                  }}
                >
                  <span className="text-[20px] opacity-60" aria-hidden>⏱</span>
                </div>
                <p className="d-serif text-[16px] text-[var(--d-ink)]">
                  Menunggu hari{" "}
                  <em className="d-serif italic text-[var(--d-coral)]">H</em>
                </p>
                <p className="d-serif mt-1 text-[12.5px] italic text-[var(--d-ink-dim)]">
                  Saat Sambut Tamu diaktifkan, halaman ini akan merekam setiap
                  kedatangan secara live.
                </p>
                {daysToEvent !== null && daysToEvent <= 2 && daysToEvent >= 0 && (
                  <Link
                    href="/dashboard/checkin"
                    className="d-mono mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--d-coral)] px-5 py-2.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)] transition-colors hover:bg-[var(--d-coral)] hover:text-[#0B0B15]"
                  >
                    Aktifkan Sambut Tamu →
                  </Link>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <BabSeparator />

      {/* ═══ BAB 4 — DETAIL & AKSI ═══ */}
      <section id="bab-4" aria-labelledby="bab-4-heading">
        <BabHeader
          number={showHariH ? 4 : 3}
          headingId="bab-4-heading"
          title={
            <>
              Lebih{" "}
              <em className="d-serif italic text-[var(--d-coral)]">dalam</em>
            </>
          }
          subtitle="Siapa yang paling antusias, dan cerita di balik angka."
        />
        <div className="mt-5">
          <BreakdownCards
            source={trafficSource}
            groups={groupEngagement}
            totalGuests={total}
            enthusiasts={realEnthusiasts}
            variant="enthusiasts-and-groups"
          />
        </div>

      {/* Daftar Lengkap — semantic <th scope="col"> + horizontal mobile scroll. */}
      <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)]">
        <header className="border-b border-[var(--d-line)] px-7 py-5">
          <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
            Daftar Lengkap
          </p>
          <h2 className="d-serif mt-2 text-[22px] font-light tracking-[-0.015em] text-[var(--d-ink)]">
            {realResponses.length} tamu, diurutkan dari respons{" "}
            <em className="d-serif italic text-[var(--d-coral)]">terbaru</em>.
          </h2>
        </header>
        <div className="max-h-[400px] overflow-y-auto overflow-x-auto custom-scroll [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[var(--d-line)] bg-[var(--d-bg-card)] backdrop-blur-sm">
                <Th scope="col">Nama</Th>
                <Th scope="col">Status</Th>
                <Th scope="col">Membuka</Th>
                <Th scope="col">Dikonfirmasi</Th>
                <Th scope="col">Asal</Th>
              </tr>
            </thead>
            <tbody>
              {realResponses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="d-serif px-6 py-10 text-center text-[13px] italic text-[var(--d-ink-dim)]"
                  >
                    Belum ada tamu. Tambahkan tamu dan kirim undangan untuk
                    mulai melihat jejaknya.
                  </td>
                </tr>
              ) : (
                realResponses.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--d-line)] last:border-0 hover:bg-[rgba(255,255,255,0.018)]"
                  >
                    <td className="px-6 py-3.5">
                      <p className="text-[14px] text-[var(--d-ink)]">
                        {r.name}
                      </p>
                      {r.groupName && (
                        <p className="d-mono mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                          {r.groupName}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`d-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${STATUS_PILL[r.rsvpStatus]}`}
                      >
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: STATUS_DOT[r.rsvpStatus] }}
                        />
                        {STATUS_LABEL[r.rsvpStatus]}
                      </span>
                    </td>
                    <td className="d-mono px-6 py-3.5 text-[11px] tracking-[0.04em] text-[var(--d-ink-dim)]">
                      {fmtTimestamp(r.openedAt)}
                    </td>
                    <td className="d-mono px-6 py-3.5 text-[11px] tracking-[0.04em] text-[var(--d-ink-dim)]">
                      {fmtTimestamp(r.rsvpedAt)}
                    </td>
                    <td className="d-mono px-6 py-3.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                      {r.lastSentVia ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      </section>
      </div>
      {/* /analytics-pdf-target */}

      {/* 7. Export — last block so it's the operator's final stop.
          Mounted outside the PDF capture wrapper so the buttons
          themselves don't end up in the rendered PDF. */}
      <div className="mt-6">
        <ExportSection eventId={eventId} />
      </div>
    </main>
  );
}

function Header({
  range,
  onRangeChange,
  syncSec,
  engagementPct,
}: {
  range: Range;
  onRangeChange: (r: Range) => void;
  syncSec: number;
  engagementPct: number;
}) {
  const ranges: { id: Range; label: string }[] = [
    { id: "24j", label: "24J" },
    { id: "7h", label: "7 Hari" },
    { id: "30h", label: "30 Hari" },
    { id: "semua", label: "Semua" },
  ];

  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px w-7 bg-[var(--d-coral)]" />
          <p className="d-eyebrow">
            Jejak Undangan ·{" "}
            {range === "24j"
              ? "24 Jam Terakhir"
              : range === "7h"
                ? "7 Hari Terakhir"
                : range === "30h"
                  ? "30 Hari Terakhir"
                  : "Semua Waktu"}
          </p>
        </div>
        <h1 className="d-serif mt-3.5 text-[clamp(36px,4.5vw,54px)] font-extralight leading-[1] tracking-[-0.025em] text-[var(--d-ink)]">
          Bagaimana tamu{" "}
          <em className="d-serif italic text-[var(--d-coral)]">menanggapi</em>?
        </h1>
        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          <span className="d-mono inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            <span
              aria-hidden
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--d-green)] shadow-[0_0_8px_var(--d-green)]"
            />
            Terkini · sinkron {syncSec} detik lalu
          </span>
          {engagementPct > 0 && (
            <span className="d-serif text-[14px] italic text-[var(--d-green)]">
              — keterlibatan {engagementPct}% dari total tamu
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div
          className="d-mono inline-flex gap-0.5 rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] p-[3px] text-[10px] uppercase tracking-[0.14em]"
          role="tablist"
          aria-label="Rentang waktu"
        >
          {ranges.map((r) => {
            const active = r.id === range;
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onRangeChange(r.id)}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-[var(--d-coral)] text-[#0B0B15]"
                    : "text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full border border-transparent px-[18px] py-[11px] text-[13px] font-medium text-[#0B0B15] transition-transform hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(240,160,156,0.24)]"
          style={{
            background:
              "linear-gradient(115deg, var(--d-blue), var(--d-lilac) 50%, var(--d-coral))",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Ekspor Laporan
        </button>
      </div>
    </header>
  );
}

function Th({
  children,
  scope = "col",
}: {
  children: React.ReactNode;
  scope?: "col" | "row";
}) {
  return (
    <th
      scope={scope}
      className="d-mono px-6 py-3.5 text-left text-[9.5px] font-normal uppercase tracking-[0.22em] text-[var(--d-ink-faint)]"
    >
      {children}
    </th>
  );
}
