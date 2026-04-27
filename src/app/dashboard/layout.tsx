import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser, getEventBundle } from "@/lib/db/queries/events";
import {
  countLiveGuests,
  getEventPackageLimit,
} from "@/lib/db/queries/guests";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { BottomTab } from "@/components/dashboard/BottomTab";
import { MobileTopBar } from "@/components/dashboard/MobileTopBar";

// Reads the persisted collapse preference and stamps `--sidebar-w` on
// <html> BEFORE first paint, so both the SidebarSkeleton (Suspense
// fallback) and the real Sidebar render at the correct width on
// reload. Without this, every navigation that re-streams the
// SidebarHost flashes back to 280px before the client component
// hydrates and snaps to the persisted width.
const SIDEBAR_INIT_SCRIPT = `
(function(){try{var c=localStorage.getItem('uwu-sidebar-collapsed')==='true';
document.documentElement.style.setProperty('--sidebar-w',c?'68px':'280px');}
catch(e){}})();
`;

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
      <script
        dangerouslySetInnerHTML={{ __html: SIDEBAR_INIT_SCRIPT }}
      />
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
  // Soft-fail to null on both fans so a slow/failing query still
  // renders the sidebar without a badge instead of breaking the layout.
  const [tamuCount, pkg] = await Promise.all([
    countLiveGuests(bundle.event.id).catch(() => null),
    getEventPackageLimit(bundle.event.id).catch(
      () => ({ packageName: null as string | null }),
    ),
  ]);
  const packageLabel = pkg?.packageName ?? null;

  return { coupleLabel, packageLabel, tamuCount };
}

async function SidebarHost() {
  const { coupleLabel, packageLabel, tamuCount } = await resolveSidebarData();
  return (
    <Sidebar
      coupleLabel={coupleLabel}
      packageLabel={packageLabel}
      previewHref="/preview"
      tamuCount={tamuCount}
    />
  );
}

async function MobileTopBarHost() {
  const { coupleLabel, packageLabel, tamuCount } = await resolveSidebarData();
  return (
    <MobileTopBar
      coupleLabel={coupleLabel}
      packageLabel={packageLabel}
      previewHref="/preview"
      tamuCount={tamuCount}
    />
  );
}

function SidebarSkeleton() {
  return (
    <aside
      className="hidden flex-col overflow-hidden px-5 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen"
      style={{
        background: "var(--d-bg-1)",
        // Read from --sidebar-w (set by SIDEBAR_INIT_SCRIPT pre-paint).
        // Falls back to 280px when the var is unset (first-ever visit).
        width: "var(--sidebar-w, 280px)",
      }}
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
