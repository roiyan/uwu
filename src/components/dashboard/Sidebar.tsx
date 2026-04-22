"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/lib/nav/dashboard-items";
import { signOutAction } from "@/lib/actions/auth";

type SidebarProps = {
  coupleLabel?: string | null;
  themeLabel?: string | null;
  previewHref?: string;
};

export function Sidebar({ coupleLabel, themeLabel, previewHref }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[260px] flex-col border-r border-[color:var(--border-ghost)] bg-surface-card px-5 py-6 lg:flex">
      <Link
        href="/dashboard"
        className="font-logo text-3xl bg-gradient-to-r from-brand-blue via-brand-lavender to-brand-pink bg-clip-text text-transparent"
      >
        uwu
      </Link>

      <div className="mt-1 text-xs text-ink-muted">
        {coupleLabel ?? "Belum ada acara"}
        {themeLabel && (
          <>
            {" "}• <span className="text-ink">{themeLabel}</span>
          </>
        )}
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {dashboardNav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const base =
            "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors";
          const stateClass = item.disabled
            ? "cursor-not-allowed text-ink-hint"
            : active
              ? "bg-navy-50 text-navy font-medium"
              : "text-ink hover:bg-surface-muted";

          const inner = (
            <>
              <span className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {item.badge && (
                <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold-dark">
                  {item.badge}
                </span>
              )}
            </>
          );

          return item.disabled ? (
            <span key={item.href} className={`${base} ${stateClass}`} aria-disabled>
              {inner}
            </span>
          ) : (
            <Link key={item.href} href={item.href} className={`${base} ${stateClass}`}>
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 border-t border-[color:var(--border-ghost)] pt-4">
        <Link
          href={previewHref ?? "#"}
          target={previewHref ? "_blank" : undefined}
          rel={previewHref ? "noreferrer" : undefined}
          aria-disabled={!previewHref}
          className={`block w-full rounded-full border border-[color:var(--border-medium)] px-4 py-2 text-center text-sm font-medium ${
            previewHref ? "text-navy hover:bg-surface-muted" : "text-ink-hint"
          }`}
        >
          👁 Pratinjau Situs
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-full px-4 py-2 text-center text-sm text-ink-muted hover:text-navy"
          >
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
