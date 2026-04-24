"use client";

import type { Workbook } from "exceljs";

export type TemplateGroup = { name: string };

/**
 * Generate and download an Excel template with two sheets:
 *  - "Grup"        — editable group list; user can add/remove rows.
 *  - "Daftar Tamu" — guest rows with dropdown validation for
 *                    `Jumlah Undangan` (1–10) and `Grup` (references
 *                    the Grup sheet).
 *
 * `groups` seeds the Grup sheet with the user's existing groups so
 * the dropdown is useful out of the box.
 */
export async function downloadGuestTemplate(groups: TemplateGroup[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook: Workbook = new ExcelJS.Workbook();

  // ========= SHEET 1: GRUP =========
  const groupSheet = workbook.addWorksheet("Grup");
  groupSheet.columns = [{ header: "Nama Grup", key: "name", width: 35 }];

  const gh = groupSheet.getRow(1);
  gh.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  gh.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  gh.height = 28;
  gh.alignment = { vertical: "middle" };

  groups.forEach((g) => groupSheet.addRow({ name: g.name }));

  groupSheet.getCell("B1").value =
    "← Tambah/edit grup di kolom A. Grup ini muncul sebagai pilihan di sheet \"Daftar Tamu\".";
  groupSheet.getCell("B1").font = {
    italic: true,
    color: { argb: "FF888888" },
    size: 10,
  };
  groupSheet.getColumn("B").width = 70;

  // ========= SHEET 2: DAFTAR TAMU =========
  const guestSheet = workbook.addWorksheet("Daftar Tamu");
  guestSheet.columns = [
    { header: "Nama Lengkap *", key: "name", width: 28 },
    { header: "Panggilan", key: "nickname", width: 24 },
    { header: "No. WhatsApp", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 26 },
    { header: "Jumlah Undangan", key: "count", width: 16 },
    { header: "Grup", key: "group", width: 28 },
    { header: "Catatan", key: "notes", width: 30 },
  ];

  const h = guestSheet.getRow(1);
  h.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  h.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  h.height = 28;
  h.alignment = { vertical: "middle" };

  // Example rows (italic grey) — parser skips these.
  const examples = [
    {
      name: "Ahmad Fadillah",
      nickname: "Pak Ahmad dan Istri",
      phone: "08123456789",
      email: "ahmad@gmail.com",
      count: 2,
      group: groups[0]?.name ?? "Keluarga Mempelai Pria",
      notes: "Saksi Nikah",
    },
    {
      name: "Siti Nurhaliza",
      nickname: "Mbak Siti",
      phone: "08987654321",
      email: "",
      count: 1,
      group: groups[5]?.name ?? "Teman Kantor",
      notes: "",
    },
  ];
  examples.forEach((ex) => {
    const row = guestSheet.addRow(ex);
    row.font = { italic: true, color: { argb: "FF999999" } };
  });

  // Keep leading zeroes in phone column.
  guestSheet.getColumn("phone").numFmt = "@";

  // Dropdown: Jumlah Undangan 1–10 (rows 2–500).
  for (let r = 2; r <= 500; r++) {
    guestSheet.getCell(`E${r}`).dataValidation = {
      type: "whole",
      operator: "between",
      formulae: [1, 10],
      showErrorMessage: true,
      errorTitle: "Jumlah tidak valid",
      error: "Masukkan angka 1–10.",
    };
  }

  // Dropdown: Grup from sheet Grup (rows 2–500). Allow extra room so
  // users can add rows in the Grup sheet beyond what we seeded.
  const groupRange = Math.max(groups.length, 20);
  for (let r = 2; r <= 500; r++) {
    guestSheet.getCell(`F${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Grup!$A$2:$A$${groupRange + 1}`],
      showErrorMessage: false, // allow typing a brand-new name
    };
  }

  // Hint row under the examples.
  const hintRow = guestSheet.getRow(4);
  hintRow.getCell(1).value =
    "↓ Isi data tamu mulai dari baris ini. Hapus contoh di atas jika tidak perlu.";
  hintRow.getCell(1).font = {
    italic: true,
    color: { argb: "FFAAAAAA" },
    size: 9,
  };

  guestSheet.views = [{ state: "frozen", ySplit: 1 }];
  groupSheet.views = [{ state: "frozen", ySplit: 1 }];

  // ========= DOWNLOAD =========
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.spreadsheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Tamu_UWU.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
