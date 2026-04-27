export type DashboardNavItem = {
  href: string;
  label: string;
  icon: string; // emoji placeholder until we wire a proper icon set
  disabled?: boolean;
  badge?: string;
  primary?: boolean; // shown in mobile bottom tab
};

export const dashboardNav: DashboardNavItem[] = [
  { href: "/dashboard",           label: "Beranda",          icon: "🏠", primary: true },
  { href: "/dashboard/website",   label: "Editor Undangan",  icon: "📝", primary: true },
  { href: "/dashboard/guests",    label: "Tamu",             icon: "👥", primary: true },
  { href: "/dashboard/messages",  label: "Kirim Undangan",   icon: "📨", primary: true },
  { href: "/dashboard/analytics", label: "Jejak Undangan",   icon: "📊" },
  { href: "/dashboard/checkin",   label: "Sambut Tamu",      icon: "✅" },
  { href: "/dashboard/amplop",    label: "Tanda Kasih",      icon: "🎁" },
  { href: "/dashboard/settings",  label: "Pengaturan",       icon: "⚙️" },
  { href: "/dashboard/packages",  label: "Paket",            icon: "📦" },
];
