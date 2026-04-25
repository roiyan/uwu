import type { AnalyticsExportData } from "@/lib/actions/analytics-export";

const NAVY_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FF1E3A5F" },
};
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } };

/**
 * Build an Excel workbook (3 sheets) from a snapshot of analytics data
 * and trigger a browser download. ExcelJS is dynamically imported so
 * the ~600kb library only ships when the user actually clicks "Data
 * Excel" — keeps the analytics page bundle slim.
 *
 * Sheets:
 *   1. Ringkasan — funnel metric totals + percentages
 *   2. Daftar Tamu — every guest row with RSVP, pax, message, etc.
 *   3. Acara — schedule rows (akad/resepsi/etc.) with date, time, venue
 *
 * Throws on the unlikely case that ExcelJS fails to import; the caller
 * surfaces that as a toast.
 */
export async function exportAnalyticsExcel(
  data: AnalyticsExportData,
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "uwu";
  workbook.created = new Date(data.generatedAt);

  // ---- Sheet 1: Ringkasan -----------------------------------------
  const summary = workbook.addWorksheet("Ringkasan");
  summary.columns = [
    { header: "Metrik", key: "metric", width: 30 },
    { header: "Nilai", key: "value", width: 14 },
    { header: "Persentase", key: "pct", width: 16 },
  ];
  summary.getRow(1).font = HEADER_FONT;
  summary.getRow(1).fill = NAVY_FILL;

  const t = data.totals;
  // Use totalGuests as the denominator for everything except the
  // "menunggu" lines, which read more naturally as % of invited /
  // % of opened depending on the stage. We keep the table simple by
  // expressing every row as % of total guests.
  const denom = Math.max(1, t.totalGuests);
  const pct = (n: number) => `${Math.round((n / denom) * 100)}%`;
  summary.addRows([
    { metric: "Total Tamu", value: t.totalGuests, pct: "100%" },
    { metric: "Diundang", value: t.invited, pct: pct(t.invited) },
    { metric: "Dibuka", value: t.opened, pct: pct(t.opened) },
    { metric: "Merespons", value: t.responded, pct: pct(t.responded) },
    { metric: "Hadir (RSVP)", value: t.attending, pct: pct(t.attending) },
    { metric: "Tidak Hadir", value: t.notAttending, pct: pct(t.notAttending) },
    { metric: "Belum Merespons", value: t.notResponded, pct: pct(t.notResponded) },
    { metric: "Konfirmasi PAX", value: t.confirmedAttendees, pct: "—" },
  ]);

  // Header row at the top of the sheet identifying the export
  summary.insertRow(1, [`Laporan UWU — ${data.coupleName}`]);
  summary.insertRow(2, [
    `Dihasilkan pada ${new Date(data.generatedAt).toLocaleString("id-ID")}`,
  ]);
  summary.insertRow(3, [
    `Acara: ${data.eventDate ?? "—"}${data.venue ? ` · ${data.venue}` : ""}`,
  ]);
  summary.insertRow(4, []);
  summary.mergeCells("A1:C1");
  summary.mergeCells("A2:C2");
  summary.mergeCells("A3:C3");
  summary.getCell("A1").font = { bold: true, size: 14 };
  summary.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };
  summary.getCell("A3").font = { italic: true, color: { argb: "FF666666" } };

  // ---- Sheet 2: Daftar Tamu ---------------------------------------
  const guests = workbook.addWorksheet("Daftar Tamu");
  guests.columns = [
    { header: "Nama", key: "name", width: 25 },
    { header: "Panggilan", key: "nickname", width: 18 },
    { header: "Grup", key: "group", width: 22 },
    { header: "No. WhatsApp", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 24 },
    { header: "Status RSVP", key: "rsvp", width: 14 },
    { header: "Jumlah Hadir", key: "pax", width: 14 },
    { header: "Dibuka", key: "openedAt", width: 18 },
    { header: "Direspons", key: "rsvpedAt", width: 18 },
    { header: "Via", key: "via", width: 12 },
    { header: "Ucapan", key: "message", width: 40 },
  ];
  guests.getRow(1).font = HEADER_FONT;
  guests.getRow(1).fill = NAVY_FILL;
  // Phones often start with 0 or contain "+" — force text format so
  // Excel doesn't interpret them as numbers / scientific notation.
  guests.getColumn("phone").numFmt = "@";

  for (const g of data.guests) {
    guests.addRow({
      name: g.name,
      nickname: g.nickname ?? "—",
      group: g.group ?? "—",
      phone: g.phone ?? "—",
      email: g.email ?? "—",
      rsvp: g.rsvp,
      pax: g.pax ?? "—",
      openedAt: g.openedAt ?? "—",
      rsvpedAt: g.rsvpedAt ?? "—",
      via: g.via ?? "—",
      message: g.message ?? "",
    });
  }
  guests.autoFilter = { from: "A1", to: "K1" };

  // ---- Sheet 3: Acara ---------------------------------------------
  const events = workbook.addWorksheet("Acara");
  events.columns = [
    { header: "Nama Acara", key: "label", width: 22 },
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Mulai", key: "start", width: 10 },
    { header: "Selesai", key: "end", width: 10 },
    { header: "Tempat", key: "venue", width: 28 },
    { header: "Alamat", key: "address", width: 40 },
  ];
  events.getRow(1).font = HEADER_FONT;
  events.getRow(1).fill = NAVY_FILL;
  for (const e of data.events) {
    events.addRow({
      label: e.label,
      date: e.date,
      start: e.start ?? "—",
      end: e.end ?? "—",
      venue: e.venue ?? "—",
      address: e.address ?? "—",
    });
  }

  // ---- Download ---------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, fileName(data.coupleName, "xlsx"));
}

function fileName(coupleName: string, ext: string): string {
  const safe = coupleName
    .replace(/[^\p{L}\p{N}\s&]/gu, "")
    .trim()
    .replace(/\s+/g, "_");
  return `Laporan_UWU_${safe || "Acara"}.${ext}`;
}

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so the browser has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
