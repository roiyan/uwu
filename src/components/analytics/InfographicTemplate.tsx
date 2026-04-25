"use client";

import type { AnalyticsExportData } from "@/lib/actions/analytics-export";

/**
 * Off-screen 1200×1500 layout for the "Infografis PNG" export.
 * Positioned at `left: -9999px` so it stays in the DOM (so html2canvas
 * can read its computed styles) without ever being visible to the
 * operator. Width is fixed in pixels rather than CSS units to keep
 * the html2canvas capture deterministic across devices.
 *
 * This is purposefully a single component — when the operator clicks
 * "Infografis PNG", we want a sharp, share-ready summary. Charts/etc
 * are skipped: the value is in a clean, IG-Story-friendly snapshot of
 * the headline numbers + a featured ucapan.
 */
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
  // The first non-empty wish becomes the highlight quote. Operators
  // who want a different one can re-run the export after picking the
  // wish — for v1 we keep it simple and pick newest.
  const featured = data.guests.find(
    (g) => g.message && g.message.trim().length > 0 && g.rsvp === "Hadir",
  );

  return (
    <div
      id={id}
      // Pinned far off-screen. We use `aria-hidden` + tabindex=-1 so
      // assistive tech doesn't announce or focus into it.
      aria-hidden
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 1200,
        height: 1500,
        background: "#06060B",
        color: "#EDE8DE",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "72px",
        boxSizing: "border-box",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Coral glow corner */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: -160,
          top: -160,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(240,160,156,0.18), transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
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
              background: "#F0A09C",
            }}
          />
          <p
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              letterSpacing: "0.32em",
              color: "#F0A09C",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            uwu · Laporan Acara
          </p>
        </div>
        <h1
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 200,
            fontSize: 68,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            margin: "28px 0 0",
            color: "#EDE8DE",
          }}
        >
          {data.coupleName}
        </h1>
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            letterSpacing: "0.18em",
            color: "#9E9A95",
            textTransform: "uppercase",
            marginTop: 18,
          }}
        >
          {data.eventDate ?? "—"}
          {data.venue ? ` · ${data.venue}` : ""}
        </p>
      </div>

      {/* KPI grid — 2×2 */}
      <div
        style={{
          marginTop: 64,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <KpiTile label="Total Tamu" value={t.totalGuests} accent="#F0A09C" />
        <KpiTile
          label="Hadir (RSVP)"
          value={t.attending}
          accent="#7ED3A4"
          highlight
        />
        <KpiTile label="Dibuka" value={t.opened} accent="#B89DD4" />
        <KpiTile label="Merespons" value={t.responded} accent="#8FA3D9" />
      </div>

      {/* Conversion big-number */}
      <div
        style={{
          marginTop: 56,
          textAlign: "center",
          padding: "32px 28px",
          borderRadius: 18,
          border: "1px solid rgba(240,160,156,0.2)",
          background:
            "linear-gradient(115deg, rgba(143,163,217,0.08), rgba(184,157,212,0.08) 50%, rgba(240,160,156,0.10))",
        }}
      >
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.32em",
            color: "#F0A09C",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Konversi Keseluruhan
        </p>
        <p
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 200,
            fontSize: 96,
            letterSpacing: "-0.028em",
            lineHeight: 1,
            margin: "14px 0 0",
            color: "#EDE8DE",
          }}
        >
          {conversionPct}
          <span style={{ fontSize: 40, color: "#9E9A95" }}>%</span>
        </p>
        <p
          style={{
            fontFamily: "Fraunces, serif",
            fontStyle: "italic",
            fontSize: 18,
            color: "#9E9A95",
            marginTop: 12,
          }}
        >
          dari {t.totalGuests} tamu — {t.confirmedAttendees} pax dikonfirmasi
        </p>
      </div>

      {/* Featured wish */}
      {featured && featured.message && (
        <div
          style={{
            marginTop: 48,
            padding: "26px 28px",
            borderRadius: 16,
            border: "1px solid rgba(237,232,222,0.07)",
            background: "#0E0F18",
            position: "relative",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 8,
              top: -2,
              fontFamily: "Fraunces, serif",
              fontSize: 64,
              fontStyle: "italic",
              color: "rgba(240,160,156,0.3)",
              lineHeight: 1,
            }}
          >
            &ldquo;
          </span>
          <p
            style={{
              fontFamily: "Fraunces, serif",
              fontStyle: "italic",
              fontSize: 22,
              lineHeight: 1.5,
              color: "#EDE8DE",
              margin: "0 0 18px",
              position: "relative",
            }}
          >
            {featured.message}
          </p>
          <p
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 14,
              color: "#9E9A95",
              margin: 0,
            }}
          >
            <span style={{ color: "#4A4850" }}>—</span> {featured.name}
            {featured.group ? ` · ${featured.group}` : ""}
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 72,
          right: 72,
          textAlign: "center",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.22em",
          color: "#4A4850",
          textTransform: "uppercase",
        }}
      >
        Dibuat dengan{" "}
        <span style={{ color: "#F0A09C" }}>uwu.id</span>
        {" · "}
        {generated}
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: number;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: "26px 24px",
        borderRadius: 18,
        border: "1px solid rgba(237,232,222,0.07)",
        background: highlight
          ? "linear-gradient(135deg, rgba(126,211,164,0.08), #0E0F18)"
          : "#0E0F18",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.24em",
          color: "#9E9A95",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 8px ${accent}`,
          }}
        />
        {label}
      </div>
      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontWeight: 200,
          fontSize: 64,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 14,
          color: highlight ? accent : "#EDE8DE",
        }}
      >
        {value}
      </div>
    </div>
  );
}
