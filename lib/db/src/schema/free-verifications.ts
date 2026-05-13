import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const freeVerificationsTable = pgTable("free_verifications", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  username: text("username").notNull(),
  printBase64: text("print_base64").notNull(),
  status: text("status").notNull().default("pending"),
  freeKey: text("free_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export type FreeVerification = typeof freeVerificationsTable.$inferSelect;
