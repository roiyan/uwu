"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/lib/nav/dashboard-items";
import { signOutAction } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/shared/BrandLogo";

type SidebarProps = {
  coupleLabel?: string | null;
  themeLabel?: string | null;
  previewHref?: string;
};

// The nav is grouped with a subtle divider before Settings/Paket so the list
// feels less flat — product items on top, account items on the bottom.
const SETTINGS_GROUP_IDS = new Set([
  "/dashboard/settings",
  "/dashboard/packages",
]);

export function Sidebar({ coupleLabel, themeLabel, previewHref }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden w-[260px] flex-col px-5 py-6 lg:flex"
      style={{
        background: "linear-gradient(180deg, #1E3A5F 0%, #142840 100%)",
        color: "#F5F5F7",
      }}
    >
      <BrandLogo href="/dashboard" size="lg" />

      <div className="mt-2 space-y-0.5">
        <p className="truncate text-xs font-medium text-white/85">
          {coupleLabel ?? "Belum ada acara"}
        </p>
        {themeLabel && (
          <p className="truncate text-[11px] text-white/45">{themeLabel}</p>
        )}
      </div>

      <nav className="mt-8 flex-1 space-y-0.5">
        {dashboardNav.map((item, idx) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const base =
            "group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors";
          const stateClass = item.disabled
            ? "cursor-not-allowed text-white/35"
            : active
              ? "bg-white/10 text-white font-medium backdrop-blur"
              : "text-white/75 hover:bg-white/5 hover:text-white";

          const prev = dashboardNav[idx - 1];
          const needsDivider =
            prev && !SETTINGS_GROUP_IDS.has(prev.href) && SETTINGS_GROUP_IDS.has(item.href);

          const inner = (
            <>
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full"
                  style={{ background: "var(--color-brand-blue)" }}
                  aria-hidden
                />
              )}
              <span className="flex items-center gap-3">
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {item.badge && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/60">
                  {item.badge}
                </span>
              )}
            </>
          );

          const node = item.disabled ? (
            <span key={item.href} className={`${base} ${stateClass}`} aria-disabled>
              {inner}
            </span>
          ) : (
            <Link key={item.href} href={item.href} className={`${base} ${stateClass}`}>
              {inner}
            </Link>
          );

          return needsDivider ? (
            <div key={item.href}>
              <hr className="my-2 border-white/10" aria-hidden />
              {node}
            </div>
          ) : (
            node
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
        <Link
          href={previewHref ?? "#"}
          target={previewHref ? "_blank" : undefined}
          rel={previewHref ? "noreferrer" : undefined}
          aria-disabled={!previewHref}
          className={`flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-center text-sm font-medium transition-colors ${
            previewHref
              ? "border-white/25 text-white hover:bg-white/10"
              : "cursor-not-allowed border-white/10 text-white/40"
          }`}
        >
          <span aria-hidden>👁</span> Pratinjau Situs
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-full px-4 py-2 text-center text-sm text-white/50 transition-colors hover:text-white"
          >
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
