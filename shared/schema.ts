import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const motorcycles = pgTable("motorcycles", {
  recid: integer("recid").primaryKey(),
  biketype: integer("biketype").notNull(), // 1=Street, 2=Dirt, 5=Dual Sport, 6=ATVs
  bikemake: text("bikemake").notNull(),
  bikemodel: text("bikemodel").notNull(),
  firstyear: integer("firstyear").notNull(),
  lastyear: integer("lastyear").notNull(),
  capacity: integer("capacity"), // Engine displacement
  // Original equipment specifications
  oe_handlebar: text("oe_handlebar"),
  oe_fcw: text("oe_fcw"), // Front chainwheel/sprocket
  oe_rcw: text("oe_rcw"), // Rear chainwheel/sprocket
  // Brake pad mapping fields
  front_brakepads: text("front_brakepads"),
  rear_brakepads: text("rear_brakepads"),
  // Additional product category fields (currently empty but part of mapping system)
  handlebars_78: text("78_handlebars"),
  twinwall: text("twinwall"),
  fatbar: text("fatbar"),
  fatbar36: text("fatbar36"),
  grips: text("grips"),
  cam: text("cam"),
  oe_barmount: text("oe_barmount"),
  barmount28: text("barmount28"),
  barmount36: text("barmount36"),
  fcwgroup: text("fcwgroup"),
  fcwconv: text("fcwconv"),
  rcwconv: text("rcwconv"),
  rcwgroup: text("rcwgroup"),
  rcwgroup_range: text("rcwgroup_range"),
  twinring: text("twinring"),
  oe_chain: text("oe_chain"),
  chainconv: text("chainconv"),
  r1_chain: text("r1_chain"),
  r3_chain: text("r3_chain"),
  r4_chain: text("r4_chain"),
  rr4_chain: text("rr4_chain"),
  clipon: text("clipon"),
  rcwcarrier: text("rcwcarrier"),
  active_handlecompare: text("active_handlecompare"),
});

export const shopifyProducts = pgTable("_shopify_products", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sku: text("sku"),
  imageUrl: text("image_url"),
  category: text("category"),
  tags: text("tags"), // JSON array as text for product tags
  variants: text("variants"), // JSON array of product variants
});

export const partMappings = pgTable("part_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopifyProductId: varchar("shopify_product_id").notNull(), // Shopify product ID - fetched live from API
  motorcycleRecid: integer("motorcycle_recid").notNull().references(() => motorcycles.recid),
  compatible: boolean("compatible").notNull().default(true),
});

export const importHistory = pgTable("import_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'motorcycles' or 'mappings'
  filename: text("filename").notNull(),
  recordsCount: integer("records_count").notNull(),
  status: text("status").notNull(), // 'success' or 'error'
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const shopifySessions = pgTable("shopify_sessions", {
  id: varchar("id").primaryKey(),
  shop: text("shop").notNull(),
  accessToken: text("access_token").notNull(),
  scope: text("scope"),
  expires: text("expires"),
  isOnline: boolean("is_online").default(false),
  state: text("state"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const partCategoryTags = pgTable("part_category_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryValue: text("category_value").notNull().unique(),
  categoryLabel: text("category_label").notNull(),
  productTags: text("product_tags").notNull(), // JSON array as text
  assignedSection: text("assigned_section"), // Which section this category belongs to: handlebars, frontSprocket, rearSprockets, chain, brakePads, barMounts, driveConversions, others
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const searchAnalytics = pgTable("search_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  searchQuery: text("search_query").notNull(),
  resultsCount: integer("results_count").notNull().default(0),
  ipAddress: text("ip_address"), // Optional for basic analytics
  userAgent: text("user_agent"), // Optional for basic analytics
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertMotorcycleSchema = createInsertSchema(motorcycles);

export const insertShopifyProductSchema = createInsertSchema(shopifyProducts);

export const insertPartMappingSchema = createInsertSchema(partMappings).omit({
  id: true,
});

export const insertImportHistorySchema = createInsertSchema(importHistory).omit({
  id: true,
  createdAt: true,
});

export const insertPartCategoryTagsSchema = createInsertSchema(partCategoryTags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMotorcycle = z.infer<typeof insertMotorcycleSchema>;
export type PartCategoryTags = typeof partCategoryTags.$inferSelect;
export type InsertPartCategoryTags = z.infer<typeof insertPartCategoryTagsSchema>;
export type Motorcycle = typeof motorcycles.$inferSelect;

export type InsertShopifyProduct = z.infer<typeof insertShopifyProductSchema>;
export type ShopifyProduct = typeof shopifyProducts.$inferSelect;

// Extended types for live Shopify data with variants
export type ShopifyProductVariant = {
  id: string;
  title: string;
  price: string;
  sku: string | null;
  inventoryQuantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  available: boolean;
};

export type ShopifyProductWithVariants = ShopifyProduct & {
  variants?: ShopifyProductVariant[];
};

export type InsertPartMapping = z.infer<typeof insertPartMappingSchema>;
export type PartMapping = typeof partMappings.$inferSelect;

export type InsertImportHistory = z.infer<typeof insertImportHistorySchema>;
export type ImportHistory = typeof importHistory.$inferSelect;

export const insertShopifySessionSchema = createInsertSchema(shopifySessions).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertShopifySession = z.infer<typeof insertShopifySessionSchema>;
export type ShopifySessionData = typeof shopifySessions.$inferSelect;

export const insertSearchAnalyticsSchema = createInsertSchema(searchAnalytics).omit({
  id: true,
  createdAt: true,
});

export type InsertSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;
export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
