import { redirect } from "next/navigation";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import {
  countLiveGuests,
  getEventPackageLimit,
  listGuestGroups,
  listGuestsForEvent,
  type GuestStatus,
} from "@/lib/db/queries/guests";
import { GuestsClient } from "./client";

type SearchParams = {
  q?: string;
  group?: string;
  status?: string;
};

const VALID_STATUSES: GuestStatus[] = [
  "baru",
  "diundang",
  "dibuka",
  "hadir",
  "tidak_hadir",
];

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const groupId = params.group && params.group !== "all" ? params.group : null;
  const status =
    params.status && VALID_STATUSES.includes(params.status as GuestStatus)
      ? (params.status as GuestStatus)
      : null;

  const [guests, groups, limit, totalLive] = await Promise.all([
    listGuestsForEvent(current.event.id, {
      search: search || undefined,
      groupId,
      status,
    }),
    listGuestGroups(current.event.id),
    getEventPackageLimit(current.event.id),
    countLiveGuests(current.event.id),
  ]);

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <GuestsClient
        eventId={current.event.id}
        eventSlug={current.event.slug}
        guests={guests}
        groups={groups}
        limit={limit.limit}
        packageName={limit.packageName}
        totalLive={totalLive}
        filter={{ search, groupId, status }}
      />
    </main>
  );
}
