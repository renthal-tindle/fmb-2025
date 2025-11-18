import { 
  type Motorcycle, 
  type InsertMotorcycle,
  type MotorcycleExtended,
  type InsertMotorcycleExtended,
  type SystemSetting,
  type InsertSystemSetting,
  type ShopifyProductWithVariants,
  type PartMapping,
  type InsertPartMapping,
  type ImportHistory,
  type InsertImportHistory,
  type PartCategoryTags,
  type InsertPartCategoryTags,
  type SearchAnalytics,
  type InsertSearchAnalytics,
  type PartSection,
  type InsertPartSection
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Motorcycles
  getMotorcycles(): Promise<Motorcycle[]>;
  getMotorcycle(recid: number): Promise<Motorcycle | undefined>;
  createMotorcycle(motorcycle: InsertMotorcycle): Promise<Motorcycle>;
  updateMotorcycle(recid: number, motorcycle: Partial<InsertMotorcycle>): Promise<Motorcycle | undefined>;
  deleteMotorcycle(recid: number): Promise<boolean>;
  searchMotorcycles(query: string): Promise<Motorcycle[]>;
  filterMotorcycles(filters: { bikemake?: string; firstyear?: number; lastyear?: number; bikeCategory?: string; bikeSubcategory?: string }): Promise<Motorcycle[]>;
  getDistinctMotorcycleMakes(): Promise<string[]>;
  getDistinctMotorcycleYears(): Promise<number[]>;
  getDistinctMotorcycleModelsByMake(make: string): Promise<string[]>;
  getDistinctYearsByMakeModel(make: string, model: string): Promise<string[]>;
  filterMotorcyclesByMakeModelYear(make: string, model: string, year?: number): Promise<Motorcycle[]>;
  filterMotorcyclesByMakeModelYearRange(make: string, model: string, startYear?: number, endYear?: number): Promise<Motorcycle[]>;
  getNextMotorcycleRecid(): Promise<number>;
  getCategoryUsage(): Promise<{ fixedColumns: string[], jsonbCategories: { category: string, count: number }[] }>;

  // Part Mappings
  getPartMappings(): Promise<PartMapping[]>;
  getPartMappingsByMotorcycle(motorcycleRecid: number): Promise<PartMapping[]>;
  getPartMappingsByProduct(productId: string): Promise<PartMapping[]>;
  createPartMapping(mapping: InsertPartMapping): Promise<PartMapping>;
  deletePartMapping(id: string): Promise<boolean>;

  // Compatible Parts (fetches live from Shopify API, not from database)
  getCompatibleParts(motorcycleRecid: number): Promise<ShopifyProductWithVariants[]>;

  // Import History
  getImportHistory(): Promise<ImportHistory[]>;
  createImportHistory(history: InsertImportHistory): Promise<ImportHistory>;

  // Bulk operations
  bulkCreateMotorcycles(motorcycles: InsertMotorcycle[]): Promise<Motorcycle[]>;
  bulkCreatePartMappings(mappings: InsertPartMapping[]): Promise<PartMapping[]>;

  // Shopify Sessions
  getShopifySession(id: string): Promise<any | undefined>;
  storeShopifySession(session: any): Promise<boolean>;
  deleteShopifySession(id: string): Promise<boolean>;
  getAllShopifySessions(): Promise<any[]>;

  // Part Category Tags
  getPartCategoryTags(): Promise<PartCategoryTags[]>;
  getPartCategoryTag(categoryValue: string): Promise<PartCategoryTags | undefined>;
  createPartCategoryTag(partCategoryTag: InsertPartCategoryTags): Promise<PartCategoryTags>;
  updatePartCategoryTag(categoryValue: string, updates: Partial<InsertPartCategoryTags>): Promise<PartCategoryTags | undefined>;
  deletePartCategoryTag(categoryValue: string): Promise<boolean>;

  // Part Sections
  getPartSections(): Promise<PartSection[]>;
  getPartSection(sectionKey: string): Promise<PartSection | undefined>;
  createPartSection(partSection: InsertPartSection): Promise<PartSection>;
  updatePartSection(sectionKey: string, updates: Partial<InsertPartSection>): Promise<PartSection | undefined>;
  deletePartSection(sectionKey: string): Promise<boolean>;
  initializeDefaultPartSections(): Promise<PartSection[]>;

  // Search Analytics
  createSearchAnalytics(analytics: InsertSearchAnalytics): Promise<SearchAnalytics>;
  getTopSearches(dateFrom?: string, dateTo?: string, limit?: number): Promise<{searchQuery: string, searchCount: number}[]>;
  
  // Advisory Locks (for preventing concurrent operations)
  acquireAdvisoryLock(lockId: number): Promise<boolean>;
  releaseAdvisoryLock(lockId: number): Promise<boolean>;

  // System Settings
  getSystemSetting(key: string): Promise<string | undefined>;
  setSystemSetting(key: string, value: string, description?: string): Promise<void>;

  // Motorcycles Extended (parallel testing table)
  getMotorcyclesExtended(): Promise<MotorcycleExtended[]>;
  getMotorcycleExtended(recid: number): Promise<MotorcycleExtended | undefined>;
  createMotorcycleExtended(motorcycle: InsertMotorcycleExtended): Promise<MotorcycleExtended>;
  updateMotorcycleExtended(recid: number, motorcycle: Partial<InsertMotorcycleExtended>): Promise<MotorcycleExtended | undefined>;
  syncMotorcyclesToExtended(): Promise<number>;
}

export class MemStorage implements IStorage {
  private motorcycles: Map<number, Motorcycle>;
  private shopifyProducts: Map<string, ShopifyProduct>;
  private partMappings: Map<string, PartMapping>;
  private importHistory: Map<string, ImportHistory>;
  private partCategoryTags: Map<string, PartCategoryTags>;
  private searchAnalytics: Map<string, SearchAnalytics>;
  private nextRecid: number;

  constructor() {
    this.motorcycles = new Map();
    this.shopifyProducts = new Map();
    this.partMappings = new Map();
    this.importHistory = new Map();
    this.partCategoryTags = new Map();
    this.searchAnalytics = new Map();
    this.nextRecid = 10000; // Start with a higher number to match existing data
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample motorcycles using new schema structure
    const sampleMotorcycles: InsertMotorcycle[] = [
      {
        recid: 10001,
        bikemake: "Honda",
        bikemodel: "CBR600RR",
        firstyear: 2023,
        lastyear: 2023,
        capacity: 599
      },
      {
        recid: 10002,
        bikemake: "Yamaha",
        bikemodel: "MT-09",
        firstyear: 2023,
        lastyear: 2023,
        capacity: 889
      },
      {
        recid: 10003,
        bikemake: "Kawasaki",
        bikemodel: "Ninja ZX-6R",
        firstyear: 2022,
        lastyear: 2022,
        capacity: 636
      }
    ];

    // Sample Shopify products
    const sampleProducts: InsertShopifyProduct[] = [
      {
        id: "brake-disc-001",
        title: "Premium Brake Disc Set",
        description: "High-performance brake discs for sport motorcycles",
        price: "149.99",
        sku: "BRK-001",
        imageUrl: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        category: "Brakes"
      },
      {
        id: "chain-kit-002",
        title: "Chain & Sprocket Kit",
        description: "Complete drive chain and sprocket replacement kit",
        price: "89.99",
        sku: "CHN-002",
        imageUrl: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        category: "Drivetrain"
      },
      {
        id: "exhaust-003",
        title: "Performance Exhaust System",
        description: "Titanium slip-on exhaust for enhanced performance",
        price: "299.99",
        sku: "EXH-003",
        imageUrl: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        category: "Performance"
      },
      {
        id: "headlight-004",
        title: "LED Headlight Assembly",
        description: "High-brightness LED headlight with DRL function",
        price: "199.99",
        sku: "LED-004",
        imageUrl: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        category: "Electrical"
      }
    ];

    // Initialize sample data
    sampleMotorcycles.forEach(motorcycle => {
      this.createMotorcycle(motorcycle);
    });

    sampleProducts.forEach(product => {
      this.createShopifyProduct(product);
    });
  }

  // Motorcycles
  async getMotorcycles(): Promise<Motorcycle[]> {
    return Array.from(this.motorcycles.values());
  }

  async getMotorcycle(recid: number): Promise<Motorcycle | undefined> {
    return this.motorcycles.get(recid);
  }

  async createMotorcycle(insertMotorcycle: InsertMotorcycle): Promise<Motorcycle> {
    const recid = insertMotorcycle.recid || this.nextRecid++;
    const motorcycle: Motorcycle = { 
      ...insertMotorcycle,
      recid,
      capacity: insertMotorcycle.capacity || null,
      oe_handlebar: insertMotorcycle.oe_handlebar || null,
      oe_fcw: insertMotorcycle.oe_fcw || null,
      oe_rcw: insertMotorcycle.oe_rcw || null,
      front_brakepads: insertMotorcycle.front_brakepads || null,
      rear_brakepads: insertMotorcycle.rear_brakepads || null,
      handlebars_78: insertMotorcycle.handlebars_78 || null,
      twinwall: insertMotorcycle.twinwall || null,
      fatbar: insertMotorcycle.fatbar || null,
      fatbar36: insertMotorcycle.fatbar36 || null,
      grips: insertMotorcycle.grips || null,
      cam: insertMotorcycle.cam || null,
      oe_barmount: insertMotorcycle.oe_barmount || null,
      barmount28: insertMotorcycle.barmount28 || null,
      barmount36: insertMotorcycle.barmount36 || null,
      fcwgroup: insertMotorcycle.fcwgroup || null,
      fcwconv: insertMotorcycle.fcwconv || null,
      rcwconv: insertMotorcycle.rcwconv || null,
      rcwgroup: insertMotorcycle.rcwgroup || null,
      rcwgroup_range: insertMotorcycle.rcwgroup_range || null,
      twinring: insertMotorcycle.twinring || null,
      oe_chain: insertMotorcycle.oe_chain || null,
      chainconv: insertMotorcycle.chainconv || null,
      r1_chain: insertMotorcycle.r1_chain || null,
      r3_chain: insertMotorcycle.r3_chain || null,
      r4_chain: insertMotorcycle.r4_chain || null,
      rr4_chain: insertMotorcycle.rr4_chain || null,
      clipon: insertMotorcycle.clipon || null,
      rcwcarrier: insertMotorcycle.rcwcarrier || null,
      active_handlecompare: insertMotorcycle.active_handlecompare || null
    };
    this.motorcycles.set(recid, motorcycle);
    return motorcycle;
  }

  async updateMotorcycle(recid: number, updates: Partial<InsertMotorcycle>): Promise<Motorcycle | undefined> {
    const existing = this.motorcycles.get(recid);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.motorcycles.set(recid, updated);
    return updated;
  }

  async deleteMotorcycle(recid: number): Promise<boolean> {
    return this.motorcycles.delete(recid);
  }

  async searchMotorcycles(query: string): Promise<Motorcycle[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.motorcycles.values()).filter(
      motorcycle =>
        motorcycle.bikemake.toLowerCase().includes(searchTerm) ||
        motorcycle.bikemodel.toLowerCase().includes(searchTerm)
    );
  }

  async filterMotorcycles(filters: { bikemake?: string; firstyear?: number; lastyear?: number; bikeCategory?: string; bikeSubcategory?: string }): Promise<Motorcycle[]> {
    return Array.from(this.motorcycles.values()).filter(motorcycle => {
      if (filters.bikemake && motorcycle.bikemake.toLowerCase() !== filters.bikemake.toLowerCase()) return false;
      // If user selects a year like 2021, find bikes that were available in 2021
      // This means: firstyear <= 2021 AND lastyear >= 2021  
      if (filters.firstyear && (motorcycle.firstyear > filters.firstyear || motorcycle.lastyear < filters.firstyear)) return false;
      if (filters.lastyear && (motorcycle.firstyear > filters.lastyear || motorcycle.lastyear < filters.lastyear)) return false;
      if (filters.bikeCategory && motorcycle.bikeCategory !== filters.bikeCategory) return false;
      if (filters.bikeSubcategory && motorcycle.bikeSubcategory !== filters.bikeSubcategory) return false;
      return true;
    });
  }

  async getDistinctMotorcycleMakes(): Promise<string[]> {
    const motorcycles = Array.from(this.motorcycles.values());
    const makes = Array.from(new Set(motorcycles.map(m => m.bikemake)));
    return makes.sort();
  }

  async getDistinctMotorcycleYears(): Promise<number[]> {
    const motorcycles = Array.from(this.motorcycles.values());
    const allYears = new Set<number>();
    
    motorcycles.forEach(motorcycle => {
      // Add all years in the range from firstyear to lastyear
      for (let year = motorcycle.firstyear; year <= motorcycle.lastyear; year++) {
        allYears.add(year);
      }
    });
    
    // Convert to array and sort in descending order (newest first)
    return Array.from(allYears).sort((a, b) => b - a);
  }

  async getDistinctMotorcycleModelsByMake(make: string): Promise<string[]> {
    const motorcycles = Array.from(this.motorcycles.values());
    const models = motorcycles
      .filter(m => m.bikemake.toLowerCase() === make.toLowerCase())
      .map(m => m.bikemodel);
    
    return Array.from(new Set(models)).sort();
  }

  async getDistinctYearsByMakeModel(make: string, model: string): Promise<string[]> {
    const motorcycles = Array.from(this.motorcycles.values());
    const allYears = new Set<number>();
    
    motorcycles
      .filter(m => 
        m.bikemake.toLowerCase() === make.toLowerCase() && 
        m.bikemodel.toLowerCase() === model.toLowerCase()
      )
      .forEach(motorcycle => {
        // Add all years in the range from firstyear to lastyear
        for (let year = motorcycle.firstyear; year <= motorcycle.lastyear; year++) {
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
    return Array.from(this.motorcycles.values()).filter(motorcycle => {
      // Make is required
      if (motorcycle.bikemake.toLowerCase() !== make.toLowerCase()) return false;
      
      // Model is required
      if (motorcycle.bikemodel.toLowerCase() !== model.toLowerCase()) return false;
      
      // Year is optional - if provided, check if the year falls within the bike's production range
      if (year && (motorcycle.firstyear > year || motorcycle.lastyear < year)) return false;
      
      return true;
    });
  }

  async filterMotorcyclesByMakeModelYearRange(make: string, model: string, startYear?: number, endYear?: number): Promise<Motorcycle[]> {
    return Array.from(this.motorcycles.values()).filter(motorcycle => {
      // Make is required
      if (motorcycle.bikemake.toLowerCase() !== make.toLowerCase()) return false;
      
      // Model is required
      if (motorcycle.bikemodel.toLowerCase() !== model.toLowerCase()) return false;
      
      // Year range is optional - if provided, check if the ranges overlap
      if (startYear !== undefined && endYear !== undefined) {
        // Check if the motorcycle's production range overlaps with the selected year range
        // Ranges overlap if: motorcycle.firstyear <= endYear AND motorcycle.lastyear >= startYear
        if (motorcycle.firstyear > endYear || motorcycle.lastyear < startYear) return false;
      }
      
      return true;
    });
  }

  async getNextMotorcycleRecid(): Promise<number> {
    if (this.motorcycles.size === 0) {
      return 10000; // Default starting point
    }
    const maxRecid = Math.max(...Array.from(this.motorcycles.keys()));
    return maxRecid + 1;
  }

  async getCategoryUsage(): Promise<{ fixedColumns: string[], jsonbCategories: { category: string, count: number }[] }> {
    // Same fixed columns list as DatabaseStorage
    const fixedColumns = [
      'oe_handlebar', 'oe_fcw', 'oe_rcw', 'front_brakepads', 'rear_brakepads',
      'handlebars_78', 'twinwall', 'fatbar', 'fatbar36', 'grips', 'cam',
      'oe_barmount', 'barmount28', 'barmount36', 'fcwgroup', 'fcwconv',
      'rcwconv', 'rcwgroup', 'rcwgroup_range', 'twinring', 'oe_chain',
      'chainconv', 'r1_chain', 'r3_chain', 'r4_chain', 'rr4_chain',
      'clipon', 'rcwcarrier', 'active_handlecompare', 'other_fcw'
    ];

    // Count JSONB category usage from in-memory motorcycles
    const categoryCount = new Map<string, number>();
    
    for (const motorcycle of this.motorcycles.values()) {
      if (motorcycle.customParts && typeof motorcycle.customParts === 'object') {
        const customParts = motorcycle.customParts as Record<string, string | null>;
        for (const category in customParts) {
          const value = customParts[category];
          if (value && value.trim() !== '') {
            categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
          }
        }
      }
    }

    const jsonbCategories = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

    return { fixedColumns, jsonbCategories };
  }

  // Shopify Products
  async getShopifyProducts(): Promise<ShopifyProduct[]> {
    return Array.from(this.shopifyProducts.values());
  }

  async getShopifyProduct(id: string): Promise<ShopifyProduct | undefined> {
    return this.shopifyProducts.get(id);
  }

  async createShopifyProduct(product: InsertShopifyProduct): Promise<ShopifyProduct> {
    const shopifyProduct: ShopifyProduct = {
      ...product,
      description: product.description || null,
      sku: product.sku || null,
      imageUrl: product.imageUrl || null,
      category: product.category || null,
      tags: product.tags || null,
      variants: product.variants || null
    };
    this.shopifyProducts.set(product.id, shopifyProduct);
    return shopifyProduct;
  }

  async updateShopifyProduct(id: string, updates: Partial<InsertShopifyProduct>): Promise<ShopifyProduct | undefined> {
    const existing = this.shopifyProducts.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.shopifyProducts.set(id, updated);
    return updated;
  }

  async searchShopifyProducts(query: string): Promise<ShopifyProduct[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.shopifyProducts.values()).filter(
      product =>
        product.title.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm))
    );
  }

  // Part Mappings
  async getPartMappings(): Promise<PartMapping[]> {
    return Array.from(this.partMappings.values());
  }

  async getPartMappingsByMotorcycle(motorcycleRecid: number): Promise<PartMapping[]> {
    return Array.from(this.partMappings.values()).filter(
      mapping => mapping.motorcycleRecid === motorcycleRecid
    );
  }

  async getPartMappingsByProduct(productId: string): Promise<PartMapping[]> {
    return Array.from(this.partMappings.values()).filter(
      mapping => mapping.shopifyProductId === productId
    );
  }

  async createPartMapping(mapping: InsertPartMapping): Promise<PartMapping> {
    const id = randomUUID();
    const partMapping: PartMapping = { 
      ...mapping, 
      id,
      compatible: mapping.compatible !== undefined ? mapping.compatible : true,
      status: mapping.status || 'active',
      expectedSku: mapping.expectedSku || null,
      productTitle: mapping.productTitle || null,
      lastSynced: mapping.lastSynced || new Date().toISOString()
    };
    this.partMappings.set(id, partMapping);
    return partMapping;
  }

  async deletePartMapping(id: string): Promise<boolean> {
    return this.partMappings.delete(id);
  }

  // Compatible Parts - Uses motorcycle database fields for SKU matching (ignores admin part mappings)
  async getCompatibleParts(motorcycleRecid: number): Promise<ShopifyProduct[]> {
    console.log(`🔍 Using motorcycle database fields for compatibility matching (motorcycle ${motorcycleRecid})`);
    
    // Get the motorcycle details
    const motorcycle = await this.getMotorcycle(motorcycleRecid);
    if (!motorcycle) {
      return [];
    }
    
    // Collect ALL motorcycle part values for SKU matching (not just OE fields)
    const motorcyclePartValues = [];
    
    // Collect prefix match values for FCW/RCW groups when OE is empty
    const prefixMatchValues: string[] = [];
    
    // Check if fcwgroup is populated but oe_fcw is empty → add for prefix matching
    if (motorcycle.fcwgroup && motorcycle.fcwgroup.trim() !== '' && 
        (!motorcycle.oe_fcw || motorcycle.oe_fcw.trim() === '')) {
      prefixMatchValues.push(motorcycle.fcwgroup.trim());
      console.log(`🔧 FCW Group "${motorcycle.fcwgroup}" with no OE Front Sprocket → will match all variants with prefix`);
    }
    
    // Check if rcwgroup is populated but oe_rcw is empty → add for prefix matching
    if (motorcycle.rcwgroup && motorcycle.rcwgroup.trim() !== '' && 
        (!motorcycle.oe_rcw || motorcycle.oe_rcw.trim() === '')) {
      prefixMatchValues.push(motorcycle.rcwgroup.trim());
      console.log(`🔧 RCW Group "${motorcycle.rcwgroup}" with no OE Rear Sprocket → will match all variants with prefix`);
    }
    
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
    console.log(`🔍 Motorcycle ${motorcycleRecid} prefix match values:`, prefixMatchValues);
    console.log(`📋 Motorcycle ${motorcycleRecid} record:`, JSON.stringify(motorcycle, null, 2));
    
    let compatibleProducts: ShopifyProduct[] = [];
    
    // Find products that match motorcycle part values by SKU
    for (const product of Array.from(this.shopifyProducts.values())) {
      let isCompatible = false;

      // Check if the main product SKU matches any motorcycle part value (exact match)
      if (motorcyclePartValues.some(partValue => 
        product.sku && product.sku.toLowerCase().trim() === partValue.toLowerCase().trim()
      )) {
        isCompatible = true;
      }
      
      // Check if product title matches any prefix value (for group products without OE)
      if (!isCompatible && prefixMatchValues.some(prefix => 
        product.title && product.title.toLowerCase().trim() === prefix.toLowerCase().trim()
      )) {
        isCompatible = true;
        console.log(`✅ Product title match: "${product.title}" matches FCW/RCW group → returning all variants`);
      }

      // If not matched by main SKU, check variant SKUs if available
      if (!isCompatible && product.variants) {
        const variants = typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants;
        for (const variant of variants) {
          // Exact SKU match
          if (variant.sku && motorcyclePartValues.some(partValue => 
            variant.sku.toLowerCase().trim() === partValue.toLowerCase().trim()
          )) {
            isCompatible = true;
            break;
          }
          
          // Prefix match for FCW/RCW groups (when OE is empty, show all variants)
          if (!isCompatible && variant.sku && prefixMatchValues.some(prefix => 
            variant.sku.toLowerCase().trim().startsWith(prefix.toLowerCase().trim())
          )) {
            isCompatible = true;
            console.log(`✅ Prefix match: variant SKU "${variant.sku}" matches prefix "${prefixMatchValues.find(p => variant.sku.toLowerCase().trim().startsWith(p.toLowerCase().trim()))}"`);
            break;
          }
        }
      }

      if (isCompatible) {
        compatibleProducts.push(product);
      }
    }
    
    console.log(`✅ Found ${compatibleProducts.length} compatible parts for motorcycle ${motorcycleRecid} using motorcycle database fields (${prefixMatchValues.length} prefix matches)`);
    return compatibleProducts;
  }

  // Import History
  async getImportHistory(): Promise<ImportHistory[]> {
    return Array.from(this.importHistory.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createImportHistory(history: InsertImportHistory): Promise<ImportHistory> {
    const id = randomUUID();
    const importRecord: ImportHistory = {
      ...history,
      id,
      createdAt: new Date().toISOString(),
    };
    this.importHistory.set(id, importRecord);
    return importRecord;
  }

  // Bulk operations
  async bulkCreateMotorcycles(motorcycles: InsertMotorcycle[]): Promise<Motorcycle[]> {
    const results: Motorcycle[] = [];
    for (const motorcycle of motorcycles) {
      results.push(await this.createMotorcycle(motorcycle));
    }
    return results;
  }

  async bulkCreatePartMappings(mappings: InsertPartMapping[]): Promise<PartMapping[]> {
    const results: PartMapping[] = [];
    for (const mapping of mappings) {
      results.push(await this.createPartMapping(mapping));
    }
    return results;
  }

  // Shopify Sessions (stub implementation for MemStorage)
  async getShopifySession(id: string): Promise<any | undefined> {
    return undefined;
  }

  async storeShopifySession(session: any): Promise<boolean> {
    return true;
  }

  async deleteShopifySession(id: string): Promise<boolean> {
    return true;
  }

  async getAllShopifySessions(): Promise<any[]> {
    return [];
  }

  // Part Category Tags (stub implementation for MemStorage)
  async getPartCategoryTags(): Promise<PartCategoryTags[]> {
    return Array.from(this.partCategoryTags.values());
  }

  async getPartCategoryTag(categoryValue: string): Promise<PartCategoryTags | undefined> {
    return this.partCategoryTags.get(categoryValue);
  }

  async createPartCategoryTag(partCategoryTag: InsertPartCategoryTags): Promise<PartCategoryTags> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const tag: PartCategoryTags = {
      id,
      ...partCategoryTag,
      assignedSection: partCategoryTag.assignedSection || null,
      createdAt: now,
      updatedAt: now,
    };
    this.partCategoryTags.set(partCategoryTag.categoryValue, tag);
    return tag;
  }

  async updatePartCategoryTag(categoryValue: string, updates: Partial<InsertPartCategoryTags>): Promise<PartCategoryTags | undefined> {
    const existing = this.partCategoryTags.get(categoryValue);
    if (!existing) return undefined;
    
    const updated: PartCategoryTags = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.partCategoryTags.set(categoryValue, updated);
    return updated;
  }

  async deletePartCategoryTag(categoryValue: string): Promise<boolean> {
    return this.partCategoryTags.delete(categoryValue);
  }

  // Search Analytics methods
  async createSearchAnalytics(analytics: InsertSearchAnalytics): Promise<SearchAnalytics> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const searchAnalytics: SearchAnalytics = {
      id,
      ...analytics,
      resultsCount: analytics.resultsCount || 0,
      ipAddress: analytics.ipAddress || null,
      userAgent: analytics.userAgent || null,
      createdAt: now,
    };
    this.searchAnalytics.set(id, searchAnalytics);
    return searchAnalytics;
  }

  async getTopSearches(dateFrom?: string, dateTo?: string, limit: number = 25): Promise<{searchQuery: string, searchCount: number}[]> {
    const allSearches = Array.from(this.searchAnalytics.values());
    
    // Filter by date range if provided
    let filteredSearches = allSearches;
    if (dateFrom) {
      filteredSearches = filteredSearches.filter(s => s.createdAt >= dateFrom);
    }
    if (dateTo) {
      filteredSearches = filteredSearches.filter(s => s.createdAt <= dateTo);
    }
    
    // Count searches by query
    const searchCounts: { [key: string]: number } = {};
    filteredSearches.forEach(search => {
      const query = search.searchQuery.toLowerCase().trim();
      searchCounts[query] = (searchCounts[query] || 0) + 1;
    });
    
    // Sort by count and return top N
    return Object.entries(searchCounts)
      .map(([searchQuery, searchCount]) => ({ searchQuery, searchCount }))
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, limit);
  }

  // Advisory Locks - Stub implementation for in-memory storage
  async acquireAdvisoryLock(lockId: number): Promise<boolean> {
    // In-memory storage doesn't need locks (single-threaded)
    return true;
  }

  async releaseAdvisoryLock(lockId: number): Promise<boolean> {
    // In-memory storage doesn't need locks (single-threaded)
    return true;
  }
}

// Use database storage for persistent data
import { DatabaseStorage } from "./database-storage";
import { loadPersistedSessions } from "./shopify-auth";

export const storage = new DatabaseStorage();

// Load Shopify sessions after storage is initialized
loadPersistedSessions().catch(error => {
  console.error('Failed to load sessions on startup:', error);
});
