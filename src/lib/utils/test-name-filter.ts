// Heuristic to filter obvious test/dummy guests from analytics
// surfaces (Tamu Paling Antusias leaderboard, Daftar Lengkap
// table). Couples regularly seed test entries to preview the
// invitation; ranking those rows next to real attendees made the
// "Top 1 antusias: Test 3" leaderboard meaningless.
//
// Filter is UI-only — we never delete the row from the database.
// Anything not flagged as a test name still renders normally.

const TEST_PREFIXES = [
  "test",
  "tes",
  "testing",
  "coba",
  "asdf",
  "xxx",
  "dummy",
  "qwerty",
  "lorem",
  "ipsum",
  "sample",
];

export function isTestName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.toLowerCase().trim();
  if (!trimmed) return false;
  for (const prefix of TEST_PREFIXES) {
    if (trimmed === prefix) return true;
    if (trimmed.startsWith(`${prefix} `)) return true;
    // Common pattern: "Test1", "Test 2", "tester3" — allow a digit
    // (with or without space) immediately after the keyword.
    if (new RegExp(`^${prefix}\\s*[0-9]+$`).test(trimmed)) return true;
  }
  return false;
}

export function rejectTestNames<T extends { name: string | null | undefined }>(
  rows: T[],
): T[] {
  return rows.filter((r) => !isTestName(r.name));
}
