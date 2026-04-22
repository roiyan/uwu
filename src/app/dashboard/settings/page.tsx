import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { SettingsTabs } from "./tabs";

type Tab = "akun" | "acara" | "budaya";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");
  const bundle = await getEventBundle(current.event.id);
  if (!bundle) redirect("/onboarding");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const params = await searchParams;
  const requested = params.tab as Tab | undefined;
  const active: Tab =
    requested === "acara" || requested === "budaya" ? requested : "akun";

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-navy">Pengaturan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Kelola akun Anda dan pengaturan acara.
        </p>
      </header>

      <SettingsTabs
        active={active}
        eventId={bundle.event.id}
        isPublished={bundle.event.isPublished}
        profile={{
          email: user.email ?? profile?.email ?? "",
          fullName: profile?.fullName ?? "",
          phone: profile?.phone ?? "",
        }}
        event={{
          title: bundle.event.title,
          slug: bundle.event.slug,
          musicUrl: bundle.event.musicUrl ?? "",
          culturalPreference: bundle.event.culturalPreference,
        }}
      />
    </main>
  );
}
