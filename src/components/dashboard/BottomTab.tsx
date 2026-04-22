"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/lib/nav/dashboard-items";

export function BottomTab() {
  const pathname = usePathname();
  const primary = dashboardNav.filter((i) => i.primary).slice(0, 4);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-[color:var(--border-ghost)] bg-surface-card lg:hidden">
      {primary.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] ${
              active ? "text-navy font-medium" : "text-ink-muted"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <Link
        href="/dashboard/more"
        className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] ${
          pathname.startsWith("/dashboard/more") ? "text-navy font-medium" : "text-ink-muted"
        }`}
      >
        <span className="text-base">⋯</span>
        <span>Lainnya</span>
      </Link>
    </nav>
  );
}
