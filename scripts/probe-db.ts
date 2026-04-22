import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const [{ tables }] = await sql`
      select string_agg(table_name, ', ' order by table_name) as tables
      from information_schema.tables
      where table_schema = 'public'
    `;
    console.log("public tables:", tables);

    const [{ pkg }] = await sql`select count(*)::int as pkg from packages`;
    const [{ thm }] = await sql`select count(*)::int as thm from themes`;
    const [{ prf }] = await sql`select count(*)::int as prf from profiles`;
    console.log(`rows → packages=${pkg}, themes=${thm}, profiles=${prf}`);

    const rls = await sql`
      select tablename, rowsecurity
      from pg_tables
      where schemaname = 'public'
      order by tablename
    `;
    const rlsOff = rls.filter((r) => !r.rowsecurity).map((r) => r.tablename);
    console.log("RLS off on:", rlsOff.length === 0 ? "(none — all tables protected)" : rlsOff.join(", "));

    const [{ policy_count }] = await sql`
      select count(*)::int as policy_count
      from pg_policies where schemaname = 'public'
    `;
    console.log("total RLS policies:", policy_count);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.log("ERROR:", err.code, err.message);
  }
  await sql.end({ timeout: 5 });
}

main();
