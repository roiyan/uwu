import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

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
          <Link
            href="/admin"
            className="font-logo text-2xl bg-gradient-to-r from-brand-blue via-brand-lavender to-brand-pink bg-clip-text text-transparent"
          >
            uwu
          </Link>
          <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy">
            Admin
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
