import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { BottomTab } from "@/components/dashboard/BottomTab";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar coupleLabel={null} themeLabel={null} />
      <div className="flex flex-1 flex-col pb-20 lg:pb-0">{children}</div>
      <BottomTab />
    </div>
  );
}
