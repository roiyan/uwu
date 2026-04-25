"use client";

import { useMemo, useState } from "react";

type DeliveryStatus = "pending" | "sent" | "delivered" | "read" | "failed";

type DeliveryRow = {
  id: string;
  recipientName: string;
  recipientPhone: string | null;
  recipientEmail: string | null;
  status: DeliveryStatus;
  errorMessage: string | null;
  sentAt: string | null;
  guestOpenedAt: string | null;
  guestRsvpStatus: string | null;
};

type Filter = "all" | "sent" | "failed" | "opened";

const STATUS_STYLE: Record<DeliveryStatus, string> = {
  pending: "bg-[var(--d-bg-2)] text-[var(--d-ink-dim)]",
  sent: "bg-[#E8F3EE] text-[#3B7A57]",
  delivered: "bg-[#E8F3EE] text-[#3B7A57]",
  read: "bg-[rgba(143,163,217,0.08)] text-[var(--d-ink)]",
  failed: "border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]",
};

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Menunggu",
  sent: "Terkirim",
  delivered: "Terkirim",
  read: "Dibaca",
  failed: "Gagal",
};

export function DeliveryListClient({
  channel,
  deliveries,
  counts,
}: {
  channel: "whatsapp" | "email";
  deliveries: DeliveryRow[];
  counts: { total: number; sent: number; failed: number; opened: number };
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    if (filter === "all") return deliveries;
    if (filter === "sent")
      return deliveries.filter(
        (d) => d.status === "sent" || d.status === "delivered" || d.status === "read",
      );
    if (filter === "failed")
      return deliveries.filter((d) => d.status === "failed");
    return deliveries.filter((d) => d.guestOpenedAt !== null);
  }, [deliveries, filter]);

  return (
    <div className="rounded-2xl bg-[var(--d-bg-card)] shadow-ghost-sm">
      <div className="border-b border-[var(--d-line)] p-4">
        <h2 className="font-display text-lg text-[var(--d-ink)]">
          Daftar Penerima ({deliveries.length})
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`Semua (${counts.total})`}
          />
          <Chip
            active={filter === "sent"}
            onClick={() => setFilter("sent")}
            label={`Terkirim (${counts.sent})`}
          />
          <Chip
            active={filter === "failed"}
            onClick={() => setFilter("failed")}
            label={`Gagal (${counts.failed})`}
          />
          <Chip
            active={filter === "opened"}
            onClick={() => setFilter("opened")}
            label={`Dibuka (${counts.opened})`}
          />
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="p-6 text-sm text-[var(--d-ink-dim)]">
          Tidak ada penerima pada filter ini.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--border-ghost)]">
          {visible.map((d) => (
            <li key={d.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--d-ink)]">
                    {d.recipientName}
                  </p>
                  <p className="truncate text-xs text-[var(--d-ink-dim)]">
                    {channel === "whatsapp" ? d.recipientPhone : d.recipientEmail}
                  </p>
                  {d.errorMessage && (
                    <p className="mt-1 text-xs text-[var(--d-coral)]">
                      {d.errorMessage}
                    </p>
                  )}
                  {d.guestOpenedAt && (
                    <p className="mt-1 text-xs text-[#3949AB]">
                      Buka undangan:{" "}
                      {new Date(d.guestOpenedAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[d.status]}`}
                >
                  {STATUS_LABEL[d.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--d-bg-2)] text-white"
          : "border border-[var(--d-line)] bg-[var(--d-bg-card)] text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
      }`}
    >
      {label}
    </button>
  );
}
