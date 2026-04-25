import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { StepHeader } from "../components/step-header";
import { HydratePreview } from "../components/preview-store";
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
export default function JadwalStep() {
  return (
    <div>
      <StepHeader
        eyebrow="Bab kedua — momen yang dirayakan"
        title={
          <>
            Sebuah hari,{" "}
            <em className="ob-serif italic text-[var(--ob-coral)]">
              beberapa acara.
            </em>
          </>
        }
        sub="Tambah hari dan lokasi setiap acara. Minimal satu acara harus diisi."
      />
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

  return (
    <>
      <HydratePreview
        brideName={bundle.couple.brideName}
        brideNickname={bundle.couple.brideNickname ?? ""}
        groomName={bundle.couple.groomName}
        groomNickname={bundle.couple.groomNickname ?? ""}
        eventDate={initial[0]?.eventDate ?? ""}
        venue={initial[0]?.venueName ?? ""}
      />
      <JadwalForm initial={initial} />
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="mt-2 space-y-6">
      <div className="h-64 animate-pulse rounded-[18px] border border-[var(--ob-line)] bg-[var(--ob-bg-card)]" />
      <div className="h-64 animate-pulse rounded-[18px] border border-[var(--ob-line)] bg-[var(--ob-bg-card)]" />
    </div>
  );
}
