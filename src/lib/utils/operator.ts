import { randomBytes, randomInt } from "crypto";

export function generateOperatorPin(): string {
  return randomInt(0, 10000).toString().padStart(4, "0");
}

export function generateOperatorToken(): string {
  return randomBytes(16).toString("hex");
}

export function buildOperatorUrl(
  baseUrl: string,
  eventId: string,
  token: string,
): string {
  return `${baseUrl.replace(/\/$/, "")}/check-in/${eventId}?token=${token}`;
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
