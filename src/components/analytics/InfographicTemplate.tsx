"use client";

import type { AnalyticsExportData } from "@/lib/actions/analytics-export";
import { UWU_LOGO_DATA_URL } from "./uwu-logo-base64";

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
  lineSoft: "rgba(255,255,255,0.04)",
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

// Section rhythm — a single source of truth for vertical cadence so
// every block sits on the same 28-pixel grid the design system uses
// elsewhere on the dark dashboard.
const SECTION_GAP = 28;
const HEADING_TO_CONTENT = 16;
const EYEBROW_TO_TITLE = 8;
const CARD_PADDING = 18;
const CARD_RADIUS = 14;

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

export type InfographicSectionId =
  | "kpi"
  | "funnel"
  | "heatmap"
  | "responses"
  | "messages"
  | "summary";

const ALL_SECTIONS: readonly InfographicSectionId[] = [
  "kpi",
  "funnel",
  "heatmap",
  "responses",
  "messages",
  "summary",
];

// Normalise the couple-name string the upstream pipeline supplies. Some
// data sources concatenate without spaces around the ampersand
// ("Vivi&Roiyan"); the visual is jarring at this size, and a tight
// letter-spacing makes it worse. Single normaliser, single-purpose.
function normaliseCoupleName(raw: string): string {
  return raw.replace(/\s*&\s*/g, " & ").replace(/\s+/g, " ").trim();
}

// "2026-04-30" → "30 April 2026". Falls back to the input when the
// string isn't a parseable ISO date so the export never blanks the
// header on edge data.
function formatLongDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Soft truncate so wishes cards stay roughly uniform height without
// relying on `line-clamp` (html2canvas's CSS pass occasionally drops
// the webkit-only properties).
function softTruncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export function InfographicTemplate({
  data,
  id = "uwu-infographic",
  selectedSections = ALL_SECTIONS,
}: {
  data: AnalyticsExportData;
  id?: string;
  selectedSections?: readonly InfographicSectionId[];
}) {
  const has = (s: InfographicSectionId) => selectedSections.includes(s);
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

  // Funnel stages — every percentage is relative to the TOTAL guest
  // count and capped at 100%. The previous version used per-stage
  // denominators (e.g. opened/invited) which produced numbers > 100%
  // when invitations were resent — visually nonsensical for a funnel.
  // Total stays anchored at 100% so the bars truly narrow downward.
  const pct = (v: number) =>
    t.totalGuests > 0
      ? Math.min(100, Math.round((v / t.totalGuests) * 100))
      : 0;
  const funnel = [
    { label: "Total", value: t.totalGuests, pct: 100, color: C.coral },
    { label: "Diundang", value: t.invited, pct: pct(t.invited), color: C.peach },
    { label: "Dibuka", value: t.opened, pct: pct(t.opened), color: C.gold },
    { label: "RSVP", value: t.responded, pct: pct(t.responded), color: C.lilac },
    { label: "Hadir", value: t.attending, pct: pct(t.attending), color: C.green },
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
        padding: "64px 64px 48px",
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
        coupleName={normaliseCoupleName(data.coupleName)}
        eventDate={formatLongDate(data.eventDate)}
        venue={data.venue}
      />

      {/* ============== KPI Row (3 equal-width cards) ============== */}
      {has("kpi") && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginTop: 48,
            position: "relative",
          }}
        >
          <KpiTile label="Total Tamu" value={t.totalGuests} dot={C.coral} />
          <KpiTile
            label="Hadir (RSVP)"
            value={t.attending}
            dot={C.green}
            highlight
          />
          <KpiTile label="Dibuka" value={t.opened} dot={C.lilac} />
        </div>
      )}

      {/* ============== Funnel ============== */}
      {has("funnel") && (
        <>
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
        </>
      )}

      {/* ============== Heatmap ============== */}
      {has("heatmap") && (
        <>
          <SectionHeading
            eyebrow="Aktivitas Tamu"
            title={
              <>
                Kapan mereka{" "}
                <em style={{ fontStyle: "italic", color: C.coral }}>
                  membuka
                </em>
                ?
              </>
            }
          />
          <HeatmapBlock matrix={heatMatrix} max={heatMax} peak={peak} />
        </>
      )}

      {/* ============== Responses Table ============== */}
      {has("responses") && responses.length > 0 && (
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
      {has("messages") && wishes.length > 0 && (
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
      {has("summary") && (
        <div
          style={{
            marginTop: SECTION_GAP + 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            alignItems: "stretch",
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
          />
        </div>
      )}

      {/* ============== Brand footer ==============
          Logo + date sit on a dedicated baseline. The thin line above
          and the smaller logo/text reflect what an export caption
          should be: present and identifiable, never dominant. */}
      <div
        style={{
          marginTop: 40,
          paddingTop: 16,
          borderTop: `1px solid ${C.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {/* Real UWU wordmark from public/logo.png — embedded as a
            base64 data URL so html2canvas can render it without a
            network fetch (path-based <img src="/logo.png"> races the
            off-screen capture). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={UWU_LOGO_DATA_URL}
          alt="uwu"
          width={56}
          height={18}
          style={{ display: "block", opacity: 0.55, objectFit: "contain" }}
        />
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.22em",
            color: C.inkFaint,
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          uwu.id · {generated}
        </span>
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
  // Date and venue render with sentence case; only the eyebrow is
  // uppercase. Stripping `text-transform: uppercase` from the meta
  // line is what tames the previous "HOTEL" shouting.
  const meta =
    [eventDate, venue].filter((v): v is string => Boolean(v)).join(" · ") ||
    null;
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
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          margin: "22px 0 0",
          color: C.ink,
        }}
      >
        {coupleName}
      </h1>
      {meta && (
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            letterSpacing: "0.18em",
            color: C.inkDim,
            marginTop: 14,
            margin: "14px 0 0",
          }}
        >
          {meta}
        </p>
      )}
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
    <div style={{ marginTop: SECTION_GAP, position: "relative" }}>
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
          fontSize: 22,
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
          margin: `${EYEBROW_TO_TITLE}px 0 ${HEADING_TO_CONTENT}px`,
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
  // The "Hadir" tile keeps a subtle green tint instead of a saturated
  // gradient so it sits as a peer to the other two tiles, not a
  // dominant focal point.
  const tileBackground = highlight
    ? "linear-gradient(135deg, rgba(126,211,164,0.08), rgba(126,211,164,0.04))"
    : C.bgCard;
  const tileBorder = highlight
    ? "1px solid rgba(126,211,164,0.18)"
    : `1px solid ${C.line}`;
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: CARD_RADIUS,
        border: tileBorder,
        background: tileBackground,
        position: "relative",
        minHeight: 132,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.22em",
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
          fontSize: 56,
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
  return (
    <div
      style={{
        padding: 20,
        borderRadius: CARD_RADIUS,
        border: `1px solid ${C.line}`,
        background: C.bgCard,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {funnel.map((f) => {
          // Width tracks the same total-relative percentage shown on
          // the right rail, so the bar physically narrows down the
          // funnel. 6% floor keeps a sliver visible for tiny values.
          const widthPct = Math.max(6, f.pct);
          return (
            <div
              key={f.label}
              style={{ display: "flex", alignItems: "center", gap: 14 }}
            >
              <div
                style={{
                  width: 84,
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: C.inkDim,
                  textTransform: "uppercase",
                  textAlign: "right",
                }}
              >
                {f.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 28,
                  position: "relative",
                  background: "rgba(255,255,255,0.025)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${f.color}, ${f.color}88)`,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 12,
                    fontFamily: FONT_SERIF,
                    fontWeight: 300,
                    fontSize: 15,
                    color: "#0B0B15",
                  }}
                >
                  {f.value}
                </div>
              </div>
              <div
                style={{
                  width: 52,
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  letterSpacing: "0.04em",
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
          marginTop: 18,
          paddingTop: 14,
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
            fontSize: 32,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            margin: 0,
            color: C.ink,
          }}
        >
          {conversionPct}
          <span style={{ fontSize: 16, color: C.inkDim }}>%</span>
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
        padding: 20,
        borderRadius: CARD_RADIUS,
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
              fontSize: 8,
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
              fontSize: 9,
              letterSpacing: "0.12em",
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
            const op = c === 0 ? 0 : 0.12 + intensity * 0.7;
            const isPeak =
              peak && peak.day === dIdx && peak.bucket === hIdx;
            return (
              <div
                key={hIdx}
                style={{
                  height: 28,
                  borderRadius: 4,
                  background:
                    c === 0 ? "transparent" : `rgba(240,160,156,${op})`,
                  border: isPeak
                    ? `1px solid ${C.coral}`
                    : "1px solid rgba(255,255,255,0.03)",
                }}
              />
            );
          })}
        </div>
      ))}
      {/* Caption */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${C.line}`,
          fontFamily: FONT_MONO,
          fontSize: 9,
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
  // Column widths: name 35%, group 30%, status 20%, pax 15%. Encoded
  // as fr units so the grid stretches to the card width.
  const COLS = "1.4fr 1.2fr 0.8fr 0.6fr";
  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: CARD_RADIUS,
        border: `1px solid ${C.line}`,
        background: C.bgCard,
      }}
    >
      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLS,
          gap: 14,
          paddingBottom: 10,
          borderBottom: `1px solid ${C.line}`,
          fontFamily: FONT_MONO,
          fontSize: 9,
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
            gridTemplateColumns: COLS,
            gap: 14,
            padding: "10px 0",
            borderBottom:
              i === rows.length - 1 ? "none" : `1px solid ${C.lineSoft}`,
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
  // "Tidak Hadir" intentionally uses soft coral, not the bright red
  // we reserve for hard errors. The status is a state, not a problem.
  const palette: Record<string, { bg: string; fg: string; dot: string }> = {
    Hadir: {
      bg: "rgba(126,211,164,0.12)",
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
      bg: "rgba(240,160,156,0.12)",
      fg: C.coral,
      dot: C.coral,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {wishes.map((w, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            padding: "16px 18px 16px 28px",
            borderRadius: CARD_RADIUS,
            border: `1px solid ${C.line}`,
            background: C.bgCard,
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 10,
              top: 4,
              fontFamily: FONT_SERIF,
              fontSize: 28,
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
              fontSize: 13,
              lineHeight: 1.55,
              color: C.ink,
              margin: "0 0 8px",
              position: "relative",
            }}
          >
            {softTruncate(w.message ?? "", 160)}
          </p>
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.04em",
              color: C.inkFaint,
              margin: 0,
            }}
          >
            — {w.name}
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
        padding: CARD_PADDING,
        borderRadius: CARD_RADIUS,
        border: `1px solid ${C.line}`,
        background: C.bgCard,
        display: "flex",
        flexDirection: "column",
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
      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
        }}
      >
        <StatusRow color={C.green} label="Hadir" value={attending} />
        <StatusRow
          color={C.coral}
          label="Tidak Hadir"
          value={notAttending}
        />
        <StatusRow
          color={C.inkFaint}
          label="Belum Merespons"
          value={notResponded}
        />
      </div>
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
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
          fontSize: 13,
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
          fontSize: 20,
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
}: {
  totalGuests: number;
  conversionPct: number;
}) {
  // No "Paket {name}" line — the package label is internal billing
  // information, not something the operator wants shared on a public
  // post. Card height is driven by content + StatusCard's flex stretch
  // so the two halves stay equal-height.
  return (
    <div
      style={{
        padding: CARD_PADDING,
        borderRadius: CARD_RADIUS,
        border: `1px solid ${C.line}`,
        background:
          "linear-gradient(135deg, rgba(143,163,217,0.06), rgba(240,160,156,0.08))",
        display: "flex",
        flexDirection: "column",
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
          fontSize: 48,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          color: C.ink,
          margin: "auto 0 0",
        }}
      >
        {conversionPct}
        <span style={{ fontSize: 20, color: C.inkDim }}>%</span>
      </p>
      <p
        style={{
          fontFamily: FONT_SERIF,
          fontStyle: "italic",
          fontSize: 12,
          color: C.inkDim,
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        dari {totalGuests} tamu berujung{" "}
        <em style={{ color: C.coral }}>hadir</em>
      </p>
    </div>
  );
}
