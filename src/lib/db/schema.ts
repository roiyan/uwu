import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
  time,
  numeric,
  unique,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const culturalPreferenceEnum = pgEnum("cultural_preference", [
  "islami",
  "umum",
  "custom",
]);

export const eventMemberRoleEnum = pgEnum("event_member_role", [
  "viewer",
  "editor",
  "admin",
]);

export const ownerRoleEnum = pgEnum("owner_role", ["bride", "groom", "both"]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
  "expired_manual",
]);

export const guestRsvpStatusEnum = pgEnum("guest_rsvp_status", [
  "baru",
  "diundang",
  "dibuka",
  "hadir",
  "tidak_hadir",
]);

export const packageTierEnum = pgEnum("package_tier", [
  "starter",
  "lite",
  "pro",
  "premium",
  "ultimate",
]);

export const messageChannelEnum = pgEnum("message_channel", [
  "whatsapp",
  "email",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "draft",
  "queued",
  "sending",
  "completed",
  "failed",
  // Sprint B: scheduled email broadcasts wait in this state until the
  // Vercel Cron handler picks them up at scheduled_at.
  "scheduled",
  "cancelled",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "sent",
  "delivered",
  "read",
  "failed",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
  "canceled",
  "failed",
]);

// ---------- profiles (extends auth.users) ----------

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: text("email").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- packages ----------

export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tier: packageTierEnum("tier").notNull().unique(),
  name: text("name").notNull(),
  priceIdr: integer("price_idr").notNull(),
  guestLimit: integer("guest_limit").notNull(),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  themeAccess: text("theme_access").notNull(), // 'basic' | 'standard' | 'premium' | 'custom'
  features: jsonb("features").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- themes (JSON config architecture) ----------

export const themes = pgTable("themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  tier: text("tier").notNull(), // 'basic' | 'standard' | 'premium'
  previewImageUrl: text("preview_image_url"),
  config: jsonb("config").notNull().$type<Record<string, unknown>>(), // full theme config
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- events ----------

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(), // used for /[slug] invitation URL
  title: text("title").notNull(), // "Anisa & Rizky"
  // Who is the account holder in the couple? 'both' = no partner invite flow.
  ownerRole: ownerRoleEnum("owner_role").notNull().default("bride"),
  themeId: uuid("theme_id").references(() => themes.id, { onDelete: "set null" }),
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "set null" }),
  culturalPreference: culturalPreferenceEnum("cultural_preference")
    .notNull()
    .default("umum"),
  musicUrl: text("music_url"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  // Hari-H check-in switch. Couple flips this on in Pengaturan when
  // they're ready to start scanning guests at the venue. Off by
  // default so the public /check-in/[eventId] route refuses traffic
  // until they're explicitly ready.
  checkinEnabled: boolean("checkin_enabled").notNull().default(false),
  // Operator-station gate. When checkin is enabled, the couple
  // generates a pair of (token, PIN). The token sits in the
  // /check-in/<eventId>?token=… URL, the 4-digit PIN is shared
  // separately with the receiving operator. Resetting either
  // invalidates the old link in one step.
  operatorPin: text("operator_pin"),
  operatorToken: text("operator_token"),
  operatorTokenCreatedAt: timestamp("operator_token_created_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------- event_members (combined: invitations + accepted collaborators) ----------
//
// Originally a single-table list of accepted members. Extended in the
// Collaboration Phase 1 migration to carry the pre-accept invite state too:
// when a row has inviteStatus = 'pending', user_id is null (partner not
// registered yet) and inviteToken is populated. On accept, userId +
// acceptedEmail are filled, inviteToken is cleared, status → 'accepted'.
// RLS helpers is_event_member / is_event_editor filter on
// inviteStatus = 'accepted' so pending rows don't grant access.

export const eventMembers = pgTable(
  "event_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "cascade",
    }),
    role: eventMemberRoleEnum("role").notNull().default("editor"),

    // Invitation fields (populated when the row is created as a pending invite)
    invitedEmail: text("invited_email"),
    invitedName: text("invited_name"),
    inviteToken: text("invite_token").unique(),
    inviteStatus: inviteStatusEnum("invite_status")
      .notNull()
      .default("accepted"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    acceptedEmail: text("accepted_email"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    invitedBy: uuid("invited_by").references(() => profiles.id, {
      onDelete: "set null",
    }),

    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => ({
    eventUserUnique: unique("event_members_event_id_user_id_unique").on(
      t.eventId,
      t.userId,
    ),
    eventEmailUnique: unique("event_members_event_id_invited_email_unique").on(
      t.eventId,
      t.invitedEmail,
    ),
  }),
);

// ---------- activity_logs (append-only audit trail) ----------

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------- couples (mempelai profile) ----------

export const couples = pgTable("couples", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .unique()
    .references(() => events.id, { onDelete: "cascade" }),
  brideName: text("bride_name").notNull(),
  brideNickname: text("bride_nickname"),
  brideFatherName: text("bride_father_name"),
  brideMotherName: text("bride_mother_name"),
  bridePhotoUrl: text("bride_photo_url"),
  brideInstagram: text("bride_instagram"),
  groomName: text("groom_name").notNull(),
  groomNickname: text("groom_nickname"),
  groomFatherName: text("groom_father_name"),
  groomMotherName: text("groom_mother_name"),
  groomPhotoUrl: text("groom_photo_url"),
  groomInstagram: text("groom_instagram"),
  coverPhotoUrl: text("cover_photo_url"),
  story: text("story"),
  quote: text("quote"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- event_schedules (akad / resepsi / etc) ----------

export const eventSchedules = pgTable("event_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // "Akad Nikah", "Resepsi", "Pemberkatan"
  eventDate: date("event_date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  venueName: text("venue_name"),
  venueAddress: text("venue_address"),
  venueMapUrl: text("venue_map_url"),
  venueLatitude: numeric("venue_latitude", { precision: 10, scale: 7 }),
  venueLongitude: numeric("venue_longitude", { precision: 10, scale: 7 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- event_theme_configs (per-theme customization) ----------

export const eventThemeConfigs = pgTable(
  "event_theme_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    config: jsonb("config").notNull().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    eventThemeUnique: unique().on(t.eventId, t.themeId),
  }),
);

// ---------- guest_groups ----------

export const guestGroups = pgTable(
  "guest_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"), // hex for UI chip
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    eventNameUnique: unique().on(t.eventId, t.name),
  }),
);

// ---------- guests ----------

export const guests = pgTable("guests", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").references(() => guestGroups.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  // Optional salutation / nickname — "Pak Ahmad dan Istri", "Mbak Siti".
  // Used in the invitation greeting when present, falls back to `name`.
  nickname: text("nickname"),
  phone: text("phone"),
  email: text("email"),
  // Invited capacity (1–10). Distinct from `rsvpAttendees` which is the
  // actual count the guest reports at RSVP time.
  plusCount: integer("plus_count").notNull().default(1),
  // Owner-facing private note (e.g. "Saksi Nikah", "Handicap access").
  notes: text("notes"),
  token: uuid("token").notNull().defaultRandom().unique(), // used in ?to=<token>
  rsvpStatus: guestRsvpStatusEnum("rsvp_status").notNull().default("baru"),
  rsvpAttendees: integer("rsvp_attendees"),
  rsvpMessage: text("rsvp_message"),
  rsvpedAt: timestamp("rsvped_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  // Per-guest send tracking (Sprint A). Complements the campaign
  // ledger in messageDeliveries with a denormalized per-guest view:
  // "how many times have we invited this person, and when last".
  sendCount: integer("send_count").notNull().default(0),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  lastSentVia: text("last_sent_via"), // 'whatsapp' | 'email'
  // Check-in tracking (Hari-H). NULL while the guest hasn't arrived;
  // populated by the operator station via /lib/actions/checkin.ts.
  // checkedInBy = operator name (free text — public station has no
  // session). actualPax may differ from rsvpAttendees when more or
  // fewer bodies show up than the RSVP promised.
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  checkedInBy: text("checked_in_by"),
  actualPax: integer("actual_pax"),
  checkinNotes: text("checkin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------- messages (broadcast campaigns) ----------

export type MessageAudience =
  | { type: "all" }
  | { type: "group"; groupIds: string[] }
  | { type: "status"; statuses: string[] };

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  channel: messageChannelEnum("channel").notNull(),
  templateSlug: text("template_slug").notNull(),
  subject: text("subject"), // email only
  body: text("body").notNull(), // template with {name}, {slug}, {date}, {venue}
  audience: jsonb("audience").notNull().$type<MessageAudience>(),
  status: messageStatusEnum("status").notNull().default("draft"),
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdByUserId: uuid("created_by_user_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  // Sprint B: when set, broadcast is parked in status='scheduled' and the
  // /api/cron/send-scheduled handler picks it up at or after this timestamp.
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
});

// ---------- message_deliveries (per-recipient ledger) ----------

export const messageDeliveries = pgTable("message_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  guestId: uuid("guest_id").references(() => guests.id, {
    onDelete: "set null",
  }),
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone"),
  recipientEmail: text("recipient_email"),
  personalisedBody: text("personalised_body").notNull(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  attemptCount: integer("attempt_count").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- orders (Midtrans payment) ----------

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  packageId: uuid("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "restrict" }),
  orderRef: text("order_ref").notNull().unique(),
  amountIdr: integer("amount_idr").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  midtransSnapToken: text("midtrans_snap_token"),
  midtransTransactionId: text("midtrans_transaction_id"),
  midtransPaymentType: text("midtrans_payment_type"),
  midtransRawSettlement: jsonb("midtrans_raw_settlement"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Type exports ----------

export type Profile = typeof profiles.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type Couple = typeof couples.$inferSelect;
export type EventSchedule = typeof eventSchedules.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type GuestGroup = typeof guestGroups.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageDelivery = typeof messageDeliveries.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type EventMember = typeof eventMembers.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
