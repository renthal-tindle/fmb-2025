import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const motorcycles = pgTable("motorcycles", {
  recid: integer("recid").primaryKey(),
  bikeCategory: text("bike_category"), // New: "Off-Road", "Street", "ATV"
  bikeSubcategory: text("bike_subcategory"), // New: "MX/Enduro", "Sportbike", "Dual Sport", etc.
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
  fcwgroup_range: text("fcwgroup_range"),
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
  other_fcw: text("other_fcw"),
  customParts: jsonb("custom_parts"), // Store dynamically created categories as {"category_value": "product_variant"}
});

export const partMappings = pgTable("part_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopifyProductId: varchar("shopify_product_id").notNull(), // Shopify product ID - fetched live from API
  motorcycleRecid: integer("motorcycle_recid").notNull().references(() => motorcycles.recid),
  compatible: boolean("compatible").notNull().default(true),
  // SKU-based resilience fields
  expectedSku: text("expected_sku"), // Expected SKU for this product (for validation and healing)
  productTitle: text("product_title"), // Product title for easier debugging
  lastSynced: text("last_synced").default(sql`CURRENT_TIMESTAMP`), // When this mapping was last verified
  status: text("status").default('active'), // 'active', 'stale', 'healing'
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
  displayMode: text("display_mode").notNull().default('products'), // 'products' or 'variants' - controls dropdown display
  assignedSection: text("assigned_section"), // Which section this category belongs to: handlebars, frontSprocket, rearSprockets, chain, brakePads, barMounts, driveConversions, others
  sortOrder: integer("sort_order").notNull().default(0), // Display order for categories in parts mapping
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

export const motorcycleCategoryConfig = pgTable("motorcycle_category_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // Main category: "Off-Road", "Street", "ATV"
  subcategory: text("subcategory"), // Subcategory: "MX/Enduro", "Sportbike", etc. (null for category-only entries)
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const partSections = pgTable("part_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionKey: text("section_key").notNull().unique(), // handlebars, frontSprocket, rearSprockets, etc.
  sectionLabel: text("section_label").notNull(), // Display name: "Handlebars", "Front Sprocket", etc.
  sortOrder: integer("sort_order").notNull().default(0), // Display order for sections
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const motorcyclesExtended = pgTable("motorcycles_extended", {
  recid: integer("recid").primaryKey(),
  biketype: integer("biketype"),
  bikeCategory: text("bike_category"),
  bikeSubcategory: text("bike_subcategory"),
  bikemake: text("bikemake").notNull(),
  bikemodel: text("bikemodel").notNull(),
  firstyear: integer("firstyear").notNull(),
  lastyear: integer("lastyear").notNull(),
  capacity: integer("capacity"),
  oe_handlebar: text("oe_handlebar"),
  oe_fcw: text("oe_fcw"),
  oe_rcw: text("oe_rcw"),
  front_brakepads: text("front_brakepads"),
  rear_brakepads: text("rear_brakepads"),
  dynamicParts: jsonb("dynamic_parts"), // All dynamic categories stored as {"category_value": "product_sku"}
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertMotorcycleSchema = createInsertSchema(motorcycles);

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

export const insertPartSectionSchema = createInsertSchema(partSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMotorcycleExtendedSchema = createInsertSchema(motorcyclesExtended).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertMotorcycle = z.infer<typeof insertMotorcycleSchema>;
export type InsertMotorcycleExtended = z.infer<typeof insertMotorcycleExtendedSchema>;
export type MotorcycleExtended = typeof motorcyclesExtended.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type PartCategoryTags = typeof partCategoryTags.$inferSelect;
export type InsertPartCategoryTags = z.infer<typeof insertPartCategoryTagsSchema>;
export type PartSection = typeof partSections.$inferSelect;
export type InsertPartSection = z.infer<typeof insertPartSectionSchema>;
export type Motorcycle = typeof motorcycles.$inferSelect;

// Types for live Shopify data with variants (fetched from API, not cached in database)
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

export type ShopifyProductWithVariants = {
  id: string;
  title: string;
  description?: string;
  price: string;
  sku?: string;
  imageUrl?: string;
  category?: string;
  tags?: string;
  variants?: ShopifyProductVariant[];
};

// Extended types for Shopify products with admin category information
export type ShopifyProductWithCategory = ShopifyProductWithVariants & {
  adminCategory?: string; // The assignedSection from partCategoryTags (handlebars, frontSprocket, rearSprockets, etc.)
  adminCategoryLabel?: string; // The categoryLabel from partCategoryTags for display
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

export const insertMotorcycleCategoryConfigSchema = createInsertSchema(motorcycleCategoryConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMotorcycleCategoryConfig = z.infer<typeof insertMotorcycleCategoryConfigSchema>;
export type MotorcycleCategoryConfig = typeof motorcycleCategoryConfig.$inferSelect;

// Motorcycle Category Structure
export const BIKE_CATEGORIES = {
  OFF_ROAD: "Off-Road",
  STREET: "Street",
  ATV: "ATV"
} as const;

export const BIKE_SUBCATEGORIES = {
  // Off-Road subcategories
  MX_ENDURO: "MX/Enduro",
  TRIALS: "Trials",
  
  // Street subcategories
  SPORTBIKE: "Sportbike",
  ADVENTURE: "Adventure",
  CRUISER: "Cruiser / V-Twin",
  TOURING: "Touring",
  STANDARD: "Standard / Naked",
  
  // Shared across Off-Road and Street
  DUAL_SPORT: "Dual Sport"
} as const;

// Category to subcategory mapping
export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  [BIKE_CATEGORIES.OFF_ROAD]: [
    BIKE_SUBCATEGORIES.MX_ENDURO,
    BIKE_SUBCATEGORIES.TRIALS,
    BIKE_SUBCATEGORIES.DUAL_SPORT
  ],
  [BIKE_CATEGORIES.STREET]: [
    BIKE_SUBCATEGORIES.SPORTBIKE,
    BIKE_SUBCATEGORIES.ADVENTURE,
    BIKE_SUBCATEGORIES.CRUISER,
    BIKE_SUBCATEGORIES.TOURING,
    BIKE_SUBCATEGORIES.STANDARD,
    BIKE_SUBCATEGORIES.DUAL_SPORT
  ],
  [BIKE_CATEGORIES.ATV]: []
};
