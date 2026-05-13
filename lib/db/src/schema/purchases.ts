import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const pendingPurchasesTable = pgTable("pending_purchases", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  buyerName: text("buyer_name").notNull(),
  product: text("product").notNull(),
  planId: text("plan_id").notNull(),
  planName: text("plan_name").notNull(),
  price: text("price").notNull(),
  pixAmount: text("pix_amount").notNull(),
  status: text("status").notNull().default("pending"),
  keyValue: text("key_value"),
  downloadUrl: text("download_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export type PendingPurchase = typeof pendingPurchasesTable.$inferSelect;
