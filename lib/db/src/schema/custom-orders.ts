import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const customOrdersTable = pgTable("custom_orders", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  packageType: text("package_type").notNull(),
  projectName: text("project_name").notNull(),
  logoBase64: text("logo_base64"),
  referenceBase64: text("reference_base64"),
  price: text("price").notNull(),
  status: text("status").notNull().default("pending"),
  clientToken: text("client_token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customOrderMessagesTable = pgTable("custom_order_messages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CustomOrder = typeof customOrdersTable.$inferSelect;
export type CustomOrderMessage = typeof customOrderMessagesTable.$inferSelect;
