"use client";

import type { AnalyticsExportData } from "@/lib/actions/analytics-export";

/**
 * Off-screen 1200×auto layout for the "Infografis PNG" export.
 *
 * Design intent:
 * The PNG is the operator's organic-marketing artifact — they post it
 * to Instagram or share to WhatsApp, friends see UWU's branding, click
 * through, signup. Every section earns its pixels: header, KPI strip,
 * funnel bars, compact heatmap, top responses table, ucapan
 * highlights, status summary, branding footer.
 *
 * Hard constraints (do not violate — html2canvas compatibility):
 *  - NO oklch() / oklab() / lab() colors. Hex + rgb/rgba only. Tailwind
 *    v4's default utilities emit oklch in computed styles, so we use
 *    inline styles end-to-end.
 *  - NO Tailwind classnames anywhere on this subtree (the live element
 *    is captured directly; computed styles from Tailwind would
 *    re-introduce oklch). The shared `buildOnClone` hook provides a
 *    safety net by pinning resolved rgb values, but using literal
 *    hex inline is belt-and-suspenders.
 *  - NO CSS custom properties (`var(--x)`).
 *  - Position: fixed off-screen at left:-10000 so the live DOM is the
 *    capture source (not a clone), keeping computed styles authoritative.
 *  - Width pinned at 1200px in inline px so the html2canvas viewport
 *    matches and the template renders deterministically across devices.
 */

const C = {
  bg: "#06060B",
  bgCard: "#0E0F18",
  bgInner: "#13141F",
  ink: "#EDE8DE",
  inkDim: "#9E9A95",
  inkFaint: "#4A4850",
  line: "rgba(237,232,222,0.07)",
  lineStrong: "rgba(237,232,222,0.16)",
  coral: "#F0A09C",
  peach: "#F4B8A3",
  blue: "#8FA3D9",
  lilac: "#B89DD4",
  green: "#7ED3A4",
  red: "#E08A8A",
  gold: "#D4B896",
} as const;

const FONT_SERIF = '"Fraunces", "Cormorant Garamond", Georgia, serif';
const FONT_SANS = '"Outfit", "Inter", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

const DAY_LABELS = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
const HOUR_BUCKETS: Array<{ label: string; from: number; to: number }> = [
  { label: "00", from: 0, to: 2 },
  { label: "03", from: 3, to: 5 },
  { label: "06", from: 6, to: 8 },
  { label: "09", from: 9, to: 11 },
  { label: "12", from: 12, to: 14 },
  { label: "15", from: 15, to: 17 },
  { label: "18", from: 18, to: 20 },
  { label: "21", from: 21, to: 23 },
];

export function InfographicTemplate({
  data,
  id = "uwu-infographic",
}: {
  data: AnalyticsExportData;
  id?: string;
}) {
  const t = data.totals;
  const conversionPct =
    t.totalGuests > 0
      ? Math.round((t.attending / t.totalGuests) * 100)
      : 0;
  const generated = new Date(data.generatedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Top 3 wishes — only "hadir" guests with non-empty messages.
  const wishes = data.guests
    .filter(
      (g) =>
        g.rsvp === "Hadir" && g.message && g.message.trim().length > 0,
    )
    .slice(0, 3);

  // Top 10 responses — most recent rsvpedAt first; fallback to ones
  // who at least opened. Operators want a curated highlight, not the
  // entire 200-row list.
  const responses = data.guests
    .filter((g) => g.rsvpedAt || g.openedAt)
    .slice(0, 10);

  // Compact 7×8 heatmap matrix (rows: days 0-6 Sun-Sat, cols: 8
  // 3-hour buckets). Aggregates the server's 7×24 buckets so the
  // image stays scannable at IG-grid size.
  const heatMatrix: number[][] = Array.from({ length: 7 }, () =>
    Array(HOUR_BUCKETS.length).fill(0),
  );
  for (const b of data.heatmap) {
    if (b.day < 0 || b.day > 6) continue;
    const idx = HOUR_BUCKETS.findIndex(
      (h) => b.hour >= h.from && b.hour <= h.to,
    );
    if (idx >= 0) heatMatrix[b.day][idx] += b.count;
  }
  const heatMax = Math.max(1, ...heatMatrix.flat());
  // Peak slot for the caption.
  let peak: { day: number; bucket: number; count: number } | null = null;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < HOUR_BUCKETS.length; h++) {
      if (heatMatrix[d][h] > 0 && (!peak || heatMatrix[d][h] > peak.count)) {
        peak = { day: d, bucket: h, count: heatMatrix[d][h] };
      }
    }
  }

  // Funnel stages — five points narrowing top-down so the visual
  // mirrors the dashboard chart.
  const denomTotal = Math.max(1, t.totalGuests);
  const denomInvited = Math.max(1, t.invited);
  const denomOpened = Math.max(1, t.opened);
  const denomResponded = Math.max(1, t.responded);
  const funnel = [
    { label: "Total", value: t.totalGuests, pct: 100, color: C.coral },
    {
      label: "Diundang",
      value: t.invited,
      pct: Math.round((t.invited / denomTotal) * 100),
      color: C.peach,
    },
    {
      label: "Dibuka",
      value: t.opened,
      pct: Math.round((t.opened / denomInvited) * 100),
      color: C.gold,
    },
    {
      label: "RSVP",
      value: t.responded,
      pct: Math.round((t.responded / denomOpened) * 100),
      color: C.lilac,
    },
    {
      label: "Hadir",
      value: t.attending,
      pct: Math.round((t.attending / denomResponded) * 100),
      color: C.green,
    },
  ];

  return (
    <div
      id={id}
      aria-hidden
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 1200,
        background: C.bg,
        color: C.ink,
        fontFamily: FONT_SANS,
        padding: "72px 64px 56px",
        boxSizing: "border-box",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Coral glow corner */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -200,
          top: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(240,160,156,0.16), transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* ============== Header ============== */}
      <Header
        coupleName={data.coupleName}
        eventDate={data.eventDate}
        venue={data.venue}
      />

      {/* ============== KPI Row (3 cards) ============== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginTop: 56,
          position: "relative",
        }}
      >
        <KpiTile
          label="Total Tamu"
          value={t.totalGuests}
          dot={C.coral}
        />
        <KpiTile
          label="Hadir (RSVP)"
          value={t.attending}
          dot={C.green}
          highlight
        />
        <KpiTile label="Dibuka" value={t.opened} dot={C.lilac} />
      </div>

      {/* ============== Funnel ============== */}
      <SectionHeading
        eyebrow="Konversi Funnel"
        title={
          <>
            Perjalanan{" "}
            <em style={{ fontStyle: "italic", color: C.coral }}>tamu</em>.
          </>
        }
      />
      <FunnelBlock funnel={funnel} conversionPct={conversionPct} />

      {/* ============== Heatmap ============== */}
      <SectionHeading
        eyebrow="Aktivitas Tamu"
        title={
          <>
            Kapan mereka{" "}
            <em style={{ fontStyle: "italic", color: C.coral }}>membuka</em>?
          </>
        }
      />
      <HeatmapBlock matrix={heatMatrix} max={heatMax} peak={peak} />

      {/* ============== Responses Table ============== */}
      {responses.length > 0 && (
        <>
          <SectionHeading
            eyebrow="Respons Tamu"
            title={
              <>
                Sambutan{" "}
                <em style={{ fontStyle: "italic", color: C.coral }}>
                  terbaru
                </em>
                .
              </>
            }
          />
          <ResponsesBlock rows={responses} />
        </>
      )}

      {/* ============== Featured Wishes ============== */}
      {wishes.length > 0 && (
        <>
          <SectionHeading
            eyebrow="Ucapan Terbaik"
            title={
              <>
                Kata-kata{" "}
                <em style={{ fontStyle: "italic", color: C.coral }}>
                  terindah
                </em>
                .
              </>
            }
          />
          <WishesBlock wishes={wishes} />
        </>
      )}

      {/* ============== Status + Summary footer ============== */}
      <div
        style={{
          marginTop: 48,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <StatusCard
          attending={t.attending}
          notAttending={t.notAttending}
          notResponded={t.notResponded}
          confirmedPax={t.confirmedAttendees}
        />
        <SummaryCard
          totalGuests={t.totalGuests}
          conversionPct={conversionPct}
          packageName={data.packageName}
        />
      </div>

      {/* ============== Brand footer ============== */}
      <div
        style={{
          marginTop: 56,
          textAlign: "center",
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.32em",
          color: C.inkFaint,
          textTransform: "uppercase",
        }}
      >
        Dibuat dengan{" "}
        <span style={{ color: C.coral }}>uwu.id</span>
        {" · "}
        {generated}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components — all use literal hex/rgba via inline styles only.
// =============================================================================

function Header({
  coupleName,
  eventDate,
  venue,
}: {
  coupleName: string;
  eventDate: string | null;
  venue: string | null;
}) {
  return (
    <div style={{ position: "relative", textAlign: "center" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          justifyContent: "center",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 40,
            height: 1,
            background: C.coral,
          }}
        />
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            letterSpacing: "0.32em",
            color: C.coral,
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          uwu · Laporan Acara
        </p>
        <span
          style={{
            display: "inline-block",
            width: 40,
            height: 1,
            background: C.coral,
          }}
        />
      </div>
      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 200,
          fontSize: 68,
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
          margin: "26px 0 0",
          color: C.ink,
        }}
      >
        {coupleName}
      </h1>
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: 13,
          letterSpacing: "0.18em",
          color: C.inkDim,
          textTransform: "uppercase",
          marginTop: 16,
        }}
      >
        {eventDate ?? "—"}
        {venue ? ` · ${venue}` : ""}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 56, position: "relative" }}>
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.32em",
          color: C.coral,
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        {eyebrow}
      </p>
      <h2
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 300,
          fontSize: 26,
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
          margin: "10px 0 22px",
          color: C.ink,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function KpiTile({
  label,
  value,
  dot,
  highlight,
}: {
  label: string;
  value: number;
  dot: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: "26px 24px",
        borderRadius: 18,
        border: `1px solid ${C.line}`,
        background: highlight
          ? "linear-gradient(135deg, rgba(126,211,164,0.10), #0E0F18)"
          : C.bgCard,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.24em",
          color: C.inkDim,
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dot,
            boxShadow: `0 0 8px ${dot}`,
          }}
        />
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 200,
          fontSize: 60,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 14,
          color: highlight ? dot : C.ink,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FunnelBlock({
  funnel,
  conversionPct,
}: {
  funnel: Array<{
    label: string;
    value: number;
    pct: number;
    color: string;
  }>;
  conversionPct: number;
}) {
  const max = Math.max(1, ...funnel.map((f) => f.value));
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 18,
        border: `1px solid ${C.line}`,
        background: C.bgCard,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {funnel.map((f) => {
          const widthPct = Math.max(8, (f.value / max) * 100);
          return (
            <div
              key={f.label}
              style={{ display: "flex", alignItems: "center", gap: 14 }}
            >
              <div
                style={{
                  width: 90,
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: C.inkDim,
                  textTransform: "uppercase",
                }}
              >
                {f.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 38,
                  position: "relative",
                  background: "rgba(255,255,255,0.025)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${f.color}, ${f.color}77)`,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 14,
                    fontFamily: FONT_SERIF,
                    fontWeight: 300,
                    fontSize: 18,
                    color: "#0B0B15",
                  }}
                >
                  {f.value}
                </div>
              </div>
              <div
                style={{
                  width: 60,
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  textAlign: "right",
                  color: C.ink,
                }}
              >
                {f.pct}%
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 22,
          paddingTop: 18,
          borderTop: `1px solid ${C.line}`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.28em",
            color: C.inkFaint,
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Konversi Keseluruhan
        </p>
        <p
          style={{
            fontFamily: FONT_SERIF,
            fontWeight: 200,
            fontSize: 36,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            margin: 0,
            color: C.ink,
          }}
        >
          {conversionPct}
          <span style={{ fontSize: 18, color: C.inkDim }}>%</span>
        </p>
      </div>
    </div>
  );
}

function HeatmapBlock({
  matrix,
  max,
  peak,
}: {
  matrix: number[][];
  max: number;
  peak: { day: number; bucket: number; count: number } | null;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 18,
        border: `1px solid ${C.line}`,
        background: C.bgCard,
      }}
    >
      {/* Hour labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `48px repeat(${HOUR_BUCKETS.length}, 1fr)`,
          gap: 4,
          marginBottom: 6,
        }}
      >
        <div />
        {HOUR_BUCKETS.map((h) => (
          <div
            key={h.label}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              textAlign: "center",
              color: C.inkFaint,
              letterSpacing: "0.06em",
            }}
          >
            {h.label}
          </div>
        ))}
      </div>
      {/* Grid */}
      {matrix.map((row, dIdx) => (
        <div
          key={dIdx}
          style={{
            display: "grid",
            gridTemplateColumns: `48px repeat(${HOUR_BUCKETS.length}, 1fr)`,
            gap: 4,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.18em",
              color: C.inkFaint,
              display: "flex",
              alignItems: "center",
              textTransform: "uppercase",
            }}
          >
            {DAY_LABELS[dIdx]}
          </div>
          {row.map((c, hIdx) => {
            const intensity = max === 0 ? 0 : c / max;
            const op = c === 0 ? 0.06 : 0.1 + intensity * 0.75;
            const isPeak =
              peak && peak.day === dIdx && peak.bucket === hIdx;
            return (
              <div
                key={hIdx}
                style={{
                  height: 28,
                  borderRadius: 4,
                  background: `rgba(240,160,156,${op})`,
                  border: isPeak
                    ? `1px solid ${C.coral}`
                    : "1px solid rgba(255,255,255,0.02)",
                }}
              />
            );
          })}
        </div>
      ))}
      {/* Caption */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${C.line}`,
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.18em",
          color: peak ? C.coral : C.inkFaint,
          textTransform: "uppercase",
        }}
      >
        {peak
          ? `Peak: ${DAY_LABELS[peak.day]} ${HOUR_BUCKETS[peak.bucket].label}:00 WIB · ${peak.count} bukaan`
          : "Belum ada bukaan tercatat."}
      </div>
    </div>
  );
}

function ResponsesBlock({
  rows,
}: {
  rows: AnalyticsExportData["guests"];
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRadius: 18,
        border: `1px solid ${C.line}`,
        background: C.bgCard,
      }}
    >
      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 0.9fr 0.7fr",
          gap: 14,
          paddingBottom: 12,
          borderBottom: `1px solid ${C.line}`,
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.22em",
          color: C.inkFaint,
          textTransform: "uppercase",
        }}
      >
        <div>Nama</div>
        <div>Grup</div>
        <div>Status</div>
        <div style={{ textAlign: "right" }}>Pax</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 0.9fr 0.7fr",
            gap: 14,
            padding: "12px 0",
            borderBottom:
              i === rows.length - 1 ? "none" : `1px solid ${C.line}`,
            fontSize: 13,
            alignItems: "center",
          }}
        >
          <div style={{ color: C.ink, fontFamily: FONT_SANS }}>{r.name}</div>
          <div style={{ color: C.inkDim, fontFamily: FONT_SANS, fontSize: 12 }}>
            {r.group ?? "—"}
          </div>
          <div>
            <StatusPillInline status={r.rsvp} />
          </div>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: "italic",
              fontSize: 14,
              textAlign: "right",
              color: r.rsvp === "Hadir" ? C.green : C.inkDim,
            }}
          >
            {r.rsvp === "Hadir" && r.pax ? r.pax : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPillInline({ status }: { status: string }) {
  const palette: Record<string, { bg: string; fg: string; dot: string }> = {
    Hadir: {
      bg: "rgba(126,211,164,0.10)",
      fg: C.green,
      dot: C.green,
    },
    Dibuka: {
      bg: "rgba(184,157,212,0.10)",
      fg: C.lilac,
      dot: C.lilac,
    },
    Diundang: {
      bg: "rgba(143,163,217,0.10)",
      fg: C.blue,
      dot: C.blue,
    },
    "Tidak Hadir": {
      bg: "rgba(224,138,138,0.10)",
      fg: C.red,
      dot: C.red,
    },
    Baru: {
      bg: "rgba(237,232,222,0.04)",
      fg: C.inkDim,
      dot: C.inkFaint,
    },
  };
  const p = palette[status] ?? palette.Baru;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: p.bg,
        color: p.fg,
        fontFamily: FONT_MONO,
        fontSize: 9,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: p.dot,
        }}
      />
      {status}
    </span>
  );
}

function WishesBlock({
  wishes,
}: {
  wishes: AnalyticsExportData["guests"];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {wishes.map((w, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            padding: "22px 26px 22px 32px",
            borderRadius: 16,
            border: `1px solid ${C.line}`,
            background: C.bgCard,
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 12,
              top: -4,
              fontFamily: FONT_SERIF,
              fontSize: 56,
              fontStyle: "italic",
              color: "rgba(240,160,156,0.3)",
              lineHeight: 1,
            }}
          >
            &ldquo;
          </span>
          <p
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: "italic",
              fontSize: 18,
              lineHeight: 1.5,
              color: C.ink,
              margin: "0 0 12px",
              position: "relative",
            }}
          >
            {w.message}
          </p>
          <p
            style={{
              fontFamily: FONT_SANS,
              fontSize: 13,
              color: C.inkDim,
              margin: 0,
            }}
          >
            <span style={{ color: C.inkFaint }}>—</span> {w.name}
            {w.group ? `, ${w.group}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusCard({
  attending,
  notAttending,
  notResponded,
  confirmedPax,
}: {
  attending: number;
  notAttending: number;
  notResponded: number;
  confirmedPax: number;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 18,
        border: `1px solid ${C.line}`,
        background: C.bgCard,
      }}
    >
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.28em",
          color: C.coral,
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        Status
      </p>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <StatusRow color={C.green} label="Hadir" value={attending} />
        <StatusRow color={C.red} label="Tidak Hadir" value={notAttending} />
        <StatusRow color={C.inkFaint} label="Belum Merespons" value={notResponded} />
      </div>
      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px solid ${C.line}`,
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.18em",
          color: C.inkFaint,
          textTransform: "uppercase",
        }}
      >
        Konfirmasi pax: <span style={{ color: C.ink }}>{confirmedPax}</span>
      </div>
    </div>
  );
}

function StatusRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: FONT_SANS,
          fontSize: 14,
          color: C.ink,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
          }}
        />
        {label}
      </span>
      <span
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 300,
          fontSize: 22,
          color: C.ink,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryCard({
  totalGuests,
  conversionPct,
  packageName,
}: {
  totalGuests: number;
  conversionPct: number;
  packageName: string;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 18,
        border: `1px solid ${C.line}`,
        background:
          "linear-gradient(135deg, rgba(143,163,217,0.06), rgba(240,160,156,0.08))",
      }}
    >
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.28em",
          color: C.coral,
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        Ringkasan
      </p>
      <p
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 200,
          fontSize: 56,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          color: C.ink,
          margin: "16px 0 0",
        }}
      >
        {conversionPct}
        <span style={{ fontSize: 24, color: C.inkDim }}>%</span>
      </p>
      <p
        style={{
          fontFamily: FONT_SERIF,
          fontStyle: "italic",
          fontSize: 14,
          color: C.inkDim,
          marginTop: 10,
          lineHeight: 1.5,
        }}
      >
        dari {totalGuests} tamu berujung{" "}
        <em style={{ color: C.coral }}>hadir</em>
      </p>
      <p
        style={{
          marginTop: 20,
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.22em",
          color: C.inkFaint,
          textTransform: "uppercase",
        }}
      >
        Paket {packageName}
      </p>
    </div>
  );
}
