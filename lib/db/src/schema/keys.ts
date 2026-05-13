import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productKeysTable = pgTable("product_keys", {
  id: serial("id").primaryKey(),
  plan: text("plan").notNull(),
  keyValue: text("key_value").notNull(),
  used: boolean("used").notNull().default(false),
  usedAt: timestamp("used_at"),
  buyerName: text("buyer_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductKeySchema = createInsertSchema(productKeysTable).omit({
  id: true,
  used: true,
  usedAt: true,
  createdAt: true,
});

export type InsertProductKey = z.infer<typeof insertProductKeySchema>;
export type ProductKey = typeof productKeysTable.$inferSelect;
