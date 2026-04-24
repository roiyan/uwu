import { redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventMembers, profiles } from "@/lib/db/schema";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { SettingsTabs } from "./tabs";

type Tab = "akun" | "acara" | "budaya" | "kolaborator";

const VALID_TABS: Tab[] = ["akun", "acara", "budaya", "kolaborator"];

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

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

  // Active partner collaborators (pending + accepted). Revoked / expired
  // are hidden — the Kolaborator tab only surfaces live state.
  const collabRows = await db
    .select()
    .from(eventMembers)
    .where(
      and(
        eq(eventMembers.eventId, bundle.event.id),
        inArray(eventMembers.inviteStatus, ["pending", "accepted"]),
      ),
    )
    .orderBy(asc(eventMembers.invitedAt));

  const isOwner = bundle.event.ownerId === user.id;

  const params = await searchParams;
  const requested = params.tab as Tab | undefined;
  const active: Tab =
    requested && VALID_TABS.includes(requested) ? requested : "akun";

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
        owner={{
          fullName: profile?.fullName ?? null,
          email: user.email ?? profile?.email ?? "",
          isCurrentUser: isOwner,
        }}
        collaborators={collabRows.map((r) => ({
          id: r.id,
          invitedEmail: r.invitedEmail,
          invitedName: r.invitedName,
          acceptedEmail: r.acceptedEmail,
          inviteStatus: r.inviteStatus,
          inviteToken: r.inviteToken,
          invitedAt: r.invitedAt.toISOString(),
          expiresAt: r.expiresAt?.toISOString() ?? null,
          acceptedAt: r.acceptedAt?.toISOString() ?? null,
        }))}
        origin={appUrl()}
      />
    </main>
  );
}
