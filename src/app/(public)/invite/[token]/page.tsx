import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { resolveInviteToken } from "@/lib/actions/collaborator";
import { InviteAction } from "./action";

// Dynamic — each token produces a different page. No point caching.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Undangan Kolaborasi — uwu",
  description: "Bergabung untuk mengelola undangan pernikahan bersama.",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <Suspense fallback={<Skeleton />}>
        <InviteContent token={token} />
      </Suspense>
    </main>
  );
}

async function InviteContent({ token }: { token: string }) {
  // Defensive: if the DB query throws (migrations drift, transient
  // connection error, etc) render a friendly card instead of a generic
  // 500. The error boundary in error.tsx backstops anything that slips
  // past this catch.
  let result: Awaited<ReturnType<typeof resolveInviteToken>>;
  try {
    result = await resolveInviteToken(token);
  } catch (err) {
    console.error("[invite] resolveInviteToken failed", err);
    return (
      <Card
        icon="⚠️"
        title="Terjadi kendala"
        body="Kami tidak bisa memproses undangan ini saat ini. Silakan coba lagi sebentar lagi."
        cta={
          <Link
            href="/"
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Kembali ke Beranda
          </Link>
        }
      />
    );
  }

  if (result.state === "not_found") {
    return (
      <Card
        icon="❓"
        title="Link tidak ditemukan"
        body="Tautan undangan tidak dikenali. Mungkin sudah dihapus atau salah salin."
        cta={
          <Link
            href="/"
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Kembali ke Beranda
          </Link>
        }
      />
    );
  }

  if (result.state === "used") {
    return (
      <Card
        icon="✅"
        title="Link sudah digunakan"
        body="Undangan ini sudah diterima. Jika Anda sudah bergabung, silakan masuk untuk mengelola undangan."
        cta={
          <Link
            href="/login"
            className="rounded-xl bg-gradient-brand px-8 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02]"
          >
            Masuk →
          </Link>
        }
      />
    );
  }

  if (result.state === "expired") {
    return (
      <Card
        icon="⏰"
        title="Link sudah kedaluwarsa"
        body="Tautan ini sudah melewati 30 hari. Minta pasangan Anda untuk membuat link baru di Dashboard."
        cta={
          <Link
            href="/"
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Kembali ke Beranda
          </Link>
        }
      />
    );
  }

  // valid — show the accept CTA
  const ownerDisplay = result.ownerDisplayName ?? "Pasangan Anda";

  return (
    <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-8 text-center shadow-2xl">
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-60"
        style={{ background: "var(--brand-gradient-dim)" }}
        aria-hidden
      />
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white shadow-lg"
        style={{ background: "var(--brand-gradient)" }}
        aria-hidden
      >
        💍
      </div>
      <h1 className="mt-5 font-display text-2xl text-white md:text-3xl">
        Undangan <span className="italic text-gradient">Kolaborasi</span>
      </h1>
      <p className="mt-3 text-sm text-white/70">
        <span className="font-medium text-white">{ownerDisplay}</span>{" "}
        mengundang Anda untuk mengelola undangan pernikahan bersama.
      </p>
      <dl className="mt-5 space-y-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm">
        <Row label="Undangan" value={result.eventTitle} />
        <Row label="Email tujuan" value={result.invitedEmail} />
        {result.invitedName && <Row label="Untuk" value={result.invitedName} />}
      </dl>
      <InviteAction token={token} />
      <p className="mt-4 text-xs text-white/40">
        Anda perlu masuk atau mendaftar untuk melanjutkan.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <dt className="text-white/50">{label}</dt>
      <dd className="truncate text-right font-medium text-white">{value}</dd>
    </div>
  );
}

function Card({
  icon,
  title,
  body,
  cta,
}: {
  icon: string;
  title: string;
  body: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-8 text-center shadow-2xl">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-3xl">
        {icon}
      </div>
      <h1 className="mt-5 font-display text-2xl text-white md:text-3xl">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-white/60">{body}</p>
      <div className="mt-6">{cta}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="w-full max-w-md animate-pulse space-y-4 rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-8">
      <div className="mx-auto h-16 w-16 rounded-full bg-white/5" />
      <div className="mx-auto h-8 w-3/4 rounded bg-white/5" />
      <div className="mx-auto h-4 w-2/3 rounded bg-white/5" />
      <div className="mt-6 h-10 w-full rounded-xl bg-white/5" />
    </div>
  );
}
