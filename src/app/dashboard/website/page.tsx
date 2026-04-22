import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { CoupleForm } from "./couple-form";
import { SchedulesForm } from "./schedules-form";

export default async function WebsiteEditorPage() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle?.couple) redirect("/onboarding");

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-navy">Website Editor</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Sesuaikan isi undangan digital Anda. Perubahan tersimpan otomatis di server.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/website/theme"
            className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
          >
            🎨 Ganti Tema
          </Link>
          <Link
            href="/preview"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-navy px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark"
          >
            👁 Pratinjau
          </Link>
        </div>
      </header>

      <div className="space-y-10">
        <CoupleForm
          eventId={bundle.event.id}
          defaults={{
            brideName: bundle.couple.brideName,
            brideNickname: bundle.couple.brideNickname ?? "",
            brideFatherName: bundle.couple.brideFatherName ?? "",
            brideMotherName: bundle.couple.brideMotherName ?? "",
            brideInstagram: bundle.couple.brideInstagram ?? "",
            bridePhotoUrl: bundle.couple.bridePhotoUrl ?? "",
            groomName: bundle.couple.groomName,
            groomNickname: bundle.couple.groomNickname ?? "",
            groomFatherName: bundle.couple.groomFatherName ?? "",
            groomMotherName: bundle.couple.groomMotherName ?? "",
            groomInstagram: bundle.couple.groomInstagram ?? "",
            groomPhotoUrl: bundle.couple.groomPhotoUrl ?? "",
            coverPhotoUrl: bundle.couple.coverPhotoUrl ?? "",
            story: bundle.couple.story ?? "",
            quote: bundle.couple.quote ?? "",
          }}
        />

        <SchedulesForm
          eventId={bundle.event.id}
          initial={bundle.schedules.map((s) => ({
            label: s.label,
            eventDate: s.eventDate,
            startTime: s.startTime ?? "",
            endTime: s.endTime ?? "",
            timezone: s.timezone,
            venueName: s.venueName ?? "",
            venueAddress: s.venueAddress ?? "",
            venueMapUrl: s.venueMapUrl ?? "",
          }))}
        />
      </div>
    </main>
  );
}
