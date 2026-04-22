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
  { href: "/dashboard/website",   label: "Website Editor",   icon: "📝", primary: true },
  { href: "/dashboard/guests",    label: "Tamu",             icon: "👥", primary: true },
  { href: "/dashboard/messages",  label: "Kirim Undangan",   icon: "📨", primary: true },
  { href: "/dashboard/analytics", label: "Analytics",        icon: "📊" },
  { href: "/dashboard/checkin",   label: "Check-in",         icon: "✅", disabled: true, badge: "Segera Hadir" },
  { href: "/dashboard/gifts",     label: "Amplop & Hadiah",  icon: "🎁", disabled: true, badge: "Segera Hadir" },
  { href: "/dashboard/settings",  label: "Pengaturan",       icon: "⚙️" },
  { href: "/dashboard/packages",  label: "Paket",            icon: "📦" },
];
