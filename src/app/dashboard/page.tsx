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

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysUntil(iso: string): number | null {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const target = Date.UTC(y, m - 1, d);
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.round((target - todayUtc) / (1000 * 60 * 60 * 24));
}

// Page shell paints immediately. Each data-heavy section streams in
// independently via Suspense boundaries so one slow query doesn't
// block the entire page.
export default async function DashboardBerandaPage() {
  const user = await requireSessionUserFast();
  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header userId={user.id} />
      </Suspense>

      <Suspense fallback={<StatHeroSkeleton />}>
        <StatHero userId={user.id} />
      </Suspense>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ProgressSkeleton />}>
            <ProgressBlock userId={user.id} />
          </Suspense>
        </div>

        <div className="space-y-4">
          <Suspense fallback={<RsvpSkeleton />}>
            <RsvpDetailCard userId={user.id} />
          </Suspense>
          <Suspense fallback={<PublishSkeleton />}>
            <PublishStatCard userId={user.id} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
        <CountdownBand userId={user.id} />
      </Suspense>
    </main>
  );
}

async function Header({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");
  const firstSchedule = bundle.schedules[0];
  const brideFirst = bundle.couple?.brideName?.split(" ")[0] ?? "Mempelai";
  const groomFirst = bundle.couple?.groomName?.split(" ")[0] ?? "Pasangan";

  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-px w-10"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
            }}
          />
          <p className="d-eyebrow">Selamat datang kembali</p>
        </div>
        <h1 className="d-serif mt-3 text-[44px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--d-ink)] md:text-[54px]">
          {brideFirst} <em className="d-serif italic text-[var(--d-coral)]">&</em>{" "}
          {groomFirst}
        </h1>
        {firstSchedule && (
          <p className="d-mono mt-3 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            {firstSchedule.label} · {formatDate(firstSchedule.eventDate)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/preview"
          target="_blank"
          rel="noreferrer"
          className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)]"
        >
          👁 Pratinjau
        </Link>
        <Link
          href="/dashboard/website"
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[12px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
        >
          Edit Undangan →
        </Link>
      </div>
    </header>
  );
}

async function StatHero({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) return null;

  const [liveGuests, statusCounts, confirmed] = await Promise.all([
    countLiveGuests(bundle.event.id),
    countGuestsByStatus(bundle.event.id),
    sumAttendees(bundle.event.id),
  ]);

  const totalDibuka =
    statusCounts.dibuka + statusCounts.hadir + statusCounts.tidak_hadir;
  const totalResponded = statusCounts.hadir + statusCounts.tidak_hadir;
  const firstSchedule = bundle.schedules[0];
  const sisaHari = firstSchedule ? daysUntil(firstSchedule.eventDate) : null;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Tamu Terdaftar"
        value={liveGuests}
        suffix=""
        bar={Math.min(100, liveGuests > 0 ? Math.max(8, liveGuests) : 0)}
        accent="var(--d-coral)"
        foot={liveGuests > 0 ? "tamu di daftar Anda" : "belum ada tamu"}
      />
      <StatTile
        label="Undangan Dibuka"
        value={totalDibuka}
        suffix={liveGuests > 0 ? `/${liveGuests}` : ""}
        bar={liveGuests > 0 ? Math.round((totalDibuka / liveGuests) * 100) : 0}
        accent="var(--d-blue)"
        foot={
          totalDibuka > 0
            ? `${Math.round((totalDibuka / Math.max(liveGuests, 1)) * 100)}% dari total`
            : "menunggu tamu membuka link"
        }
      />
      <StatTile
        label="RSVP Hadir"
        value={statusCounts.hadir}
        suffix=""
        bar={
          totalResponded > 0
            ? Math.round((statusCounts.hadir / totalResponded) * 100)
            : 0
        }
        accent="var(--d-green)"
        foot={`${confirmed} orang dikonfirmasi`}
      />
      <StatTile
        label="Sisa Hari"
        value={sisaHari ?? 0}
        suffix=""
        bar={sisaHari !== null ? Math.max(0, Math.min(100, 100 - sisaHari)) : 0}
        accent="var(--d-gold)"
        foot={
          sisaHari === null
            ? "tanggal belum diisi"
            : sisaHari > 0
              ? "menuju hari H"
              : sisaHari === 0
                ? "hari ini"
                : "hari sudah lewat"
        }
      />
    </section>
  );
}

function StatTile({
  label,
  value,
  suffix,
  bar,
  accent,
  foot,
}: {
  label: string;
  value: number;
  suffix: string;
  bar: number;
  accent: string;
  foot: string;
}) {
  return (
    <div className="d-card p-5">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
        {label}
      </p>
      <p className="d-serif mt-3 text-[40px] font-extralight leading-none text-[var(--d-ink)]">
        {value}
        <span className="d-serif text-[18px] text-[var(--d-ink-faint)]">
          {suffix}
        </span>
      </p>
      <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-[var(--d-bg-2)]">
        <div
          className="d-bar-fill h-full rounded-full"
          style={
            {
              background: accent,
              boxShadow: `0 0 12px ${accent}`,
              "--w": Math.max(0, Math.min(100, bar)) / 100,
              transformOrigin: "left center",
              transform: `scaleX(${Math.max(0, Math.min(100, bar)) / 100})`,
            } as React.CSSProperties
          }
        />
      </div>
      <p className="mt-3 text-[11px] text-[var(--d-ink-dim)]">{foot}</p>
    </div>
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

async function RsvpDetailCard({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const [statusCounts, confirmedAttendees] = await Promise.all([
    countGuestsByStatus(current.event.id),
    sumAttendees(current.event.id),
  ]);

  return (
    <section className="d-card p-6">
      <p className="d-eyebrow">RSVP Detail</p>
      <p className="d-serif mt-3 text-[28px] font-extralight leading-none text-[var(--d-ink)]">
        {statusCounts.hadir}{" "}
        <span className="d-serif text-[14px] text-[var(--d-ink-dim)]">
          hadir
        </span>
      </p>
      <p className="d-mono mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
        {confirmedAttendees} orang dikonfirmasi
      </p>
      <dl className="mt-5 space-y-2 text-[12px]">
        <RsvpRow
          label="Hadir"
          value={statusCounts.hadir}
          dot="var(--d-green)"
        />
        <RsvpRow
          label="Tidak Hadir"
          value={statusCounts.tidak_hadir}
          dot="var(--d-coral)"
        />
        <RsvpRow
          label="Dibuka, belum jawab"
          value={statusCounts.dibuka}
          dot="var(--d-lilac)"
        />
        <RsvpRow
          label="Belum dibuka"
          value={statusCounts.baru + statusCounts.diundang}
          dot="var(--d-ink-faint)"
        />
      </dl>
      <Link
        href="/dashboard/analytics"
        className="d-mono mt-5 inline-block text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-peach)]"
      >
        Lihat analytics →
      </Link>
    </section>
  );
}

function RsvpRow({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[var(--d-ink-dim)]">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dot }}
        />
        {label}
      </span>
      <span className="font-medium text-[var(--d-ink)]">{value}</span>
    </div>
  );
}

async function PublishStatCard({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) return null;
  const isPublished = bundle.event.isPublished;
  return (
    <section className="d-card p-6">
      <p className="d-eyebrow">Status Publikasi</p>
      <div className="mt-3 flex items-center gap-3">
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{
            background: isPublished ? "var(--d-green)" : "var(--d-ink-faint)",
            boxShadow: isPublished
              ? "0 0 12px rgba(126, 211, 164, 0.6)"
              : undefined,
          }}
        />
        <p className="d-serif text-[20px] font-light text-[var(--d-ink)]">
          {isPublished ? "Dipublikasikan" : "Belum dipublikasikan"}
        </p>
      </div>
      <p className="mt-2 text-[12px] text-[var(--d-ink-dim)]">
        {isPublished
          ? "Undangan dapat diakses tamu Anda."
          : "Undangan masih tersembunyi dari publik."}
      </p>
      <Link
        href="/dashboard/settings"
        className="d-mono mt-4 inline-block text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-peach)]"
      >
        Pengaturan publikasi →
      </Link>
    </section>
  );
}

async function CountdownBand({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) return null;
  const firstSchedule = bundle.schedules[0];
  if (!firstSchedule) return null;
  const sisaHari = daysUntil(firstSchedule.eventDate);
  if (sisaHari === null) return null;

  return (
    <section className="mt-8 d-card overflow-hidden p-8 md:p-12">
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-[42ch] text-center md:text-left">
          <p className="d-eyebrow">Mendekati hari H</p>
          <p className="d-serif mt-3 text-[24px] font-extralight leading-snug text-[var(--d-ink)] md:text-[28px]">
            Setiap detail kecil yang Anda susun adalah cerita yang akan{" "}
            <em className="d-serif italic text-[var(--d-coral)]">
              dikenang seumur hidup.
            </em>
          </p>
          <p className="d-mono mt-4 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            {firstSchedule.label} · {formatDate(firstSchedule.eventDate)}
          </p>
        </div>

        <div className="relative flex h-[160px] w-[160px] shrink-0 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid var(--d-line-strong)",
            }}
          />
          <span
            aria-hidden
            className="absolute inset-3 rounded-full"
            style={{
              border: "1px solid rgba(240, 160, 156, 0.18)",
              boxShadow: "0 0 24px rgba(240, 160, 156, 0.18) inset",
            }}
          />
          <div className="relative flex flex-col items-center justify-center">
            <span className="d-serif text-[64px] font-extralight leading-none text-[var(--d-coral)]">
              {sisaHari > 0 ? sisaHari : sisaHari === 0 ? "H" : "—"}
            </span>
            <span className="d-mono mt-2 text-[10px] uppercase tracking-[0.32em] text-[var(--d-ink-dim)]">
              {sisaHari > 0
                ? "Hari Lagi"
                : sisaHari === 0
                  ? "Hari Ini"
                  : "Sudah Lewat"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeaderSkeleton() {
  return (
    <header className="mb-10 space-y-3">
      <div className="h-3 w-40 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="h-12 w-72 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="h-3 w-56 animate-pulse rounded bg-[var(--d-bg-2)]" />
    </header>
  );
}

function StatHeroSkeleton() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="d-card h-[148px] animate-pulse"
          style={{ background: "var(--d-bg-2)" }}
        />
      ))}
    </section>
  );
}

function ProgressSkeleton() {
  return (
    <section className="d-card p-7">
      <div className="h-3 w-32 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-[var(--d-bg-2)]" />
      <div className="mt-5 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-[12px] bg-[var(--d-bg-2)]"
          />
        ))}
      </div>
    </section>
  );
}

function RsvpSkeleton() {
  return (
    <section className="d-card p-6">
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-8 w-20 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-2 h-3 w-32 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-5 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-3 w-full animate-pulse rounded bg-[var(--d-bg-2)]"
          />
        ))}
      </div>
    </section>
  );
}

function PublishSkeleton() {
  return (
    <section className="d-card p-6">
      <div className="h-3 w-32 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-6 w-44 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-[var(--d-bg-2)]" />
    </section>
  );
}
