"use client";

import { useState, useTransition } from "react";
import type { ParseResult } from "@/lib/utils/guest-parser";
import { importGuestsAction } from "@/lib/actions/guest";
import { useRouter } from "next/navigation";

export function GuestImportModal({
  eventId,
  fileName,
  result,
  onClose,
  onSuccess,
}: {
  eventId: string;
  fileName: string;
  result: ParseResult;
  onClose: () => void;
  onSuccess: (summary: {
    imported: number;
    newGroups: string[];
    warnings: number;
  }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  function runImport() {
    setServerError(null);
    startTransition(async () => {
      const res = await importGuestsAction(
        eventId,
        result.valid.map((g) => ({
          name: g.name,
          nickname: g.nickname,
          phone: g.phone,
          email: g.email,
          plusCount: g.plusCount,
          groupName: g.groupName,
          notes: g.notes,
        })),
      );
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.refresh();
      onSuccess({
        imported: res.data?.imported ?? result.valid.length,
        newGroups: res.data?.newGroups ?? result.newGroups,
        warnings: result.warnings.length,
      });
    });
  }

  const preview = result.valid.slice(0, 5);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="theme-dashboard fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={pending ? undefined : onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
              Import Excel
            </p>
            <h2 className="d-serif mt-2 text-[24px] font-extralight text-[var(--d-ink)]">
              Preview Import
            </h2>
            <p className="d-mono mt-2 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
              {fileName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--d-line-strong)] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-2)] hover:text-[var(--d-ink)] disabled:opacity-50"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-[rgba(126,211,164,0.25)] bg-[rgba(126,211,164,0.08)] px-4 py-3 text-[13px] text-[var(--d-green)]">
            <span className="text-base">✅</span>
            <span>
              <strong className="text-[var(--d-ink)]">
                {result.valid.length}
              </strong>{" "}
              tamu valid siap diimport
              {result.totalRead > result.valid.length &&
                ` dari ${result.totalRead} baris terdeteksi`}
            </span>
          </div>

          {result.warnings.length > 0 && (
            <div className="rounded-md border border-[rgba(212,184,150,0.25)] bg-[rgba(212,184,150,0.06)] p-4">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--d-gold)]">
                <span>⚠️</span>
                <span>
                  {result.warnings.length} perlu perhatian (tetap diimport bila
                  kolom wajib terisi)
                </span>
              </div>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-[11px] text-[var(--d-ink-dim)]">
                {result.warnings.slice(0, 20).map((w, i) => (
                  <li key={i}>
                    Baris {w.row} · {fieldLabel(w.field)} · {w.message}
                  </li>
                ))}
                {result.warnings.length > 20 && (
                  <li className="italic opacity-70">
                    … +{result.warnings.length - 20} peringatan lainnya
                  </li>
                )}
              </ul>
            </div>
          )}

          {result.newGroups.length > 0 && (
            <div className="rounded-md border border-[rgba(143,163,217,0.25)] bg-[rgba(143,163,217,0.06)] px-4 py-3 text-[13px] text-[var(--d-blue)]">
              <div className="flex items-center gap-2">
                <span>🆕</span>
                <span>
                  <strong className="text-[var(--d-ink)]">
                    {result.newGroups.length} grup baru
                  </strong>{" "}
                  akan dibuat otomatis:
                </span>
              </div>
              <div className="mt-1 ml-6 text-[11px] text-[var(--d-ink-dim)]">
                {result.newGroups.join(", ")}
              </div>
            </div>
          )}
        </div>

        {preview.length > 0 && (
          <div className="mb-5 overflow-hidden rounded-md border border-[var(--d-line)]">
            <div className="d-mono bg-[var(--d-bg-2)] px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
              Preview {preview.length} tamu pertama
            </div>
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--d-bg-2)]/50 text-left text-[var(--d-ink-faint)]">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">No. WhatsApp</th>
                  <th className="px-3 py-2">Grup</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((g, i) => (
                  <tr key={i} className="border-t border-[var(--d-line)]">
                    <td className="px-3 py-2 font-medium text-[var(--d-ink)]">
                      {g.name}
                      {g.nickname && (
                        <span className="ml-1 text-[var(--d-ink-dim)]">
                          · {g.nickname}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[var(--d-ink-dim)]">
                      {g.phone ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--d-ink-dim)]">
                      {g.groupName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {serverError && (
          <p className="mb-5 rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-[13px] text-[var(--d-coral)]">
            {serverError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="d-mono rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-2)] hover:text-[var(--d-ink)] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={runImport}
            disabled={pending || result.valid.length === 0}
            className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending && (
              <span
                aria-hidden
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            <span>
              {pending
                ? "Mengimport…"
                : `Import ${result.valid.length} Tamu`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function fieldLabel(f: "name" | "phone" | "email" | "count"): string {
  switch (f) {
    case "name":
      return "Nama";
    case "phone":
      return "No. WhatsApp";
    case "email":
      return "Email";
    case "count":
      return "Jumlah Undangan";
  }
}
