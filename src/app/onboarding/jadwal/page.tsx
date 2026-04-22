import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { Stepper } from "@/components/onboarding/Stepper";
import { JadwalForm, type ScheduleRow } from "./form";

function defaultRows(): ScheduleRow[] {
  return [
    {
      label: "Akad Nikah",
      eventDate: "",
      startTime: "08:00",
      endTime: "10:00",
      timezone: "Asia/Jakarta",
      venueName: "",
      venueAddress: "",
      venueMapUrl: "",
    },
    {
      label: "Resepsi",
      eventDate: "",
      startTime: "11:00",
      endTime: "14:00",
      timezone: "Asia/Jakarta",
      venueName: "",
      venueAddress: "",
      venueMapUrl: "",
    },
  ];
}

// Page shell paints instantly; the data-dependent form streams in via Suspense.
// Users see the stepper + heading + skeleton without waiting for the DB round-trip.
export default function JadwalStep() {
  return (
    <div>
      <Stepper current="jadwal" reached={["mempelai", "jadwal"]} />
      <section className="mt-10">
        <h1 className="font-display text-3xl text-ink">
          Jadwal <span className="italic text-gradient">acara</span>
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Tambah hari dan lokasi setiap acara. Minimal satu acara harus diisi.
        </p>
      </section>
      <Suspense fallback={<FormSkeleton />}>
        <JadwalFormLoader />
      </Suspense>
    </div>
  );
}

async function JadwalFormLoader() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");

  const bundle = await getEventBundle(current.event.id);
  if (!bundle || !bundle.couple) redirect("/onboarding/mempelai");

  const initial: ScheduleRow[] = bundle.schedules.length
    ? bundle.schedules.map((s) => ({
        label: s.label,
        eventDate: s.eventDate,
        startTime: s.startTime ?? "",
        endTime: s.endTime ?? "",
        timezone: s.timezone,
        venueName: s.venueName ?? "",
        venueAddress: s.venueAddress ?? "",
        venueMapUrl: s.venueMapUrl ?? "",
      }))
    : defaultRows();

  return <JadwalForm initial={initial} />;
}

function FormSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      <div className="h-64 animate-pulse rounded-2xl bg-surface-card/60" />
      <div className="h-64 animate-pulse rounded-2xl bg-surface-card/60" />
    </div>
  );
}
