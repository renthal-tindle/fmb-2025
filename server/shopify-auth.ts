import { shopifyApi, LATEST_API_VERSION, Session } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";
import { Request, Response, NextFunction } from "express";
import { storage } from './storage';

// Extend global type for session persistence
declare global {
  var PERSISTED_SHOPIFY_SESSIONS: string | undefined;
  var LATEST_SHOPIFY_ACCESS_TOKEN: string | undefined;
}

// Initialize Shopify API  
const appUrl = process.env.SHOPIFY_APP_URL || process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : 'https://rest-express.replit.app';

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES?.split(',') || ['read_products', 'write_products'],
  hostName: new URL(appUrl).hostname,
  hostScheme: 'https',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false, // Set to false for easier development
  sessionStorage: {
    storeSession: async (session: Session): Promise<boolean> => {
      console.log(`🔄 ATTEMPTING: Storing session ${session.id} for shop ${session.shop}`);
      console.log(`Session data: ID=${session.id}, Shop=${session.shop}, HasToken=${!!session.accessToken}`);
      
      try {
        // Store in database for permanent persistence
        const stored = await storage.storeShopifySession(session);
        
        // Also keep in memory for compatibility during current session
        inMemorySessionStorage.set(session.id, session);
        inMemorySessionStorage.set('current', session);
        
        if (stored) {
          console.log(`✅ PERMANENT: Stored Shopify session for ${session.shop} in DATABASE`);
        } else {
          console.log(`❌ FAILED: Could not store session for ${session.shop} in DATABASE`);
        }
        
        return stored;
      } catch (error) {
        console.error(`💥 ERROR: Exception while storing session for ${session.shop}:`, error);
        return false;
      }
    },
    loadSession: async (id: string): Promise<Session | undefined> => {
      // Try memory first for speed
      let session = inMemorySessionStorage.get(id);
      
      // Fallback to database
      if (!session) {
        session = await storage.getShopifySession(id);
        if (session) {
          // Cache in memory for current session
          inMemorySessionStorage.set(id, session);
          console.log(`📥 RESTORED: Loaded session ${id} from DATABASE`);
        }
      }
      
      return session;
    },
    deleteSession: async (id: string): Promise<boolean> => {
      inMemorySessionStorage.delete(id);
      return await storage.deleteShopifySession(id);
    },
  },
});

export type ShopifySession = Session;

// In-memory session storage with persistence
const inMemorySessionStorage = new Map<string, Session>();

// Persistence functions with actual implementation
const persistSessions = () => {
  try {
    const sessionsObj = Object.fromEntries(inMemorySessionStorage.entries());
    // Store sessions as JSON in a temporary storage (environment variable approach)
    if (typeof global !== 'undefined') {
      global.PERSISTED_SHOPIFY_SESSIONS = JSON.stringify(sessionsObj);
    }
    console.log(`Persisted ${inMemorySessionStorage.size} Shopify sessions`);
  } catch (error) {
    console.error('Failed to persist sessions:', error);
  }
};

const loadPersistedSessions = async () => {
  try {
    console.log('Loading persisted sessions from database...');
    const sessions = await storage.getAllShopifySessions();
    
    for (const sessionData of sessions) {
      if (sessionData && sessionData.id) {
        inMemorySessionStorage.set(sessionData.id, sessionData as Session);
        // Store latest session as 'current' for easy access
        if (sessionData.shop) {
          inMemorySessionStorage.set('current', sessionData as Session);
        }
      }
    }
    
    console.log(`✅ RESTORED: Loaded ${sessions.length} sessions from DATABASE`);
    console.log(`Sessions loaded: ${sessions.map(s => s.shop).join(', ')}`);
    
    // Also check if we have any access tokens to store globally
    const activeSession = sessions.find(s => s.accessToken);
    if (activeSession?.accessToken) {
      global.LATEST_SHOPIFY_ACCESS_TOKEN = activeSession.accessToken;
      console.log(`✅ RESTORED: Global access token for ${activeSession.shop}`);
    }
    
  } catch (error) {
    console.log('Failed to load sessions from database:', error);
  }
};

// Export the function to be called after storage is initialized
export { loadPersistedSessions };

// Export inMemorySessionStorage for use in other modules
export { inMemorySessionStorage };

// Get current session helper
export const getCurrentSession = (): Session | undefined => {
  return inMemorySessionStorage.get('current');
};

// Middleware to verify shop parameter
export const verifyShop = (req: Request, res: Response, next: NextFunction) => {
  const shop = req.query.shop as string;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }
  
  // Validate shop domain format
  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
  
  if (!/^[a-zA-Z0-9\-]+\.myshopify\.com$/.test(shopDomain)) {
    return res.status(400).send('Invalid shop domain');
  }
  
  req.query.shop = shopDomain;
  next();
};

// Get authorization URL for OAuth flow  
export const getAuthUrl = async (shop: string, req: any, res: any): Promise<string> => {
  return await shopify.auth.begin({
    shop: shop,
    callbackPath: '/api/auth/callback',
    isOnline: false,
    rawRequest: req,
    rawResponse: res,
  });
};

// Validate and exchange authorization code for access token
export const validateAuthCallback = async (req: any, res: any) => {
  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });
    
    return callback;
  } catch (error) {
    console.error('Auth callback validation failed:', error);
    throw error;
  }
};

// Fetch products from Shopify store
export const fetchShopifyProducts = async (session: ShopifySession) => {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }
  
  const client = new shopify.clients.Rest({
    session,
  });
  
  try {
    const response = await client.get({
      path: 'products',
      query: { limit: 250 }, // Adjust as needed
    });
    
    const productsData = response.body as any;
    
    // Log variant information for debugging
    if (productsData.products) {
      const totalVariants = productsData.products.reduce((sum: number, product: any) => {
        return sum + (product.variants?.length || 0);
      }, 0);
      console.log(`Fetched ${productsData.products.length} products with ${totalVariants} total variants from Shopify`);
      
      // Log products with multiple variants
      const productsWithVariants = productsData.products.filter((p: any) => p.variants && p.variants.length > 1);
      console.log(`Found ${productsWithVariants.length} products with multiple variants`);
      productsWithVariants.forEach((p: any) => {
        console.log(`- ${p.title}: ${p.variants.length} variants`);
      });
    }
    
    return response.body;
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};

// Fetch specific Shopify products by their IDs
export const fetchShopifyProductsByIds = async (session: ShopifySession, productIds: string[]) => {
  if (!session.accessToken) {
    throw new Error('No access token available');
  }
  
  if (productIds.length === 0) {
    return { products: [] };
  }
  
  const client = new shopify.clients.Rest({
    session,
  });
  
  try {
    // Shopify REST API allows fetching multiple products by IDs
    const idsParam = productIds.join(',');
    const response = await client.get({
      path: 'products',
      query: { ids: idsParam, limit: 250 },
    });
    
    const productsData = response.body as any;
    console.log(`Fetched ${productsData.products?.length || 0} live products from Shopify for ${productIds.length} requested IDs`);
    
    return productsData;
  } catch (error) {
    console.error('Failed to fetch products by IDs:', error);
    throw error;
  }
};

// Verify request authenticity using HMAC
export const verifyWebhook = (data: string, hmacHeader: string): boolean => {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET!);
  hmac.update(data, 'utf8');
  const calculatedHmac = hmac.digest('base64');
  
  return calculatedHmac === hmacHeader;
};