import type { ReactNode } from "react";
import { PublicNavbar, PublicBottomTab } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <PublicNavbar />
      <div className="flex-1">{children}</div>
      <PublicFooter />
      <PublicBottomTab />
    </div>
  );
}
