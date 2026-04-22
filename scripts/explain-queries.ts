import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function explain(label: string, query: string) {
  console.log(`\n--- ${label} ---`);
  const rows = await sql.unsafe(`EXPLAIN (ANALYZE, BUFFERS) ${query}`);
  for (const r of rows) console.log(Object.values(r)[0]);
}

async function main() {
  const [anyEvent] = await sql`SELECT id, owner_id, slug FROM events LIMIT 1`;
  if (!anyEvent) {
    console.log("No events in DB; skipping.");
    process.exit(0);
  }
  const eventId = anyEvent.id as string;
  const userId = anyEvent.owner_id as string;
  const slug = anyEvent.slug as string;

  await explain(
    "getCurrentEventForUser",
    `SELECT e.*, t.*
       FROM events e
       LEFT JOIN themes t ON t.id = e.theme_id
       LEFT JOIN event_members em ON em.event_id = e.id AND em.user_id = '${userId}'
      WHERE e.deleted_at IS NULL
        AND (e.owner_id = '${userId}' OR em.user_id = '${userId}')
      ORDER BY e.created_at DESC
      LIMIT 1`,
  );

  await explain(
    "resolveEffectiveRole (auth guard)",
    `SELECT CASE WHEN e.owner_id = '${userId}' THEN 'owner' ELSE em.role::text END AS effective_role
       FROM events e
       LEFT JOIN event_members em ON em.event_id = e.id AND em.user_id = '${userId}'
      WHERE e.id = '${eventId}' AND e.deleted_at IS NULL
      LIMIT 1`,
  );

  await explain(
    "guest list with group join",
    `SELECT g.*, gg.name AS group_name, gg.color AS group_color
       FROM guests g
       LEFT JOIN guest_groups gg ON gg.id = g.group_id
      WHERE g.event_id = '${eventId}' AND g.deleted_at IS NULL
      ORDER BY g.created_at ASC`,
  );

  await explain(
    "RSVP stats aggregate",
    `SELECT rsvp_status, count(*)::int FROM guests
      WHERE event_id = '${eventId}' AND deleted_at IS NULL
      GROUP BY rsvp_status`,
  );

  await explain(
    "getPublishedEventBySlug",
    `SELECT * FROM events e
       LEFT JOIN themes t ON t.id = e.theme_id
      WHERE e.slug = '${slug}' AND e.is_published = true AND e.deleted_at IS NULL
      LIMIT 1`,
  );

  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end().catch(() => {});
  process.exit(1);
});
