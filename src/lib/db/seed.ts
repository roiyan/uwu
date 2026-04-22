import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { packages, themes, profiles } from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL || !SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing env vars. Need DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const queryClient = postgres(DATABASE_URL, { prepare: false });
const db = drizzle(queryClient);
const admin = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PACKAGES = [
  {
    tier: "starter" as const,
    name: "Starter",
    priceIdr: 0,
    guestLimit: 25,
    whatsappEnabled: false,
    themeAccess: "basic",
    features: ["25 tamu", "3 tema dasar"],
  },
  {
    tier: "lite" as const,
    name: "Lite",
    priceIdr: 49000,
    guestLimit: 100,
    whatsappEnabled: true,
    themeAccess: "standard",
    features: ["100 tamu", "10 tema standar", "WhatsApp", "Amplop Digital"],
  },
  {
    tier: "pro" as const,
    name: "Pro",
    priceIdr: 149000,
    guestLimit: 300,
    whatsappEnabled: true,
    themeAccess: "premium",
    features: ["300 tamu", "Semua tema premium", "WA + Email", "Analytics"],
  },
  {
    tier: "premium" as const,
    name: "Premium",
    priceIdr: 349000,
    guestLimit: 500,
    whatsappEnabled: true,
    themeAccess: "premium",
    features: ["500 tamu", "Semua tema premium", "AI RSVP Assistant"],
  },
  {
    tier: "ultimate" as const,
    name: "Ultimate",
    priceIdr: 599000,
    guestLimit: 1000,
    whatsappEnabled: true,
    themeAccess: "custom",
    features: ["1000 tamu", "Tema eksklusif", "Custom Domain", "Dedicated Manager"],
  },
];

const THEMES = [
  {
    slug: "sakura-dreams",
    name: "Sakura Dreams",
    description: "Pink-pastel dengan aksen sakura, cocok untuk resepsi taman.",
    tier: "basic",
    previewImageUrl: null,
    config: {
      palette: { primary: "#E8A0A0", secondary: "#FAF6F1" },
      sections: ["hero", "couple", "schedule", "rsvp"],
    },
  },
  {
    slug: "navy-elegance",
    name: "Navy Elegance",
    description: "Navy-ivory formal untuk akad dan resepsi indoor.",
    tier: "standard",
    previewImageUrl: null,
    config: {
      palette: { primary: "#1E3A5F", secondary: "#FAF6F1", accent: "#D4A574" },
      sections: ["hero", "couple", "story", "schedule", "gallery", "rsvp"],
    },
  },
  {
    slug: "rose-gold-luxe",
    name: "Rose Gold Luxe",
    description: "Premium rose-gold dengan animasi halus.",
    tier: "premium",
    previewImageUrl: null,
    config: {
      palette: { primary: "#C06070", secondary: "#FFF8F2", accent: "#D4A574" },
      sections: ["hero", "couple", "story", "schedule", "gallery", "gifts", "rsvp"],
    },
  },
];

async function upsertUser(email: string, password: string, fullName: string, role: "user" | "admin") {
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const hit = existing?.users.find((u) => u.email === email);

  let userId: string;
  if (hit) {
    userId = hit.id;
    await admin.auth.admin.updateUserById(userId, { password, user_metadata: { full_name: fullName } });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
    userId = data.user.id;
  }

  await db
    .insert(profiles)
    .values({ id: userId, email, fullName, role })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { email, fullName, role, updatedAt: sql`now()` },
    });

  return userId;
}

async function main() {
  console.log("→ Seeding packages...");
  for (const p of PACKAGES) {
    await db
      .insert(packages)
      .values(p)
      .onConflictDoUpdate({ target: packages.tier, set: p });
  }

  console.log("→ Seeding themes...");
  for (const t of THEMES) {
    await db
      .insert(themes)
      .values(t)
      .onConflictDoUpdate({ target: themes.slug, set: t });
  }

  console.log("→ Seeding users...");
  const testId = await upsertUser(
    "test@uwu.id",
    "test12345",
    "Test Couple",
    "user",
  );
  const adminId = await upsertUser(
    "admin@uwu.id",
    "admin12345",
    "UWU Admin",
    "admin",
  );

  console.log("\n✓ Seed complete");
  console.log(`  test user:  test@uwu.id  / test12345   (id=${testId})`);
  console.log(`  admin user: admin@uwu.id / admin12345  (id=${adminId})`);

  await queryClient.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await queryClient.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
