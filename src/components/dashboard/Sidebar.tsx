"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dashboardNav } from "@/lib/nav/dashboard-items";
import { signOutAction } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/shared/BrandLogo";

const COLLAPSE_STORAGE_KEY = "uwu-sidebar-collapsed";

type SidebarProps = {
  coupleLabel?: string | null;
  themeLabel?: string | null;
  packageLabel?: string | null;
  previewHref?: string;
  /** Live guest count, rendered as the Tamu badge. Hidden when null. */
  tamuCount?: number | null;
  /** Drives the publish status dot above the preview button. `null`
   *  hides the row entirely (used by mobile drawer where the
   *  Beranda banner already covers it). */
  isPublished?: boolean | null;
  /** Adds the responsive `lg:flex` toggle. When rendered as a mobile
   *  drawer (via SidebarMobileDrawer below), pass false. */
  responsive?: boolean;
  /** Optional close handler shown only when the sidebar is rendered
   *  as a mobile drawer. */
  onCloseMobile?: () => void;
};

const ACCOUNT_GROUP = new Set([
  "/dashboard/settings",
  "/dashboard/packages",
]);

const HARI_H_GROUP = new Set([
  "/dashboard/checkin",
  "/dashboard/amplop",
]);

// SVG icon paths per nav href. 24×24 viewBox, stroke-width 1.5, no fill.
// Active state colours via `currentColor` so we can swap by parent text colour.
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
  "/dashboard/analytics": (
    <path d="M3 20h18M6 20V10M11 20V4M16 20v-7M21 20v-4" />
  ),
  "/dashboard/checkin": (
    <path d="M9 11l3 3 8-8M3 7l9 9 9-9" />
  ),
  "/dashboard/amplop": (
    <>
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M3 8l9-5 9 5M12 13v8M3 14h18" />
    </>
  ),
  "/dashboard/settings": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </>
  ),
  "/dashboard/packages": (
    <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
  ),
};

function NavIcon({
  href,
  active,
}: {
  href: string;
  active: boolean;
}) {
  const path = NAV_ICONS[href];
  if (!path) return null;
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      style={{ opacity: active ? 1 : 0.7 }}
      aria-hidden
    >
      {path}
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Splits a label like "Vivi & Roiyan" into ("Vivi", "& Roiyan") so the
 * second half can render in Fraunces italic coral. Falls back to the
 * full string in normal weight when there's no &.
 */
function splitCoupleLabel(label: string): { left: string; right: string | null } {
  const idx = label.indexOf("&");
  if (idx === -1) return { left: label, right: null };
  return {
    left: label.slice(0, idx).trim(),
    right: label.slice(idx).trim(),
  };
}

export function Sidebar({
  coupleLabel,
  themeLabel,
  packageLabel,
  previewHref,
  tamuCount,
  isPublished,
  responsive = true,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  // Desktop-only collapse. Mobile drawer (responsive=false) ignores
  // this and always renders full-width. Hydrate from localStorage in
  // an effect so the SSR markup matches the initial CSR markup
  // (always expanded), then snap to the persisted preference.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!responsive) return;
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
    } catch {
      // Private browsing throws on storage access — fall through.
    }
  }, [responsive]);
  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };
  const isCollapsed = responsive && collapsed;

  // Width morphs between 280px (expanded) and 68px (collapsed). Mobile
  // drawer (responsive=false) keeps the full 280px so the drawer's
  // labels stay readable.
  //
  // CRITICAL: width is set via inline `style.width`, NOT a Tailwind
  // class. Earlier we used `lg:w-[68px]` / `lg:w-[280px]` in a ternary
  // and Tailwind 4's content scanner dropped both rules from the
  // build output, so the sidebar never resized in production. Inline
  // style sidesteps the JIT entirely and renders the value straight
  // from React state.
  const sidebarClass = [
    // `group` enables `group-hover:opacity-100` on the toggle button
    // — keeps the chevron faint by default but lights up the moment
    // the operator's cursor enters the rail.
    "group relative flex-col overflow-hidden",
    responsive
      ? "hidden lg:sticky lg:top-0 lg:flex lg:h-screen"
      : "flex h-full",
  ].join(" ");
  const sidebarWidth = responsive ? (isCollapsed ? 68 : 280) : 280;

  const couple = splitCoupleLabel(coupleLabel ?? "Cerita belum dimulai");
  // Badge under the couple label is the package tier ("Starter", "Silk",
  // ...) — what the couple paid for. We used to surface the theme name
  // instead, but that was redundant with the in-context theme picker
  // and read confusingly as if the theme were the active subscription.
  const metaLabel = (packageLabel ?? "").toUpperCase();

  // Publish the width to the layout via a CSS variable on the
  // document root. The skeleton fallback (rendered before this
  // component hydrates, and re-rendered on every server stream)
  // reads `var(--sidebar-w)` so it matches the persisted preference
  // instead of snapping back to 280px on every navigation. The
  // matching <script> in layout.tsx initializes the var
  // synchronously before first paint.
  useEffect(() => {
    if (!responsive) return;
    document.documentElement.style.setProperty(
      "--sidebar-w",
      `${sidebarWidth}px`,
    );
  }, [responsive, sidebarWidth]);

  return (
    <aside
      data-collapsed={isCollapsed ? "true" : "false"}
      className={sidebarClass}
      style={{
        background: "var(--d-bg-1)",
        color: "var(--d-ink)",
        width: `${sidebarWidth}px`,
        transition: "width 200ms ease-out",
      }}
    >
      {/* Top-left coral glow per design ref */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "var(--d-coral)",
          filter: "blur(110px)",
          opacity: 0.1,
          top: -80,
          left: -80,
        }}
      />

      {/* Collapse toggle — only on desktop. Bigger (32px) coral-bordered
          pill INSIDE the rail rather than floating on the edge so it's
          easier to discover and click. Faint by default (opacity-40);
          lights up on hover anywhere over the sidebar via group-hover.
          When collapsed the rail is 68px wide so we center the pill
          horizontally instead of pinning it to the right.
          Mobile drawer hides this — it has its own close button. */}
      {responsive && !isCollapsed && (
        <button
          type="button"
          onClick={toggleCollapse}
          aria-label="Perkecil menu"
          aria-pressed={false}
          title="Perkecil menu"
          className={[
            "absolute right-[16px] top-[58px] z-10",
            "hidden h-8 w-8 items-center justify-center",
            "rounded-full border border-[var(--d-coral)]",
            "bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]",
            "opacity-40 transition-all duration-200",
            "group-hover:opacity-100",
            "hover:scale-105 hover:bg-[rgba(240,160,156,0.18)]",
            "lg:flex",
          ].join(" ")}
        >
          <ChevronIcon direction="left" />
        </button>
      )}

      <div className="relative flex h-full flex-col">
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu"
            className="d-mono absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-2)]"
          >
            <CloseIcon />
            Tutup
          </button>
        )}

        {/* Brand section. In collapsed mode we shrink to a centered
            BrandLogo (icon variant) and hide the couple + meta labels
            so the rail can sit at 68px. */}
        <div
          className={`border-b border-[var(--d-line)] ${
            isCollapsed ? "px-3 pb-4 pt-5" : "px-6 pb-6 pt-7"
          }`}
        >
          <div
            className={`flex items-center gap-2 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <BrandLogo
              href="/dashboard"
              size={isCollapsed ? "sm" : "md"}
            />
          </div>
          {!isCollapsed && (
            <>
              <p className="mt-4 truncate text-[20px] leading-tight">
                <span className="font-light text-[var(--d-ink)]">
                  {couple.left}
                </span>
                {couple.right && (
                  <span className="d-serif italic text-[var(--d-coral)]">
                    {" "}
                    {couple.right}
                  </span>
                )}
              </p>
              {metaLabel && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--d-gold)" }}
                  />
                  <p className="d-mono truncate text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
                    {metaLabel}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav
          className={`flex-1 space-y-0.5 overflow-y-auto py-5 ${
            isCollapsed ? "px-2" : "px-3"
          }`}
        >
          {/* Expand-toggle row — only in collapsed mode. Renders in
              normal flow at the top of the nav list so it can't
              visually overlap the page content (the previous absolute
              "left-1/2" pill nudged outside the 68px rail clipping
              rect on some browser zoom levels). Full-width tap
              target, 44px tall to match touch guidelines. */}
          {responsive && isCollapsed && (
            <div className="mb-1.5 border-b border-[var(--d-line)] pb-2">
              <button
                type="button"
                onClick={toggleCollapse}
                aria-label="Perbesar menu"
                aria-pressed
                title="Perbesar menu"
                className="flex w-full items-center justify-center rounded-[10px] py-2.5 text-[var(--d-coral)] transition-colors hover:bg-[rgba(240,160,156,0.10)]"
              >
                <ChevronIcon direction="right" />
              </button>
            </div>
          )}

          {dashboardNav.map((item, idx) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            const prev = dashboardNav[idx - 1];
            const showHariSeparator =
              prev && !HARI_H_GROUP.has(prev.href) && HARI_H_GROUP.has(item.href);
            const showAccountSeparator =
              prev && !ACCOUNT_GROUP.has(prev.href) && ACCOUNT_GROUP.has(item.href);

            // Per-item badge resolution.
            // - Locked items (Check-in / Gifts) → "SEGERA"
            // - Tamu → live count (when provided)
            // - Paket → "UPGRADE" (peach pill)
            // - Everyone else → no badge
            let badgeNode: React.ReactNode = null;
            if (item.disabled) {
              badgeNode = <SoonBadge />;
            } else if (
              item.href === "/dashboard/guests" &&
              typeof tamuCount === "number" &&
              tamuCount > 0
            ) {
              badgeNode = <CountBadge value={tamuCount} />;
            } else if (item.href === "/dashboard/packages") {
              badgeNode = <UpgradeBadge />;
            }

            return (
              <div key={item.href}>
                {/* Section separators are decorative labels — drop the
                    text in collapsed mode but keep a thin divider so
                    the visual rhythm is preserved. */}
                {showHariSeparator &&
                  (isCollapsed ? (
                    <div
                      className="mx-3 my-3 h-px bg-[var(--d-line)]"
                      aria-hidden
                    />
                  ) : (
                    <NavSeparator label="Hari H" />
                  ))}
                {showAccountSeparator &&
                  (isCollapsed ? (
                    <div
                      className="mx-3 my-3 h-px bg-[var(--d-line)]"
                      aria-hidden
                    />
                  ) : (
                    <NavSeparator label="Akun" />
                  ))}
                <NavItem
                  href={item.href}
                  label={item.label}
                  badge={badgeNode}
                  disabled={item.disabled}
                  active={active}
                  collapsed={isCollapsed}
                  onClick={onCloseMobile}
                />
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={`space-y-3 border-t border-[var(--d-line)] ${
            isCollapsed ? "px-2 py-4" : "px-5 py-5"
          }`}
        >
          {isPublished !== null && isPublished !== undefined && (
            <PublishStatusRow
              isPublished={isPublished}
              collapsed={isCollapsed}
            />
          )}
          <Link
            href={previewHref ?? "#"}
            target={previewHref ? "_blank" : undefined}
            rel={previewHref ? "noreferrer" : undefined}
            aria-disabled={!previewHref}
            onClick={onCloseMobile}
            title={isCollapsed ? "Intip Undangan" : undefined}
            className={`flex w-full items-center justify-center gap-2 rounded-[10px] border ${
              isCollapsed ? "py-2" : "px-4 py-2.5"
            } text-[12.5px] transition-colors ${
              previewHref
                ? "border-[var(--d-line-strong)] text-[var(--d-ink)] hover:bg-[var(--d-bg-2)]"
                : "cursor-not-allowed border-[var(--d-line)] text-[var(--d-ink-faint)]"
            }`}
          >
            <EyeIcon />
            {!isCollapsed && "Intip Undangan"}
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              title={isCollapsed ? "Keluar" : undefined}
              className={`d-mono w-full rounded-full text-center transition-colors ${
                isCollapsed
                  ? "py-1.5 text-[10px] text-[var(--d-ink-faint)] hover:text-[var(--d-coral)]"
                  : "px-4 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)] hover:text-[var(--d-coral)]"
              }`}
            >
              {isCollapsed ? "↩" : "Keluar"}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

// Publish status row sitting in the sidebar footer. Always-on shortcut
// to the Acara → Publikasi section so couples discover the publish
// toggle without hunting through Pengaturan. Pulses red-coral when
// unpublished so it reads as "needs attention" in peripheral vision.
function PublishStatusRow({
  isPublished,
  collapsed,
}: {
  isPublished: boolean;
  collapsed: boolean;
}) {
  const dotColor = isPublished ? "var(--d-green)" : "var(--d-coral)";
  const glow = isPublished
    ? "0 0 6px rgba(126,211,164,0.55)"
    : "0 0 8px rgba(240,160,156,0.6)";
  const label = isPublished ? "Sudah tayang" : "Belum tayang";
  const href = "/dashboard/settings?tab=acara#publikasi";
  const dot = (
    <span
      aria-hidden
      className={isPublished ? undefined : "uwu-pulse"}
      style={{
        display: "inline-block",
        width: collapsed ? 8 : 6,
        height: collapsed ? 8 : 6,
        borderRadius: "50%",
        background: dotColor,
        boxShadow: glow,
        flexShrink: 0,
      }}
    />
  );

  if (collapsed) {
    return (
      <Link
        href={href}
        title={isPublished ? label : `${label} — klik untuk tayangkan`}
        className="flex w-full items-center justify-center py-1.5"
      >
        {dot}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="d-mono flex items-center gap-2 rounded-[8px] px-1 py-1 text-[10px] uppercase tracking-[0.22em] transition-colors hover:bg-[var(--d-bg-2)]"
      style={{ color: dotColor, opacity: 0.85 }}
    >
      {dot}
      {label}
    </Link>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "right" ? (
        <path d="M9 18l6-6-6-6" />
      ) : (
        <path d="M15 18l-6-6 6-6" />
      )}
    </svg>
  );
}

function NavSeparator({ label }: { label: string }) {
  return (
    <p className="d-mono mt-5 mb-2 px-3 text-[9px] uppercase tracking-[0.32em] text-[var(--d-ink-faint)]">
      {label}
    </p>
  );
}

function NavItem({
  href,
  label,
  badge,
  disabled,
  active,
  collapsed = false,
  onClick,
}: {
  href: string;
  label: string;
  badge?: React.ReactNode;
  disabled?: boolean;
  active: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  // Active row: 2px coral left border + gradient bg + coral icon.
  // In collapsed mode the row centers a single icon at 44px height
  // and drops the text + left-border affordance (border would be
  // visually noisy on a 52px-wide rail).
  const base =
    "group relative flex items-center rounded-[10px] text-[13px] transition-colors";
  const layout = collapsed
    ? "justify-center py-2.5"
    : "justify-between py-2.5";
  const padding = collapsed
    ? "px-0"
    : active
      ? "pl-[14px] pr-3"
      : "pl-4 pr-3";
  const stateClass = disabled
    ? "cursor-not-allowed text-[var(--d-ink-faint)]"
    : active
      ? "text-[var(--d-ink)]"
      : "text-[var(--d-ink-dim)] hover:bg-[var(--d-bg-2)] hover:text-[var(--d-ink)]";

  const activeStyle: React.CSSProperties | undefined =
    active && !collapsed
      ? {
          borderLeft: "2px solid var(--d-coral)",
          background:
            "linear-gradient(90deg, rgba(240,160,156,0.12) 0%, transparent 100%)",
        }
      : active && collapsed
        ? {
            background: "rgba(240,160,156,0.12)",
          }
        : undefined;

  const inner = collapsed ? (
    <>
      <span
        className="flex items-center justify-center"
        style={{ color: active ? "var(--d-coral)" : undefined }}
      >
        <NavIcon href={href} active={active} />
      </span>
      {/* Visible-on-hover tooltip — sighted users with a collapsed
          rail need to know what each icon does. Native `title` is
          unreliable on touch devices and doesn't render on focus,
          so we ship our own pill. pointer-events-none keeps it from
          stealing clicks when the icon is hovered. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border bg-[var(--d-bg-1)] px-2.5 py-1 text-[11px] font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{
          borderColor: "var(--d-line)",
          color: "var(--d-ink)",
          boxShadow: "0 6px 18px rgba(0,0,0,0.32)",
          zIndex: 50,
        }}
      >
        {label}
      </span>
    </>
  ) : (
    <>
      <span
        className="flex items-center gap-3"
        style={{ color: active ? "var(--d-coral)" : undefined }}
      >
        <NavIcon href={href} active={active} />
        <span
          className={active ? "font-medium text-[var(--d-ink)]" : undefined}
        >
          {label}
        </span>
      </span>
      {badge}
    </>
  );

  if (disabled) {
    return (
      <span
        className={`${base} ${layout} ${padding} ${stateClass} ${
          collapsed ? "min-h-[44px]" : ""
        }`}
        style={activeStyle}
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        aria-disabled
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${base} ${layout} ${padding} ${stateClass} ${
        collapsed ? "min-h-[44px]" : ""
      }`}
      style={activeStyle}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      {inner}
    </Link>
  );
}

function SoonBadge() {
  return (
    <span className="d-mono rounded bg-white/5 px-2 py-0.5 text-[8.5px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
      Akan Hadir ✨
    </span>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="d-mono rounded bg-[rgba(240,160,156,0.16)] px-2 py-0.5 text-[8.5px] tracking-[0.18em] text-[var(--d-coral)]">
      {value}
    </span>
  );
}

function UpgradeBadge() {
  return (
    <span className="d-mono rounded bg-[rgba(244,184,163,0.12)] px-2 py-0.5 text-[8.5px] uppercase tracking-[0.18em] text-[var(--d-peach)]">
      Upgrade
    </span>
  );
}
