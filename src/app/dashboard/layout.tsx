import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { BottomTab } from "@/components/dashboard/BottomTab";

// Synchronous shell — children paint immediately. Auth + sidebar data both
// resolve inside Suspense boundaries so one slow query can't block the other
// half of the screen.
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface-base">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarWithData />
      </Suspense>
      <div className="flex flex-1 flex-col pb-20 lg:pb-0">{children}</div>
      <BottomTab />
    </div>
  );
}

async function SidebarWithData() {
  const user = await getSessionUserFast();
  if (!user) redirect("/login?next=/dashboard");

  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding/mempelai");

  const bundle = await getEventBundle(current.event.id);
  if (!bundle?.couple) redirect("/onboarding/mempelai");

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
          <div key={i} className="h-9 w-full animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    </aside>
  );
}
