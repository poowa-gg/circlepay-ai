import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  date,
  jsonb,
  unique
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  country: text("country").notNull(),
  paypalEmail: text("paypal_email"),
  createdAt: timestamp("created_at").defaultNow()
});

export const circles = pgTable("circles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  cultureTerm: text("culture_term").notNull(),
  currency: text("currency").notNull(),
  contributionAmount: numeric("contribution_amount", {
    precision: 12,
    scale: 2
  }).notNull(),
  cycleFrequency: text("cycle_frequency").notNull(),
  organizerId: uuid("organizer_id").references(() => users.id),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow()
});

export const circleMembers = pgTable(
  "circle_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    payoutPosition: integer("payout_position").notNull(),

    trustScore: numeric("trust_score", {
      precision: 5,
      scale: 2
    }).default("70.00"),

    status: text("status").notNull().default("active"),

    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => [
    unique("circle_members_circle_user_unique").on(
      table.circleId,
      table.userId
    )
  ]
);
export const cycles = pgTable(
  "cycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id),

    cycleNumber: integer("cycle_number").notNull(),

    dueDate: date("due_date").notNull(),

    status: text("status").notNull().default("OPEN"),

    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => [
    unique("cycles_circle_number_unique").on(
      table.circleId,
      table.cycleNumber
    )
  ]
);

export const contributions = pgTable(
  "contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, {
        onDelete: "cascade"
      }),

    // Nullable temporarily to preserve any older prototype records.
    // The new generator always supplies a cycle ID.
    cycleId: uuid("cycle_id")
      .references(() => cycles.id),

    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, {
        onDelete: "cascade"
      }),

    amount: numeric("amount", {
      precision: 12,
      scale: 2
    }).notNull(),

    currency: text("currency").notNull(),

    status: text("status").notNull().default("PENDING"),

    paypalInvoiceId: text("paypal_invoice_id"),

    dueDate: date("due_date").notNull(),

    paidAt: timestamp("paid_at"),

    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => [
    unique("contributions_cycle_member_unique").on(
      table.cycleId,
      table.memberId
    )
  ]
);

export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  circleId: uuid("circle_id").references(() => circles.id, {
    onDelete: "cascade"
  }),
  recipientMemberId: uuid("recipient_member_id").references(
    () => circleMembers.id
  ),
  amount: numeric("amount", {
    precision: 12,
    scale: 2
  }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  paypalPayoutBatchId: text("paypal_payout_batch_id"),
  scheduledFor: date("scheduled_for").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  circleId: uuid("circle_id").references(() => circles.id, {
    onDelete: "cascade"
  }),
  actor: text("actor").notNull(),
  eventType: text("event_type").notNull(),
  details: jsonb("details").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});