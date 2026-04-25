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
    <section className="rounded-[18px] border border-[var(--ob-line)] bg-[var(--ob-bg-card)] p-6 md:p-8">
      <div className="flex items-start gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base"
          style={{
            background:
              "linear-gradient(135deg, #8FA3D9 0%, #B89DD4 50%, #F0A09C 100%)",
            color: "#fff",
          }}
          aria-hidden
        >
          ✉️
        </span>
        <div className="min-w-0 flex-1">
          <p className="ob-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)]">
            Undang pasangan
          </p>
          <h2 className="ob-serif mt-2 text-[22px] font-light text-[var(--ob-ink)]">
            Kelola undangan ini bersama-sama.
          </h2>
          <p className="mt-2 text-[14px] text-[var(--ob-ink-dim)]">
            Link undangan untuk{" "}
            <span className="text-[var(--ob-ink)]">{partnerName}</span>
            {partnerEmail && (
              <span className="text-[var(--ob-ink-faint)]">
                {" "}
                ({partnerEmail})
              </span>
            )}
            :
          </p>
          <div className="mt-3 rounded-md border border-[var(--ob-line-strong)] bg-[var(--ob-bg-2)] px-3 py-2">
            <p className="ob-mono truncate text-[11px] text-[var(--ob-ink)]">
              {inviteUrl}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="ob-mono rounded-full border border-[var(--ob-line-strong)] px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink)] transition-colors hover:bg-[var(--ob-bg-2)]"
            >
              {copied ? "✓ Disalin" : "Salin Link"}
            </button>
            <a
              href={getWhatsAppShareUrl(partnerName, inviteUrl)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#25D366] px-4 py-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Kirim via WhatsApp
            </a>
          </div>
          <p className="mt-3 text-[11px] text-[var(--ob-ink-faint)]">
            ⏳ Link berlaku{" "}
            {expiresLabel ? `sampai ${expiresLabel}` : "30 hari"} dan hanya
            bisa digunakan sekali. Anda bisa membuat link baru kapan saja di
            Dashboard.
          </p>
        </div>
      </div>
    </section>
  );
}
