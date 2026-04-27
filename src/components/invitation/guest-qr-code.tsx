"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { buildInvitationUrl } from "@/lib/utils/invitation-url";

type Palette = { primary: string; secondary: string; accent: string };

export function GuestQrCode({
  slug,
  token,
  guestName,
  attendees,
  palette,
}: {
  slug: string;
  token: string;
  guestName: string;
  attendees: number | null;
  palette: Palette;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Resolve the guest-facing URL after hydration. We delegate to
  // buildInvitationUrl() so the encoded link respects subdomain
  // mode in production (`<slug>.uwu.id?to=…`) while still falling
  // back to `<app>/<slug>?to=…` for staging/local.
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  useEffect(() => {
    setInvitationUrl(buildInvitationUrl(slug, `?to=${token}`));
  }, [slug, token]);

  if (!invitationUrl) return null;

  // "Save QR" path — render the existing inline SVG to canvas, then
  // export PNG. We use the rendered SVG directly so the QR matches what
  // the guest sees on screen, including palette colors.
  function downloadPng() {
    const svg = wrapRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 4;
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) return;
        const dl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dl;
        a.download = `tiket-uwu-${guestName.replace(/\s+/g, "-").toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(dl);
      }, "image/png");
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  return (
    <section className="px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-md rounded-2xl bg-white/85 p-8 text-center shadow-ghost-md backdrop-blur"
      >
        <p
          className="text-xs uppercase tracking-[0.3em]"
          style={{ color: palette.accent }}
        >
          Tiket Kehadiran Anda
        </p>
        <h3
          className="mt-3 font-display text-2xl"
          style={{ color: palette.primary }}
        >
          Selamat datang
        </h3>

        <div
          ref={wrapRef}
          className="mt-6 flex items-center justify-center rounded-2xl bg-white p-6"
          style={{
            border: `1px solid ${palette.accent}33`,
          }}
        >
          <QRCodeSVG
            value={invitationUrl}
            size={200}
            level="M"
            marginSize={1}
            fgColor="#1A1A2E"
            bgColor="#FFFFFF"
          />
        </div>

        <p className="mt-5 font-display text-lg italic" style={{ color: palette.primary }}>
          {guestName}
        </p>
        {attendees != null && attendees > 0 && (
          <p className="mt-1 text-xs opacity-70">
            Tamu undangan · {attendees} orang
          </p>
        )}

        <div
          className="mt-5 flex items-center justify-center gap-3"
          style={{ color: palette.accent }}
        >
          <span className="h-px w-10 bg-current" />
          <span aria-hidden>♡</span>
          <span className="h-px w-10 bg-current" />
        </div>

        <p className="mt-5 text-xs leading-relaxed opacity-80">
          Tunjukkan QR ini saat tiba di lokasi acara.
          <br />
          Satu sentuhan — kehadiran Anda tercatat,
          <br />
          tanpa antri, tanpa ribet.
        </p>

        <button
          type="button"
          onClick={downloadPng}
          className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: palette.primary }}
        >
          📥 Simpan QR
        </button>
      </motion.div>
    </section>
  );
}
