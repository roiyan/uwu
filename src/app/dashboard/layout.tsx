import type { ReactNode } from "react";
import { Suspense } from "react";
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
  // Minimal auth guard — this has to await because we can't stream a redirect.
  // Everything else (event/couple/theme lookup for the sidebar) runs inside a
  // Suspense boundary below so `children` renders in parallel with it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarWithData userId={user.id} />
      </Suspense>
      <div className="flex flex-1 flex-col pb-20 lg:pb-0">{children}</div>
      <BottomTab />
    </div>
  );
}

async function SidebarWithData({ userId }: { userId: string }) {
  const current = await getCurrentEventForUser(userId);
  if (!current) redirect("/onboarding/mempelai");

  const bundle = await getEventBundle(current.event.id);
  if (!bundle?.couple) redirect("/onboarding/mempelai");
  if (bundle.schedules.length === 0) redirect("/onboarding/jadwal");
  if (!bundle.event.themeId) redirect("/onboarding/tema");

  const couple = bundle.couple;
  const coupleLabel =
    couple.brideNickname && couple.groomNickname
      ? `${couple.brideNickname} & ${couple.groomNickname}`
      : bundle.event.title;

  return (
    <Sidebar
      coupleLabel={coupleLabel}
      themeLabel={bundle.theme?.name ?? null}
      previewHref="/preview"
    />
  );
}

function SidebarSkeleton() {
  return (
    <aside
      className="hidden w-[260px] flex-col px-5 py-6 lg:flex"
      style={{
        background: "linear-gradient(180deg, #1E3A5F 0%, #142840 100%)",
      }}
    >
      <div className="h-9 w-20 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-3 w-40 animate-pulse rounded bg-white/10" />
      <div className="mt-8 flex-1 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-full animate-pulse rounded-lg bg-white/5"
          />
        ))}
      </div>
    </aside>
  );
}
