/**
 * Helpers for the check-in operator handoff. The flow:
 *   1. Couple opens Pengaturan → flips check-in on → clicks
 *      "Buat Link Operator". This calls generateOperatorLinkAction,
 *      which uses these helpers to mint a (token, PIN) pair.
 *   2. Couple shares the resulting URL via WhatsApp; the PIN is
 *      shared separately (different message / channel).
 *   3. Operator opens the URL on their device → enters the PIN →
 *      we hand them the public check-in station with a localStorage
 *      session that survives reloads until the couple resets the
 *      link.
 *
 * Security shape (intentional):
 *   - Token is a 32-char hex string from crypto.randomBytes(16). Not
 *     guessable by enumeration even at high QPS.
 *   - PIN is 4 digits — short enough to share verbally over the
 *     phone. The token must match BEFORE the PIN is checked, so the
 *     PIN cannot be brute-forced against random eventIds; an
 *     attacker would have to obtain the URL first.
 *   - Resetting issues a fresh (token, PIN) which atomically
 *     invalidates the old link via the action's UPDATE.
 */

import { randomBytes, randomInt } from "crypto";

export function generateOperatorPin(): string {
  // 4-digit PIN, zero-padded. randomInt is uniformly distributed; we
  // intentionally allow leading-zero pins like "0123" so the keyspace
  // is the full 0-9999 range.
  return randomInt(0, 10000).toString().padStart(4, "0");
}

export function generateOperatorToken(): string {
  // 32 hex chars = 128 bits of entropy. Way more than needed for the
  // expected lifetime of a single wedding's operator handoff, and
  // matches the "appears non-secret in URL" intuition operators
  // already have for invitation links.
  return randomBytes(16).toString("hex");
}

export function buildOperatorUrl(
  baseUrl: string,
  eventId: string,
  token: string,
): string {
  // Trim trailing slash so we don't end up with `…uwu.id//check-in/…`.
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/check-in/${eventId}?token=${token}`;
}

/**
 * Format the localStorage session key. The session value itself is
 * literally `${token}:${pin}` — both are required to re-validate
 * against the server on subsequent loads.
 */
export function operatorSessionStorageKey(eventId: string): string {
  return `uwu-operator-${eventId}`;
}

export function operatorSessionValue(token: string, pin: string): string {
  return `${token}:${pin}`;
}

export function parseOperatorSessionValue(
  value: string | null | undefined,
): { token: string; pin: string } | null {
  if (!value) return null;
  const colonIdx = value.indexOf(":");
  if (colonIdx <= 0 || colonIdx === value.length - 1) return null;
  const token = value.slice(0, colonIdx);
  const pin = value.slice(colonIdx + 1);
  if (!/^[0-9a-f]{32}$/i.test(token)) return null;
  if (!/^\d{4}$/.test(pin)) return null;
  return { token, pin };
}

/**
 * On-disk shape of the operator's localStorage entry. The PIN gate
 * stores both the (token, pin) session key the server re-validates
 * AND the operator's own name — collected once on day-of setup so
 * every check-in auto-fills the "Operator" field instead of
 * re-prompting per guest.
 *
 * Older sessions (pre-name capture) are stored as the bare
 * `${token}:${pin}` string. `readOperatorSessionPayload` accepts both
 * shapes so a legacy session keeps working until the operator next
 * lands on the keypad.
 */
export type OperatorSessionPayload = {
  sessionKey: string;
  operatorName: string;
};

export function operatorSessionPayload(
  token: string,
  pin: string,
  operatorName: string,
): OperatorSessionPayload {
  return {
    sessionKey: operatorSessionValue(token, pin),
    operatorName: operatorName.trim(),
  };
}

export function readOperatorSessionPayload(
  raw: string | null | undefined,
): OperatorSessionPayload | null {
  if (!raw) return null;
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.sessionKey === "string" &&
        typeof parsed.operatorName === "string"
      ) {
        return {
          sessionKey: parsed.sessionKey,
          operatorName: parsed.operatorName,
        };
      }
    } catch {
      return null;
    }
    return null;
  }
  if (parseOperatorSessionValue(raw)) {
    return { sessionKey: raw, operatorName: "" };
  }
  return null;
}
