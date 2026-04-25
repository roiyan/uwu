"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/lib/nav/dashboard-items";

// SVG paths per nav href, mirroring the desktop sidebar's icon set.
// 24×24 viewBox, stroke-linecap/linejoin round; rendered at 20×20.
const NAV_ICONS: Record<string, React.ReactNode> = {
  "/dashboard": (
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V9.5z" />
  ),
  "/dashboard/website": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 4v5" />
    </>
  ),
  "/dashboard/guests": (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0112 0M16 11a3 3 0 100-6M21 20a6 6 0 00-4-5.66" />
    </>
  ),
  "/dashboard/messages": (
    <path d="M3 7l9 6 9-6M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7a2 2 0 012-2h14a2 2 0 012 2" />
  ),
};

const MORE_ICON = (
  <>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </>
);

function TabIcon({ path, active }: { path: React.ReactNode; active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        color: active ? "var(--d-coral)" : "var(--d-ink-dim)",
      }}
      aria-hidden
    >
      {path}
    </svg>
  );
}

export function BottomTab() {
  const pathname = usePathname();
  const primary = dashboardNav.filter((i) => i.primary).slice(0, 4);
  const moreActive = pathname.startsWith("/dashboard/more");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-[var(--d-line)] backdrop-blur lg:hidden"
      style={{ background: "rgba(12, 12, 21, 0.92)" }}
      aria-label="Navigasi utama"
    >
      {primary.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-center"
          >
            <TabIcon
              path={NAV_ICONS[item.href] ?? null}
              active={active}
            />
            <span
              className={`d-mono text-[8px] uppercase tracking-[0.16em] ${
                active
                  ? "font-medium text-[var(--d-coral)]"
                  : "text-[var(--d-ink-faint)]"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
      <Link
        href="/dashboard/more"
        className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-center"
      >
        <TabIcon path={MORE_ICON} active={moreActive} />
        <span
          className={`d-mono text-[8px] uppercase tracking-[0.16em] ${
            moreActive
              ? "font-medium text-[var(--d-coral)]"
              : "text-[var(--d-ink-faint)]"
          }`}
        >
          Lainnya
        </span>
      </Link>
    </nav>
  );
}
