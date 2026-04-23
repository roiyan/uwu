"use client";

import { useState } from "react";
import { useToast } from "@/components/shared/Toast";
import { getWhatsAppShareUrl } from "@/lib/utils/share";

export function InviteCard({
  inviteUrl,
  partnerName,
  partnerEmail,
  expiresAt,
}: {
  inviteUrl: string;
  partnerName: string;
  partnerEmail: string;
  expiresAt: string | null;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => {
        setCopied(true);
        toast.success("Link disalin");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Tidak bisa menyalin link."));
  }

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-6 shadow-2xl">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base"
          style={{ background: "var(--brand-gradient-dim)", color: "#fff" }}
          aria-hidden
        >
          ✉️
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg text-white">
            Undang pasangan untuk mengelola bersama
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Link undangan untuk{" "}
            <span className="font-medium text-white">{partnerName}</span>
            {partnerEmail && (
              <span className="text-white/50"> ({partnerEmail})</span>
            )}
            :
          </p>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <p className="truncate font-mono text-xs text-white/80">
              {inviteUrl}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl border border-white/20 px-4 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              {copied ? "✓ Disalin" : "📋 Salin Link"}
            </button>
            <a
              href={getWhatsAppShareUrl(partnerName, inviteUrl)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#25D366] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              💬 Kirim via WhatsApp
            </a>
          </div>
          <p className="mt-3 text-xs text-white/40">
            ⏳ Link berlaku{" "}
            {expiresLabel ? `sampai ${expiresLabel}` : "30 hari"} dan hanya bisa
            digunakan sekali. Anda bisa membuat link baru kapan saja di Dashboard.
          </p>
        </div>
      </div>
    </section>
  );
}
