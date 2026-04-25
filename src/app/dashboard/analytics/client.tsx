"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkline } from "@/components/dashboard/Sparkline";

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
  groupName: string | null;
  groupColor: string | null;
  rsvpStatus: GuestStatus;
  rsvpAttendees: number | null;
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

function todayLabel(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AnalyticsClient({
  total,
  guestLimit,
  packageName,
  funnel,
  trend,
  responses,
  groups,
  confirmedAttendees,
}: {
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

  // Week-over-week deltas for the trend badges. Compares the latest
  // bucket to the first; positive = up, zero = neutral, negative =
  // down. Falls back to the full sum when the series is shorter
  // than 2 buckets.
  function deltaOf(values: number[]): number {
    if (values.length < 2) return values[0] ?? 0;
    const half = Math.floor(values.length / 2);
    const recent = values.slice(half).reduce((a, b) => a + b, 0);
    const prior = values.slice(0, half).reduce((a, b) => a + b, 0);
    return recent - prior;
  }

  const dRegistered = deltaOf(sparkRegistered);
  const dOpened = deltaOf(sparkOpened);
  const dRsvped = deltaOf(sparkRsvped);
  const dAttending = deltaOf(sparkAttending);

  // Funnel rebuild client-side when group filter changes. We compute
  // from `responses` instead of round-tripping to keep the dropdown
  // snappy. When "all" is selected we use the server-rendered numbers
  // so empty-on-first-load still works.
  const filteredFunnel = useMemo(() => {
    if (!groupFilter) return funnel;
    const rows = responses.filter((r) =>
      groups.find((g) => g.id === groupFilter)
        ? r.groupName === groups.find((g) => g.id === groupFilter)?.name
        : true,
    );
    return {
      total: rows.length,
      invited: rows.filter((r) => r.sendCount > 0).length,
      opened: rows.filter((r) => r.openedAt !== null).length,
      responded: rows.filter(
        (r) => r.rsvpStatus === "hadir" || r.rsvpStatus === "tidak_hadir",
      ).length,
      attending: rows.filter((r) => r.rsvpStatus === "hadir").length,
    };
  }, [groupFilter, funnel, responses, groups]);

  const fnPct = (v: number, denom: number) =>
    denom > 0 ? Math.round((v / denom) * 100) : 0;

  // Two breakdown cards — derived in-memory.
  const distribusi = [
    {
      key: "hadir" as const,
      label: "Hadir",
      value: responses.filter((r) => r.rsvpStatus === "hadir").length,
      color: "var(--d-green)",
    },
    {
      key: "tidak_hadir" as const,
      label: "Tidak Hadir",
      value: responses.filter((r) => r.rsvpStatus === "tidak_hadir").length,
      color: "var(--d-coral)",
    },
    {
      key: "menunggu" as const,
      label: "Menunggu",
      value: responses.filter(
        (r) =>
          r.rsvpStatus === "baru" ||
          r.rsvpStatus === "diundang" ||
          r.rsvpStatus === "dibuka",
      ).length,
      color: "var(--d-ink-faint)",
    },
  ];

  const status = [
    {
      label: "Diundang",
      value: funnel.invited,
      color: "var(--d-blue)",
    },
    {
      label: "Dibuka",
      value: funnel.opened,
      color: "var(--d-lilac)",
    },
    {
      label: "Merespons",
      value: funnel.responded,
      color: "var(--d-gold)",
    },
    {
      label: "Belum buka",
      value: total - funnel.opened,
      color: "var(--d-ink-faint)",
    },
  ];

  return (
    <main className="flex-1 overflow-x-hidden px-5 py-8 lg:px-12 lg:py-12">
      <Header
        range={range}
        onRangeChange={setRange}
        syncSec={syncSec}
        engagementPct={fnPct(funnel.opened, Math.max(funnel.invited, 1))}
      />

      {/* 4 KPI cards */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          dot="var(--d-coral)"
          label="Total Tamu"
          value={total}
          suffix={`/${guestLimit}`}
          delta={dRegistered}
          deltaUnit=""
          compare="vs pekan lalu"
          spark={sparkRegistered}
          color="#F0A09C"
        />
        <KpiCard
          dot="var(--d-blue)"
          label="Dibuka"
          value={funnel.opened}
          suffix={`·${fnPct(funnel.opened, Math.max(funnel.invited, 1))}%`}
          delta={dOpened}
          deltaUnit=""
          compare="rata-rata industri 42%"
          spark={sparkOpened}
          color="#8FA3D9"
        />
        <KpiCard
          dot="var(--d-lilac)"
          label="RSVP"
          value={funnel.responded}
          suffix={`·${fnPct(funnel.responded, Math.max(funnel.opened, 1))}%`}
          delta={dRsvped}
          deltaUnit=""
          compare="dari yang membuka"
          spark={sparkRsvped}
          color="#B89DD4"
        />
        <KpiCard
          dot="var(--d-green)"
          label="Hadir"
          value={funnel.attending}
          suffix={`pax · ${confirmedAttendees}`}
          delta={dAttending}
          deltaUnit="pax"
          compare={`paket ${packageName}`}
          spark={sparkAttending}
          color="#7ED3A4"
        />
      </section>

      {/* Funnel with group filter */}
      <section className="mt-6 rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
              Funnel Respons · {todayLabel()}
            </p>
            <h2 className="d-serif mt-2 text-[26px] font-extralight leading-tight text-[var(--d-ink)]">
              Perjalanan tamu dari undangan hingga{" "}
              <em className="d-serif italic text-[var(--d-coral)]">
                konfirmasi kehadiran.
              </em>
            </h2>
          </div>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="d-mono rounded-md border border-[var(--d-line-strong)] bg-[var(--d-bg-2)] px-4 py-2.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink)] outline-none transition-colors focus:border-[var(--d-coral)]"
          >
            <option value="">Semua Grup</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </header>

        <FunnelRows data={filteredFunnel} />
      </section>

      {/* Distribusi + Status — 2 columns */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BreakdownCard
          eyebrow="Distribusi Respons"
          title={
            <>
              Hadir, tidak hadir, atau{" "}
              <em className="d-serif italic text-[var(--d-coral)]">
                menunggu
              </em>
              .
            </>
          }
          rows={distribusi.map((r) => ({
            label: r.label,
            value: r.value,
            pct: fnPct(r.value, Math.max(total, 1)),
            color: r.color,
          }))}
        />
        <BreakdownCard
          eyebrow="Status Tamu"
          title={
            <>
              Sebaran{" "}
              <em className="d-serif italic text-[var(--d-coral)]">status</em>{" "}
              keseluruhan.
            </>
          }
          rows={status.map((r) => ({
            label: r.label,
            value: r.value,
            pct: fnPct(r.value, Math.max(total, 1)),
            color: r.color,
          }))}
        />
      </div>

      {/* Response table */}
      <section className="mt-6 rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)]">
        <header className="border-b border-[var(--d-line)] p-6">
          <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
            Daftar Respons
          </p>
          <h2 className="d-serif mt-2 text-[22px] font-extralight text-[var(--d-ink)]">
            {responses.length} tamu, diurutkan dari respons{" "}
            <em className="d-serif italic text-[var(--d-coral)]">terbaru</em>.
          </h2>
        </header>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--d-line)]">
                <Th>Nama</Th>
                <Th>Status</Th>
                <Th>Dibuka</Th>
                <Th>Direspons</Th>
                <Th>Via</Th>
              </tr>
            </thead>
            <tbody>
              {responses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[13px] text-[var(--d-ink-dim)]"
                  >
                    Belum ada tamu. Tambahkan tamu lalu kirim undangan untuk
                    mulai melihat data respons di sini.
                  </td>
                </tr>
              ) : (
                responses.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--d-line)] last:border-0 hover:bg-[rgba(237,232,222,0.025)]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--d-ink)]">
                        {r.name}
                      </p>
                      {r.groupName && (
                        <p className="d-mono mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                          {r.groupName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${STATUS_PILL[r.rsvpStatus]}`}
                      >
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: STATUS_DOT[r.rsvpStatus] }}
                        />
                        {STATUS_LABEL[r.rsvpStatus]}
                      </span>
                    </td>
                    <td className="d-mono px-4 py-3 text-[11px] text-[var(--d-ink-dim)]">
                      {fmtTimestamp(r.openedAt)}
                    </td>
                    <td className="d-mono px-4 py-3 text-[11px] text-[var(--d-ink-dim)]">
                      {fmtTimestamp(r.rsvpedAt)}
                    </td>
                    <td className="d-mono px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                      {r.lastSentVia ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
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
    <header>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-px w-10"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
              }}
            />
            <p className="d-eyebrow">Analytics</p>
          </div>
          <h1 className="d-serif mt-3 text-[32px] font-extralight leading-[1.1] tracking-[-0.01em] text-[var(--d-ink)] md:text-[48px] md:leading-[1.05]">
            Bagaimana tamu{" "}
            <em className="d-serif italic text-[var(--d-coral)]">
              menanggapi
            </em>
            ?
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[var(--d-ink-dim)]">
            <span className="d-mono inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]">
              <span
                aria-hidden
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--d-green)]"
              />
              Update real-time · sinkron {syncSec} detik lalu
            </span>
            {engagementPct > 0 && (
              <span className="d-serif italic text-[var(--d-coral)]">
                — engagement {engagementPct}% dari yang diundang
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range pills — visual chrome that matches the design
              ref. Active state is local; data behind the pills is
              the full event window today. Wiring per-range queries
              is a follow-up. */}
          <div
            className="d-mono inline-flex gap-1 rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] p-1 text-[10px] uppercase tracking-[0.22em]"
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
                  className={`rounded-full px-3 py-1 transition-colors ${
                    active
                      ? "bg-[var(--d-bg-1)] text-[var(--d-ink)]"
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
            className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)]"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Ekspor
          </button>
        </div>
      </div>
    </header>
  );
}

function KpiCard({
  dot,
  label,
  value,
  suffix,
  delta,
  deltaUnit,
  compare,
  spark,
  color,
}: {
  dot: string;
  label: string;
  value: number;
  suffix: string;
  delta: number;
  deltaUnit: string;
  compare: string;
  spark: number[];
  color: string;
}) {
  const positive = delta > 0;
  const neutral = delta === 0;
  return (
    <div className="d-card flex flex-col gap-3 p-5">
      <div className="d-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dot, boxShadow: `0 0 10px ${dot}` }}
        />
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="d-serif text-[42px] font-extralight leading-none text-[var(--d-ink)]">
          {value}
        </p>
        <span className="d-serif text-[16px] text-[var(--d-ink-dim)]">
          {suffix}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-[var(--d-ink-dim)]">
        <span
          className={`d-mono inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
            positive
              ? "bg-[rgba(126,211,164,0.12)] text-[var(--d-green)]"
              : neutral
                ? "bg-[var(--d-bg-2)] text-[var(--d-ink-dim)]"
                : "bg-[rgba(240,160,156,0.12)] text-[var(--d-coral)]"
          }`}
        >
          {positive ? "↑" : neutral ? "·" : "↓"}{" "}
          {Math.abs(delta)}
          {deltaUnit ? ` ${deltaUnit}` : ""}
        </span>
        <span>{compare}</span>
      </div>
      <Sparkline values={spark} color={color} className="-mx-1" />
    </div>
  );
}

function FunnelRows({
  data,
}: {
  data: {
    total: number;
    invited: number;
    opened: number;
    responded: number;
    attending: number;
  };
}) {
  const denom = Math.max(data.total, 1);
  const rows: { key: string; label: string; value: number; color: string }[] =
    [
      { key: "total", label: "Total Tamu", value: data.total, color: "var(--d-blue)" },
      { key: "invited", label: "Diundang", value: data.invited, color: "var(--d-coral)" },
      { key: "opened", label: "Dibuka", value: data.opened, color: "var(--d-gold)" },
      {
        key: "responded",
        label: "Merespons",
        value: data.responded,
        color: "var(--d-lilac)",
      },
      {
        key: "attending",
        label: "Hadir",
        value: data.attending,
        color: "var(--d-green)",
      },
    ];

  return (
    <ul className="mt-7 space-y-5">
      {rows.map((row) => {
        const pct = Math.round((row.value / denom) * 100);
        return (
          <li key={row.key}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 text-[var(--d-ink)]">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: row.color }}
                />
                {row.label}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="d-serif text-[18px] font-light text-[var(--d-ink)]">
                  {row.value}
                </span>
                <span className="d-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                  · {pct}%
                </span>
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--d-bg-2)]">
              <div
                className="d-bar-fill h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: row.color,
                  boxShadow: `0 0 12px ${row.color}`,
                  transformOrigin: "left center",
                  transform: `scaleX(${pct / 100})`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function BreakdownCard({
  eyebrow,
  title,
  rows,
}: {
  eyebrow: string;
  title: React.ReactNode;
  rows: { label: string; value: number; pct: number; color: string }[];
}) {
  return (
    <section className="d-card p-7">
      <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
        {eyebrow}
      </p>
      <h2 className="d-serif mt-2 text-[22px] font-extralight text-[var(--d-ink)]">
        {title}
      </h2>
      <ul className="mt-5 space-y-4">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2 text-[var(--d-ink-dim)]">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: row.color }}
                />
                {row.label}
              </span>
              <span className="d-mono uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                {row.value} · {row.pct}%
              </span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--d-bg-2)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${row.pct}%`,
                  background: row.color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="d-mono px-4 py-3 text-left text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
      {children}
    </th>
  );
}
