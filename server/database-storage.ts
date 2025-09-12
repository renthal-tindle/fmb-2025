import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, like, ilike, and, or, gte, lte, sql } from "drizzle-orm";
import {
  motorcycles,
  shopifyProducts,
  partMappings,
  importHistory,
  partCategoryTags,
  shopifySessions,
  searchAnalytics,
  type Motorcycle,
  type InsertMotorcycle,
  type ShopifyProduct,
  type InsertShopifyProduct,
  type PartMapping,
  type InsertPartMapping,
  type ImportHistory,
  type InsertImportHistory,
  type PartCategoryTags,
  type InsertPartCategoryTags,
  type ShopifySessionData,
  type InsertShopifySession,
  type SearchAnalytics,
  type InsertSearchAnalytics
} from "@shared/schema";
import { IStorage } from "./storage";

const sqlConnection = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 10,
  connect_timeout: 30,
});
const db = drizzle(sqlConnection);

export class DatabaseStorage implements IStorage {
  // Motorcycles
  async getMotorcycles(): Promise<Motorcycle[]> {
    return await db.select().from(motorcycles);
  }

  async getMotorcycle(recid: number): Promise<Motorcycle | undefined> {
    const result = await db.select().from(motorcycles).where(eq(motorcycles.recid, recid));
    return result[0];
  }

  async createMotorcycle(motorcycle: InsertMotorcycle): Promise<Motorcycle> {
    const result = await db.insert(motorcycles).values(motorcycle).returning();
    return result[0];
  }

  async updateMotorcycle(recid: number, updates: Partial<InsertMotorcycle>): Promise<Motorcycle | undefined> {
    const result = await db.update(motorcycles)
      .set(updates)
      .where(eq(motorcycles.recid, recid))
      .returning();
    return result[0];
  }

  async deleteMotorcycle(recid: number): Promise<boolean> {
    const result = await db.delete(motorcycles).where(eq(motorcycles.recid, recid));
    return result.length > 0;
  }

  async searchMotorcycles(query: string): Promise<Motorcycle[]> {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      return [];
    }
    
    // Check if search term is a numeric RECID
    const numericRecid = parseInt(searchTerm);
    if (!isNaN(numericRecid) && searchTerm === numericRecid.toString()) {
      // Direct RECID search
      const result = await db.select().from(motorcycles).where(eq(motorcycles.recid, numericRecid));
      return result;
    }
    
    // Split search into individual words for better matching
    const words = searchTerm.split(/\s+/);
    
    if (words.length === 1) {
      // Single word: search in make OR model OR RECID (if numeric)
      const pattern = `%${words[0]}%`;
      const conditions = [
        ilike(motorcycles.bikemake, pattern),
        ilike(motorcycles.bikemodel, pattern)
      ];
      
      // If the word contains digits, also search RECID as string  
      if (/\d/.test(words[0])) {
        conditions.push(sql`CAST(${motorcycles.recid} AS TEXT) ILIKE ${pattern}`);
      }
      
      return await db.select().from(motorcycles).where(or(...conditions));
    } else {
      // Multiple words: try different combinations
      const patterns = words.map(word => `%${word}%`);
      
      // Create conditions for each word in either make or model
      const wordConditions = patterns.map(pattern => 
        or(
          ilike(motorcycles.bikemake, pattern),
          ilike(motorcycles.bikemodel, pattern)
        )
      );
      
      // Also try the full search term in make or model
      const fullPattern = `%${searchTerm}%`;
      const fullTermCondition = or(
        ilike(motorcycles.bikemake, fullPattern),
        ilike(motorcycles.bikemodel, fullPattern)
      );
      
      // Return results where either the full term matches OR all individual words match
      return await db.select().from(motorcycles).where(
        or(
          fullTermCondition,
          and(...wordConditions)
        )
      );
    }
  }

  async filterMotorcycles(filters: { 
    bikemake?: string; 
    firstyear?: number; 
    lastyear?: number; 
    biketype?: number 
  }): Promise<Motorcycle[]> {
    const conditions = [];
    
    if (filters.bikemake) {
      conditions.push(eq(motorcycles.bikemake, filters.bikemake));
    }
    if (filters.firstyear) {
      // If user selects a year like 2021, find bikes that were available in 2021
      // This means: firstyear <= 2021 AND lastyear >= 2021
      conditions.push(lte(motorcycles.firstyear, filters.firstyear));
      conditions.push(gte(motorcycles.lastyear, filters.firstyear));
    }
    if (filters.lastyear) {
      // If user filters by lastyear, find bikes that were available in that year
      conditions.push(lte(motorcycles.firstyear, filters.lastyear));
      conditions.push(gte(motorcycles.lastyear, filters.lastyear));
    }
    if (filters.biketype) {
      conditions.push(eq(motorcycles.biketype, filters.biketype));
    }

    if (conditions.length === 0) {
      return await this.getMotorcycles();
    }

    return await db.select().from(motorcycles).where(and(...conditions));
  }

  async getDistinctMotorcycleMakes(): Promise<string[]> {
    const result = await db.select({ bikemake: motorcycles.bikemake })
      .from(motorcycles)
      .groupBy(motorcycles.bikemake)
      .orderBy(motorcycles.bikemake);
    
    return result.map(row => row.bikemake);
  }

  async getDistinctMotorcycleYears(): Promise<number[]> {
    const result = await db.select({ 
      firstyear: motorcycles.firstyear, 
      lastyear: motorcycles.lastyear 
    }).from(motorcycles);
    
    // Create a Set to collect all unique years from the ranges
    const allYears = new Set<number>();
    
    result.forEach(row => {
      // Add all years in the range from firstyear to lastyear
      for (let year = row.firstyear; year <= row.lastyear; year++) {
        allYears.add(year);
      }
    });
    
    // Convert to array and sort in descending order (newest first)
    return Array.from(allYears).sort((a, b) => b - a);
  }

  // Shopify Products
  async getShopifyProducts(): Promise<ShopifyProduct[]> {
    const products = await db.select().from(shopifyProducts);
    // Parse variants JSON field back into objects
    return products.map(product => ({
      ...product,
      variants: product.variants ? JSON.parse(product.variants) : null
    }));
  }

  async getShopifyProduct(id: string): Promise<ShopifyProduct | undefined> {
    const result = await db.select().from(shopifyProducts).where(eq(shopifyProducts.id, id));
    if (result[0]) {
      return {
        ...result[0],
        variants: result[0].variants ? JSON.parse(result[0].variants) : null
      };
    }
    return result[0];
  }

  async createShopifyProduct(product: InsertShopifyProduct): Promise<ShopifyProduct> {
    const result = await db.insert(shopifyProducts).values(product).returning();
    return result[0];
  }

  async updateShopifyProduct(id: string, updates: Partial<InsertShopifyProduct>): Promise<ShopifyProduct | undefined> {
    const result = await db.update(shopifyProducts)
      .set(updates)
      .where(eq(shopifyProducts.id, id))
      .returning();
    return result[0];
  }

  async searchShopifyProducts(query: string): Promise<ShopifyProduct[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const products = await db.select().from(shopifyProducts).where(
      like(shopifyProducts.title, searchTerm)
    );
    // Parse variants JSON field back into objects
    return products.map(product => ({
      ...product,
      variants: product.variants ? JSON.parse(product.variants) : null
    }));
  }

  // Part Mappings
  async getPartMappings(): Promise<PartMapping[]> {
    return await db.select().from(partMappings);
  }

  async getPartMappingsByMotorcycle(motorcycleRecid: number): Promise<PartMapping[]> {
    return await db.select().from(partMappings)
      .where(eq(partMappings.motorcycleRecid, motorcycleRecid));
  }

  async getPartMappingsByProduct(productId: string): Promise<PartMapping[]> {
    return await db.select().from(partMappings)
      .where(eq(partMappings.shopifyProductId, productId));
  }

  async createPartMapping(mapping: InsertPartMapping): Promise<PartMapping> {
    const result = await db.insert(partMappings).values(mapping).returning();
    return result[0];
  }

  async deletePartMapping(id: string): Promise<boolean> {
    const result = await db.delete(partMappings).where(eq(partMappings.id, id));
    return result.length > 0;
  }

  // Compatible Parts
  async getCompatibleParts(motorcycleRecid: number): Promise<ShopifyProduct[]> {
    const result = await db
      .select({
        id: shopifyProducts.id,
        title: shopifyProducts.title,
        description: shopifyProducts.description,
        price: shopifyProducts.price,
        sku: shopifyProducts.sku,
        imageUrl: shopifyProducts.imageUrl,
        category: shopifyProducts.category,
        tags: shopifyProducts.tags,
        variants: shopifyProducts.variants,
      })
      .from(partMappings)
      .innerJoin(shopifyProducts, eq(partMappings.shopifyProductId, shopifyProducts.id))
      .where(
        and(
          eq(partMappings.motorcycleRecid, motorcycleRecid),
          eq(partMappings.compatible, true)
        )
      );
    
    return result;
  }

  // Import History
  async getImportHistory(): Promise<ImportHistory[]> {
    return await db.select().from(importHistory).orderBy(importHistory.createdAt);
  }

  async createImportHistory(history: InsertImportHistory): Promise<ImportHistory> {
    const result = await db.insert(importHistory).values(history).returning();
    return result[0];
  }

  // Bulk operations
  async bulkCreateMotorcycles(motorcyclesList: InsertMotorcycle[]): Promise<Motorcycle[]> {
    const result = await db.insert(motorcycles).values(motorcyclesList).returning();
    return result;
  }

  async bulkCreatePartMappings(mappingsList: InsertPartMapping[]): Promise<PartMapping[]> {
    const result = await db.insert(partMappings).values(mappingsList).returning();
    return result;
  }

  // Part Category Tags
  async getPartCategoryTags(): Promise<PartCategoryTags[]> {
    return await db.select().from(partCategoryTags);
  }

  async getPartCategoryTag(categoryValue: string): Promise<PartCategoryTags | undefined> {
    const result = await db.select().from(partCategoryTags).where(eq(partCategoryTags.categoryValue, categoryValue));
    return result[0];
  }

  async createPartCategoryTag(partCategoryTag: InsertPartCategoryTags): Promise<PartCategoryTags> {
    const result = await db.insert(partCategoryTags).values(partCategoryTag).returning();
    return result[0];
  }

  async updatePartCategoryTag(categoryValue: string, updates: Partial<InsertPartCategoryTags>): Promise<PartCategoryTags | undefined> {
    const result = await db.update(partCategoryTags)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(partCategoryTags.categoryValue, categoryValue))
      .returning();
    return result[0];
  }

  async deletePartCategoryTag(categoryValue: string): Promise<boolean> {
    const result = await db.delete(partCategoryTags).where(eq(partCategoryTags.categoryValue, categoryValue));
    return result.length > 0;
  }

  // Shopify Sessions
  async getShopifySession(id: string): Promise<any | undefined> {
    const result = await db.select().from(shopifySessions).where(eq(shopifySessions.id, id));
    if (result[0]) {
      return {
        id: result[0].id,
        shop: result[0].shop,
        accessToken: result[0].accessToken,
        scope: result[0].scope,
        expires: result[0].expires,
        isOnline: result[0].isOnline,
        state: result[0].state
      };
    }
    return undefined;
  }

  async storeShopifySession(session: any): Promise<boolean> {
    try {
      const sessionData: InsertShopifySession = {
        id: session.id,
        shop: session.shop,
        accessToken: session.accessToken,
        scope: session.scope || null,
        expires: session.expires || null,
        isOnline: session.isOnline || false,
        state: session.state || null
      };

      // Try to update first, then insert if it doesn't exist
      const existing = await this.getShopifySession(session.id);
      if (existing) {
        await db.update(shopifySessions)
          .set({ ...sessionData, updatedAt: new Date().toISOString() })
          .where(eq(shopifySessions.id, session.id));
      } else {
        await db.insert(shopifySessions).values(sessionData);
      }
      
      console.log(`Stored Shopify session ${session.id} for shop ${session.shop} in database`);
      return true;
    } catch (error) {
      console.error('Failed to store Shopify session:', error);
      return false;
    }
  }

  async deleteShopifySession(id: string): Promise<boolean> {
    const result = await db.delete(shopifySessions).where(eq(shopifySessions.id, id));
    return result.length > 0;
  }

  async getAllShopifySessions(): Promise<any[]> {
    const result = await db.select().from(shopifySessions);
    return result.map(session => ({
      id: session.id,
      shop: session.shop,
      accessToken: session.accessToken,
      scope: session.scope,
      expires: session.expires,
      isOnline: session.isOnline,
      state: session.state
    }));
  }

  // Search Analytics
  async createSearchAnalytics(analytics: InsertSearchAnalytics): Promise<SearchAnalytics> {
    const result = await db.insert(searchAnalytics).values(analytics).returning();
    return result[0];
  }

  async getTopSearches(dateFrom?: string, dateTo?: string, limit: number = 25): Promise<{searchQuery: string, searchCount: number}[]> {
    let query = db.select({
      searchQuery: searchAnalytics.searchQuery,
      searchCount: sql<number>`COUNT(*)`
    })
    .from(searchAnalytics)
    .groupBy(searchAnalytics.searchQuery)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit);

    if (dateFrom || dateTo) {
      const conditions: any[] = [];
      if (dateFrom) {
        conditions.push(sql`${searchAnalytics.createdAt} >= ${dateFrom}`);
      }
      if (dateTo) {
        conditions.push(sql`${searchAnalytics.createdAt} <= ${dateTo}`);
      }
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    return result;
  }
}