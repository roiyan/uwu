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

export default async function JadwalStep() {
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

  const reached: ("mempelai" | "jadwal" | "tema" | "selesai")[] = ["mempelai", "jadwal"];
  if (bundle.schedules.length > 0) reached.push("tema");
  if (bundle.event.themeId) reached.push("selesai");

  return (
    <div>
      <Stepper current="jadwal" reached={reached} />
      <section className="mt-10">
        <h1 className="font-display text-3xl text-ink">Jadwal acara</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Tambah hari dan lokasi setiap acara. Minimal satu acara harus diisi.
        </p>
      </section>
      <JadwalForm initial={initial} />
    </div>
  );
}
