import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import {
  countGuestWishes,
  countGuestsByStatus,
  countLiveGuests,
  getDailyOpens,
  getEventPackageLimit,
  getResponseFunnel,
  listGuestWishes,
  sumAttendees,
} from "@/lib/db/queries/guests";
import { getRecentActivity } from "@/lib/actions/activity";
import {
  ProgressSetupCard,
  type SetupStep,
} from "@/components/dashboard/ProgressSetupCard";
import { DailyOpensChart } from "@/components/dashboard/DailyOpensChart";
import {
  ReadinessCard,
  type ReadinessStep,
} from "@/components/dashboard/ReadinessCard";
import { ResponseFunnel } from "@/components/dashboard/ResponseFunnel";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TamuStatCard } from "@/components/dashboard/TamuStatCard";
import {
  UcapanTamuCard,
  UcapanTamuSkeleton,
} from "@/components/dashboard/UcapanTamuCard";

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
      {/* Unpublished banner — streams in alongside the header. Self-
          gates to render nothing when isPublished, so on the happy
          path it only briefly contributes a 0-height fallback. */}
      <Suspense fallback={null}>
        <UnpublishedBanner userId={user.id} />
      </Suspense>

      <Suspense fallback={<HeaderSkeleton />}>
        <Header userId={user.id} />
      </Suspense>

      <Suspense fallback={<StatHeroSkeleton />}>
        <StatHero userId={user.id} />
      </Suspense>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<ProgressSkeleton />}>
            <ProgressBlock userId={user.id} />
          </Suspense>

          {/* Peek: time-series chart + 5-tier funnel side by side. On
              mobile they stack with the funnel beneath the chart. */}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Suspense fallback={<ChartSkeleton />}>
              <ChartBlock userId={user.id} />
            </Suspense>
            <Suspense fallback={<FunnelSkeleton />}>
              <FunnelBlock userId={user.id} />
            </Suspense>
          </div>

          {/* Ucapan tamu fills the otherwise-empty stretch beneath the
              chart row, sitting flush with the right-rail stack
              (PublishStatCard / ActivityBlock) on desktop. On mobile
              it just stacks naturally inside the left column. */}
          <Suspense fallback={<UcapanTamuSkeleton />}>
            <UcapanBlock userId={user.id} />
          </Suspense>
        </div>

        <div className="space-y-4">
          <Suspense fallback={<TamuSkeleton />}>
            <TamuBlock userId={user.id} />
          </Suspense>
          <Suspense fallback={<RsvpSkeleton />}>
            <RsvpDetailCard userId={user.id} />
          </Suspense>
          <Suspense fallback={<PublishSkeleton />}>
            <PublishStatCard userId={user.id} />
          </Suspense>
          <Suspense fallback={<ActivitySkeleton />}>
            <ActivityBlock userId={user.id} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
        <CountdownBand userId={user.id} />
      </Suspense>
    </main>
  );
}

async function UnpublishedBanner({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const bundle = await getEventBundle(current.event.id);
  if (!bundle || bundle.event.isPublished) return null;
  return (
    <Link
      href="/dashboard/settings?tab=acara#publikasi"
      className="mb-5 flex items-center justify-between gap-3 rounded-[14px] border px-5 py-3.5 transition-colors hover:bg-[var(--d-bg-2)] lg:mb-8"
      style={{
        background:
          "linear-gradient(115deg, rgba(240,160,156,0.08), rgba(244,184,163,0.08))",
        borderColor: "rgba(240,160,156,0.22)",
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="uwu-pulse"
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--d-coral)",
            boxShadow: "0 0 8px rgba(240,160,156,0.6)",
            flexShrink: 0,
          }}
        />
        <div className="min-w-0">
          <p className="d-serif text-[14px] leading-tight text-[var(--d-ink)]">
            Undangan belum tayang
          </p>
          <p className="d-serif mt-0.5 truncate text-[12px] italic text-[var(--d-ink-dim)]">
            Tamu yang menerima link belum bisa membuka undangan.
          </p>
        </div>
      </div>
      <span className="d-mono inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--d-coral)] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B0B15]">
        Tayangkan →
      </span>
    </Link>
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
    <header className="mb-5 flex flex-col gap-3 lg:mb-10 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 lg:mb-0 lg:gap-3">
          <span
            aria-hidden
            className="h-px w-6 lg:w-10"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
            }}
          />
          <p className="d-eyebrow">Selamat datang</p>
        </div>
        {/* Mobile: 26px title — leaves room for "Bride & Groom" on a
            single line in a 350px content area for typical Indonesian
            first names without wrapping. Desktop: 54px. */}
        <h1 className="d-serif mt-1 text-[26px] font-extralight leading-[1.1] tracking-[-0.01em] text-[var(--d-ink)] lg:mt-3 lg:text-[54px] lg:leading-[1.05]">
          {brideFirst}{" "}
          <em className="d-serif italic text-[var(--d-coral)]">&</em>{" "}
          {groomFirst}
        </h1>
        {firstSchedule && (
          <p className="d-mono mt-1.5 text-[9.5px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] lg:mt-3 lg:text-[11px] lg:tracking-[0.22em]">
            {firstSchedule.label} · {formatDate(firstSchedule.eventDate)}
          </p>
        )}
      </div>
      {/* Mobile: button row fills its container row, each Link grows
          equally via flex-1. Desktop (lg+): natural widths, sit at
          the right of the flex-row hero. */}
      <div className="flex shrink-0 gap-2">
        <Link
          href="/preview"
          target="_blank"
          rel="noreferrer"
          className="d-mono inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--d-line-strong)] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] lg:flex-none lg:px-5 lg:py-2 lg:text-[11px]"
        >
          👁 Intip Undangan
        </Link>
        <Link
          href="/dashboard/website"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-3 py-1.5 text-[10px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 lg:flex-none lg:px-6 lg:py-2.5 lg:text-[12px]"
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
        foot={liveGuests > 0 ? "tamu di daftar Anda" : "menanti tamu pertama"}
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
            : "menanti tamu membuka undangan"
        }
      />
      <StatTile
        label="Konfirmasi Hadir"
        value={statusCounts.hadir}
        suffix=""
        bar={
          totalResponded > 0
            ? Math.round((statusCounts.hadir / totalResponded) * 100)
            : 0
        }
        accent="var(--d-green)"
        foot={`${confirmed} tamu akan hadir`}
      />
      <StatTile
        label="Sisa Hari"
        value={sisaHari ?? 0}
        suffix=""
        bar={sisaHari !== null ? Math.max(0, Math.min(100, 100 - sisaHari)) : 0}
        accent="var(--d-gold)"
        foot={
          sisaHari === null
            ? "isi tanggal di pengaturan"
            : sisaHari > 0
              ? "menuju hari H"
              : sisaHari === 0
                ? "hari ini"
                : "acara sudah berlalu"
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
  // Each href ends with `#<section>` so the website editor can read
  // window.location.hash on mount and jump straight to that section.
  // Keys must match the SectionId union in EditorSplit.tsx.
  const steps: SetupStep[] = [
    {
      id: "couple",
      label: "Tentang Kalian",
      description: "Kenalkan diri kalian — nama, foto, dan cerita singkat.",
      href: "/dashboard/website#mempelai",
      done: Boolean(bundle.couple?.brideName && bundle.couple?.groomName),
    },
    {
      id: "schedule",
      label: "Jadwal acara",
      description: "Tanggal, waktu, dan lokasi akad serta resepsi.",
      href: "/dashboard/website#acara",
      done: bundle.schedules.length > 0,
    },
    {
      id: "theme",
      label: "Pilih tema",
      description: "Pilih tampilan undangan kalian.",
      href: "/dashboard/website/theme",
      done: Boolean(bundle.event.themeId),
    },
    {
      id: "story",
      label: "Kisah Cinta",
      description: "Bagikan perjalanan cinta kalian.",
      href: "/dashboard/website#kutipan",
      done: hasCoupleStory,
    },
    {
      id: "cover",
      label: "Foto sampul",
      description: "Abadikan momen terbaik sebagai sampul.",
      href: "/dashboard/website#foto-sampul",
      done: hasCoverPhoto,
    },
    {
      id: "guests",
      label: "Daftar Tamu",
      description: "Susun daftar orang-orang istimewa kalian.",
      href: "/dashboard/guests",
      done: guestCount > 0,
    },
    {
      id: "publish",
      label: "Tayangkan Undangan",
      description: "Biarkan dunia melihat undangan kalian.",
      href: "/dashboard/settings?tab=acara",
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
      <p className="d-eyebrow">Detail Respons</p>
      <p className="d-serif mt-3 text-[28px] font-extralight leading-none text-[var(--d-ink)]">
        {statusCounts.hadir}{" "}
        <span className="d-serif text-[14px] text-[var(--d-ink-dim)]">
          hadir
        </span>
      </p>
      <p className="d-mono mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
        {confirmedAttendees} tamu akan hadir
      </p>
      <dl className="mt-5 space-y-2 text-[12px]">
        <RsvpRow
          label="Hadir"
          value={statusCounts.hadir}
          dot="var(--d-green)"
        />
        <RsvpRow
          label="Berhalangan"
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
        Lihat jejak →
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
          {isPublished ? "Sudah tayang" : "Belum tayang"}
        </p>
      </div>
      <p className="mt-2 text-[12px] text-[var(--d-ink-dim)]">
        {isPublished
          ? "Undangan dapat diakses tamu Anda."
          : "Undangan masih disimpan untuk kalian berdua."}
      </p>
      <Link
        href="/dashboard/settings?tab=acara"
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

// ===========================================================================
// Beranda peek + activity blocks
// ===========================================================================

async function ChartBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) return null;

  // Pre-publish: open events are still 0, the chart would just show
  // a flat zero line. Show a "Kesiapan Undangan" card instead so the
  // user has something actionable in that slot. Switches to the live
  // chart automatically once isPublished flips true.
  if (!bundle.event.isPublished) {
    const guestCount = await countLiveGuests(bundle.event.id);
    const hasCoupleStory = Boolean(
      bundle.couple?.story || bundle.couple?.quote,
    );
    const hasCoverPhoto = Boolean(bundle.couple?.coverPhotoUrl);
    const readiness: ReadinessStep[] = [
      {
        id: "couple",
        label: "Tentang Kalian",
        href: "/dashboard/website#mempelai",
        done: Boolean(
          bundle.couple?.brideName && bundle.couple?.groomName,
        ),
      },
      {
        id: "schedule",
        label: "Jadwal acara",
        href: "/dashboard/website#acara",
        done: bundle.schedules.length > 0,
      },
      {
        id: "theme",
        label: "Tema",
        href: "/dashboard/website/theme",
        done: Boolean(bundle.event.themeId),
      },
      {
        id: "story",
        label: "Kisah Cinta",
        href: "/dashboard/website#kutipan",
        done: hasCoupleStory,
      },
      {
        id: "cover",
        label: "Foto sampul",
        href: "/dashboard/website#foto-sampul",
        done: hasCoverPhoto,
      },
      {
        id: "guests",
        label: "Tamu",
        href: "/dashboard/guests",
        done: guestCount > 0,
      },
      {
        id: "publish",
        label: "Publikasi",
        href: "/dashboard/settings?tab=acara",
        done: bundle.event.isPublished,
      },
    ];
    return <ReadinessCard steps={readiness} />;
  }

  const data = await getDailyOpens(bundle.event.id, 7);
  return <DailyOpensChart data={data} />;
}

async function FunnelBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const data = await getResponseFunnel(current.event.id);
  return <ResponseFunnel data={data} />;
}

async function TamuBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const [count, packageInfo] = await Promise.all([
    countLiveGuests(current.event.id),
    getEventPackageLimit(current.event.id),
  ]);
  return (
    <TamuStatCard
      count={count}
      limit={packageInfo.limit}
      packageName={packageInfo.packageName}
    />
  );
}

async function ActivityBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  const rows = await getRecentActivity(current.event.id, 5);
  return (
    <RecentActivity
      items={rows.map((r) => ({
        id: r.id,
        summary: r.summary,
        userName: r.userName,
        userEmail: r.userEmail,
        createdAt: r.createdAt,
      }))}
    />
  );
}

async function UcapanBlock({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) return null;
  // 3 wishes for the card + the totals for the footer line. Both
  // queries scope to live guests with non-empty rsvpMessage so the
  // numerator and denominator stay consistent.
  const [wishes, totalWishes, totalGuests] = await Promise.all([
    listGuestWishes(current.event.id, 3),
    countGuestWishes(current.event.id),
    countLiveGuests(current.event.id),
  ]);
  return (
    <UcapanTamuCard
      wishes={wishes}
      totalWishes={totalWishes}
      totalGuests={totalGuests}
    />
  );
}

function ChartSkeleton() {
  return (
    <section
      className="d-card h-[300px] animate-pulse"
      style={{ background: "var(--d-bg-2)" }}
    />
  );
}

function FunnelSkeleton() {
  return (
    <section className="d-card p-7">
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-6 w-44 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-6 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-3 w-full animate-pulse rounded bg-[var(--d-bg-2)]" />
            <div className="mt-2 h-2 w-full animate-pulse rounded bg-[var(--d-bg-2)]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function TamuSkeleton() {
  return (
    <section className="d-card p-6">
      <div className="h-3 w-16 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-10 w-24 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-[var(--d-bg-2)]" />
    </section>
  );
}

function ActivitySkeleton() {
  return (
    <section className="d-card p-[22px]">
      <div className="h-4 w-32 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-4 space-y-3">
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
