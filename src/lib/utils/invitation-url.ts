// Build a guest-facing invitation URL for an event slug.
//
// Two URL shapes are supported, switched purely by env config:
//
// - Subdomain (production once `uwu.id` + Vercel wildcard are live):
//     https://<slug>.uwu.id
//   Activated by setting NEXT_PUBLIC_ROOT_DOMAIN. The middleware
//   rewrites the bare host on a subdomain to /<slug> so the App
//   Router renders the same invitation page.
//
// - Path-based (staging / local / fallback):
//     <NEXT_PUBLIC_APP_URL>/<slug>
//   This is the historical shape; broadcast templates and QR codes
//   that were generated before the cutover keep working.
//
// `pathOrQuery` is appended verbatim — pass `?to=<token>` to point
// at a specific guest, or leave it empty for the unpersonalised view.

const PROTOCOL =
  process.env.NEXT_PUBLIC_INVITATION_PROTOCOL?.trim() || "https";

export function buildInvitationUrl(
  slug: string,
  pathOrQuery: string = "",
): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (rootDomain) {
    return `${PROTOCOL}://${slug}.${rootDomain}${pathOrQuery}`;
  }
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${appUrl}/${slug}${pathOrQuery}`;
}

// Origin half of the invitation URL — i.e. everything before the
// path. Used by share-preview cards that already render the slug
// themselves but need the host to compose the full link.
export function invitationOrigin(slug: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (rootDomain) {
    return `${PROTOCOL}://${slug}.${rootDomain}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}
