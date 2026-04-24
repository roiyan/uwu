import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import {
  countGuestsByStatus,
  countLiveGuests,
  sumAttendees,
} from "@/lib/db/queries/guests";
import {
  ProgressSetupCard,
  type SetupStep,
} from "@/components/dashboard/ProgressSetupCard";

function StatRow({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        {label}
      </span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Page shell (header, action buttons, grid layout) paints immediately.
// Each data-heavy card streams in independently via Suspense boundaries
// so one slow query doesn't block the entire page.
export default async function DashboardBerandaPage() {
  const user = await requireSessionUserFast();
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header userId={user.id} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ProgressSkeleton />}>
            <ProgressBlock userId={user.id} />
          </Suspense>
        </div>

        <div className="space-y-4">
          <Suspense fallback={<StatCardSkeleton label="Tamu" />}>
            <GuestsStatCard userId={user.id} />
          </Suspense>
          <Suspense fallback={<StatCardSkeleton label="RSVP" />}>
            <RsvpStatCard userId={user.id} />
          </Suspense>
          <Suspense fallback={<StatCardSkeleton label="Status" />}>
            <PublishStatCard userId={user.id} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Header({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");
  const firstSchedule = bundle.schedules[0];

  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-ink-hint">
          Selamat datang
        </p>
        <h1 className="mt-1 font-display text-3xl text-navy">
          {bundle.couple?.brideName?.split(" ")[0]} &amp;{" "}
          {bundle.couple?.groomName?.split(" ")[0]}
        </h1>
        {firstSchedule && (
          <p className="mt-1 text-sm text-ink-muted">
            {firstSchedule.label} • {formatDate(firstSchedule.eventDate)}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Link
          href="/preview"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-navy/30 px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/5"
        >
          👁 Pratinjau
        </Link>
        <Link
          href="/dashboard/website"
          className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-medium text-white shadow-[0_6px_20px_-6px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02]"
        >
          Edit Undangan →
        </Link>
      </div>
    </header>
  );
}

async function ProgressBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  const guestCount = await countLiveGuests(bundle.event.id);
  const hasCoupleStory = Boolean(bundle.couple?.story || bundle.couple?.quote);
  const hasCoverPhoto = Boolean(bundle.couple?.coverPhotoUrl);
  const steps: SetupStep[] = [
    {
      id: "couple",
      label: "Detail mempelai",
      description: "Nama, foto, dan cerita singkat tentang Anda berdua.",
      href: "/dashboard/website",
      done: Boolean(bundle.couple?.brideName && bundle.couple?.groomName),
    },
    {
      id: "schedule",
      label: "Jadwal acara",
      description: "Tanggal, waktu, dan lokasi akad serta resepsi.",
      href: "/dashboard/website",
      done: bundle.schedules.length > 0,
    },
    {
      id: "theme",
      label: "Pilih tema",
      description: "Tentukan tampilan visual undangan digital Anda.",
      href: "/dashboard/website/theme",
      done: Boolean(bundle.event.themeId),
    },
    {
      id: "story",
      label: "Cerita & kutipan",
      description: "Tambah kisah Anda dan kutipan favorit.",
      href: "/dashboard/website",
      done: hasCoupleStory,
    },
    {
      id: "cover",
      label: "Foto sampul",
      description: "Unggah foto bersama sebagai latar utama.",
      href: "/dashboard/website",
      done: hasCoverPhoto,
    },
    {
      id: "guests",
      label: "Tambah tamu",
      description: "Import atau tambah tamu satu per satu.",
      href: "/dashboard/guests",
      done: guestCount > 0,
    },
    {
      id: "publish",
      label: "Publikasikan undangan",
      description: "Aktifkan undangan agar dapat dibagikan ke tamu.",
      href: "/dashboard/settings",
      done: bundle.event.isPublished,
    },
  ];
  return <ProgressSetupCard steps={steps} />;
}

async function GuestsStatCard({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const count = await countLiveGuests(current.event.id);
  return (
    <section className="rounded-2xl bg-surface-card p-5 shadow-ghost-sm">
      <p className="text-xs uppercase tracking-wide text-ink-hint">Tamu</p>
      <p className="mt-2 font-display text-3xl text-ink">{count}</p>
      <p className="text-xs text-ink-muted">total tamu terdaftar</p>
      <Link
        href="/dashboard/guests"
        className="mt-4 inline-block text-xs font-medium text-navy hover:underline"
      >
        Kelola tamu →
      </Link>
    </section>
  );
}

async function RsvpStatCard({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const [statusCounts, confirmedAttendees] = await Promise.all([
    countGuestsByStatus(current.event.id),
    sumAttendees(current.event.id),
  ]);
  return (
    <section className="rounded-2xl bg-surface-card p-5 shadow-ghost-sm">
      <p className="text-xs uppercase tracking-wide text-ink-hint">RSVP</p>
      <p className="mt-2 font-display text-3xl text-ink">
        {statusCounts.hadir}
        <span className="text-base text-ink-muted"> hadir</span>
      </p>
      <p className="text-xs text-ink-muted">
        {confirmedAttendees} orang dikonfirmasi
      </p>
      <dl className="mt-3 space-y-1 text-xs text-ink-muted">
        <StatRow label="Dibuka" value={statusCounts.dibuka} dot="var(--color-rsvp-dibuka)" />
        <StatRow label="Tidak Hadir" value={statusCounts.tidak_hadir} dot="var(--color-rsvp-tidak-hadir)" />
        <StatRow label="Belum direspons" value={statusCounts.baru + statusCounts.diundang} dot="var(--color-rsvp-baru)" />
      </dl>
      <Link
        href="/dashboard/analytics"
        className="mt-4 inline-block text-xs font-medium text-navy hover:underline"
      >
        Lihat analytics →
      </Link>
    </section>
  );
}

async function PublishStatCard({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) return null;
  const isPublished = bundle.event.isPublished;
  return (
    <section className="rounded-2xl bg-surface-card p-5 shadow-ghost-sm">
      <p className="text-xs uppercase tracking-wide text-ink-hint">Status</p>
      <p className="mt-2 font-display text-lg text-ink">
        {isPublished ? "Dipublikasikan" : "Belum dipublikasikan"}
      </p>
      <p className="text-xs text-ink-muted">
        {isPublished
          ? "Undangan dapat diakses tamu Anda."
          : "Undangan masih tersembunyi dari publik."}
      </p>
      <Link
        href="/dashboard/settings"
        className="mt-4 inline-block text-xs font-medium text-navy hover:underline"
      >
        Pengaturan publikasi →
      </Link>
    </section>
  );
}

function HeaderSkeleton() {
  return (
    <header className="mb-8 space-y-2">
      <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
      <div className="h-9 w-56 animate-pulse rounded bg-surface-muted" />
      <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
    </header>
  );
}

function ProgressSkeleton() {
  return (
    <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
      <div className="h-6 w-48 animate-pulse rounded bg-surface-muted" />
      <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-surface-muted" />
      <div className="mt-5 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-muted/60" />
        ))}
      </div>
    </section>
  );
}

function StatCardSkeleton({ label }: { label: string }) {
  return (
    <section className="rounded-2xl bg-surface-card p-5 shadow-ghost-sm">
      <p className="text-xs uppercase tracking-wide text-ink-hint">{label}</p>
      <div className="mt-2 h-8 w-16 animate-pulse rounded bg-surface-muted" />
      <div className="mt-2 h-3 w-32 animate-pulse rounded bg-surface-muted" />
    </section>
  );
}
