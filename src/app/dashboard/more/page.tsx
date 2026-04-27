import Link from "next/link";
import { dashboardNav } from "@/lib/nav/dashboard-items";
import { signOutAction } from "@/lib/actions/auth";

// Same icon set as the dashboard sidebar — kept locally so this page
// stays a server component without importing the client Sidebar.
const NAV_ICONS: Record<string, React.ReactNode> = {
  "/dashboard/analytics": (
    <path d="M3 20h18M6 20V10M11 20V4M16 20v-7M21 20v-4" />
  ),
  "/dashboard/checkin": <path d="M9 11l3 3 8-8M3 7l9 9 9-9" />,
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

function ItemIcon({
  href,
  disabled,
}: {
  href: string;
  disabled?: boolean;
}) {
  const path = NAV_ICONS[href];
  if (!path) return null;
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
      className="shrink-0"
      style={{
        color: disabled ? "var(--d-ink-faint)" : "var(--d-coral)",
        opacity: disabled ? 0.6 : 1,
      }}
      aria-hidden
    >
      {path}
    </svg>
  );
}

export default function MoreMenuPage() {
  const extras = dashboardNav.filter((i) => !i.primary);
  return (
    <main className="flex-1 px-5 py-8 lg:px-10">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-px w-10"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
            }}
          />
          <p className="d-eyebrow">Menu Lainnya</p>
        </div>
        <h1 className="d-serif mt-3 text-[32px] font-extralight leading-[1.1] tracking-[-0.01em] text-[var(--d-ink)]">
          Menu{" "}
          <em className="d-serif italic text-[var(--d-coral)]">tambahan</em>.
        </h1>
        <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
          Pintasan ke pengaturan, paket, dan fitur yang akan tersedia
          segera.
        </p>
      </header>

      <ul className="grid gap-3 md:grid-cols-2">
        {extras.map((item) => {
          const inner = (
            <div className="flex items-center justify-between rounded-[14px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-5 transition-colors hover:bg-[var(--d-bg-2)]">
              <div className="flex items-center gap-3">
                <ItemIcon href={item.href} disabled={item.disabled} />
                <div>
                  <p className="text-[14px] font-medium text-[var(--d-ink)]">
                    {item.label}
                  </p>
                  {item.badge && (
                    <span className="d-mono mt-1 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[8px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[var(--d-ink-faint)]">›</span>
            </div>
          );
          if (item.disabled) {
            return (
              <li key={item.href} className="cursor-not-allowed opacity-60">
                <div aria-disabled>{inner}</div>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link href={item.href}>{inner}</Link>
            </li>
          );
        })}
      </ul>

      {/* Logout — matches the desktop sidebar footer so mobile users
          have a clear way out. Submits the existing signOutAction. */}
      <div className="mt-8 border-t border-[var(--d-line)] pt-6">
        <form action={signOutAction}>
          <button
            type="submit"
            className="d-mono w-full rounded-full px-4 py-3 text-center text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)] transition-colors hover:text-[var(--d-coral)]"
          >
            Keluar
          </button>
        </form>
      </div>
    </main>
  );
}
