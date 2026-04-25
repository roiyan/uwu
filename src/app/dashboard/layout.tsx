import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import { countLiveGuests } from "@/lib/db/queries/guests";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { BottomTab } from "@/components/dashboard/BottomTab";
import { MobileTopBar } from "@/components/dashboard/MobileTopBar";

// Synchronous shell — children paint immediately. Auth + sidebar data
// both resolve inside Suspense boundaries so one slow query can't
// block the other half of the screen.
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Mobile uses block flow with the MobileTopBar pinned at the top of
  // the content column and the BottomTab fixed at the bottom; the
  // desktop Sidebar is `hidden` on mobile so it costs zero layout
  // space. On lg+ the outer becomes a flex row and the Sidebar
  // occupies its 280px column.
  return (
    <div
      className="theme-dashboard relative min-h-screen lg:flex"
      style={{ background: "var(--d-bg-0)" }}
    >
      {/* Soft global glow orbs — kept very low opacity so content
          contrast remains AAA. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute -top-40 right-0 h-[520px] w-[520px] rounded-full opacity-[0.05] blur-[160px]"
          style={{ background: "var(--d-lilac)" }}
        />
        <div
          className="absolute bottom-0 left-1/4 h-[420px] w-[420px] rounded-full opacity-[0.05] blur-[160px]"
          style={{ background: "var(--d-peach)" }}
        />
      </div>

      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarHost />
      </Suspense>
      {/* Content column — flex column so the MobileTopBar can sit
          stickily at the top above {children} on mobile. */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <Suspense fallback={null}>
          <MobileTopBarHost />
        </Suspense>
        {children}
      </div>
      <BottomTab />
    </div>
  );
}

// Sidebar pulls the same data used by SidebarHost + MobileTopBarHost.
// We resolve once per host and don't share between them — Next dedups
// the underlying queries via React `cache()` inside getEventBundle.
async function resolveSidebarData() {
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
  const themeLabel = bundle.theme?.name ?? null;

  // Soft-fail to null so a slow/failing query still renders the
  // sidebar without a badge instead of breaking the layout.
  const tamuCount = await countLiveGuests(bundle.event.id).catch(() => null);

  return { coupleLabel, themeLabel, tamuCount };
}

async function SidebarHost() {
  const { coupleLabel, themeLabel, tamuCount } = await resolveSidebarData();
  return (
    <Sidebar
      coupleLabel={coupleLabel}
      themeLabel={themeLabel}
      previewHref="/preview"
      tamuCount={tamuCount}
    />
  );
}

async function MobileTopBarHost() {
  const { coupleLabel, themeLabel, tamuCount } = await resolveSidebarData();
  return (
    <MobileTopBar
      coupleLabel={coupleLabel}
      themeLabel={themeLabel}
      previewHref="/preview"
      tamuCount={tamuCount}
    />
  );
}

function SidebarSkeleton() {
  return (
    <aside
      className="hidden w-[280px] flex-col px-5 py-6 lg:flex"
      style={{ background: "var(--d-bg-1)" }}
    >
      <div className="h-9 w-20 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-4 w-40 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-2 h-3 w-28 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-8 flex-1 space-y-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded-[12px] bg-[var(--d-bg-2)]"
          />
        ))}
      </div>
    </aside>
  );
}
