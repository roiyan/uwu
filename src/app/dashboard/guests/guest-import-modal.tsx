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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={pending ? undefined : onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-navy">Preview Import</h2>
            <p className="mt-1 text-sm text-ink-muted">{fileName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="text-ink-muted transition-colors hover:text-navy disabled:opacity-50"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="text-lg">✅</span>
            <span>
              <strong>{result.valid.length}</strong> tamu valid siap diimport
              {result.totalRead > result.valid.length &&
                ` dari ${result.totalRead} baris terdeteksi`}
            </span>
          </div>

          {result.warnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900">
                <span>⚠️</span>
                <span>
                  {result.warnings.length} perlu perhatian (tetap diimport bila
                  kolom wajib terisi)
                </span>
              </div>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-amber-800">
                {result.warnings.slice(0, 20).map((w, i) => (
                  <li key={i}>
                    Baris {w.row} · {fieldLabel(w.field)} · {w.message}
                  </li>
                ))}
                {result.warnings.length > 20 && (
                  <li className="italic opacity-70">
                    ... +{result.warnings.length - 20} peringatan lainnya
                  </li>
                )}
              </ul>
            </div>
          )}

          {result.newGroups.length > 0 && (
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <div className="flex items-center gap-2">
                <span>🆕</span>
                <span>
                  <strong>{result.newGroups.length} grup baru</strong> akan
                  dibuat otomatis:
                </span>
              </div>
              <div className="mt-1 ml-6 text-xs">
                {result.newGroups.join(", ")}
              </div>
            </div>
          )}
        </div>

        {preview.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-xl border border-[color:var(--border-medium)]">
            <div className="bg-surface-muted px-3 py-2 text-xs uppercase tracking-wide text-ink-muted">
              Preview {preview.length} tamu pertama
            </div>
            <table className="w-full text-xs">
              <thead className="bg-surface-muted/50 text-left text-ink-hint">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">No. WhatsApp</th>
                  <th className="px-3 py-2">Grup</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((g, i) => (
                  <tr key={i} className="border-t border-[color:var(--border-ghost)]">
                    <td className="px-3 py-2 font-medium text-navy">
                      {g.name}
                      {g.nickname && (
                        <span className="ml-1 text-ink-muted">
                          · {g.nickname}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink-muted">
                      {g.phone ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-muted">
                      {g.groupName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {serverError && (
          <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-dark">
            {serverError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={runImport}
            disabled={pending || result.valid.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-2 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {pending && (
              <span
                aria-hidden
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            <span>
              {pending
                ? "Mengimport..."
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
