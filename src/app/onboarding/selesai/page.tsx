import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventMembers } from "@/lib/db/schema";
import { requireAuthedUser } from "@/lib/auth-guard";
import {
  getCurrentEventForUser,
  getEventBundle,
  listThemes,
} from "@/lib/db/queries/events";
import { Confetti } from "../components/confetti";
import { HydratePreview } from "../components/preview-store";
import { StepHeader } from "../components/step-header";
import { InviteCard } from "./invite-card";

export default function SelesaiStep() {
  return (
    <div>
      <StepHeader
        eyebrow="Epilogue — Selesai"
        title={
          <>
            Bab pembuka{" "}
            <em className="ob-serif italic text-[var(--ob-coral)]">
              sudah ditulis.
            </em>
          </>
        }
        sub="Semua kepingan pertama sudah di tempatnya. Mari kita polish undangan kalian di dashboard."
      />

      <Suspense fallback={<LoadingCard />}>
        <SelesaiContent />
      </Suspense>
    </div>
  );
}

async function SelesaiContent() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle?.couple) redirect("/onboarding/mempelai");

  // Resolve theme palette from the DB so the final preview matches
  // whatever the user picked (or fall back to ivory).
  const themes = await listThemes();
  const pickedTheme = themes.find((t) => t.id === bundle.event.themeId);
  const themeSlug = pickedTheme
    ? pickedTheme.name.toLowerCase().split(/\s+/)[0] ?? "ivory"
    : "ivory";

  // Partner invite (queued during mempelai step) surfaces here.
  const [invite] = await db
    .select({
      id: eventMembers.id,
      token: eventMembers.inviteToken,
      invitedEmail: eventMembers.invitedEmail,
      invitedName: eventMembers.invitedName,
      expiresAt: eventMembers.expiresAt,
    })
    .from(eventMembers)
    .where(
      and(
        eq(eventMembers.eventId, current.event.id),
        eq(eventMembers.inviteStatus, "pending"),
      ),
    )
    .limit(1);

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = invite?.token ? `${origin}/invite/${invite.token}` : null;

  const firstSchedule = bundle.schedules[0];
  const dateStr = firstSchedule?.eventDate
    ? new Date(`${firstSchedule.eventDate}T00:00:00Z`).toLocaleDateString(
        "id-ID",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        },
      )
    : "Tanggal menyusul";

  const palette = palettes[themeSlug] ?? palettes.ivory;

  return (
    <div className="relative">
      <HydratePreview
        brideName={bundle.couple.brideName}
        brideNickname={bundle.couple.brideNickname ?? ""}
        groomName={bundle.couple.groomName}
        groomNickname={bundle.couple.groomNickname ?? ""}
        eventDate={firstSchedule?.eventDate ?? ""}
        venue={firstSchedule?.venueName ?? ""}
        themeSlug={themeSlug}
      />
      <Confetti />

      <section
        className="relative mt-2 overflow-hidden rounded-[24px] border border-[var(--ob-line)] bg-[var(--ob-bg-card)] p-8 md:p-10"
      >
        <p className="ob-mono text-[10px] uppercase tracking-[0.32em] text-[var(--ob-ink-dim)]">
          Pratinjau Final
        </p>
        <div
          className="relative mt-6 overflow-hidden rounded-[18px] p-10 text-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
          style={{
            background: palette.bg,
            color: palette.ink,
            transform: "rotate(-1deg)",
          }}
        >
          <p
            className="ob-mono text-[8.5px] uppercase tracking-[0.36em] opacity-70"
            style={{ color: palette.ink }}
          >
            The Wedding Of
          </p>
          <p
            className="mt-3 text-[10px] tracking-[0.4em]"
            style={{ color: palette.accent }}
          >
            ✦ ⸻ ✦
          </p>
          <p
            className="ob-serif mt-3 text-3xl font-light leading-tight"
            style={{ color: palette.ink }}
          >
            {bundle.couple.brideNickname || bundle.couple.brideName}
          </p>
          <p
            className="ob-serif text-3xl italic opacity-70"
            style={{ color: palette.ink }}
          >
            &
          </p>
          <p
            className="ob-serif text-3xl font-light italic leading-tight"
            style={{ color: palette.ink }}
          >
            {bundle.couple.groomNickname || bundle.couple.groomName}
          </p>
          <p
            className="ob-mono mt-5 text-[10px] uppercase tracking-[0.28em] opacity-80"
            style={{ color: palette.ink }}
          >
            {dateStr}
          </p>
          {firstSchedule?.venueName && (
            <p
              className="ob-mono mt-1 text-[10px] tracking-[0.18em] opacity-60"
              style={{ color: palette.ink }}
            >
              {firstSchedule.venueName}
            </p>
          )}
          <p
            className="ob-mono mt-6 text-[8px] uppercase tracking-[0.32em] opacity-60"
            style={{ color: palette.accent }}
          >
            {pickedTheme?.name ?? "Ivory Whisper"}
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="ob-serif text-[22px] font-light text-[var(--ob-ink)]">
            <em className="italic text-[var(--ob-coral)]">Selamat!</em>{" "}
            Undangan untuk{" "}
            <span className="text-[var(--ob-ink)]">
              {bundle.couple.brideNickname || bundle.couple.brideName} &{" "}
              {bundle.couple.groomNickname || bundle.couple.groomName}
            </span>{" "}
            siap dipoles.
          </p>
          <p className="mt-3 text-[14px] text-[var(--ob-ink-dim)]">
            Lanjutkan dengan menyesuaikan isi undangan, tambah tamu, lalu
            kirim undangan digital.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-3 text-[13px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
            >
              Masuk Dashboard →
            </Link>
            <Link
              href="/dashboard/website"
              className="ob-mono inline-flex items-center gap-2 rounded-full border border-[var(--ob-line-strong)] px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-[var(--ob-ink)] transition-colors hover:bg-[var(--ob-bg-2)]"
            >
              Edit Isi Undangan
            </Link>
          </div>
        </div>
      </section>

      {inviteUrl && invite && (
        <div className="mt-6">
          <InviteCard
            inviteUrl={inviteUrl}
            partnerName={invite.invitedName ?? invite.invitedEmail ?? "pasangan"}
            partnerEmail={invite.invitedEmail ?? ""}
            expiresAt={invite.expiresAt?.toISOString() ?? null}
          />
        </div>
      )}
    </div>
  );
}

const palettes: Record<
  string,
  { bg: string; ink: string; accent: string }
> = {
  ivory: {
    bg: "linear-gradient(135deg, #F4E8DA 0%, #E2BE9C 100%)",
    ink: "#2A1F1A",
    accent: "#9C5B3A",
  },
  sakura: {
    bg: "linear-gradient(135deg, #FCD9DC 0%, #E89AA1 100%)",
    ink: "#3A1C24",
    accent: "#A14056",
  },
  midnight: {
    bg: "linear-gradient(135deg, #1A1F3A 0%, #2C2440 60%, #0E0F18 100%)",
    ink: "#EDE8DE",
    accent: "#D4B896",
  },
  emerald: {
    bg: "linear-gradient(135deg, #1F3A2D 0%, #2C5840 100%)",
    ink: "#EDE8DE",
    accent: "#D4B896",
  },
  navy: {
    bg: "linear-gradient(135deg, #1A2A3F 0%, #2C4258 100%)",
    ink: "#EDE8DE",
    accent: "#B89DD4",
  },
  coral: {
    bg: "linear-gradient(135deg, #F4B8A3 0%, #E89AA1 100%)",
    ink: "#3A1C24",
    accent: "#9C5B3A",
  },
};

function LoadingCard() {
  return (
    <section className="mt-2 rounded-[24px] border border-[var(--ob-line)] bg-[var(--ob-bg-card)] p-8 text-center md:p-10">
      <div className="mx-auto h-72 animate-pulse rounded-[18px] bg-[var(--ob-bg-2)]" />
      <p className="mt-6 text-sm text-[var(--ob-ink-dim)]">
        Menyiapkan undangan Anda…
      </p>
    </section>
  );
}
