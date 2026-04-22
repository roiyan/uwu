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
  themeId: uuid("theme_id").references(() => themes.id, { onDelete: "set null" }),
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "set null" }),
  culturalPreference: culturalPreferenceEnum("cultural_preference")
    .notNull()
    .default("umum"),
  musicUrl: text("music_url"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------- event_members (for couple + collaborators) ----------

export const eventMembers = pgTable(
  "event_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: eventMemberRoleEnum("role").notNull().default("viewer"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => ({
    eventUserUnique: unique().on(t.eventId, t.userId),
  }),
);

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
  phone: text("phone"),
  email: text("email"),
  token: uuid("token").notNull().defaultRandom().unique(), // used in ?to=<token>
  rsvpStatus: guestRsvpStatusEnum("rsvp_status").notNull().default("baru"),
  rsvpAttendees: integer("rsvp_attendees"),
  rsvpMessage: text("rsvp_message"),
  rsvpedAt: timestamp("rsvped_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
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
