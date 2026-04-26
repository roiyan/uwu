"use client";

import { useEffect, useMemo, useState } from "react";
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
import { StatusDonut } from "@/components/analytics/StatusDonut";
import {
  ActivityHeatmap,
  type HeatmapBucket,
} from "@/components/analytics/ActivityHeatmap";
import { ExportSection } from "@/components/analytics/ExportSection";

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
    if (!groupFilter && !cutoff) return funnel;
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFilter, funnel, responses, groups, cutoff]);

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
      label: "Total Tamu",
      value: total,
      suffix: `/${guestLimit}`,
      delta: deltaOf(sparkRegistered),
      compare: "vs pekan lalu",
      spark: sparkRegistered,
    },
    {
      dot: "var(--d-blue)",
      color: "#8FA3D9",
      label: "Dibuka",
      value: filteredFunnel.opened,
      // Denominator is total guests (not "invited") so the percentage
      // can never exceed 100%. Direct-link opens land in `opened` even
      // when sendCount is 0, which used to push the ratio above 100.
      suffix: `·${fnPct(filteredFunnel.opened, Math.max(total, 1))}%`,
      delta: deltaOf(sparkOpened),
      compare: "dari total tamu",
      spark: sparkOpened,
    },
    {
      dot: "var(--d-lilac)",
      color: "#B89DD4",
      label: "RSVP",
      value: filteredFunnel.responded,
      suffix: `·${fnPct(filteredFunnel.responded, Math.max(filteredFunnel.opened, 1))}%`,
      delta: deltaOf(sparkRsvped),
      compare: "dari yang membuka",
      spark: sparkRsvped,
    },
    {
      dot: "var(--d-green)",
      color: "#7ED3A4",
      label: "Hadir",
      value: filteredFunnel.attending,
      suffix: `· ${confirmedAttendees} pax`,
      delta: deltaOf(sparkAttending),
      deltaUnit: "pax",
      compare: `paket ${packageName}`,
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
      {/* 1. KPI strip */}
      <div className="mt-7">
        <KpiCards cards={kpiCards} />
      </div>

      {/* 2. Time-series chart */}
      <div className="mt-6">
        <TimeSeriesChart series={series} />
      </div>

      {/* 3. 3-column breakdowns */}
      <div className="mt-6">
        <BreakdownCards
          source={trafficSource}
          groups={groupEngagement}
          totalGuests={total}
          enthusiasts={enthusiasts}
        />
      </div>

      {/* 4. Funnel + Donut */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <FunnelChart
          data={filteredFunnel}
          groups={groups}
          groupFilter={groupFilter}
          onGroupChange={setGroupFilter}
        />
        <StatusDonut slices={donutSlices} total={total} />
      </div>

      {/* 5. Heatmap (full-width) — Top openers card removed; the
             "Tamu Paling Antusias" card on the breakdown row above
             already surfaces the most engaged guests with a richer
             ranking, so a separate top-opener list was duplicative. */}
      <div className="mt-6">
        <ActivityHeatmap buckets={filteredHeatmap} />
      </div>

      {/* 6. Response table — placed above Ekspor so the operator can
          review the raw list (and copy individual rows out) before
          deciding which export bundle they need. */}
      <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)]">
        <header className="border-b border-[var(--d-line)] px-7 py-5">
          <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
            Daftar Respons
          </p>
          <h2 className="d-serif mt-2 text-[22px] font-light tracking-[-0.015em] text-[var(--d-ink)]">
            {filteredResponses.length} tamu, diurutkan dari respons{" "}
            <em className="d-serif italic text-[var(--d-coral)]">terbaru</em>.
          </h2>
        </header>
        <div className="max-h-[400px] overflow-y-auto overflow-x-auto custom-scroll">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[var(--d-line)] bg-[var(--d-bg-card)] backdrop-blur-sm">
                <Th>Nama</Th>
                <Th>Status</Th>
                <Th>Dibuka</Th>
                <Th>Direspons</Th>
                <Th>Via</Th>
              </tr>
            </thead>
            <tbody>
              {filteredResponses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="d-serif px-6 py-10 text-center text-[13px] italic text-[var(--d-ink-dim)]"
                  >
                    Belum ada tamu. Tambahkan tamu lalu kirim undangan untuk
                    mulai melihat data respons di sini.
                  </td>
                </tr>
              ) : (
                filteredResponses.map((r) => (
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
            Analytics ·{" "}
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
            Update real-time · sinkron {syncSec} detik lalu
          </span>
          {engagementPct > 0 && (
            <span className="d-serif text-[14px] italic text-[var(--d-green)]">
              — engagement {engagementPct}% dari total tamu
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="d-mono px-6 py-3.5 text-left text-[9.5px] font-normal uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
      {children}
    </th>
  );
}
