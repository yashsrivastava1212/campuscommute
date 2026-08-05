import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const verificationStatusEnum = pgEnum("verification_status", [
  "PENDING",
  "VERIFIED",
]);

export const carpoolStatusEnum = pgEnum("carpool_status", [
  "OPEN",
  "LOCKED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "OWNER",
  "MEMBER",
]);

export const joinRequestStatusEnum = pgEnum("join_request_status", [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
]);

export const discussionRoomStatusEnum = pgEnum("discussion_room_status", [
  "ACTIVE",
  "ARCHIVED",
]);

export const mergeProposalStatusEnum = pgEnum("merge_proposal_status", [
  "PENDING",
  "APPROVED",
  "DECLINED",
  "EXPIRED",
  "MERGED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "JOIN_REQUEST",
  "JOIN_ACCEPTED",
  "JOIN_REJECTED",
  "OWNERSHIP_TRANSFER",
  "CARPOOL_LOCKED",
  "NEW_MESSAGE",
  "MERGE_SUGGESTION",
  "MERGE_COMPLETE",
  "SYSTEM",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "PENDING",
  "REVIEWED",
  "DISMISSED",
  "ACTIONED",
]);

export const transportListingStatusEnum = pgEnum("transport_listing_status", [
  "OPEN",
  "FULL",
  "CANCELLED",
  "COMPLETED",
]);

export const institutes = pgTable("institutes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  emailDomain: varchar("email_domain", { length: 100 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").references(() => institutes.id),
  campusEmail: varchar("campus_email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }),
  phoneEncrypted: text("phone_encrypted"),
  verificationStatus: verificationStatusEnum("verification_status")
    .notNull()
    .default("PENDING"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  activeCarpoolId: uuid("active_carpool_id"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const otpTokens = pgTable(
  "otp_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    otpHash: varchar("otp_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("otp_tokens_email_idx").on(table.email),
    index("otp_tokens_expires_at_idx").on(table.expiresAt),
  ]
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("refresh_tokens_user_idx").on(table.userId)]
);

export const destinations = pgTable("destinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").references(() => institutes.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull().default("other"),
  instituteCode: varchar("institute_code", { length: 50 }).notNull().default("GIM"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const destinationFares = pgTable("destination_fares", {
  id: uuid("id").primaryKey().defaultRandom(),
  destinationId: uuid("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  estimatedFareInr: integer("estimated_fare_inr").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const carpools = pgTable(
  "carpools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    instituteId: uuid("institute_id").references(() => institutes.id),
    originId: uuid("origin_id").references(() => destinations.id),
    origin: varchar("origin", { length: 255 }).notNull().default("GIM Campus (Sanquelim)"),
    destinationId: uuid("destination_id").references(() => destinations.id),
    destination: varchar("destination", { length: 255 }).notNull(),
    departureAt: timestamp("departure_at", { withTimezone: true }).notNull(),
    totalSeats: integer("total_seats").notNull().default(4),
    seatsAvailable: integer("seats_available").notNull(),
    status: carpoolStatusEnum("status").notNull().default("OPEN"),
    isLocked: boolean("is_locked").notNull().default(false),
    joinCutoffAt: timestamp("join_cutoff_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("carpools_status_departure_idx").on(table.status, table.departureAt),
    index("carpools_destination_idx").on(table.destination),
  ]
);

export const carpoolMemberships = pgTable(
  "carpool_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    carpoolId: uuid("carpool_id")
      .notNull()
      .references(() => carpools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    contactRevealed: boolean("contact_revealed").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("carpool_memberships_carpool_user_idx").on(
      table.carpoolId,
      table.userId
    ),
    index("carpool_memberships_user_idx").on(table.userId),
  ]
);

export const joinRequests = pgTable(
  "join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    carpoolId: uuid("carpool_id")
      .notNull()
      .references(() => carpools.id, { onDelete: "cascade" }),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: joinRequestStatusEnum("status").notNull().default("PENDING"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("join_requests_carpool_idx").on(table.carpoolId),
    index("join_requests_requester_idx").on(table.requesterId),
  ]
);

export const discussionRooms = pgTable(
  "discussion_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    carpoolId: uuid("carpool_id")
      .notNull()
      .unique()
      .references(() => carpools.id, { onDelete: "cascade" }),
    status: discussionRoomStatusEnum("status").notNull().default("ACTIVE"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => discussionRooms.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_room_sent_idx").on(table.roomId, table.sentAt)]
);

export const mergeProposals = pgTable(
  "merge_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    carpoolAId: uuid("carpool_a_id")
      .notNull()
      .references(() => carpools.id, { onDelete: "cascade" }),
    carpoolBId: uuid("carpool_b_id")
      .notNull()
      .references(() => carpools.id, { onDelete: "cascade" }),
    compatibilityScore: integer("compatibility_score").notNull(),
    ownerAApproved: boolean("owner_a_approved").notNull().default(false),
    ownerBApproved: boolean("owner_b_approved").notNull().default(false),
    status: mergeProposalStatusEnum("status").notNull().default("PENDING"),
    resultingCarpoolId: uuid("resulting_carpool_id").references(() => carpools.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("merge_proposals_status_idx").on(table.status)]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_user_idx").on(table.userId, table.isRead)]
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  carpoolId: uuid("carpool_id").references(() => carpools.id),
  reportedUserId: uuid("reported_user_id").references(() => users.id),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: uuid("target_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recurringTemplates = pgTable("recurring_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  destination: varchar("destination", { length: 255 }).notNull(),
  destinationId: uuid("destination_id").references(() => destinations.id),
  dayOfWeek: integer("day_of_week").notNull(),
  departureTime: varchar("departure_time", { length: 5 }).notNull(),
  totalSeats: integer("total_seats").notNull().default(4),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transportListings = pgTable("transport_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  instituteId: uuid("institute_id").references(() => institutes.id),
  destination: varchar("destination", { length: 255 }).notNull(),
  departureAt: timestamp("departure_at", { withTimezone: true }).notNull(),
  vehicleType: varchar("vehicle_type", { length: 50 }).notNull().default("TAXI"),
  totalSeats: integer("total_seats").notNull().default(4),
  seatsAvailable: integer("seats_available").notNull(),
  pricePerSeatInr: integer("price_per_seat_inr").notNull(),
  status: transportListingStatusEnum("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transportBookings = pgTable("transport_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => transportListings.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(carpoolMemberships),
  joinRequests: many(joinRequests),
  ownedCarpools: many(carpools),
}));

export const carpoolsRelations = relations(carpools, ({ one, many }) => ({
  owner: one(users, {
    fields: [carpools.ownerId],
    references: [users.id],
  }),
  destinationRef: one(destinations, {
    fields: [carpools.destinationId],
    references: [destinations.id],
  }),
  memberships: many(carpoolMemberships),
  joinRequests: many(joinRequests),
  discussionRoom: one(discussionRooms),
}));

export const carpoolMembershipsRelations = relations(
  carpoolMemberships,
  ({ one }) => ({
    carpool: one(carpools, {
      fields: [carpoolMemberships.carpoolId],
      references: [carpools.id],
    }),
    user: one(users, {
      fields: [carpoolMemberships.userId],
      references: [users.id],
    }),
  })
);

export const joinRequestsRelations = relations(joinRequests, ({ one }) => ({
  carpool: one(carpools, {
    fields: [joinRequests.carpoolId],
    references: [carpools.id],
  }),
  requester: one(users, {
    fields: [joinRequests.requesterId],
    references: [users.id],
  }),
}));

export const discussionRoomsRelations = relations(
  discussionRooms,
  ({ one, many }) => ({
    carpool: one(carpools, {
      fields: [discussionRooms.carpoolId],
      references: [carpools.id],
    }),
    messages: many(messages),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  room: one(discussionRooms, {
    fields: [messages.roomId],
    references: [discussionRooms.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));
