import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/shared/BrandLogo";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[color:var(--border-ghost)] bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <BrandLogo href="/admin" size="md" />
          <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy">
            Admin
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
