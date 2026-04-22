import { redirect } from "next/navigation";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";

export default async function OnboardingIndex() {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");

  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding/mempelai");

  if (!bundle.couple) redirect("/onboarding/mempelai");
  if (bundle.schedules.length === 0) redirect("/onboarding/jadwal");
  if (!bundle.event.themeId) redirect("/onboarding/tema");
  redirect("/onboarding/selesai");
}
