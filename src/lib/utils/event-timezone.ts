export type EventTimezoneOption = { value: string; abbr: string; city: string; offset: string };
export const EVENT_TIMEZONE_OPTIONS: EventTimezoneOption[] = [
  { value: "Asia/Jakarta", abbr: "WIB", city: "Jakarta", offset: "UTC+7" },
  { value: "Asia/Makassar", abbr: "WITA", city: "Makassar", offset: "UTC+8" },
  { value: "Asia/Jayapura", abbr: "WIT", city: "Jayapura", offset: "UTC+9" },
  { value: "Asia/Singapore", abbr: "SGT", city: "Singapore", offset: "UTC+8" },
  { value: "Asia/Kuala_Lumpur", abbr: "MYT", city: "Kuala Lumpur", offset: "UTC+8" },
  { value: "Asia/Tokyo", abbr: "JST", city: "Tokyo", offset: "UTC+9" },
  { value: "Asia/Dubai", abbr: "GST", city: "Dubai", offset: "UTC+4" },
  { value: "Europe/London", abbr: "GMT", city: "London", offset: "UTC+0" },
  { value: "America/New_York", abbr: "EST", city: "New York", offset: "UTC-5" },
];
export const EVENT_TIMEZONE_VALUES = EVENT_TIMEZONE_OPTIONS.map((o) => o.value) as readonly string[];
export const DEFAULT_EVENT_TIMEZONE = "Asia/Jakarta";
