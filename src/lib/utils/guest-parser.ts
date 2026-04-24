"use client";

export interface ImportGuestRow {
  name: string;
  nickname: string | null;
  phone: string | null;
  email: string | null;
  plusCount: number;
  groupName: string | null;
  notes: string | null;
}

export interface ParseWarning {
  row: number;
  field: "name" | "phone" | "email" | "count";
  message: string;
}

export interface ParseResult {
  valid: ImportGuestRow[];
  warnings: ParseWarning[];
  newGroups: string[];
  totalRead: number;
}

/**
 * Parse an uploaded .xlsx file produced from our template (or a
 * structurally similar sheet). Returns valid rows + per-row warnings
 * so the UI can show what will be imported and what will be skipped.
 *
 * Accepts slight variations in sheet name / header row. Skips the two
 * seeded example rows by content match.
 */
export async function parseGuestFile(
  file: File,
  existingGroupNames: string[] = [],
): Promise<ParseResult> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const guestSheet =
    workbook.getWorksheet("Daftar Tamu") ??
    workbook.worksheets.find(
      (ws) => ws.name.toLowerCase().includes("tamu") || ws.name.toLowerCase().includes("guest"),
    ) ??
    workbook.worksheets[workbook.worksheets.length - 1];

  if (!guestSheet) {
    throw new Error("File tidak memiliki sheet yang valid.");
  }

  // Locate header row — the first row where cell A contains "nama".
  let headerRow = 1;
  guestSheet.eachRow((row, rowNumber) => {
    const cell = String(row.getCell(1).value ?? "").toLowerCase();
    if (cell.includes("nama") && headerRow === 1) {
      headerRow = rowNumber;
    }
  });

  const valid: ImportGuestRow[] = [];
  const warnings: ParseWarning[] = [];
  let totalRead = 0;

  guestSheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;

    const rawName = String(row.getCell(1).value ?? "").trim();
    if (!rawName) return;
    // Skip seeded example rows from the template.
    if (rawName === "Ahmad Fadillah" || rawName === "Siti Nurhaliza") return;
    if (rawName.startsWith("↓")) return;

    totalRead++;

    if (rawName.length < 2) {
      warnings.push({
        row: rowNumber,
        field: "name",
        message: `Nama "${rawName}" terlalu pendek (minimal 2 karakter).`,
      });
      return;
    }

    const nickname = String(row.getCell(2).value ?? "").trim() || null;
    const rawPhone = String(row.getCell(3).value ?? "").trim();
    const rawEmail = String(row.getCell(4).value ?? "").trim();
    const rawCount = row.getCell(5).value;
    const groupName = String(row.getCell(6).value ?? "").trim() || null;
    const notes = String(row.getCell(7).value ?? "").trim() || null;

    let phone: string | null = null;
    if (rawPhone) {
      if (isValidPhone(rawPhone)) {
        phone = normalizePhone(rawPhone);
      } else {
        warnings.push({
          row: rowNumber,
          field: "phone",
          message: `Format nomor "${rawPhone}" tidak valid — diabaikan.`,
        });
      }
    }

    let email: string | null = null;
    if (rawEmail) {
      if (isValidEmail(rawEmail)) {
        email = rawEmail;
      } else {
        warnings.push({
          row: rowNumber,
          field: "email",
          message: `Format email "${rawEmail}" tidak valid — diabaikan.`,
        });
      }
    }

    let plusCount = 1;
    if (rawCount !== null && rawCount !== "" && rawCount !== undefined) {
      const n = Number(rawCount);
      if (Number.isFinite(n) && n >= 1 && n <= 10) {
        plusCount = Math.round(n);
      } else {
        warnings.push({
          row: rowNumber,
          field: "count",
          message: `Jumlah undangan "${rawCount}" di luar rentang 1–10 — disetel ke 1.`,
        });
      }
    }

    valid.push({
      name: rawName,
      nickname,
      phone,
      email,
      plusCount,
      groupName,
      notes,
    });
  });

  // Detect brand-new groups that aren't in the user's existing list.
  const existingLower = new Set(
    existingGroupNames.map((n) => n.toLowerCase()),
  );
  const referenced = [
    ...new Set(
      valid
        .map((r) => r.groupName?.trim())
        .filter((n): n is string => Boolean(n)),
    ),
  ];
  const newGroups = referenced.filter(
    (n) => !existingLower.has(n.toLowerCase()),
  );

  return { valid, warnings, newGroups, totalRead };
}

// ==================== helpers ====================

function normalizePhone(raw: string): string {
  const compact = raw.replace(/[\s\-().]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("0")) return "+62" + compact.slice(1);
  if (compact.startsWith("62")) return "+" + compact;
  if (compact.startsWith("8")) return "+62" + compact;
  return compact;
}

function isValidPhone(raw: string): boolean {
  const compact = raw.replace(/[\s\-()]/g, "");
  return /^(\+?62|0)8\d{8,12}$/.test(compact);
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
