"use client";

import { useMemo, useState } from "react";

export type DailyOpenPoint = {
  /** YYYY-MM-DD UTC date string from the server. */
  date: string;
  count: number;
};

const W = 600;
const H = 200;
const PAD_X = 40;
const PAD_Y = 24;

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function fmtDay(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return DAY_LABELS[dow] ?? iso;
}

/**
 * Build a 7-day window ending today. Fills missing days with 0 and
 * overlays a 7-day forward forecast line that linearly extrapolates
 * the average daily growth — purely visual, no DB side effects.
 */
function buildSeries(raw: DailyOpenPoint[]): {
  actual: { date: string; count: number; x: number; y: number }[];
  forecast: { date: string; count: number; x: number; y: number }[];
  yMax: number;
} {
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const actualDates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayUtc - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    actualDates.push(iso);
  }

  const byDate = new Map(raw.map((p) => [p.date, p.count]));
  const actualCounts = actualDates.map((d) => byDate.get(d) ?? 0);

  // Linear forecast: average daily delta over the past 7 days
  // projected forward 7 days. Cap at zero so it never goes negative.
  const last = actualCounts[actualCounts.length - 1] ?? 0;
  const first = actualCounts[0] ?? 0;
  const slope = Math.max(0, (last - first) / 6);
  const forecastCounts = Array.from({ length: 7 }, (_, i) =>
    Math.max(0, Math.round(last + slope * (i + 1))),
  );
  const forecastDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayUtc + (i + 1) * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });

  const yMaxCalc = Math.max(
    1,
    ...actualCounts,
    ...forecastCounts,
  );
  const yMax = Math.ceil(yMaxCalc * 1.2);

  const totalPoints = 14; // 7 actual + 7 forecast
  const xStep = (W - 2 * PAD_X) / (totalPoints - 1);
  const ySpan = H - 2 * PAD_Y;

  const toY = (v: number) =>
    PAD_Y + ySpan - (v / yMax) * ySpan;

  const actual = actualDates.map((date, i) => ({
    date,
    count: actualCounts[i] ?? 0,
    x: PAD_X + i * xStep,
    y: toY(actualCounts[i] ?? 0),
  }));
  const forecast = [
    // Bridge: include today's last actual point as the first forecast
    // anchor so the dashed line starts visually attached.
    {
      date: actualDates[actualDates.length - 1] ?? "",
      count: last,
      x: PAD_X + (actualDates.length - 1) * xStep,
      y: toY(last),
    },
    ...forecastDates.map((date, i) => ({
      date,
      count: forecastCounts[i] ?? 0,
      x: PAD_X + (actualDates.length + i) * xStep,
      y: toY(forecastCounts[i] ?? 0),
    })),
  ];

  return { actual, forecast, yMax };
}

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function pointsToArea(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const line = pointsToPath(points);
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const baselineY = H - PAD_Y;
  return `${line} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
}


export function DailyOpensChart({ data }: { data: DailyOpenPoint[] }) {
  const series = useMemo(() => buildSeries(data), [data]);
  const [hover, setHover] = useState<
    | {
        x: number;
        y: number;
        date: string;
        count: number;
        kind: "actual" | "forecast";
      }
    | null
  >(null);

  // Info-banner state previously gated by localStorage (INFO_KEY).
  // Now rendered as a hover-only "i" pill in the header; no
  // dismissed state needed.

  const totalActual = series.actual.reduce((acc, p) => acc + p.count, 0);
  const isEmpty = totalActual === 0;

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => PAD_Y + f * (H - 2 * PAD_Y));

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="d-eyebrow">Bukaan</p>
            {/* Replaced the dismissable info banner with a hover-only
                "i" pill — same explanation, zero vertical real estate. */}
            <span
              role="img"
              aria-label="Setiap kali tamu membuka link undangan, kami mencatatnya di sini. Gunakan untuk tahu kapan waktu terbaik mengirim undangan berikutnya."
              title="Setiap kali tamu membuka link undangan, kami mencatatnya di sini. Gunakan untuk tahu kapan waktu terbaik mengirim undangan berikutnya."
              className="inline-flex h-[14px] w-[14px] cursor-help items-center justify-center rounded-full border text-[8.5px] text-[var(--d-ink-faint)]"
              style={{ borderColor: "var(--d-line-strong)" }}
            >
              i
            </span>
          </div>
          <h2 className="d-serif mt-2 text-[26px] font-extralight leading-tight text-[var(--d-ink)]">
            Bukaan{" "}
            <em className="d-serif italic text-[var(--d-coral)]">per hari</em>
          </h2>
          <p className="mt-1 text-[12.5px] text-[var(--d-ink-dim)]">
            Tujuh hari terakhir · prediksi hingga hari H
          </p>
        </div>
        <Legend />
      </header>

      <div className="relative mt-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          className="block"
          role="img"
          aria-label="Grafik bukaan undangan per hari"
        >
          <defs>
            <linearGradient id="dailyOpensCoral" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F0A09C" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F0A09C" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="dailyOpensBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8FA3D9" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#8FA3D9" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y grid */}
          <g>
            {gridLines.map((y, i) => (
              <line
                key={i}
                x1={PAD_X}
                x2={W - PAD_X}
                y1={y}
                y2={y}
                stroke="var(--d-line)"
                strokeDasharray="2 4"
              />
            ))}
          </g>

          {/* Forecast (drawn first so coral overlays it) */}
          <path
            d={pointsToArea(series.forecast)}
            fill="url(#dailyOpensBlue)"
          />
          <path
            d={pointsToPath(series.forecast)}
            fill="none"
            stroke="#8FA3D9"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Actual */}
          <path d={pointsToArea(series.actual)} fill="url(#dailyOpensCoral)" />
          <path
            d={pointsToPath(series.actual)}
            fill="none"
            stroke="#F0A09C"
            strokeWidth="2"
          />

          {/* Hover targets — invisible squares per actual point */}
          {series.actual.map((p) => {
            const isHover =
              hover && hover.kind === "actual" && hover.date === p.date;
            return (
              <g key={`a-${p.date}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHover ? 6 : 4}
                  fill="#F0A09C"
                  stroke="var(--d-bg-card)"
                  strokeWidth="2"
                />
                <rect
                  x={p.x - 18}
                  y={0}
                  width={36}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() =>
                    setHover({
                      x: p.x,
                      y: p.y,
                      date: p.date,
                      count: p.count,
                      kind: "actual",
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}

          {/* X axis labels */}
          {series.actual.map((p, i) => (
            <text
              key={`l-${p.date}`}
              x={p.x}
              y={H - 6}
              textAnchor="middle"
              fontFamily='"JetBrains Mono", monospace'
              fontSize="9"
              fill="var(--d-ink-faint)"
              style={{ letterSpacing: "0.18em" }}
            >
              {i === series.actual.length - 1 ? "Hari Ini" : fmtDay(p.date)}
            </text>
          ))}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-[var(--d-line-strong)] bg-[var(--d-bg-2)] px-3 py-2 text-[11px]"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: `calc(${(hover.y / H) * 100}% - 10px)`,
            }}
          >
            <p className="d-mono uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
              {hover.kind === "actual" ? "Aktual" : "Prediksi"}
            </p>
            <p className="d-serif mt-0.5 text-[16px] font-light text-[var(--d-coral)]">
              {hover.count}{" "}
              <span className="text-[10px] text-[var(--d-ink-dim)]">
                bukaan
              </span>
            </p>
            <p className="d-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)]">
              {fmtDay(hover.date)}
            </p>
          </div>
        )}

        {isEmpty && (
          <p className="d-mono mt-3 text-center text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
            Belum ada jejak bukaan · Tayangkan undangan untuk mulai melihat jejaknya.
          </p>
        )}
      </div>
    </section>
  );
}

function Legend() {
  return (
    <div className="d-mono flex items-center gap-4 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-sm"
          style={{ background: "#F0A09C" }}
        />
        Aktual
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-sm"
          style={{ background: "#8FA3D9" }}
        />
        Prediksi
      </span>
    </div>
  );
}
