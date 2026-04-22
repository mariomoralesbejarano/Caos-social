import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const roomsTable = pgTable(
  "rooms",
  {
    code: text("code").primaryKey(),
    state: jsonb("state").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    updatedIdx: index("rooms_updated_idx").on(t.updatedAt),
  }),
);

export type RoomRow = typeof roomsTable.$inferSelect;
