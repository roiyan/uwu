"use client";

import { useMemo, useState } from "react";

export type TimeSeriesPoint = {
  date: string;
  opened: number;
  rsvped: number;
};

const W = 1000;
const H = 280;
const PAD_L = 36;
const PAD_R = 24;
const PAD_T = 30;
const PAD_B = 38;

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const wd = d.toLocaleDateString("id-ID", {
    weekday: "short",
    timeZone: "UTC",
  });
  const day = d.getUTCDate();
  return `${wd.slice(0, 3).toUpperCase()} ${day}`;
}

export function TimeSeriesChart({
  series,
}: {
  series: TimeSeriesPoint[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(
    () => (series.length === 0 ? defaultEmptySeries() : series),
    [series],
  );

  const yMax = Math.max(
    5,
    ...data.map((d) => Math.max(d.opened, d.rsvped)),
  );
  const yTicks = niceTicks(yMax, 4);
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  function px(i: number) {
    return PAD_L + i * stepX;
  }
  function py(v: number) {
    return PAD_T + innerH - (v / yMax) * innerH;
  }

  const openedLine = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(d.opened)}`)
    .join(" ");
  const openedArea = `${openedLine} L ${px(data.length - 1)} ${PAD_T + innerH} L ${px(0)} ${PAD_T + innerH} Z`;
  const rsvpLine = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(d.rsvped)}`)
    .join(" ");
  const rsvpArea = `${rsvpLine} L ${px(data.length - 1)} ${PAD_T + innerH} L ${px(0)} ${PAD_T + innerH} Z`;

  const totalOpened = data.reduce((s, p) => s + p.opened, 0);
  const totalRsvp = data.reduce((s, p) => s + p.rsvped, 0);

  // Peak (highest opens) — pulses subtly
  let peakI = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i].opened > data[peakI].opened) peakI = i;
  }
  const peakHasData = data[peakI]?.opened > 0;

  return (
    <section className="relative overflow-hidden rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
            Jejak · 7 Hari Terakhir
          </p>
          <h2 className="d-serif mt-2 text-[24px] font-light leading-tight tracking-[-0.015em] text-[var(--d-ink)] lg:text-[26px]">
            Bukaan vs RSVP per hari
          </h2>
          <p className="d-serif mt-1.5 text-[13px] italic text-[var(--d-ink-dim)]">
            Jejak undangan sepanjang pekan — titik puncak{" "}
            {peakHasData ? `di ${dayLabel(data[peakI].date)}.` : "menunggu data."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Legend
            label="Dibuka"
            color="var(--d-coral)"
            value={totalOpened}
            dashed={false}
          />
          <Legend
            label="RSVP"
            color="var(--d-blue)"
            value={totalRsvp}
            dashed
          />
        </div>
      </div>

      <div className="relative -mx-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block h-[260px] w-full lg:h-[280px]"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="ts-area-coral" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F0A09C" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#F0A09C" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ts-area-blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8FA3D9" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#8FA3D9" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y grid + labels */}
          {yTicks.map((t) => {
            const y = py(t);
            return (
              <g key={`y-${t}`}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={y}
                  y2={y}
                  stroke="var(--d-line)"
                  strokeDasharray="2 4"
                />
                <text
                  x={PAD_L - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="var(--d-ink-faint)"
                  fontFamily="JetBrains Mono, monospace"
                  letterSpacing="0.16em"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* X labels */}
          {data.map((d, i) => (
            <text
              key={`x-${i}`}
              x={px(i)}
              y={H - 14}
              textAnchor="middle"
              fontSize="9"
              fill="var(--d-ink-faint)"
              fontFamily="JetBrains Mono, monospace"
              letterSpacing="0.18em"
            >
              {dayLabel(d.date)}
            </text>
          ))}

          {/* RSVP area + dashed line (drawn first, behind opened) */}
          <path d={rsvpArea} fill="url(#ts-area-blue)" />
          <path
            d={rsvpLine}
            fill="none"
            stroke="#8FA3D9"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Opened area + line */}
          <path d={openedArea} fill="url(#ts-area-coral)" />
          <path
            d={openedLine}
            fill="none"
            stroke="#F0A09C"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Peak callout */}
          {peakHasData && (
            <g>
              <circle
                cx={px(peakI)}
                cy={py(data[peakI].opened)}
                r="9"
                fill="rgba(240,160,156,0.15)"
                className="ts-pulse"
              />
              <circle
                cx={px(peakI)}
                cy={py(data[peakI].opened)}
                r="4.5"
                fill="#F0A09C"
                stroke="var(--d-bg-card)"
                strokeWidth="2"
              />
              <text
                x={px(peakI)}
                y={Math.max(20, py(data[peakI].opened) - 18)}
                textAnchor="middle"
                fontSize="9"
                fill="var(--d-coral)"
                fontFamily="JetBrains Mono, monospace"
                letterSpacing="0.18em"
              >
                PUNCAK · {data[peakI].opened}
              </text>
            </g>
          )}

          {/* Data dots + hover targets */}
          {data.map((d, i) => (
            <g key={`dots-${i}`}>
              <circle
                cx={px(i)}
                cy={py(d.opened)}
                r={hover === i ? 6 : 3.5}
                fill="#F0A09C"
                stroke="var(--d-bg-card)"
                strokeWidth="1.5"
                style={{ transition: "r 0.18s" }}
              />
              <circle
                cx={px(i)}
                cy={py(d.rsvped)}
                r={hover === i ? 5 : 3}
                fill="#8FA3D9"
                stroke="var(--d-bg-card)"
                strokeWidth="1.5"
                style={{ transition: "r 0.18s" }}
              />
              {/* Wide hover target */}
              <rect
                x={px(i) - stepX / 2}
                y={PAD_T}
                width={stepX}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hover !== null && data[hover] && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] border border-[var(--d-line-strong)] bg-[var(--d-bg-2)] px-3.5 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
            style={{
              left: `${(px(hover) / W) * 100}%`,
              top: `${(py(Math.max(data[hover].opened, data[hover].rsvped)) / H) * 100}%`,
              marginTop: "-12px",
              minWidth: "150px",
            }}
          >
            <p className="d-mono mb-1.5 text-[9px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
              {dayLabel(data[hover].date)}
            </p>
            <div className="d-serif flex items-baseline justify-between gap-3 text-[13px] text-[var(--d-ink)]">
              <span className="text-[var(--d-ink-dim)]">Dibuka</span>
              <em className="d-serif italic text-[var(--d-coral)]">
                {data[hover].opened}
              </em>
            </div>
            <div className="d-serif mt-0.5 flex items-baseline justify-between gap-3 text-[13px] text-[var(--d-ink)]">
              <span className="text-[var(--d-ink-dim)]">RSVP</span>
              <em className="d-serif italic text-[var(--d-blue)]">
                {data[hover].rsvped}
              </em>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.ts-pulse) {
          animation: tsPulse 2s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes tsPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.4); }
        }
      `}</style>
    </section>
  );
}

function Legend({
  label,
  color,
  value,
  dashed,
}: {
  label: string;
  color: string;
  value: number;
  dashed: boolean;
}) {
  return (
    <span className="d-mono inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)]">
      <span
        aria-hidden
        className="block h-[2px] w-7 rounded-full"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0, ${color} 4px, transparent 4px, transparent 7px)`
            : color,
        }}
      />
      {label}
      <span className="d-serif text-[14px] text-[var(--d-ink)]">{value}</span>
    </span>
  );
}

function niceTicks(max: number, count: number): number[] {
  const step = Math.max(1, Math.ceil(max / count));
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(v);
  return ticks;
}

// Generates an empty 7-day series so the chart still renders the
// grid + axes when the event has zero opens.
function defaultEmptySeries(): TimeSeriesPoint[] {
  const out: TimeSeriesPoint[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, opened: 0, rsvped: 0 });
  }
  return out;
}
