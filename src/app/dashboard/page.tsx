import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guests } from "@/lib/db/schema";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import {
  ProgressSetupCard,
  type SetupStep,
} from "@/components/dashboard/ProgressSetupCard";

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DashboardBerandaPage() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  const guestCountRows = await db
    .select({ id: guests.id })
    .from(guests)
    .where(and(eq(guests.eventId, bundle.event.id)));
  const guestCount = guestCountRows.length;
  const firstSchedule = bundle.schedules[0];

  const hasCoupleStory = Boolean(bundle.couple?.story || bundle.couple?.quote);
  const hasCoverPhoto = Boolean(bundle.couple?.coverPhotoUrl);
  const hasGuests = guestCount > 0;
  const isPublished = bundle.event.isPublished;

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
      done: hasGuests,
    },
    {
      id: "publish",
      label: "Publikasikan undangan",
      description: "Aktifkan undangan agar dapat dibagikan ke tamu.",
      href: "/dashboard/settings",
      done: isPublished,
    },
  ];

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
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
            href={`/${bundle.event.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
          >
            👁 Pratinjau
          </Link>
          <Link
            href="/dashboard/website"
            className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-dark"
          >
            Edit Undangan
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProgressSetupCard steps={steps} />
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl bg-surface-card p-5 shadow-ghost-sm">
            <p className="text-xs uppercase tracking-wide text-ink-hint">Tamu</p>
            <p className="mt-2 font-display text-3xl text-ink">{guestCount}</p>
            <p className="text-xs text-ink-muted">total tamu terdaftar</p>
            <Link
              href="/dashboard/guests"
              className="mt-4 inline-block text-xs font-medium text-navy hover:underline"
            >
              Kelola tamu →
            </Link>
          </section>
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
        </div>
      </div>
    </main>
  );
}
