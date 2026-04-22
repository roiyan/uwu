import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { BottomTab } from "@/components/dashboard/BottomTab";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");

  const bundle = await getEventBundle(current.event.id);
  if (!bundle?.couple) redirect("/onboarding/mempelai");
  if (bundle && bundle.schedules.length === 0) redirect("/onboarding/jadwal");
  if (bundle && !bundle.event.themeId) redirect("/onboarding/tema");

  const couple = bundle.couple;
  const coupleLabel =
    couple.brideNickname && couple.groomNickname
      ? `${couple.brideNickname} & ${couple.groomNickname}`
      : bundle.event.title;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        coupleLabel={coupleLabel}
        themeLabel={bundle.theme?.name ?? null}
        previewHref="/preview"
      />
      <div className="flex flex-1 flex-col pb-20 lg:pb-0">{children}</div>
      <BottomTab />
    </div>
  );
}
