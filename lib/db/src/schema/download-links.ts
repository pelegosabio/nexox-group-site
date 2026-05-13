import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const downloadLinksTable = pgTable("download_links", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull().unique(),
  downloadUrl: text("download_url").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DownloadLink = typeof downloadLinksTable.$inferSelect;
