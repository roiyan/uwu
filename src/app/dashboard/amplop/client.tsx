"use client";

import { useState, useTransition } from "react";
import {
  addGiftAccountAction,
  deleteGiftAccountAction,
  setGiftConfirmationStatusAction,
  updateGiftAccountAction,
  type GiftAccountInput,
  type GiftAccountRow,
  type GiftConfirmationRow,
} from "@/lib/actions/gift";
import { useToast } from "@/components/shared/Toast";

const BANK_PROVIDERS = [
  "BCA",
  "Mandiri",
  "BNI",
  "BRI",
  "BSI",
  "CIMB Niaga",
  "Bank Permata",
  "Bank Danamon",
  "Bank Mega",
  "Bank Muamalat",
  "Bank Jago",
  "Bank BTPN",
  "Jenius",
  "SeaBank",
  "Bank Neo",
];

const EWALLET_PROVIDERS = [
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
  "LinkAja",
  "Flip",
  "Lainnya",
];

function fmtRupiah(n: number | null): string {
  if (!n || n <= 0) return "—";
  return "Rp " + n.toLocaleString("id-ID");
}

export function AmplopClient({
  eventId,
  initialAccounts,
  initialConfirmations,
  initialStats,
}: {
  eventId: string;
  initialAccounts: GiftAccountRow[];
  initialConfirmations: GiftConfirmationRow[];
  initialStats: { total: number; verified: number; verifiedAmount: number };
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [confirms, setConfirms] = useState(initialConfirmations);
  const [stats, setStats] = useState(initialStats);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function handleAdd(input: GiftAccountInput) {
    startTransition(async () => {
      const res = await addGiftAccountAction(eventId, input);
      if (res.ok && res.data) {
        setAccounts((prev) => [
          ...prev,
          {
            id: res.data!.id,
            type: input.type,
            provider: input.provider,
            accountName: input.accountName,
            accountNumber: input.accountNumber,
            isActive: true,
            sortOrder: prev.length,
          },
        ]);
        setAdding(false);
        toast.success("Jembatan kasih dibuka.");
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  }

  function handleToggleActive(row: GiftAccountRow) {
    const next = !row.isActive;
    setAccounts((prev) =>
      prev.map((a) => (a.id === row.id ? { ...a, isActive: next } : a)),
    );
    startTransition(async () => {
      const res = await updateGiftAccountAction(eventId, row.id, {
        isActive: next,
      });
      if (!res.ok) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === row.id ? { ...a, isActive: !next } : a,
          ),
        );
        toast.error(res.error);
      } else {
        toast.success(
          next ? "Jembatan kembali terbuka." : "Jembatan ditutup sementara.",
        );
      }
    });
  }

  function handleDelete(row: GiftAccountRow) {
    if (
      !window.confirm(
        "Tutup jembatan ini? Tamu tidak akan bisa mengirim ke rekening ini lagi.",
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteGiftAccountAction(eventId, row.id);
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== row.id));
        toast.success("Jembatan ditutup.");
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  }

  function handleSetStatus(
    row: GiftConfirmationRow,
    status: "verified" | "rejected",
  ) {
    setConfirms((prev) =>
      prev.map((c) => (c.id === row.id ? { ...c, status } : c)),
    );
    if (status === "verified") {
      setStats((s) => ({
        ...s,
        verified: s.verified + (row.status !== "verified" ? 1 : 0),
        verifiedAmount:
          s.verifiedAmount +
          (row.status !== "verified" ? row.amount ?? 0 : 0),
      }));
    }
    startTransition(async () => {
      const res = await setGiftConfirmationStatusAction(
        eventId,
        row.id,
        status,
      );
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-9">
      {/* === Rekening section === */}
      <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6 lg:p-7">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px w-7 bg-[var(--d-coral)]" />
          <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
            Jembatan Kasih
          </p>
        </div>
        <h2 className="d-serif mt-3 text-[24px] font-light leading-tight tracking-[-0.015em] text-[var(--d-ink)]">
          Ke mana tanda kasih{" "}
          <em className="d-serif italic text-[var(--d-coral)]">mengalir</em>.
        </h2>
        <p className="d-serif mt-2 max-w-[58ch] text-[12.5px] italic text-[var(--d-ink-dim)]">
          Tambahkan rekening agar tamu bisa mengirim doa dalam bentuk lain.
        </p>

        {accounts.length === 0 && !adding ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.015)] p-8 text-center">
            <p className="d-serif text-[14px] italic leading-relaxed text-[var(--d-ink-dim)]">
              Belum ada jembatan. Tambahkan rekening pertama agar tamu bisa
              mengirimkan{" "}
              <em className="d-serif italic text-[var(--d-coral)]">
                tanda kasih
              </em>{" "}
              mereka.
            </p>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="d-mono mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--d-coral)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#0B0B15] transition-shadow hover:shadow-[0_10px_30px_rgba(240,160,156,0.3)]"
            >
              + Buka Jembatan Baru
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <article
                key={a.id}
                className="rounded-[14px] border border-[var(--d-line)] bg-[rgba(255,255,255,0.02)] p-5"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span
                    aria-hidden
                    className="d-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px]"
                    style={{
                      background: "rgba(240,160,156,0.1)",
                      color: "var(--d-coral)",
                    }}
                  >
                    {a.type === "bank" ? "🏦" : "📱"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-[var(--d-ink)]">
                      {a.provider}
                    </p>
                    <p className="d-mono text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                      {a.type === "bank" ? "Transfer Bank" : "Dompet Digital"}
                    </p>
                  </div>
                </div>
                <p className="text-[12.5px] text-[var(--d-ink-dim)]">
                  a.n. {a.accountName}
                </p>
                <p className="d-mono mt-1 break-all text-[14px] tracking-[0.04em] text-[var(--d-ink)]">
                  {a.accountNumber}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(a)}
                    disabled={pending}
                    className={`d-mono rounded-full border px-3 py-1.5 text-[10.5px] uppercase tracking-[0.16em] transition-colors disabled:opacity-50 ${
                      a.isActive
                        ? "border-[var(--d-green)] bg-[rgba(126,211,164,0.08)] text-[var(--d-green)]"
                        : "border-[var(--d-line-strong)] text-[var(--d-ink-dim)]"
                    }`}
                  >
                    {a.isActive ? "Terbuka" : "Ditutup sementara"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
                    disabled={pending}
                    className="d-mono rounded-full border border-[var(--d-line-strong)] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.16em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)] disabled:opacity-50"
                  >
                    Tutup
                  </button>
                </div>
              </article>
            ))}
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="d-serif rounded-[14px] border border-dashed border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.015)] p-5 text-[14px] italic text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
              >
                + Buka Jembatan Baru
              </button>
            )}
          </div>
        )}

        {adding && (
          <AddAccountForm
            pending={pending}
            onCancel={() => setAdding(false)}
            onSubmit={handleAdd}
          />
        )}
      </section>

      {/* === KPI strip === */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Tanda kasih masuk" value={`${stats.total}`} sub="total" />
        <Kpi
          label="Sudah diterima"
          value={`${stats.verified}`}
          sub="terverifikasi ♡"
          color="var(--d-green)"
        />
        <Kpi
          label="Terkumpul"
          value={fmtRupiah(stats.verifiedAmount)}
          sub="dari yang sudah diterima"
        />
      </section>

      {/* === Konfirmasi table === */}
      <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6 lg:p-7">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px w-7 bg-[var(--d-coral)]" />
          <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
            Kasih yang Sampai
          </p>
        </div>
        <h2 className="d-serif mt-3 text-[22px] font-light tracking-[-0.015em] text-[var(--d-ink)]">
          Mereka yang sudah{" "}
          <em className="d-serif italic text-[var(--d-coral)]">menitipkan</em>{" "}
          doa.
        </h2>

        {confirms.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--d-line)] bg-[rgba(255,255,255,0.02)] p-8 text-center">
            <p className="d-serif text-[14px] italic text-[var(--d-ink-dim)]">
              Belum ada yang mengonfirmasi — tapi kasih tidak selalu perlu
              bukti.
            </p>
          </div>
        ) : (
          <div className="mt-5 max-h-[420px] overflow-x-auto overflow-y-auto rounded-xl border border-[var(--d-line)]">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-[var(--d-bg-card)]">
                <tr className="border-b border-[var(--d-line)] text-left text-[var(--d-ink-faint)]">
                  <Th>Dari</Th>
                  <Th>Ke</Th>
                  <Th>Nominal</Th>
                  <Th>Status</Th>
                  <Th>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {confirms.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--d-line)] last:border-0 hover:bg-[rgba(255,255,255,0.018)]"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-[14px] text-[var(--d-ink)]">
                        {c.guestName}
                      </p>
                      {c.guestMessage && (
                        <p className="d-serif mt-1 line-clamp-2 max-w-[40ch] text-[12px] italic text-[var(--d-ink-dim)]">
                          “{c.guestMessage}”
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-[var(--d-ink-dim)]">
                      {c.accountProvider ?? "—"}
                    </td>
                    <td className="d-mono px-5 py-3.5 text-[13px] text-[var(--d-ink)]">
                      {fmtRupiah(c.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      {c.status === "pending" ? (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetStatus(c, "verified")}
                            disabled={pending}
                            className="d-mono rounded-full border border-[var(--d-green)] bg-[rgba(126,211,164,0.06)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--d-green)] transition-colors hover:bg-[rgba(126,211,164,0.14)] disabled:opacity-50"
                          >
                            Terima ♡
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(c, "rejected")}
                            disabled={pending}
                            className="d-mono rounded-full border border-[var(--d-line-strong)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)] disabled:opacity-50"
                          >
                            Tinjau Ulang
                          </button>
                        </div>
                      ) : (
                        <span className="d-mono text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="d-mono px-5 py-3 text-[10px] font-normal uppercase tracking-[0.2em]">
      {children}
    </th>
  );
}

function Kpi({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-5">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
        {label}
      </p>
      <p
        className="d-serif mt-2 text-[26px] font-light leading-tight tracking-[-0.01em]"
        style={{ color: color ?? "var(--d-ink)" }}
      >
        {value}
      </p>
      <p className="d-serif mt-1 text-[12px] italic text-[var(--d-ink-dim)]">
        {sub}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "verified")
    return (
      <span className="d-mono inline-flex items-center gap-1.5 rounded-full bg-[rgba(126,211,164,0.12)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--d-green)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--d-green)]" />
        Terverifikasi ♡
      </span>
    );
  if (status === "rejected")
    return (
      <span className="d-mono inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
        Ditinjau ulang
      </span>
    );
  return (
    <span className="d-mono inline-flex items-center gap-1.5 rounded-full bg-[rgba(240,160,156,0.12)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--d-coral)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--d-coral)]" />
      Menunggu
    </span>
  );
}

function AddAccountForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: GiftAccountInput) => void;
}) {
  const [type, setType] = useState<"bank" | "ewallet">("bank");
  const [provider, setProvider] = useState(BANK_PROVIDERS[0]);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const providers = type === "bank" ? BANK_PROVIDERS : EWALLET_PROVIDERS;

  return (
    <div className="mt-5 rounded-[14px] border border-[var(--d-coral)] bg-[rgba(240,160,156,0.04)] p-5">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Buka Jembatan Baru
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            Bagaimana tamu mengirim?
          </span>
          <div className="mt-2 flex gap-2">
            {(["bank", "ewallet"] as const).map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setProvider(
                      t === "bank" ? BANK_PROVIDERS[0] : EWALLET_PROVIDERS[0],
                    );
                  }}
                  className={`d-mono flex-1 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                    active
                      ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.1)] text-[var(--d-coral)]"
                      : "border-[var(--d-line-strong)] text-[var(--d-ink-dim)]"
                  }`}
                >
                  {t === "bank" ? "Transfer Bank" : "Dompet Digital"}
                </button>
              );
            })}
          </div>
        </label>
        <label className="block">
          <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            Pilih layanan
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-2 w-full cursor-pointer appearance-none rounded-xl border border-[var(--d-line-strong)] bg-[var(--d-bg-2)] px-3 py-2.5 text-[14px] text-[var(--d-ink)] outline-none focus:border-[var(--d-coral)]"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            Atas nama
          </span>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            maxLength={100}
            placeholder="Vivi Anggraini"
            className="mt-2 w-full rounded-xl border border-[var(--d-line-strong)] bg-transparent px-3 py-2.5 text-[14px] text-[var(--d-ink)] outline-none focus:border-[var(--d-coral)]"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            Nomor tujuan
          </span>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            maxLength={50}
            inputMode="numeric"
            placeholder={type === "bank" ? "1234567890" : "0822-3328-0206"}
            className="d-mono mt-2 w-full rounded-xl border border-[var(--d-line-strong)] bg-transparent px-3 py-2.5 text-[14px] tracking-[0.04em] text-[var(--d-ink)] outline-none focus:border-[var(--d-coral)]"
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="d-mono rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)]"
        >
          Nanti saja
        </button>
        <button
          type="button"
          onClick={() => onSubmit({ type, provider, accountName, accountNumber })}
          disabled={pending || !accountName.trim() || !accountNumber.trim()}
          className="d-mono inline-flex items-center gap-2 rounded-full bg-[var(--d-coral)] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#0B0B15] transition-shadow hover:shadow-[0_10px_30px_rgba(240,160,156,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Buka Jembatan
        </button>
      </div>
    </div>
  );
}
