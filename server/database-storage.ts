import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, like, ilike, and, or, gte, lte, sql, asc } from "drizzle-orm";
import {
  motorcycles,
  shopifyProducts,
  partMappings,
  importHistory,
  partCategoryTags,
  partSections,
  shopifySessions,
  searchAnalytics,
  motorcycleCategoryConfig,
  type Motorcycle,
  type InsertMotorcycle,
  type ShopifyProduct,
  type ShopifyProductWithCategory,
  type InsertShopifyProduct,
  type PartMapping,
  type InsertPartMapping,
  type ImportHistory,
  type InsertImportHistory,
  type PartCategoryTags,
  type InsertPartCategoryTags,
  type PartSection,
  type InsertPartSection,
  type ShopifySessionData,
  type InsertShopifySession,
  type SearchAnalytics,
  type InsertSearchAnalytics,
  type MotorcycleCategoryConfig,
  type InsertMotorcycleCategoryConfig
} from "@shared/schema";
import { IStorage } from "./storage";
import { fetchShopifyProductsByIds, getCurrentSession, fetchShopifyProducts } from "./shopify-auth";

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
    
    // Extract year from search if present (4-digit year between 1900-2099)
    const yearMatch = searchTerm.match(/\b(19\d{2}|20\d{2})\b/);
    const searchYear = yearMatch ? parseInt(yearMatch[0]) : null;
    
    // Remove year from search term when matching make/model
    const searchWithoutYear = searchYear 
      ? searchTerm.replace(/\b(19\d{2}|20\d{2})\b/g, '').trim().replace(/\s+/g, ' ')
      : searchTerm;
    
    // Split search into individual words for better matching
    const words = searchWithoutYear.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0 && searchYear) {
      // Only year was provided, search by year range
      return await db.select().from(motorcycles).where(
        and(
          lte(motorcycles.firstyear, searchYear),
          gte(motorcycles.lastyear, searchYear)
        )
      );
    }
    
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
      
      let results = await db.select().from(motorcycles).where(or(...conditions));
      
      // Filter by year if year was in search
      if (searchYear) {
        results = results.filter(bike => 
          bike.firstyear <= searchYear && bike.lastyear >= searchYear
        );
      }
      
      return results;
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
      const fullPattern = `%${searchWithoutYear}%`;
      const fullTermCondition = or(
        ilike(motorcycles.bikemake, fullPattern),
        ilike(motorcycles.bikemodel, fullPattern)
      );
      
      // Return results where either the full term matches OR all individual words match
      let results = await db.select().from(motorcycles).where(
        or(
          fullTermCondition,
          and(...wordConditions)
        )
      );
      
      // Filter by year if year was in search
      if (searchYear) {
        results = results.filter(bike => 
          bike.firstyear <= searchYear && bike.lastyear >= searchYear
        );
      }
      
      return results;
    }
  }

  async filterMotorcycles(filters: { 
    bikemake?: string; 
    firstyear?: number; 
    lastyear?: number; 
    biketype?: number;
    bikeCategory?: string;
    bikeSubcategory?: string;
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
    if (filters.bikeCategory) {
      conditions.push(eq(motorcycles.bikeCategory, filters.bikeCategory));
    }
    if (filters.bikeSubcategory) {
      conditions.push(eq(motorcycles.bikeSubcategory, filters.bikeSubcategory));
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

  async getDistinctMotorcycleModelsByMake(make: string): Promise<string[]> {
    const result = await db.select({ bikemodel: motorcycles.bikemodel })
      .from(motorcycles)
      .where(ilike(motorcycles.bikemake, make))
      .groupBy(motorcycles.bikemodel)
      .orderBy(motorcycles.bikemodel);
    
    return result.map(row => row.bikemodel);
  }

  async getDistinctYearsByMakeModel(make: string, model: string): Promise<string[]> {
    const result = await db.select({ 
      firstyear: motorcycles.firstyear, 
      lastyear: motorcycles.lastyear 
    }).from(motorcycles)
    .where(and(
      ilike(motorcycles.bikemake, make),
      ilike(motorcycles.bikemodel, model)
    ));
    
    // Create a Set to collect all unique years from the ranges
    const allYears = new Set<number>();
    
    result.forEach(row => {
      // Add all years in the range from firstyear to lastyear
      for (let year = row.firstyear; year <= row.lastyear; year++) {
        allYears.add(year);
      }
    });
    
    // Convert to sorted array (newest first)
    const sortedYears = Array.from(allYears).sort((a, b) => b - a);
    
    // Group consecutive years into ranges
    return this.groupYearsIntoRanges(sortedYears);
  }

  private groupYearsIntoRanges(years: number[]): string[] {
    if (years.length === 0) return [];
    if (years.length === 1) return [years[0].toString()];
    
    const ranges: string[] = [];
    let rangeStart = years[0];
    let rangeEnd = years[0];
    
    for (let i = 1; i < years.length; i++) {
      // Since years are sorted descending, consecutive means current year is rangeStart - 1
      if (years[i] === rangeStart - 1) {
        // Extend the current range
        rangeStart = years[i];
      } else {
        // End the current range and add it to results
        if (rangeStart === rangeEnd) {
          ranges.push(rangeEnd.toString());
        } else {
          ranges.push(`${rangeStart}-${rangeEnd}`);
        }
        
        // Start a new range
        rangeStart = years[i];
        rangeEnd = years[i];
      }
    }
    
    // Add the final range
    if (rangeStart === rangeEnd) {
      ranges.push(rangeEnd.toString());
    } else {
      ranges.push(`${rangeStart}-${rangeEnd}`);
    }
    
    return ranges;
  }

  async filterMotorcyclesByMakeModelYear(make: string, model: string, year?: number): Promise<Motorcycle[]> {
    const conditions = [
      ilike(motorcycles.bikemake, make),
      ilike(motorcycles.bikemodel, model)
    ];

    // Year is optional - if provided, check if the year falls within the bike's production range
    if (year) {
      conditions.push(lte(motorcycles.firstyear, year));
      conditions.push(gte(motorcycles.lastyear, year));
    }

    return await db.select().from(motorcycles).where(and(...conditions));
  }

  async filterMotorcyclesByMakeModelYearRange(make: string, model: string, startYear?: number, endYear?: number): Promise<Motorcycle[]> {
    const conditions = [
      ilike(motorcycles.bikemake, make),
      ilike(motorcycles.bikemodel, model)
    ];

    // Year range is optional - if provided, check if the ranges overlap
    if (startYear !== undefined && endYear !== undefined) {
      // Ranges overlap if: motorcycle.firstyear <= endYear AND motorcycle.lastyear >= startYear
      conditions.push(lte(motorcycles.firstyear, endYear));
      conditions.push(gte(motorcycles.lastyear, startYear));
    }

    return await db.select().from(motorcycles).where(and(...conditions));
  }

  // Shopify Products - Fetches live data from Shopify API
  async getShopifyProducts(): Promise<ShopifyProduct[]> {
    try {
      // Get the current Shopify session
      const session = getCurrentSession();
      if (!session) {
        console.warn('No Shopify session available for getShopifyProducts - returning empty array');
        return [];
      }
      
      // Fetch live product data from Shopify API
      const shopifyResponse = await fetchShopifyProducts(session);
      
      // Transform Shopify API response to match our expected format
      const products: ShopifyProduct[] = shopifyResponse.products?.map((product: any) => ({
        id: product.id.toString(),
        title: product.title,
        description: product.body_html || null,
        price: product.variants?.[0]?.price || '0.00',
        sku: product.variants?.[0]?.sku || null,
        imageUrl: product.images?.[0]?.src || null,
        category: product.product_type || null,
        tags: product.tags || '', // Shopify returns tags as comma-separated string
        variants: JSON.stringify(product.variants || [])
      })) || [];
      
      console.log(`✅ LIVE DATA: Fetched ${products.length} products from Shopify`);
      return products;
      
    } catch (error) {
      console.error('Failed to fetch live Shopify products:', error);
      // Return empty array instead of throwing to prevent complete failure
      return [];
    }
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

  // Add parts count to all motorcycles efficiently (fetches Shopify products once)
  async addPartsCountToMotorcycles(motorcycles: Motorcycle[]): Promise<Array<Motorcycle & { partsCount: number }>> {
    try {
      // Get the current Shopify session
      const session = getCurrentSession();
      if (!session) {
        // No session, return motorcycles with 0 parts
        return motorcycles.map(m => ({ ...m, partsCount: 0 }));
      }
      
      // Fetch Shopify products ONCE for all motorcycles
      const allProductsResponse = await fetchShopifyProducts(session);
      const allProducts = allProductsResponse.products || [];
      
      // Define all the motorcycle part fields that can contain SKU values
      const partFieldsToCheck = [
        'oe_handlebar', 'oe_fcw', 'oe_rcw', 'oe_barmount', 'oe_chain',
        'front_brakepads', 'rear_brakepads',
        'handlebars_78', 'twinwall', 'fatbar', 'fatbar36',
        'grips', 'cam',
        'barmount28', 'barmount36',
        'fcwgroup', 'fcwconv', 'rcwconv', 'rcwgroup', 'rcwgroup_range', 'twinring',
        'chainconv', 'r1_chain', 'r3_chain', 'r4_chain', 'rr4_chain',
        'clipon', 'rcwcarrier', 'active_handlecompare'
      ];
      
      // Count parts for each motorcycle using the shared product list
      return motorcycles.map(motorcycle => {
        // Extract all non-empty part values from this motorcycle
        const motorcyclePartValues: string[] = [];
        for (const fieldName of partFieldsToCheck) {
          const motorcycleValue = (motorcycle as any)[fieldName];
          if (motorcycleValue && typeof motorcycleValue === 'string' && motorcycleValue.trim() !== '') {
            motorcyclePartValues.push(motorcycleValue.trim());
          }
        }
        
        // Count compatible products for this motorcycle
        let count = 0;
        for (const product of allProducts) {
          let isCompatible = false;

          // Check if the main product SKU matches any motorcycle part value
          if (motorcyclePartValues.some(partValue => 
            product.sku && product.sku.toLowerCase().trim() === partValue.toLowerCase().trim()
          )) {
            isCompatible = true;
          }

          // If not matched by main SKU, check variant SKUs
          if (!isCompatible && product.variants) {
            for (const variant of product.variants) {
              if (variant.sku && motorcyclePartValues.some(partValue => 
                variant.sku.toLowerCase().trim() === partValue.toLowerCase().trim()
              )) {
                isCompatible = true;
                break;
              }
            }
          }

          if (isCompatible) {
            count++;
          }
        }
        
        return {
          ...motorcycle,
          partsCount: count
        };
      });
    } catch (error) {
      console.error('Failed to add parts count to motorcycles:', error);
      // Return motorcycles with 0 parts on error
      return motorcycles.map(m => ({ ...m, partsCount: 0 }));
    }
  }

  // Compatible Parts - Uses motorcycle database fields for SKU matching (ignores admin part mappings)
  async getCompatibleParts(motorcycleRecid: number): Promise<ShopifyProductWithCategory[]> {
    try {
      // Get the motorcycle details for SKU-based matching
      const motorcycle = await this.getMotorcycle(motorcycleRecid);
      if (!motorcycle) {
        return [];
      }

      // Get the current Shopify session
      const session = getCurrentSession();
      if (!session) {
        console.warn('No Shopify session available - falling back to empty results');
        return [];
      }
      
      // Fetch part category tags to determine admin categories
      const categoryTags = await db.select().from(partCategoryTags);
      
      console.log(`🔍 Using motorcycle database fields for compatibility matching (motorcycle ${motorcycleRecid})`);
      
      // Get all products for SKU matching
      const allProductsResponse = await fetchShopifyProducts(session);
      const allProducts = allProductsResponse.products || [];
      
      // Collect ALL motorcycle part values for SKU matching (not just OE fields)
      const motorcyclePartValues = [];
      
      // Define all the motorcycle part fields that can contain SKU values
      const partFieldsToCheck = [
        // Original Equipment fields
        'oe_handlebar', 'oe_fcw', 'oe_rcw', 'oe_barmount', 'oe_chain',
        // Brake pad fields
        'front_brakepads', 'rear_brakepads',
        // Handlebar fields
        'handlebars_78', 'twinwall', 'fatbar', 'fatbar36',
        // Other part fields
        'grips', 'cam',
        // Bar mount fields
        'barmount28', 'barmount36',
        // Sprocket/chainwheel fields
        'fcwgroup', 'fcwconv', 'rcwconv', 'rcwgroup', 'rcwgroup_range', 'twinring',
        // Chain fields
        'chainconv', 'r1_chain', 'r3_chain', 'r4_chain', 'rr4_chain',
        // Other specialized fields
        'clipon', 'rcwcarrier', 'active_handlecompare'
      ];
      
      // Extract all non-empty part values from motorcycle database
      for (const fieldName of partFieldsToCheck) {
        const motorcycleValue = (motorcycle as any)[fieldName];
        if (motorcycleValue && typeof motorcycleValue === 'string' && motorcycleValue.trim() !== '') {
          motorcyclePartValues.push(motorcycleValue.trim());
        }
      }
      
      console.log(`🔍 Motorcycle ${motorcycleRecid} part values for SKU matching:`, motorcyclePartValues);
      console.log(`📋 Motorcycle ${motorcycleRecid} record:`, JSON.stringify(motorcycle, null, 2));
      
      let compatibleProducts: any[] = [];
      
      // Find products that match motorcycle part values by SKU
      // Also track which specific variant matched for each product
      const productMatchInfo: Map<any, string | null> = new Map();
      
      for (const product of allProducts) {
        let isCompatible = false;
        let matchedVariantId: string | null = null;

        // Check if the main product SKU matches any motorcycle part value
        if (motorcyclePartValues.some(partValue => 
          product.sku && product.sku.toLowerCase().trim() === partValue.toLowerCase().trim()
        )) {
          isCompatible = true;
          // If main product SKU matches, use first variant ID
          matchedVariantId = product.variants?.[0]?.id?.toString() || null;
        }

        // If not matched by main SKU, check variant SKUs
        if (!isCompatible && product.variants) {
          for (const variant of product.variants) {
            if (variant.sku && motorcyclePartValues.some(partValue => 
              variant.sku.toLowerCase().trim() === partValue.toLowerCase().trim()
            )) {
              isCompatible = true;
              matchedVariantId = variant.id?.toString() || null;
              break;
            }
          }
        }

        if (isCompatible) {
          compatibleProducts.push(product);
          productMatchInfo.set(product, matchedVariantId);
        }
      }
      
      // Step 4: Transform compatible products and determine admin categories
      const products: ShopifyProductWithCategory[] = compatibleProducts.map((product: any) => {
        const productTags = (product.tags || '').toLowerCase().split(',').map((tag: string) => tag.trim());
        
        // Find matching category by checking if any product tags match the category's productTags
        let adminCategory = 'others'; // Default category
        let adminCategoryLabel = 'Others'; // Default label
        
        // First, check if this is an OE part by comparing SKUs with motorcycle OE fields
        let isOEPart = false;
        let oeFieldMatch = null;
        
        // Check main product SKU against OE values
        const mainSKU = product.sku;
        if (mainSKU) {
          for (const categoryTag of categoryTags) {
            if (categoryTag.categoryValue.startsWith('oe_')) {
              const oeFieldValue = (motorcycle as any)[categoryTag.categoryValue.toLowerCase()];
              if (oeFieldValue && typeof oeFieldValue === 'string' && oeFieldValue.toLowerCase().trim() === mainSKU.toLowerCase().trim()) {
                isOEPart = true;
                oeFieldMatch = categoryTag;
                adminCategory = categoryTag.assignedSection || 'others';
                adminCategoryLabel = categoryTag.categoryLabel || 'Others';
                break;
              }
            }
          }
        }
        
        // Check variant SKUs against OE values if no main SKU match
        if (!isOEPart && product.variants) {
          for (const variant of product.variants) {
            if (variant.sku) {
              for (const categoryTag of categoryTags) {
                if (categoryTag.categoryValue.startsWith('oe_')) {
                  const oeFieldValue = (motorcycle as any)[categoryTag.categoryValue.toLowerCase()];
                  if (oeFieldValue && typeof oeFieldValue === 'string' && oeFieldValue.toLowerCase().trim() === variant.sku.toLowerCase().trim()) {
                    isOEPart = true;
                    oeFieldMatch = categoryTag;
                    adminCategory = categoryTag.assignedSection || 'others';
                    adminCategoryLabel = categoryTag.categoryLabel || 'Others';
                    break;
                  }
                }
              }
              if (isOEPart) break;
            }
          }
        }
        
        // If not an OE part, use the standard tag matching logic
        if (!isOEPart) {
          for (const categoryTag of categoryTags) {
            if (categoryTag.assignedSection) {
              const categoryProductTags = JSON.parse(categoryTag.productTags || '[]')
                .map((tag: string) => tag.toLowerCase().trim());
              
              // Check if any product tag matches any category tag
              const hasMatch = productTags.some((productTag: string) => 
                categoryProductTags.some((categoryTag: string) => 
                  productTag.includes(categoryTag) || categoryTag.includes(productTag)
                )
              );
              
              if (hasMatch) {
                adminCategory = categoryTag.assignedSection;
                adminCategoryLabel = categoryTag.categoryLabel;
                break; // Use first match
              }
            }
          }
        }
        
        // Get the matched variant ID for this product
        const matchedVariantId = productMatchInfo.get(product);
        
        const productData = {
          id: product.id ? product.id.toString() : `temp-${Math.random().toString(36)}`,
          title: product.title || 'Unknown Product',
          description: product.body_html || null,
          price: product.variants?.[0]?.price || '0.00',
          sku: product.variants?.[0]?.sku || null,
          imageUrl: product.images?.[0]?.src || null,
          category: product.product_type || null,
          tags: product.tags || '', // Shopify returns tags as comma-separated string
          variants: product.variants || [],
          handle: product.handle || null,
          url: product.handle ? `/products/${product.handle}` : null,
          adminCategory: adminCategory,
          adminCategoryLabel: adminCategoryLabel,
          matchedVariantId: matchedVariantId // ID of the variant that matched motorcycle's SKU
        };
        
        // Debug log to help identify any missing fields
        if (!product.id) {
          console.warn(`⚠️ Product missing ID:`, JSON.stringify(product, null, 2));
        }
        
        return productData;
      }) || [];
      
      console.log(`✅ LIVE DATA: Found ${products.length} compatible parts for motorcycle ${motorcycleRecid}`);
      return products;
      
    } catch (error) {
      console.error('Failed to fetch live compatible parts:', error);
      // Return empty array instead of throwing to prevent complete failure
      return [];
    }
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
    return await db.select().from(partCategoryTags).orderBy(
      asc(partCategoryTags.assignedSection),
      asc(partCategoryTags.sortOrder)
    );
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
    const result = await db.delete(partCategoryTags).where(eq(partCategoryTags.categoryValue, categoryValue)).returning();
    return result.length > 0;
  }

  // Part Sections
  async getPartSections(): Promise<PartSection[]> {
    return await db.select().from(partSections).orderBy(asc(partSections.sortOrder));
  }

  async getPartSection(sectionKey: string): Promise<PartSection | undefined> {
    const result = await db.select().from(partSections).where(eq(partSections.sectionKey, sectionKey));
    return result[0];
  }

  async createPartSection(partSection: InsertPartSection): Promise<PartSection> {
    const result = await db.insert(partSections).values(partSection).returning();
    return result[0];
  }

  async updatePartSection(sectionKey: string, updates: Partial<InsertPartSection>): Promise<PartSection | undefined> {
    const result = await db.update(partSections)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(partSections.sectionKey, sectionKey))
      .returning();
    return result[0];
  }

  async deletePartSection(sectionKey: string): Promise<boolean> {
    const result = await db.delete(partSections).where(eq(partSections.sectionKey, sectionKey)).returning();
    return result.length > 0;
  }

  async initializeDefaultPartSections(): Promise<PartSection[]> {
    const defaultSections = [
      { sectionKey: "handlebars", sectionLabel: "Handlebars", sortOrder: 0, isActive: true },
      { sectionKey: "frontSprocket", sectionLabel: "Front Sprocket", sortOrder: 1, isActive: true },
      { sectionKey: "rearSprockets", sectionLabel: "Rear Sprockets", sortOrder: 2, isActive: true },
      { sectionKey: "chain", sectionLabel: "Chain", sortOrder: 3, isActive: true },
      { sectionKey: "brakePads", sectionLabel: "Brake Pads", sortOrder: 4, isActive: true },
      { sectionKey: "barMounts", sectionLabel: "Bar Mounts", sortOrder: 5, isActive: true },
      { sectionKey: "driveConversions", sectionLabel: "Drive Conversions", sortOrder: 6, isActive: true },
      { sectionKey: "others", sectionLabel: "Others", sortOrder: 7, isActive: true },
    ];

    const result = await db.insert(partSections).values(defaultSections).returning();
    return result;
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

  async getNextMotorcycleRecid(): Promise<number> {
    const rows = await db
      .select({ 
        maxRecid: sql<number>`max(${motorcycles.recid})` 
      })
      .from(motorcycles);
    
    const max = rows[0]?.maxRecid == null ? 9999 : Number(rows[0].maxRecid);
    return max + 1;
  }

  // ========== SKU-BASED HEALING FUNCTIONS ==========
  
  /**
   * Validates all part mappings and identifies stale product IDs
   */
  async validatePartMappings(): Promise<{
    healthy: Array<{id: string, shopifyProductId: string, expectedSku: string | null}>,
    stale: Array<{id: string, shopifyProductId: string, expectedSku: string | null}>,
    missing: Array<{id: string, shopifyProductId: string}>
  }> {
    const session = getCurrentSession();
    if (!session) {
      throw new Error('No Shopify session available for validation');
    }

    // Get all part mappings
    const mappings = await db.select().from(partMappings);
    
    // Get unique product IDs to check
    const uniqueProductIds = Array.from(new Set(mappings.map(m => m.shopifyProductId)));
    
    // Fetch products from Shopify to validate IDs
    const shopifyResponse = await fetchShopifyProductsByIds(session, uniqueProductIds);
    const existingProducts = shopifyResponse.products || [];
    const existingProductIds = new Set(existingProducts.map((p: any) => p.id.toString()));
    
    const healthy = [];
    const stale = [];
    const missing = [];
    
    for (const mapping of mappings) {
      if (existingProductIds.has(mapping.shopifyProductId)) {
        healthy.push({
          id: mapping.id,
          shopifyProductId: mapping.shopifyProductId,
          expectedSku: mapping.expectedSku
        });
      } else {
        if (mapping.expectedSku) {
          stale.push({
            id: mapping.id,
            shopifyProductId: mapping.shopifyProductId,
            expectedSku: mapping.expectedSku
          });
        } else {
          missing.push({
            id: mapping.id,
            shopifyProductId: mapping.shopifyProductId
          });
        }
      }
    }
    
    return { healthy, stale, missing };
  }

  /**
   * Heals a stale part mapping by finding the product with matching SKU
   */
  async healPartMapping(mappingId: string, expectedSku: string): Promise<{
    success: boolean, 
    newProductId?: string,
    message: string
  }> {
    const session = getCurrentSession();
    if (!session) {
      return { success: false, message: 'No Shopify session available' };
    }

    try {
      // Get all products from Shopify to search for SKU
      const shopifyResponse = await fetchShopifyProducts(session);
      const allProducts = shopifyResponse.products || [];
      
      // Find product containing the expected SKU (check main SKU and variants)
      let matchingProduct = null;
      for (const product of allProducts) {
        // Check main product SKU
        if (product.sku && product.sku.toLowerCase().trim() === expectedSku.toLowerCase().trim()) {
          matchingProduct = product;
          break;
        }
        
        // Check variant SKUs
        if (product.variants) {
          for (const variant of product.variants) {
            if (variant.sku && variant.sku.toLowerCase().trim() === expectedSku.toLowerCase().trim()) {
              matchingProduct = product;
              break;
            }
          }
          if (matchingProduct) break;
        }
      }
      
      if (!matchingProduct) {
        return { 
          success: false, 
          message: `No product found with SKU: ${expectedSku}` 
        };
      }
      
      // Update the mapping with the new product ID
      await db
        .update(partMappings)
        .set({
          shopifyProductId: matchingProduct.id.toString(),
          productTitle: matchingProduct.title,
          lastSynced: new Date().toISOString(),
          status: 'active'
        })
        .where(eq(partMappings.id, mappingId));
      
      return {
        success: true,
        newProductId: matchingProduct.id.toString(),
        message: `Healed mapping: ${expectedSku} → ${matchingProduct.title} (ID: ${matchingProduct.id})`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error healing mapping: ${(error as Error).message}`
      };
    }
  }

  /**
   * Populates missing SKU and title data for existing part mappings
   */
  async populatePartMappingMetadata(): Promise<{
    updated: number,
    failed: number,
    details: Array<{id: string, sku?: string, title?: string, error?: string}>
  }> {
    const session = getCurrentSession();
    if (!session) {
      throw new Error('No Shopify session available');
    }

    // Get mappings without expected_sku or product_title
    const mappingsToUpdate = await db
      .select()
      .from(partMappings)
      .where(
        or(
          sql`${partMappings.expectedSku} IS NULL`,
          sql`${partMappings.productTitle} IS NULL`
        )
      );

    if (mappingsToUpdate.length === 0) {
      return { updated: 0, failed: 0, details: [] };
    }

    // Get unique product IDs to fetch
    const uniqueProductIds = Array.from(new Set(mappingsToUpdate.map(m => m.shopifyProductId)));
    
    // Fetch products from Shopify
    const shopifyResponse = await fetchShopifyProductsByIds(session, uniqueProductIds);
    const products = shopifyResponse.products || [];
    
    // Create product lookup map
    const productMap = new Map(products.map((p: any) => [p.id.toString(), p]));
    
    let updated = 0;
    let failed = 0;
    const details = [];
    
    for (const mapping of mappingsToUpdate) {
      const product = productMap.get(mapping.shopifyProductId);
      
      if (product) {
        // Get the primary SKU (from first variant or main product)
        const primarySku = (product as any).variants?.[0]?.sku || (product as any).sku || null;
        
        try {
          await db
            .update(partMappings)
            .set({
              expectedSku: primarySku,
              productTitle: (product as any).title,
              lastSynced: new Date().toISOString(),
              status: 'active'
            })
            .where(eq(partMappings.id, mapping.id));
          
          updated++;
          details.push({
            id: mapping.id,
            sku: primarySku,
            title: (product as any).title
          });
        } catch (error) {
          failed++;
          details.push({
            id: mapping.id,
            error: `Update failed: ${(error as Error).message}`
          });
        }
      } else {
        failed++;
        details.push({
          id: mapping.id,
          error: `Product ${mapping.shopifyProductId} not found in Shopify`
        });
      }
    }
    
    return { updated, failed, details };
  }

  /**
   * Auto-heals all stale part mappings by finding products with matching SKUs
   */
  async autoHealAllStalePartMappings(): Promise<{
    healed: number,
    failed: number,
    details: Array<{id: string, message: string}>
  }> {
    const validation = await this.validatePartMappings();
    
    let healed = 0;
    let failed = 0;
    const details = [];
    
    for (const staleMapping of validation.stale) {
      const result = await this.healPartMapping(staleMapping.id, staleMapping.expectedSku!);
      
      if (result.success) {
        healed++;
      } else {
        failed++;
      }
      
      details.push({
        id: staleMapping.id,
        message: result.message
      });
    }
    
    return { healed, failed, details };
  }

  // Motorcycle Category Configuration
  async getMotorcycleCategoryConfig(): Promise<MotorcycleCategoryConfig[]> {
    return await db.select().from(motorcycleCategoryConfig)
      .where(eq(motorcycleCategoryConfig.isActive, true))
      .orderBy(motorcycleCategoryConfig.sortOrder);
  }

  async createMotorcycleCategoryConfig(config: InsertMotorcycleCategoryConfig): Promise<MotorcycleCategoryConfig> {
    const result = await db.insert(motorcycleCategoryConfig).values(config).returning();
    return result[0];
  }

  async updateMotorcycleCategoryConfig(id: string, updates: Partial<InsertMotorcycleCategoryConfig>): Promise<MotorcycleCategoryConfig | undefined> {
    const result = await db.update(motorcycleCategoryConfig)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(motorcycleCategoryConfig.id, id))
      .returning();
    return result[0];
  }

  async deleteMotorcycleCategoryConfig(id: string): Promise<boolean> {
    // Soft delete by setting isActive to false
    const result = await db.update(motorcycleCategoryConfig)
      .set({ isActive: false, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(motorcycleCategoryConfig.id, id))
      .returning();
    return result.length > 0;
  }

  async hardDeleteMotorcycleCategoryConfig(id: string): Promise<boolean> {
    // Hard delete for complete removal
    const result = await db.delete(motorcycleCategoryConfig)
      .where(eq(motorcycleCategoryConfig.id, id));
    return result.length > 0;
  }

  // Advisory Locks - PostgreSQL session-level locks for preventing concurrent operations
  async acquireAdvisoryLock(lockId: number): Promise<boolean> {
    try {
      // pg_try_advisory_lock returns true if lock acquired, false if already held
      const result = await sqlConnection`SELECT pg_try_advisory_lock(${lockId}) as acquired`;
      return result[0]?.acquired || false;
    } catch (error) {
      console.error('Error acquiring advisory lock:', error);
      return false;
    }
  }

  async releaseAdvisoryLock(lockId: number): Promise<boolean> {
    try {
      // pg_advisory_unlock returns true if lock was held and released
      const result = await sqlConnection`SELECT pg_advisory_unlock(${lockId}) as released`;
      return result[0]?.released || false;
    } catch (error) {
      console.error('Error releasing advisory lock:', error);
      return false;
    }
  }
}