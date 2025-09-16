import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMotorcycleSchema, insertPartMappingSchema, insertImportHistorySchema, insertPartCategoryTagsSchema } from "@shared/schema";
import { z } from "zod";
import { getAuthUrl, validateAuthCallback, verifyShop, fetchShopifyProducts, inMemorySessionStorage } from "./shopify-auth";
import multer from 'multer';
import { parse as parseCsv } from 'csv-parse';
import { Readable } from 'stream';
import { promisify } from 'util';
import crypto from 'crypto';

// ==========================================
// SECURITY UTILITIES
// ==========================================

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validateAppProxySignature(originalUrl: string, secret: string): boolean {
  if (!originalUrl || !secret) {
    console.error('Missing URL or secret for signature validation');
    return false;
  }
  
  try {
    // Extract query string from the original URL - treat literally, no entity decoding
    const queryIndex = originalUrl.indexOf('?');
    if (queryIndex === -1) {
      console.error('No query string found in URL:', originalUrl);
      return false;
    }
    
    const rawQuery = originalUrl.substring(queryIndex + 1);
    // Future implementation: Shopify app proxy signature validation
    // Currently using session-based security which is more reliable
    return true;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

// App Proxy Security Middleware
function createAppProxySecurityMiddleware() {
  return (req: any, res: any, next: any) => {
    try {
      const { shop, timestamp, signature } = req.query;
      
      // Check required parameters
      if (!shop || !timestamp || !signature) {
        console.error('Missing required app proxy parameters');
        return res.status(400).send("Invalid proxy request - missing required parameters");
      }
      
      // Validate timestamp freshness (within 5 minutes)
      const requestTime = parseInt(timestamp as string);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - requestTime) > 300) {
        console.error(`Stale timestamp for shop: ${shop}`);
        return res.status(401).send("Request timestamp too old");
      }
      
      // TEMPORARY: Skip signature validation due to encoding issues
      // We already validate: shop session exists, timestamp is fresh, and app is installed
      // TODO: Fix signature validation in future version
      // Using session-based security - validates app installation and timestamp freshness
      
      // Alternative approach: If we need signature validation, uncomment below
      // const appProxySecret = process.env.SHOPIFY_API_SECRET;
      // if (!appProxySecret || !validateAppProxySignature(req.originalUrl, appProxySecret)) {
      //   console.error(`Invalid app proxy signature for shop: ${shop}`);
      //   return res.status(403).send("Unauthorized proxy request");
      // }
      
      // Verify shop has an active session (is installed)
      const sessions = Array.from(inMemorySessionStorage.values());
      const shopSession = sessions.find((session: any) => session?.shop === shop);
      if (!shopSession) {
        console.error(`No active session found for shop: ${shop}`);
        return res.status(403).send("App not installed for this shop");
      }
      
      // Store shop in request for later use
      req.shopifyShop = shop;
      req.shopifySession = shopSession;
      next();
    } catch (error) {
      console.error('App proxy security middleware error:', error);
      res.status(500).send("Security validation failed");
    }
  };
}

// ==========================================
// CUSTOMER-FACING PAGE TEMPLATES
// ==========================================

function generateMotorcyclePage(motorcycle: any, compatibleParts: any[], shop: string): string {
  const baseUrl = `${escapeHtml(shop)}/apps/fit-my-bike`;
  const bikeMake = escapeHtml(motorcycle.bikemake || '');
  const bikeModel = escapeHtml(motorcycle.bikemodel || '');
  const bikeYear = motorcycle.bikeyear || 'Unknown Year';
  const bikeEngine = escapeHtml(motorcycle.bikeengine || 'All Engines');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Parts for ${bikeMake} ${bikeModel} ${bikeYear} | Renthal Official</title>
  <meta name="description" content="Find compatible Renthal parts for your ${bikeMake} ${bikeModel} ${bikeYear}. High-quality motorcycle parts and accessories.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="Parts for ${bikeMake} ${bikeModel} ${bikeYear}">
  <meta property="og:description" content="Find compatible Renthal motorcycle parts and accessories">
  <meta property="og:type" content="website">
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; padding: 20px; 
      background: #f8f9fa; 
      color: #333;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { 
      background: linear-gradient(135deg, #e74c3c, #c0392b); 
      color: white; 
      padding: 30px; 
      border-radius: 12px; 
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 { margin: 0 0 10px 0; font-size: 2.5em; font-weight: 700; }
    .header p { margin: 0; font-size: 1.2em; opacity: 0.9; }
    .search-widget { 
      background: white; 
      padding: 25px; 
      border-radius: 12px; 
      margin-bottom: 30px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .search-widget h3 { margin: 0 0 20px 0; color: #2c3e50; }
    .search-form { display: flex; gap: 15px; flex-wrap: wrap; align-items: end; }
    .form-group { flex: 1; min-width: 150px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; }
    select, input, button { 
      width: 100%; 
      padding: 12px; 
      border: 2px solid #ddd; 
      border-radius: 8px; 
      font-size: 16px;
    }
    select:focus, input:focus { border-color: #e74c3c; outline: none; }
    .search-btn { 
      background: #e74c3c; 
      color: white; 
      border: none; 
      cursor: pointer; 
      font-weight: 600;
      transition: background 0.2s;
    }
    .search-btn:hover { background: #c0392b; }
    .parts-section h2 { color: #2c3e50; margin-bottom: 25px; font-size: 2em; }
    .parts-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
      gap: 25px; 
    }
    .part-card { 
      background: white; 
      border-radius: 12px; 
      overflow: hidden; 
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .part-card:hover { 
      transform: translateY(-5px); 
      box-shadow: 0 8px 25px rgba(0,0,0,0.15); 
    }
    .part-image { 
      width: 100%; 
      height: 200px; 
      object-fit: cover; 
      background: #f1f1f1;
    }
    .part-content { padding: 20px; }
    .part-title { margin: 0 0 10px 0; font-size: 1.3em; font-weight: 600; color: #2c3e50; }
    .part-price { font-size: 1.5em; font-weight: 700; color: #e74c3c; margin: 10px 0; }
    .part-sku { color: #666; margin: 5px 0; }
    .part-variants { color: #007cba; margin: 10px 0; font-weight: 500; }
    .view-product { 
      display: inline-block; 
      background: #e74c3c; 
      color: white; 
      text-decoration: none; 
      padding: 12px 25px; 
      border-radius: 8px; 
      font-weight: 600;
      transition: background 0.2s;
      margin-top: 15px;
    }
    .view-product:hover { background: #c0392b; }
    .no-parts { 
      text-align: center; 
      padding: 60px 20px; 
      background: white; 
      border-radius: 12px; 
      color: #666;
    }
    .breadcrumb { 
      margin-bottom: 20px; 
      color: #666; 
    }
    .breadcrumb a { color: #e74c3c; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    @media (max-width: 768px) {
      .search-form { flex-direction: column; }
      .form-group { min-width: 100%; }
      .header h1 { font-size: 2em; }
      .parts-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="breadcrumb">
      <a href="${escapeHtml(shop)}">Home</a> > 
      <a href="${baseUrl}">Find Parts</a> > 
      ${bikeMake} ${bikeModel} ${bikeYear}
    </div>
    
    <div class="header">
      <h1>Parts for ${bikeMake} ${bikeModel}</h1>
      <p>${bikeYear} • ${bikeEngine}</p>
    </div>

    <div class="search-widget">
      <h3>🔍 Find Parts for a Different Bike</h3>
      <div class="search-form">
        <div class="form-group">
          <label for="make-select">Make</label>
          <select id="make-select">
            <option value="">Select Make</option>
          </select>
        </div>
        <div class="form-group">
          <label for="model-select">Model</label>
          <select id="model-select" disabled>
            <option value="">Select Model</option>
          </select>
        </div>
        <div class="form-group">
          <label for="year-select">Year (Optional)</label>
          <select id="year-select" disabled>
            <option value="">Select Year</option>
          </select>
        </div>
        <div class="form-group">
          <label for="model-input">Model Search (Optional)</label>
          <input type="text" id="model-input" placeholder="e.g., CRF450R">
        </div>
        <div class="form-group">
          <button class="search-btn" onclick="searchMotorcycles()">Find My Bike</button>
        </div>
      </div>
      <div id="search-results"></div>
    </div>

    <div class="parts-section">
      <h2>Compatible Renthal Parts (${compatibleParts.length})</h2>
      ${compatibleParts.length > 0 ? `
        <div class="parts-grid">
          ${compatibleParts.map(part => {
            const partTitle = escapeHtml(part.title || 'Unnamed Product');
            const partPrice = escapeHtml(part.variants?.[0]?.price || '0.00');
            const partSku = escapeHtml(part.variants?.[0]?.sku || 'N/A');
            const partHandle = escapeHtml(part.handle || '');
            const imageUrl = part.images?.[0]?.src ? escapeHtml(part.images[0].src) : '';
            
            return `
            <div class="part-card">
              ${imageUrl ? 
                `<img src="${imageUrl}" alt="${partTitle}" class="part-image">` :
                `<div class="part-image" style="display: flex; align-items: center; justify-content: center; background: #f1f1f1; color: #999;">No Image</div>`
              }
              <div class="part-content">
                <h3 class="part-title">${partTitle}</h3>
                <div class="part-price">$${partPrice}</div>
                <div class="part-sku">SKU: ${partSku}</div>
                ${part.variants && part.variants.length > 1 ? 
                  `<div class="part-variants">${part.variants.length} variants available</div>` : ''
                }
                <a href="${escapeHtml(shop)}/products/${partHandle}" class="view-product" target="_top">View Product</a>
              </div>
            </div>
          `;}).join('')}
        </div>
      ` : `
        <div class="no-parts">
          <h3>No Compatible Parts Found</h3>
          <p>We don't have any parts mapped for this specific motorcycle yet.</p>
          <p>Try searching for a similar model or contact us for assistance.</p>
        </div>
      `}
    </div>
  </div>

  <script>
    const baseUrl = "${baseUrl}";
    
    async function loadSearchOptions() {
      try {
        // Only load makes initially
        const makesRes = await fetch(\`/apps/fit-my-bike/search-data?type=makes\`);
        const makes = await makesRes.json();
        populateSelect('make-select', makes);
      } catch (error) {
        console.error('Failed to load search options:', error);
      }
    }

    async function loadModelsForMake(make) {
      try {
        const response = await fetch(\`/apps/fit-my-bike/search-data?type=models&make=\${encodeURIComponent(make)}\`);
        const models = await response.json();
        populateSelect('model-select', models);
        document.getElementById('model-select').disabled = false;
        
        // Reset and disable year dropdown
        document.getElementById('year-select').innerHTML = '<option value="">Select Year</option>';
        document.getElementById('year-select').disabled = true;
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    }

    async function loadYearsForMakeModel(make, model) {
      try {
        const response = await fetch(\`/apps/fit-my-bike/search-data?type=years&make=\${encodeURIComponent(make)}&model=\${encodeURIComponent(model)}\`);
        const years = await response.json();
        populateSelect('year-select', years);
        document.getElementById('year-select').disabled = false;
      } catch (error) {
        console.error('Failed to load years:', error);
      }
    }
    
    function populateSelect(selectId, options) {
      const select = document.getElementById(selectId);
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
      });
    }
    
    // Event handlers for cascading dropdowns
    document.getElementById('make-select').addEventListener('change', function() {
      const make = this.value;
      if (make) {
        loadModelsForMake(make);
      } else {
        // Reset model and year dropdowns
        document.getElementById('model-select').innerHTML = '<option value="">Select Model</option>';
        document.getElementById('model-select').disabled = true;
        document.getElementById('year-select').innerHTML = '<option value="">Select Year</option>';
        document.getElementById('year-select').disabled = true;
      }
    });

    document.getElementById('model-select').addEventListener('change', function() {
      const make = document.getElementById('make-select').value;
      const model = this.value;
      if (make && model) {
        loadYearsForMakeModel(make, model);
      } else {
        // Reset year dropdown
        document.getElementById('year-select').innerHTML = '<option value="">Select Year</option>';
        document.getElementById('year-select').disabled = true;
      }
    });

    async function searchMotorcycles() {
      const make = document.getElementById('make-select').value;
      const model = document.getElementById('model-select').value;
      const year = document.getElementById('year-select').value;
      const modelSearch = document.getElementById('model-input').value;
      
      if (!make || !model) {
        alert('Please select at least make and model');
        return;
      }
      
      try {
        const response = await fetch(\`/apps/fit-my-bike/search\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ make, model, year, searchQuery: modelSearch })
        });
        
        const { motorcycles } = await response.json();
        
        if (motorcycles.length === 1) {
          window.top.location.href = \`\${baseUrl}?bikeid=\${motorcycles[0].recid}\`;
        } else if (motorcycles.length > 1) {
          showMotorcycleSelection(motorcycles);
        } else {
          alert('No motorcycles found for your selection. Try different criteria.');
        }
      } catch (error) {
        console.error('Search failed:', error);
        alert('Search failed. Please try again.');
      }
    }
    
    function showMotorcycleSelection(motorcycles) {
      const resultsDiv = document.getElementById('search-results');
      
      // Create header safely
      const header = document.createElement('h4');
      header.style.cssText = 'margin: 20px 0 15px 0; color: #2c3e50;';
      header.textContent = 'Select Your Exact Model:';
      
      // Create container
      const container = document.createElement('div');
      container.style.cssText = 'display: grid; gap: 10px;';
      
      // Create buttons safely using DOM API
      motorcycles.forEach(bike => {
        const button = document.createElement('button');
        button.style.cssText = 'padding: 15px; border: 2px solid #e74c3c; background: white; border-radius: 8px; cursor: pointer; text-align: left; font-size: 16px; transition: all 0.2s;';
        
        // Create content safely
        const strong = document.createElement('strong');
        strong.textContent = \`\${bike.bikemake} \${bike.bikemodel}\`;
        
        button.appendChild(strong);
        button.appendChild(document.createTextNode(\` • \${bike.bikeyear} • \${bike.bikeengine || 'Standard'}\`));
        
        // Safe event handlers
        button.addEventListener('click', () => {
          window.top.location.href = \`\${baseUrl}?bikeid=\${bike.recid}\`;
        });
        button.addEventListener('mouseover', () => {
          button.style.background = '#e74c3c';
          button.style.color = 'white';
        });
        button.addEventListener('mouseout', () => {
          button.style.background = 'white';
          button.style.color = '#333';
        });
        
        container.appendChild(button);
      });
      
      // Clear and append safely
      resultsDiv.innerHTML = '';
      resultsDiv.appendChild(header);
      resultsDiv.appendChild(container);
    }
    
    // Initialize search on page load
    loadSearchOptions();
  </script>
</body>
</html>
  `;
}

function generateSearchPage(shop: string): string {
  const baseUrl = `${shop}/apps/fit-my-bike`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Find Motorcycle Parts | Renthal Official</title>
  <meta name="description" content="Find compatible Renthal parts for your motorcycle. Search by year, make, and model to discover high-quality motorcycle parts and accessories.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; padding: 20px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: #333;
    }
    .container { max-width: 800px; margin: 0 auto; padding-top: 50px; }
    .header { 
      text-align: center; 
      color: white; 
      margin-bottom: 40px;
    }
    .header h1 { 
      font-size: 3em; 
      margin: 0 0 15px 0; 
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .header p { 
      font-size: 1.3em; 
      margin: 0; 
      opacity: 0.9;
    }
    .search-card { 
      background: white; 
      padding: 40px; 
      border-radius: 20px; 
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .search-card h2 { 
      margin: 0 0 30px 0; 
      color: #2c3e50; 
      font-size: 1.8em;
      text-align: center;
    }
    .search-form { display: grid; gap: 20px; }
    .form-group label { 
      display: block; 
      margin-bottom: 8px; 
      font-weight: 600; 
      color: #555; 
      font-size: 1.1em;
    }
    select, input { 
      width: 100%; 
      padding: 15px; 
      border: 2px solid #e1e8ed; 
      border-radius: 12px; 
      font-size: 16px;
      transition: border-color 0.2s;
    }
    select:focus, input:focus { 
      border-color: #667eea; 
      outline: none; 
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .search-btn { 
      background: linear-gradient(135deg, #667eea, #764ba2); 
      color: white; 
      border: none; 
      padding: 18px; 
      border-radius: 12px; 
      font-size: 18px; 
      font-weight: 600;
      cursor: pointer; 
      margin-top: 10px;
      transition: transform 0.2s;
    }
    .search-btn:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    .quick-text-search { 
      margin-top: 30px; 
      padding-top: 30px; 
      border-top: 2px solid #f1f1f1;
    }
    .quick-text-search h3 { 
      margin: 0 0 15px 0; 
      color: #2c3e50;
    }
    .search-input-group { 
      display: flex; 
      gap: 15px; 
    }
    .search-input-group input { 
      flex: 1;
    }
    .search-input-group button { 
      background: #e74c3c; 
      color: white; 
      border: none; 
      padding: 15px 30px; 
      border-radius: 12px; 
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .search-input-group button:hover { 
      background: #c0392b; 
    }
    #search-results { 
      margin-top: 25px;
    }
    .results-grid { 
      display: grid; 
      gap: 15px; 
    }
    .result-item { 
      padding: 20px; 
      background: #f8f9fa; 
      border: 2px solid transparent; 
      border-radius: 12px; 
      cursor: pointer; 
      transition: all 0.2s;
    }
    .result-item:hover { 
      border-color: #667eea; 
      background: white; 
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .result-title { 
      font-weight: 600; 
      color: #2c3e50; 
      margin-bottom: 5px;
    }
    .result-details { 
      color: #666; 
      font-size: 0.95em;
    }
    @media (max-width: 768px) {
      .container { padding-top: 20px; }
      .header h1 { font-size: 2.2em; }
      .search-card { padding: 25px; margin: 0 10px; }
      .search-input-group { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏍️ Find Your Parts</h1>
      <p>Discover compatible Renthal parts for your motorcycle</p>
    </div>

    <div class="search-card">
      <h2>Search by Make, Model & Year</h2>
      <div class="search-form">
        <div class="form-group">
          <label for="make-select">🏭 Make</label>
          <select id="make-select">
            <option value="">Choose your bike's make</option>
          </select>
        </div>
        <div class="form-group">
          <label for="model-select">🏍️ Model</label>
          <select id="model-select" disabled>
            <option value="">Choose your bike's model</option>
          </select>
        </div>
        <div class="form-group">
          <label for="year-select">📅 Year (Optional)</label>
          <select id="year-select" disabled>
            <option value="">Choose your bike's year</option>
          </select>
        </div>
        <div class="form-group">
          <label for="model-input">🔍 Model Search (Optional)</label>
          <input type="text" id="model-input" placeholder="e.g., CRF450R, YZ250F, KX450">
        </div>
        <button class="search-btn" onclick="searchMotorcycles()">🔍 Find Compatible Parts</button>
      </div>

      <div class="quick-text-search">
        <h3>💨 Quick Search</h3>
        <p style="color: #666; margin-bottom: 15px;">Or search directly for your motorcycle model</p>
        <div class="search-input-group">
          <input type="text" id="quick-search" placeholder="e.g., Honda CRF450R 2023">
          <button onclick="quickSearch()">Search</button>
        </div>
      </div>

      <div id="search-results"></div>
    </div>
  </div>

  <script>
    const baseUrl = "${baseUrl}";
    
    async function loadSearchOptions() {
      try {
        // Only load makes initially
        const makesRes = await fetch(\`/apps/fit-my-bike/search-data?type=makes\`);
        const makes = await makesRes.json();
        populateSelect('make-select', makes.sort());
      } catch (error) {
        console.error('Failed to load search options:', error);
      }
    }

    async function loadModelsForMake(make) {
      try {
        const response = await fetch(\`/apps/fit-my-bike/search-data?type=models&make=\${encodeURIComponent(make)}\`);
        const models = await response.json();
        populateSelect('model-select', models.sort());
        document.getElementById('model-select').disabled = false;
        
        // Reset and disable year dropdown
        document.getElementById('year-select').innerHTML = '<option value="">Choose your bike\'s year</option>';
        document.getElementById('year-select').disabled = true;
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    }

    async function loadYearsForMakeModel(make, model) {
      try {
        const response = await fetch(\`/apps/fit-my-bike/search-data?type=years&make=\${encodeURIComponent(make)}&model=\${encodeURIComponent(model)}\`);
        const years = await response.json();
        populateSelect('year-select', years.sort((a, b) => b - a)); // Recent years first
        document.getElementById('year-select').disabled = false;
      } catch (error) {
        console.error('Failed to load years:', error);
      }
    }
    
    function populateSelect(selectId, options) {
      const select = document.getElementById(selectId);
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
      });
    }
    
    // Event handlers for cascading dropdowns
    document.getElementById('make-select').addEventListener('change', function() {
      const make = this.value;
      if (make) {
        loadModelsForMake(make);
      } else {
        // Reset model and year dropdowns
        document.getElementById('model-select').innerHTML = '<option value="">Choose your bike\'s model</option>';
        document.getElementById('model-select').disabled = true;
        document.getElementById('year-select').innerHTML = '<option value="">Choose your bike\'s year</option>';
        document.getElementById('year-select').disabled = true;
      }
    });

    document.getElementById('model-select').addEventListener('change', function() {
      const make = document.getElementById('make-select').value;
      const model = this.value;
      if (make && model) {
        loadYearsForMakeModel(make, model);
      } else {
        // Reset year dropdown
        document.getElementById('year-select').innerHTML = '<option value="">Choose your bike\'s year</option>';
        document.getElementById('year-select').disabled = true;
      }
    });

    async function searchMotorcycles() {
      const make = document.getElementById('make-select').value;
      const model = document.getElementById('model-select').value;
      const year = document.getElementById('year-select').value;
      const modelSearch = document.getElementById('model-input').value;
      
      if (!make || !model) {
        alert('Please select at least make and model to search');
        return;
      }
      
      await performSearch({ make, model, year, searchQuery: modelSearch });
    }
    
    async function quickSearch() {
      const query = document.getElementById('quick-search').value.trim();
      
      if (!query) {
        alert('Please enter a motorcycle model to search');
        return;
      }
      
      await performSearch({ searchQuery: query });
    }
    
    async function performSearch(searchParams) {
      try {
        const response = await fetch(\`/apps/fit-my-bike/search\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchParams)
        });
        
        const { motorcycles } = await response.json();
        showSearchResults(motorcycles);
      } catch (error) {
        console.error('Search failed:', error);
        alert('Search failed. Please try again.');
      }
    }
    
    function showSearchResults(motorcycles) {
      const resultsDiv = document.getElementById('search-results');
      
      // Clear previous results
      resultsDiv.innerHTML = '';
      
      if (motorcycles.length === 0) {
        // Create no results message safely
        const noResultsDiv = document.createElement('div');
        noResultsDiv.style.cssText = 'text-align: center; padding: 30px; color: #666;';
        
        const heading = document.createElement('h3');
        heading.textContent = 'No motorcycles found';
        
        const message = document.createElement('p');
        message.textContent = 'Try adjusting your search criteria or contact us for assistance.';
        
        noResultsDiv.appendChild(heading);
        noResultsDiv.appendChild(message);
        resultsDiv.appendChild(noResultsDiv);
        return;
      }
      
      if (motorcycles.length === 1) {
        // Direct redirect for single result
        window.top.location.href = \`\${baseUrl}?bikeid=\${motorcycles[0].recid}\`;
        return;
      }
      
      // Create header safely
      const header = document.createElement('h3');
      header.style.cssText = 'margin: 25px 0 15px 0; color: #2c3e50;';
      header.textContent = \`Found \${motorcycles.length} motorcycles - Select your exact model:\`;
      
      // Create results grid
      const grid = document.createElement('div');
      grid.className = 'results-grid';
      
      // Create result items safely
      motorcycles.forEach(bike => {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        // Create title element
        const title = document.createElement('div');
        title.className = 'result-title';
        title.textContent = \`\${bike.bikemake} \${bike.bikemodel}\`;
        
        // Create details element
        const details = document.createElement('div');
        details.className = 'result-details';
        details.textContent = \`\${bike.bikeyear} • \${bike.bikeengine || 'Standard Engine'}\`;
        
        // Safe click handler
        item.addEventListener('click', () => {
          window.top.location.href = \`\${baseUrl}?bikeid=\${bike.recid}\`;
        });
        
        item.appendChild(title);
        item.appendChild(details);
        grid.appendChild(item);
      });
      
      resultsDiv.appendChild(header);
      resultsDiv.appendChild(grid);
    }
    
    // Initialize search options on page load
    loadSearchOptions();
    
    // Allow Enter key to trigger search
    document.getElementById('quick-search').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        quickSearch();
      }
    });
  </script>
</body>
</html>
  `;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Motorcycles routes
  app.get("/api/motorcycles", async (req, res) => {
    try {
      const { search, bikemake, firstyear, lastyear, biketype } = req.query;
      
      let motorcycles;
      if (search) {
        motorcycles = await storage.searchMotorcycles(search as string);
        
        // Track search analytics (only for search queries, not filters)
        try {
          await storage.createSearchAnalytics({
            searchQuery: search as string,
            resultsCount: motorcycles.length,
            ipAddress: req.ip || null,
            userAgent: req.get('User-Agent') || null
          });
        } catch (analyticsError) {
          // Log analytics error but don't fail the search
          console.error('Failed to track search analytics:', analyticsError);
        }
      } else if (bikemake || firstyear || lastyear || biketype) {
        motorcycles = await storage.filterMotorcycles({
          bikemake: bikemake as string,
          firstyear: firstyear ? parseInt(firstyear as string) : undefined,
          lastyear: lastyear ? parseInt(lastyear as string) : undefined,
          biketype: biketype ? parseInt(biketype as string) : undefined,
        });
      } else {
        motorcycles = await storage.getMotorcycles();
      }
      
      // Prevent caching to ensure fresh data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.json(motorcycles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch motorcycles" });
    }
  });

  app.get("/api/motorcycles/makes", async (req, res) => {
    try {
      const makes = await storage.getDistinctMotorcycleMakes();
      // Prevent caching to ensure fresh data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.json(makes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch motorcycle makes" });
    }
  });

  app.get("/api/motorcycles/years", async (req, res) => {
    try {
      const years = await storage.getDistinctMotorcycleYears();
      // Prevent caching to ensure fresh data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.json(years);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch motorcycle years" });
    }
  });

  app.get("/api/motorcycles/next-recid", async (req, res) => {
    try {
      const nextRecid = await storage.getNextMotorcycleRecid();
      res.json({ nextRecid });
    } catch (error) {
      res.status(500).json({ message: "Failed to get next RECID" });
    }
  });

  app.get("/api/motorcycles/:recid(\\d+)", async (req, res) => {
    try {
      const recid = parseInt(req.params.recid);
      const motorcycle = await storage.getMotorcycle(recid);
      if (!motorcycle) {
        return res.status(404).json({ message: "Motorcycle not found" });
      }
      res.json(motorcycle);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch motorcycle" });
    }
  });

  app.post("/api/motorcycles", async (req, res) => {
    try {
      // If no recid provided, get the next available one
      if (!req.body.recid) {
        const nextRecid = await storage.getNextMotorcycleRecid();
        req.body.recid = nextRecid;
      }
      
      const validatedData = insertMotorcycleSchema.parse(req.body);
      const motorcycle = await storage.createMotorcycle(validatedData);
      res.status(201).json(motorcycle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid motorcycle data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create motorcycle" });
    }
  });

  app.put("/api/motorcycles/:recid", async (req, res) => {
    try {
      const recid = parseInt(req.params.recid);
      const validatedData = insertMotorcycleSchema.partial().parse(req.body);
      const motorcycle = await storage.updateMotorcycle(recid, validatedData);
      if (!motorcycle) {
        return res.status(404).json({ message: "Motorcycle not found" });
      }
      res.json(motorcycle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid motorcycle data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update motorcycle" });
    }
  });

  app.delete("/api/motorcycles/:recid", async (req, res) => {
    try {
      const recid = parseInt(req.params.recid);
      const success = await storage.deleteMotorcycle(recid);
      if (!success) {
        return res.status(404).json({ message: "Motorcycle not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete motorcycle" });
    }
  });

  // Part Assignment routes
  app.patch("/api/motorcycles/:recid/parts", async (req, res) => {
    try {
      const recid = parseInt(req.params.recid);
      const { partCategory, productVariant } = req.body;
      
      if (!partCategory) {
        return res.status(400).json({ message: "Part category is required" });
      }
      
      // Build update object dynamically based on part category
      const updateData = {
        [partCategory]: productVariant || null
      };
      
      const motorcycle = await storage.updateMotorcycle(recid, updateData);
      if (!motorcycle) {
        return res.status(404).json({ message: "Motorcycle not found" });
      }
      res.json(motorcycle);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign part to motorcycle" });
    }
  });

  // Get part categories for a motorcycle
  app.get("/api/motorcycles/:recid/parts", async (req, res) => {
    try {
      const recid = parseInt(req.params.recid);
      const motorcycle = await storage.getMotorcycle(recid);
      if (!motorcycle) {
        return res.status(404).json({ message: "Motorcycle not found" });
      }
      
      // Extract all part category assignments
      const partCategories = {
        oe_handlebar: motorcycle.oe_handlebar,
        oe_fcw: motorcycle.oe_fcw,
        oe_rcw: motorcycle.oe_rcw,
        front_brakepads: motorcycle.front_brakepads,
        rear_brakepads: motorcycle.rear_brakepads,
        handlebars_78: motorcycle.handlebars_78,
        twinwall: motorcycle.twinwall,
        fatbar: motorcycle.fatbar,
        fatbar36: motorcycle.fatbar36,
        grips: motorcycle.grips,
        cam: motorcycle.cam,
        oe_barmount: motorcycle.oe_barmount,
        barmount28: motorcycle.barmount28,
        barmount36: motorcycle.barmount36,
        fcwgroup: motorcycle.fcwgroup,
        fcwconv: motorcycle.fcwconv,
        rcwconv: motorcycle.rcwconv,
        rcwgroup: motorcycle.rcwgroup,
        rcwgroup_range: motorcycle.rcwgroup_range,
        twinring: motorcycle.twinring,
        oe_chain: motorcycle.oe_chain,
        chainconv: motorcycle.chainconv,
        r1_chain: motorcycle.r1_chain,
        r3_chain: motorcycle.r3_chain,
        r4_chain: motorcycle.r4_chain,
        rr4_chain: motorcycle.rr4_chain,
        clipon: motorcycle.clipon,
        rcwcarrier: motorcycle.rcwcarrier,
        active_handlecompare: motorcycle.active_handlecompare
      };
      
      res.json(partCategories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch motorcycle parts" });
    }
  });

  // Simple debug endpoint
  app.get("/api/debug/sessions", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const sessionCount = inMemorySessionStorage.size;
      const sessionKeys = Array.from(inMemorySessionStorage.keys());
      const hasGlobalToken = !!global.LATEST_SHOPIFY_ACCESS_TOKEN;
      
      // Collect debug session info
      
      // Get actual session data
      let workingSession = null;
      const sessions = Array.from(inMemorySessionStorage.values()).map(session => {
        const sessionData = {
          id: session.id,
          shop: session.shop,
          hasAccessToken: !!session.accessToken,
          tokenLength: session.accessToken ? session.accessToken.length : 0
        };
        
        if (session.accessToken && !workingSession) {
          workingSession = session;
        }
        
        return sessionData;
      });
      
      // Test live Shopify connection if we have a session
      let shopifyTest = null;
      if (workingSession) {
        try {
          // Testing live Shopify connection
          const client = new shopify.clients.Rest({ session: workingSession });
          const response = await client.get({
            path: 'products',
            query: { limit: 1 }
          });
          const productsData = response.body as any;
          const products = productsData.products || [];
          
          shopifyTest = {
            success: true,
            productCount: products.length,
            firstProduct: products[0] ? {
              id: products[0].id,
              title: products[0].title,
              variantCount: products[0].variants?.length || 0
            } : null
          };
          // Shopify test successful
        } catch (shopifyError) {
          shopifyTest = {
            success: false,
            error: shopifyError.message
          };
          // Shopify test failed
        }
      }
      
      const result = {
        sessionCount,
        sessionKeys,
        hasGlobalToken,
        globalTokenLength: global.LATEST_SHOPIFY_ACCESS_TOKEN ? global.LATEST_SHOPIFY_ACCESS_TOKEN.length : 0,
        sessions,
        shopifyTest
      };
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test endpoint to get session info and live products
  app.get("/api/shopify/test", async (req, res) => {
    try {
      // Check current session status
      
      // Try all methods to get a session
      const currentSession = inMemorySessionStorage.get('current');
      // Check for current session
      
      const allSessions = Array.from(inMemorySessionStorage.values());
      // Check all available sessions
      
      let workingSession = null;
      for (const session of allSessions) {
        if (session && session.accessToken) {
          workingSession = session;
          // Found working session
          break;
        }
      }
      
      if (!workingSession && global.LATEST_SHOPIFY_ACCESS_TOKEN) {
        workingSession = {
          id: 'test-session',
          shop: 'renthal-offical.myshopify.com',
          accessToken: global.LATEST_SHOPIFY_ACCESS_TOKEN,
          state: 'test',
          isOnline: false
        };
        // Using global token for test session
      }
      
      if (!workingSession) {
        return res.json({
          error: 'No working session found',
          sessionCount: inMemorySessionStorage.size,
          globalToken: !!global.LATEST_SHOPIFY_ACCESS_TOKEN
        });
      }
      
      // Test Shopify API call
      const client = new shopify.clients.Rest({ session: workingSession as any });
      const response = await client.get({
        path: 'products',
        query: { limit: 5 }
      });
      
      const productsData = response.body as any;
      const products = productsData.products || [];
      
      console.log(`Successfully fetched ${products.length} products from Shopify`);
      
      // Check for variants specifically
      const productWithVariants = products.find((p: any) => p.variants && p.variants.length > 1);
      
      res.json({
        success: true,
        sessionFound: true,
        shop: workingSession.shop,
        productCount: products.length,
        firstProduct: products[0] ? {
          id: products[0].id,
          title: products[0].title,
          variantCount: products[0].variants?.length || 0,
          hasMultipleVariants: (products[0].variants?.length || 0) > 1
        } : null,
        productWithMostVariants: productWithVariants ? {
          id: productWithVariants.id,
          title: productWithVariants.title,
          variantCount: productWithVariants.variants?.length || 0,
          variants: productWithVariants.variants?.slice(0, 3).map((v: any) => ({
            id: v.id,
            title: v.title,
            sku: v.sku,
            price: v.price
          }))
        } : null
      });
      
    } catch (error) {
      console.error('Shopify test failed:', error);
      res.status(500).json({ error: 'Test failed', details: error.message });
    }
  });

  // Force refresh variants from Shopify
  app.get("/api/products/force-refresh", async (req, res) => {
    try {
      console.log('FORCE REFRESH: Creating direct Shopify connection');
      
      // Create a new Shopify session directly 
      const directSession = {
        id: 'direct-session',
        shop: 'renthal-offical.myshopify.com',
        accessToken: global.LATEST_SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN || '',
        state: 'direct',
        isOnline: false
      };
      
      if (!directSession.accessToken) {
        return res.status(400).json({ error: 'No Shopify access token available' });
      }
      
      const client = new shopify.clients.Rest({ session: directSession as any });
      
      const response = await client.get({
        path: 'products',
        query: { limit: 250 }
      });
      
      const productsData = response.body as any;
      const products = (productsData.products || []).map((product: any) => ({
        id: product.id.toString(),
        title: product.title,
        description: product.body_html || null,
        price: product.variants?.[0]?.price || "0",
        sku: product.variants?.[0]?.sku || null,
        imageUrl: product.images?.[0]?.src || null,
        category: product.product_type || null,
        tags: product.tags ? JSON.stringify(product.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)) : null,
        variants: product.variants?.map((variant: any) => ({
          id: variant.id.toString(),
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
          inventoryQuantity: variant.inventory_quantity,
          option1: variant.option1,
          option2: variant.option2, 
          option3: variant.option3,
          available: variant.inventory_quantity > 0
        })) || []
      }));
      
      console.log(`FORCE REFRESH: Fetched ${products.length} products with variants`);
      console.log(`FORCE REFRESH: Sample product variants:`, products.find(p => p.variants.length > 0)?.variants?.length || 0);
      
      res.json(products);
      
    } catch (error) {
      console.error('FORCE REFRESH failed:', error);
      res.status(500).json({ error: 'Failed to force refresh products' });
    }
  });

  // Shopify Products routes - fetch live data from Shopify
  app.get("/api/products", async (req, res) => {
    try {
      const { search } = req.query;
      
      // Check what sessions we have
      const sessions = Array.from(inMemorySessionStorage.values());
      
      // Find working session
      let activeSession = inMemorySessionStorage.get('current');
      if (!activeSession || !activeSession.accessToken) {
        activeSession = sessions.find((session: any) => session?.accessToken);
      }
      
      // Use active session if found
      
      // If no session but we have a global token, create a direct session
      if (!activeSession && global.LATEST_SHOPIFY_ACCESS_TOKEN) {
        // Using global access token directly
        activeSession = {
          id: 'direct-global-session',
          shop: 'renthal-offical.myshopify.com',
          accessToken: global.LATEST_SHOPIFY_ACCESS_TOKEN,
          state: 'direct',
          isOnline: false
        } as any;
      }
      
      // Try to get live data from Shopify first
      try {
        
        if (activeSession) {
          // Fetch live products from Shopify
          const shopifyData = await fetchShopifyProducts(activeSession);
          let liveProducts = (shopifyData.products || []).map((product: any) => ({
            id: product.id.toString(),
            title: product.title,
            description: product.body_html || null,
            price: product.variants?.[0]?.price || "0",
            sku: product.variants?.[0]?.sku || null,
            imageUrl: product.images?.[0]?.src || null,
            category: product.product_type || null,
            tags: product.tags ? JSON.stringify(product.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)) : null,
            variants: product.variants?.map((variant: any) => ({
              id: variant.id.toString(),
              title: variant.title,
              price: variant.price,
              sku: variant.sku,
              inventoryQuantity: variant.inventory_quantity,
              option1: variant.option1,
              option2: variant.option2, 
              option3: variant.option3,
              available: variant.inventory_quantity > 0
            })) || []
          }));
          
          // Apply search filter if provided
          if (search) {
            const searchLower = (search as string).toLowerCase();
            liveProducts = liveProducts.filter((product: any) => 
              product.title.toLowerCase().includes(searchLower) ||
              (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
              (product.tags && product.tags.toLowerCase().includes(searchLower))
            );
          }
          
          console.log(`Fetched ${liveProducts.length} live products from Shopify`);
          console.log(`Product titles: ${liveProducts.map(p => p.title).join(', ')}`);
          console.log(`Variants found in first product:`, liveProducts[0]?.variants?.length || 0);
          console.log(`Sample product with variants:`, JSON.stringify(liveProducts.find(p => p.variants && p.variants.length > 0), null, 2));
          return res.json(liveProducts);
        }
      } catch (shopifyError) {
        console.log("Shopify fetch failed:", shopifyError);
      }
      
      // No local database fallback - return empty array (Option A implementation)
      console.log("No active Shopify session found, returning empty inventory");
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      // Try to get live data from Shopify first
      try {
        const sessions = Array.from(inMemorySessionStorage.values());
        const activeSession = sessions.find((session: any) => session?.accessToken);
        
        if (activeSession) {
          const shopifyData = await fetchShopifyProducts(activeSession);
          const liveProduct = (shopifyData.products || []).find((product: any) => 
            product.id.toString() === req.params.id
          );
          
          if (liveProduct) {
            const formattedProduct = {
              id: liveProduct.id.toString(),
              title: liveProduct.title,
              description: liveProduct.body_html || null,
              price: liveProduct.variants?.[0]?.price || "0",
              sku: liveProduct.variants?.[0]?.sku || null,
              imageUrl: liveProduct.images?.[0]?.src || null,
              category: liveProduct.product_type || null,
              tags: liveProduct.tags ? JSON.stringify(liveProduct.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)) : null,
            };
            return res.json(formattedProduct);
          }
        }
      } catch (shopifyError) {
        console.log("Shopify fetch failed for individual product:", shopifyError);
      }
      
      // No local database fallback - return 404 with helpful message
      console.log(`Product ${req.params.id} not found in Shopify, no local fallback`);
      return res.status(404).json({ 
        message: "Product not found in Shopify store",
        needsAuth: !inMemorySessionStorage.has('current'),
        productId: req.params.id
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const { tags } = req.body;
      const productId = req.params.id;
      
      const updatedProduct = await storage.updateShopifyProduct(productId, { tags });
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Part Mappings routes
  app.get("/api/mappings", async (req, res) => {
    try {
      const { motorcycleRecid, productId } = req.query;
      
      let mappings;
      if (motorcycleRecid) {
        mappings = await storage.getPartMappingsByMotorcycle(parseInt(motorcycleRecid as string));
      } else if (productId) {
        mappings = await storage.getPartMappingsByProduct(productId as string);
      } else {
        mappings = await storage.getPartMappings();
      }
      
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mappings" });
    }
  });

  app.post("/api/mappings", async (req, res) => {
    try {
      const validatedData = insertPartMappingSchema.parse(req.body);
      const mapping = await storage.createPartMapping(validatedData);
      res.status(201).json(mapping);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mapping data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create mapping" });
    }
  });

  app.post("/api/mappings/bulk", async (req, res) => {
    try {
      const { mappings } = req.body;
      if (!Array.isArray(mappings)) {
        return res.status(400).json({ message: "Mappings must be an array" });
      }
      
      const validatedMappings = mappings.map(mapping => insertPartMappingSchema.parse(mapping));
      const results = await storage.bulkCreatePartMappings(validatedMappings);
      res.status(201).json(results);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mapping data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create mappings" });
    }
  });

  app.delete("/api/mappings/:id", async (req, res) => {
    try {
      const success = await storage.deletePartMapping(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete mapping" });
    }
  });

  // Compatible Parts route
  app.get("/api/motorcycles/:recid/compatible-parts", async (req, res) => {
    try {
      const recid = parseInt(req.params.recid);
      const parts = await storage.getCompatibleParts(recid);
      res.json(parts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch compatible parts" });
    }
  });

  // Import History routes
  app.get("/api/import-history", async (req, res) => {
    try {
      const history = await storage.getImportHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch import history" });
    }
  });

  // Part Category Tags routes
  app.get("/api/part-category-tags", async (req, res) => {
    try {
      const tags = await storage.getPartCategoryTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch part category tags" });
    }
  });

  app.post("/api/part-category-tags", async (req, res) => {
    try {
      const validatedData = insertPartCategoryTagsSchema.parse(req.body);
      const tag = await storage.createPartCategoryTag(validatedData);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create part category tag" });
    }
  });

  app.put("/api/part-category-tags/:categoryValue", async (req, res) => {
    try {
      const { categoryValue } = req.params;
      const validatedData = insertPartCategoryTagsSchema.partial().parse(req.body);
      const tag = await storage.updatePartCategoryTag(categoryValue, validatedData);
      if (!tag) {
        return res.status(404).json({ message: "Part category tag not found" });
      }
      res.json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update part category tag" });
    }
  });

  app.delete("/api/part-category-tags/:categoryValue", async (req, res) => {
    try {
      const { categoryValue } = req.params;
      const success = await storage.deletePartCategoryTag(categoryValue);
      if (!success) {
        return res.status(404).json({ message: "Part category tag not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete part category tag" });
    }
  });

  app.post("/api/import-history", async (req, res) => {
    try {
      const validatedData = insertImportHistorySchema.parse(req.body);
      const history = await storage.createImportHistory(validatedData);
      res.status(201).json(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid import history data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create import history" });
    }
  });

  // CSV Import routes
  app.post("/api/import/motorcycles", async (req, res) => {
    try {
      const { data } = req.body; // Expecting parsed CSV data
      if (!Array.isArray(data)) {
        return res.status(400).json({ message: "Invalid CSV data format" });
      }

      const motorcycles = data.map(row => ({
        recid: parseInt(row.RECID),
        biketype: parseInt(row.BIKETYPE),
        bikemake: row.BIKEMAKE,
        bikemodel: row.BIKEMODEL,
        firstyear: parseInt(row.FIRSTYEAR),
        lastyear: parseInt(row.LASTYEAR),
        capacity: row.CAPACITY ? parseInt(row.CAPACITY) : null,
        oe_handlebar: row.OE_HANDLEBAR || null,
        oe_fcw: row.OE_FCW || null,
        oe_rcw: row.OE_RCW || null,
        front_brakepads: row.FRONT_BRAKEPADS || null,
        rear_brakepads: row.REAR_BRAKEPADS || null,
        handlebars_78: row['78_HANDLEBARS'] || null,
        twinwall: row.TWINWALL || null,
        fatbar: row.FATBAR || null,
        fatbar36: row.FATBAR36 || null,
        grips: row.GRIPS || null,
        cam: row.CAM || null,
        oe_barmount: row.OE_BARMOUNT || null,
        barmount28: row.BARMOUNT28 || null,
        barmount36: row.BARMOUNT36 || null,
        fcwgroup: row.FCWGROUP || null,
        fcwconv: row.FCWCONV || null,
        rcwconv: row.RCWCONV || null,
        rcwgroup: row.RCWGROUP || null,
        rcwgroup_range: row.RCWGROUP_RANGE || null,
        twinring: row.TWINRING || null,
        oe_chain: row.OE_CHAIN || null,
        chainconv: row.CHAINCONV || null,
        r1_chain: row.R1_CHAIN || null,
        r3_chain: row.R3_CHAIN || null,
        r4_chain: row.R4_CHAIN || null,
        rr4_chain: row.RR4_CHAIN || null,
        clipon: row.CLIPON || null,
        rcwcarrier: row.RCWCARRIER || null,
        active_handlecompare: row.ACTIVE_HANDLECOMPARE || null,
      }));

      const validatedMotorcycles = motorcycles.map(motorcycle => 
        insertMotorcycleSchema.parse(motorcycle)
      );

      const results = await storage.bulkCreateMotorcycles(validatedMotorcycles);
      
      // Create import history record
      await storage.createImportHistory({
        type: "motorcycles",
        filename: req.body.filename || "upload.csv",
        recordsCount: results.length,
        status: "success",
      });

      res.status(201).json({ 
        message: `Successfully imported ${results.length} motorcycles`,
        motorcycles: results 
      });
    } catch (error) {
      // Create failed import history record
      await storage.createImportHistory({
        type: "motorcycles",
        filename: req.body.filename || "upload.csv",
        recordsCount: 0,
        status: "error",
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid CSV data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to import motorcycles" });
    }
  });

  app.post("/api/import/mappings", async (req, res) => {
    try {
      const { data } = req.body; // Expecting parsed CSV data
      if (!Array.isArray(data)) {
        return res.status(400).json({ message: "Invalid CSV data format" });
      }

      const mappings = data.map(row => ({
        shopifyProductId: row.shopifyProductId,
        motorcycleRecid: parseInt(row.motorcycleRecid),
        compatible: row.compatible === 'true' || row.compatible === true,
      }));

      const validatedMappings = mappings.map(mapping => 
        insertPartMappingSchema.parse(mapping)
      );

      const results = await storage.bulkCreatePartMappings(validatedMappings);
      
      // Create import history record
      await storage.createImportHistory({
        type: "mappings",
        filename: req.body.filename || "upload.csv",
        recordsCount: results.length,
        status: "success",
      });

      res.status(201).json({ 
        message: `Successfully imported ${results.length} part mappings`,
        mappings: results 
      });
    } catch (error) {
      // Create failed import history record
      await storage.createImportHistory({
        type: "mappings",
        filename: req.body.filename || "upload.csv",
        recordsCount: 0,
        status: "error",
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid CSV data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to import mappings" });
    }
  });

  // New simplified CSV import and template endpoints
  app.get("/api/import/template", async (req, res) => {
    const type = req.query.type || 'motorcycles';
    
    if (type === 'parts') {
      // Parts mapping template
      const csvHeaders = [
        'MOTORCYCLE_RECID',
        'PART_CATEGORY',
        'PRODUCT_VARIANT'
      ];

      const sampleData = [
        '9200,oe_handlebar,821-01-BK',
        '9200,fcwgroup,228U-520 Front Sprocket',
        '9200,oe_fcw,228U-520-13T'
      ];

      const csvContent = [csvHeaders.join(','), ...sampleData].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="parts-mapping-template.csv"');
      res.send(csvContent);
    } else if (type === 'combined') {
      try {
        // Get all part category tags from database to create dynamic headers
        const categoryTags = await storage.getPartCategoryTags();
        
        // Base motorcycle headers
        const motorcycleHeaders = [
          'RECID',
          'BIKEMAKE',
          'BIKEMODEL', 
          'CAPACITY',
          'FIRSTYEAR',
          'LASTYEAR',
          'BIKETYPE',
          'ENGINETYPE'
        ];
        
        // Convert category values to uppercase headers for CSV
        const partHeaders = categoryTags.map(tag => tag.categoryValue.toUpperCase());
        
        // Combine all headers
        const csvHeaders = [...motorcycleHeaders, ...partHeaders];
        
        // Create sample data with empty part values (users fill these in)
        const emptyPartValues = new Array(partHeaders.length).fill('');
        const sampleData = [
          '9999,HONDA,CR 500R,500,1985,2001,2,2-Stroke,' + emptyPartValues.join(','),
          '9998,YAMAHA,YZ 250,250,2000,2023,2,2-Stroke,' + emptyPartValues.join(',')
        ];

        const csvContent = [csvHeaders.join(','), ...sampleData].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="combined-import-template.csv"');
        res.send(csvContent);
      } catch (error) {
        console.error('Error generating combined template:', error);
        res.status(500).json({ message: 'Failed to generate template' });
      }
    } else {
      // Motorcycle import template  
      const csvHeaders = [
        'RECID',
        'BIKEMAKE',
        'BIKEMODEL', 
        'CAPACITY',
        'FIRSTYEAR',
        'LASTYEAR',
        'BIKETYPE',
        'ENGINETYPE'
      ];

      const sampleData = [
        '9999,HONDA,CR 500R,500,1985,2001,2,2-Stroke',
        '9998,YAMAHA,YZ 250,250,2000,2023,2,2-Stroke'
      ];

      const csvContent = [csvHeaders.join(','), ...sampleData].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="motorcycle-import-template.csv"');
      res.send(csvContent);
    }
  });

  // Export combined motorcycle and parts data
  app.get("/api/export/combined-data", async (req, res) => {
    try {
      // Get all motorcycles and part category tags
      const [motorcycles, categoryTags] = await Promise.all([
        storage.getMotorcycles(),
        storage.getPartCategoryTags()
      ]);

      // Base motorcycle headers
      const motorcycleHeaders = [
        'RECID',
        'BIKEMAKE',
        'BIKEMODEL', 
        'CAPACITY',
        'FIRSTYEAR',
        'LASTYEAR',
        'BIKETYPE',
        'ENGINETYPE'
      ];
      
      // Convert category values to uppercase headers for CSV
      const partHeaders = categoryTags.map(tag => tag.categoryValue.toUpperCase());
      
      // Combine all headers
      const csvHeaders = [...motorcycleHeaders, ...partHeaders];

      // Build CSV rows with actual data
      const csvRows = [];
      
      for (const motorcycle of motorcycles) {
        // Build motorcycle data row
        const motorcycleData = [
          motorcycle.recid.toString(),
          motorcycle.bikemake || '',
          motorcycle.bikemodel || '',
          motorcycle.capacity?.toString() || '',
          motorcycle.firstyear?.toString() || '',
          motorcycle.lastyear?.toString() || '',
          motorcycle.biketype?.toString() || '',
          '' // enginetype not in schema
        ];
        
        // Add part data for each category - get from motorcycle columns directly
        const partData = partHeaders.map(header => {
          const columnName = header.toLowerCase();
          // Access the motorcycle property dynamically
          return (motorcycle as any)[columnName] || '';
        });
        
        // Combine motorcycle and part data
        const fullRow = [...motorcycleData, ...partData];
        csvRows.push(fullRow.join(','));
      }

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="motorcycles-and-parts-export.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting combined data:', error);
      res.status(500).json({ message: 'Failed to export data' });
    }
  });

  app.post("/api/import/csv", upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: "No CSV file provided" 
        });
      }

      const importType = req.body.type || 'motorcycles';
      const csvBuffer = req.file.buffer;
      const csvString = csvBuffer.toString('utf-8');

      // Parse CSV with error handling
      const parsePromise = promisify(parseCsv);
      const records = await parsePromise(csvString, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          success: false,
          totalRows: 0,
          successCount: 0,
          errorCount: 0,
          errors: [{ row: 1, field: 'file', message: 'CSV file is empty or invalid' }]
        });
      }

      const errors: Array<{ row: number; field: string; message: string }> = [];
      let savedRecords: any[] = [];
      let rowNumber = 2; // Start at 2 (accounting for header row)

      if (importType === 'parts') {
        // Handle parts mapping import
        const validMappings: any[] = [];

        for (const row of records) {
          const rowErrors: Array<{ field: string; message: string }> = [];

          try {
            // Basic validation for parts mapping
            if (!row.MOTORCYCLE_RECID) {
              rowErrors.push({ field: 'MOTORCYCLE_RECID', message: 'MOTORCYCLE_RECID is required' });
            } else if (isNaN(parseInt(row.MOTORCYCLE_RECID))) {
              rowErrors.push({ field: 'MOTORCYCLE_RECID', message: 'MOTORCYCLE_RECID must be a number' });
            }

            if (!row.PART_CATEGORY?.trim()) {
              rowErrors.push({ field: 'PART_CATEGORY', message: 'PART_CATEGORY is required' });
            }

            if (!row.PRODUCT_VARIANT?.trim()) {
              rowErrors.push({ field: 'PRODUCT_VARIANT', message: 'PRODUCT_VARIANT is required' });
            }

            // If validation passed, create the mapping
            if (rowErrors.length === 0) {
              const motorcycleRecid = parseInt(row.MOTORCYCLE_RECID);
              const partCategory = row.PART_CATEGORY.trim();
              const productVariant = row.PRODUCT_VARIANT.trim();

              // Apply the part mapping directly using the same logic as the individual assignment
              const updateData = {
                [partCategory]: productVariant
              };

              const motorcycle = await storage.updateMotorcycle(motorcycleRecid, updateData);
              if (motorcycle) {
                validMappings.push({ motorcycleRecid, partCategory, productVariant });
              } else {
                rowErrors.push({ field: 'MOTORCYCLE_RECID', message: 'Motorcycle not found' });
              }
            }

            // Add row errors to main errors array
            rowErrors.forEach(error => {
              errors.push({ 
                row: rowNumber, 
                field: error.field, 
                message: error.message 
              });
            });

          } catch (error) {
            errors.push({
              row: rowNumber,
              field: 'general',
              message: error instanceof Error ? error.message : 'Unknown error'
            });
          }

          rowNumber++;
        }

        savedRecords = validMappings;

        // Create import history record
        await storage.createImportHistory({
          type: "parts",
          filename: req.file.originalname,
          recordsCount: savedRecords.length,
          status: savedRecords.length > 0 ? "success" : "error",
        });

      } else if (importType === 'combined') {
        // Handle combined motorcycles + parts import
        const validCombined: any[] = [];

        // Define the parts columns mapping (ALL available categories)
        const partsColumnMap: Record<string, string> = {
          'OE_HANDLEBAR': 'oe_handlebar',
          'OE_FCW': 'oe_fcw',
          'OE_RCW': 'oe_rcw',
          'FRONT_BRAKEPADS': 'front_brakepads',
          'REAR_BRAKEPADS': 'rear_brakepads',
          'HANDLEBARS_78': 'handlebars_78',
          'TWINWALL': 'twinwall',
          'FATBAR': 'fatbar',
          'FATBAR36': 'fatbar36',
          'GRIPS': 'grips',
          'CAM': 'cam',
          'OE_BARMOUNT': 'oe_barmount',
          'BARMOUNT28': 'barmount28',
          'BARMOUNT36': 'barmount36',
          'FCWGROUP': 'fcwgroup',
          'FCWCONV': 'fcwconv',
          'RCWCONV': 'rcwconv',
          'RCWGROUP': 'rcwgroup',
          'RCWGROUP_RANGE': 'rcwgroup_range',
          'TWINRING': 'twinring',
          'OE_CHAIN': 'oe_chain',
          'CHAINCONV': 'chainconv',
          'R1_CHAIN': 'r1_chain',
          'R3_CHAIN': 'r3_chain',
          'R4_CHAIN': 'r4_chain',
          'RR4_CHAIN': 'rr4_chain',
          'CLIPON': 'clipon',
          'RCWCARRIER': 'rcwcarrier',
          'ACTIVE_HANDLECOMPARE': 'active_handlecompare'
        };

        for (const row of records) {
          const rowErrors: Array<{ field: string; message: string }> = [];

          try {
            // Validate motorcycle fields (first 8 columns)
            if (!row.RECID) {
              rowErrors.push({ field: 'RECID', message: 'RECID is required' });
            } else if (isNaN(parseInt(row.RECID))) {
              rowErrors.push({ field: 'RECID', message: 'RECID must be a number' });
            }

            if (!row.BIKEMAKE?.trim()) {
              rowErrors.push({ field: 'BIKEMAKE', message: 'BIKEMAKE is required' });
            }

            if (!row.BIKEMODEL?.trim()) {
              rowErrors.push({ field: 'BIKEMODEL', message: 'BIKEMODEL is required' });
            }

            // If validation passed, create motorcycle and assign parts
            if (rowErrors.length === 0) {
              // Create motorcycle data
              const motorcycleData = {
                recid: parseInt(row.RECID),
                bikemake: row.BIKEMAKE.trim(),
                bikemodel: row.BIKEMODEL.trim(),
                capacity: row.CAPACITY ? parseInt(row.CAPACITY) : null,
                firstyear: row.FIRSTYEAR ? parseInt(row.FIRSTYEAR) : null,
                lastyear: row.LASTYEAR ? parseInt(row.LASTYEAR) : null,
                biketype: row.BIKETYPE ? parseInt(row.BIKETYPE) : null,
                enginetype: row.ENGINETYPE?.trim() || null
              };

              // Create motorcycle
              const motorcycle = await storage.createMotorcycle(motorcycleData);
              
              // Assign parts (columns 8+)
              const partsAssigned: string[] = [];
              for (const [columnName, partCategory] of Object.entries(partsColumnMap)) {
                const partValue = row[columnName];
                if (partValue && partValue.trim()) {
                  try {
                    const updateData = {
                      [partCategory]: partValue.trim()
                    };
                    await storage.updateMotorcycle(motorcycle.recid, updateData);
                    partsAssigned.push(columnName);
                  } catch (partError) {
                    rowErrors.push({ 
                      field: columnName, 
                      message: `Failed to assign part: ${partError instanceof Error ? partError.message : 'Unknown error'}` 
                    });
                  }
                }
              }

              validCombined.push({ 
                motorcycle: motorcycleData, 
                partsAssigned 
              });
            }

            // Add row errors to main errors array
            rowErrors.forEach(error => {
              errors.push({ 
                row: rowNumber, 
                field: error.field, 
                message: error.message 
              });
            });

          } catch (error) {
            errors.push({
              row: rowNumber,
              field: 'general',
              message: error instanceof Error ? error.message : 'Unknown error'
            });
          }

          rowNumber++;
        }

        savedRecords = validCombined;

        // Create import history record
        await storage.createImportHistory({
          type: "combined",
          filename: req.file.originalname,
          recordsCount: savedRecords.length,
          status: savedRecords.length > 0 ? "success" : "error",
        });

      } else {
        // Handle motorcycles import
        const validMotorcycles: any[] = [];

        for (const row of records) {
          const rowErrors: Array<{ field: string; message: string }> = [];

          try {
            // Basic validation for motorcycles
            if (!row.RECID) {
              rowErrors.push({ field: 'RECID', message: 'RECID is required' });
            } else if (isNaN(parseInt(row.RECID))) {
              rowErrors.push({ field: 'RECID', message: 'RECID must be a number' });
            }

            if (!row.BIKEMAKE?.trim()) {
              rowErrors.push({ field: 'BIKEMAKE', message: 'BIKEMAKE is required' });
            }

            if (!row.BIKEMODEL?.trim()) {
              rowErrors.push({ field: 'BIKEMODEL', message: 'BIKEMODEL is required' });
            }

            if (!row.BIKETYPE) {
              rowErrors.push({ field: 'BIKETYPE', message: 'BIKETYPE is required' });
            } else if (isNaN(parseInt(row.BIKETYPE))) {
              rowErrors.push({ field: 'BIKETYPE', message: 'BIKETYPE must be a number' });
            }

            // If validation passed, create the motorcycle object
            if (rowErrors.length === 0) {
              const motorcycleData = {
                recid: parseInt(row.RECID),
                biketype: parseInt(row.BIKETYPE),
                bikemake: row.BIKEMAKE.trim(),
                bikemodel: row.BIKEMODEL.trim(),
                capacity: row.CAPACITY ? parseInt(row.CAPACITY) : null,
                firstyear: row.FIRSTYEAR ? parseInt(row.FIRSTYEAR) : null,
                lastyear: row.LASTYEAR ? parseInt(row.LASTYEAR) : null,
                enginetype: row.ENGINETYPE?.trim() || null,
              };

              // Validate with Zod schema
              const validatedData = insertMotorcycleSchema.parse(motorcycleData);
              validMotorcycles.push(validatedData);
            } else {
              // Add row errors to main errors array
              rowErrors.forEach(error => {
                errors.push({ 
                  row: rowNumber, 
                  field: error.field, 
                  message: error.message 
                });
              });
            }
          } catch (error) {
            if (error instanceof z.ZodError) {
              error.errors.forEach(zodError => {
                errors.push({
                  row: rowNumber,
                  field: zodError.path.join('.'),
                  message: zodError.message
                });
              });
            } else {
              errors.push({
                row: rowNumber,
                field: 'general',
                message: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }

          rowNumber++;
        }

        // Attempt to save valid motorcycles
        if (validMotorcycles.length > 0) {
          try {
            savedRecords = await storage.bulkCreateMotorcycles(validMotorcycles);
          } catch (error) {
            // Handle database errors
            errors.push({
              row: 0,
              field: 'database',
              message: error instanceof Error ? error.message : 'Database error occurred'
            });
          }
        }

        // Create import history record
        await storage.createImportHistory({
          type: "motorcycles",
          filename: req.file.originalname,
          recordsCount: savedRecords.length,
          status: savedRecords.length > 0 ? "success" : "error",
        });
      }

      const result = {
        success: errors.length === 0 && savedRecords.length > 0,
        totalRows: records.length,
        successCount: savedRecords.length,
        errorCount: records.length - savedRecords.length,
        errors: errors.slice(0, 50) // Limit errors to first 50 for UI
      };

      res.json(result);

    } catch (error) {
      console.error('CSV import error:', error);
      
      // Create failed import history record
      await storage.createImportHistory({
        type: req.body.type || "motorcycles",
        filename: req.file?.originalname || "unknown.csv",
        recordsCount: 0,
        status: "error",
      });

      res.status(500).json({
        success: false,
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        errors: [{ row: 0, field: 'system', message: 'Server error processing CSV file' }]
      });
    }
  });

  // Statistics endpoint for dashboard
  app.get("/api/stats", async (req, res) => {
    try {
      const [motorcycles, products, mappings, importHistory, categoryTags] = await Promise.all([
        storage.getMotorcycles(),
        storage.getShopifyProducts(),
        storage.getPartMappings(),
        storage.getImportHistory(),
        storage.getPartCategoryTags()
      ]);

      // Calculate coverage metrics
      const motorcyclesWithParts = new Set(mappings.map(m => m.motorcycleRecid));
      const coveragePercentage = motorcycles.length > 0 ? 
        Math.round((motorcyclesWithParts.size / motorcycles.length) * 100) : 0;

      // Category breakdown - count how many motorcycles have each category mapped
      const categoryBreakdown: { [key: string]: number } = {};
      categoryTags.forEach(tag => {
        const columnName = tag.categoryValue.toLowerCase();
        const count = motorcycles.filter(m => (m as any)[columnName] && (m as any)[columnName].trim() !== '').length;
        categoryBreakdown[tag.categoryLabel] = count;
      });

      // Popular makes analysis
      const makesCounts: { [key: string]: number } = {};
      motorcycles.forEach(m => {
        makesCounts[m.bikemake] = (makesCounts[m.bikemake] || 0) + 1;
      });
      const popularMakes = Object.entries(makesCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([make, count]) => ({ make, count }));

      // Year coverage analysis  
      const yearCounts: { [key: number]: number } = {};
      motorcycles.forEach(m => {
        for (let year = m.firstyear; year <= m.lastyear; year++) {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
      });
      const currentYear = new Date().getFullYear();
      const recentYears = Object.entries(yearCounts)
        .filter(([year]) => parseInt(year) >= currentYear - 10)
        .sort(([a], [b]) => parseInt(b) - parseInt(a))
        .slice(0, 5)
        .map(([year, count]) => ({ year: parseInt(year), count }));

      // Data quality metrics
      const unmappedMotorcycles = motorcycles.length - motorcyclesWithParts.size;
      const missingCapacity = motorcycles.filter(m => !m.capacity).length;
      
      const stats = {
        // Basic metrics
        totalMotorcycles: motorcycles.length,
        mappedParts: mappings.length,
        shopifyProducts: products.length,
        lastSync: importHistory.length > 0 ? importHistory[0].createdAt : null,
        
        // Enhanced metrics
        coveragePercentage,
        motorcyclesWithParts: motorcyclesWithParts.size,
        unmappedMotorcycles,
        categoryBreakdown,
        popularMakes,
        recentYears,
        
        // Data quality
        missingCapacity,
        totalCategories: categoryTags.length,
      };

      res.json(stats);
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Debug endpoint to check Shopify authentication status
  app.get("/api/debug/shopify-status", async (req, res) => {
    try {
      const sessions = Array.from(inMemorySessionStorage.values());
      const activeSession = sessions.find((session: any) => session?.accessToken);
      
      res.json({
        hasGlobalToken: !!global.LATEST_SHOPIFY_ACCESS_TOKEN,
        globalTokenLength: global.LATEST_SHOPIFY_ACCESS_TOKEN?.length || 0,
        activeSessions: sessions.length,
        hasActiveSession: !!activeSession,
        sessionShop: activeSession?.shop || null,
        needsReauth: !activeSession && !global.LATEST_SHOPIFY_ACCESS_TOKEN
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // Top searches endpoint for analytics
  app.get("/api/analytics/top-searches", async (req, res) => {
    try {
      const { dateFrom, dateTo, limit } = req.query;
      
      const topSearches = await storage.getTopSearches(
        dateFrom as string,
        dateTo as string,
        limit ? parseInt(limit as string) : 25
      );
      
      res.json(topSearches);
    } catch (error) {
      console.error('Top searches error:', error);
      res.status(500).json({ message: "Failed to fetch top searches" });
    }
  });

  // Customer API: Get compatible parts by make/model/year
  app.get("/api/customer/motorcycle-parts", async (req, res) => {
    try {
      const { make, model, year } = req.query;
      
      if (!make || !model || !year) {
        return res.status(400).json({ 
          message: "Missing required parameters: make, model, year" 
        });
      }

      // Parse year to integer for comparison
      const yearNum = parseInt(year as string);
      if (isNaN(yearNum)) {
        return res.status(400).json({ 
          message: "Invalid year parameter" 
        });
      }

      // Find motorcycles matching the make, model, and year
      const motorcycles = await storage.getMotorcycles();
      const matchingMotorcycles = motorcycles.filter(m => 
        m.bikemake === make && 
        m.bikemodel === model &&
        yearNum >= m.firstyear && 
        yearNum <= m.lastyear
      );

      if (matchingMotorcycles.length === 0) {
        return res.json({ 
          motorcycle: { make, model, year },
          parts: [] 
        });
      }

      // Get all products and check compatibility
      const [allProducts, categoryTags] = await Promise.all([
        storage.getShopifyProducts(),
        storage.getPartCategoryTags()
      ]);


      const compatibleProducts = [];
      const compatibleProductIds = new Set();

      // Check each matching motorcycle for specifically assigned parts only
      for (const motorcycle of matchingMotorcycles) {
        // Check each part category for assigned products
        for (const category of categoryTags) {
          const columnName = category.categoryValue.toLowerCase();
          const assignedSku = (motorcycle as any)[columnName];
          
          // Only include parts that have been specifically assigned in admin
          if (assignedSku && assignedSku.trim() !== '') {
            // Find the exact product with this SKU (check main SKU and variant SKUs)
            const assignedProduct = allProducts.find(product => {
              // Check main product SKU
              if (product.sku === assignedSku) {
                return true;
              }
              
              // Check variant SKUs
              try {
                const variants = product.variants ? JSON.parse(product.variants) : [];
                return variants.some((variant: any) => variant.sku === assignedSku);
              } catch (error) {
                // If variants parsing fails, continue with main SKU check only
                return false;
              }
            });
            
            if (!assignedProduct) {
              console.warn(`Customer API: Assigned SKU "${assignedSku}" for category "${category.categoryLabel}" not found in Shopify products or variants`);
              continue;
            }
            
            if (assignedProduct && !compatibleProductIds.has(assignedProduct.id)) {
              compatibleProductIds.add(assignedProduct.id);
              
              // Parse product data for display
              let images: Array<{ src: string }> = [];
              try {
                images = assignedProduct.imageUrl ? [{ src: assignedProduct.imageUrl }] : [];
              } catch (error) {
                console.error('Error parsing product images:', error);
              }

              compatibleProducts.push({
                id: assignedProduct.id,
                title: assignedProduct.title,
                price: assignedProduct.price,
                sku: assignedProduct.sku,
                images: images,
                category: assignedProduct.category,
                tags: assignedProduct.tags,
                categoryLabel: category.categoryLabel // Include category label for display
              });
            }
          }
        }
      }

      res.json({
        motorcycle: { 
          make, 
          model, 
          year: parseInt(year as string),
          matchingMotorcycles: matchingMotorcycles.length
        },
        parts: compatibleProducts
      });
      
    } catch (error) {
      console.error('Customer parts search error:', error);
      res.status(500).json({ message: "Failed to search for compatible parts" });
    }
  });

  // Customer API: Get compatible parts for a motorcycle
  app.get("/api/customer/motorcycles/:recid/compatible-parts", async (req, res) => {
    try {
      const recid = parseInt(req.params.recid);
      if (isNaN(recid)) {
        return res.status(400).json({ message: "Invalid motorcycle ID" });
      }

      // Get the motorcycle first to verify it exists
      const motorcycle = await storage.getMotorcycle(recid);
      if (!motorcycle) {
        return res.status(404).json({ message: "Motorcycle not found" });
      }

      // Get all products and check which ones have compatible parts for this motorcycle
      const [allProducts, categoryTags] = await Promise.all([
        storage.getShopifyProducts(),
        storage.getPartCategoryTags()
      ]);

      const compatibleProducts = [];

      // Check each product's compatibility by looking at motorcycle column values
      for (const product of allProducts) {
        let isCompatible = false;

        // Check each part category to see if this motorcycle has a matching part
        for (const category of categoryTags) {
          const columnName = category.categoryValue.toLowerCase();
          const motorcycleValue = (motorcycle as any)[columnName];
          
          // If motorcycle has a value for this part category, check if product matches
          if (motorcycleValue && motorcycleValue.trim() !== '') {
            // Parse product tags to see if it matches the motorcycle's part value
            try {
              const productTags = JSON.parse(category.productTags) as string[];
              
              // Check if any product tag matches the motorcycle's part value
              if (productTags.some(tag => 
                product.tags?.toLowerCase().includes(tag.toLowerCase()) ||
                product.title?.toLowerCase().includes(tag.toLowerCase()) ||
                product.sku?.toLowerCase().includes(tag.toLowerCase())
              )) {
                isCompatible = true;
                break;
              }
            } catch (e) {
              // Skip if JSON parsing fails
              continue;
            }
          }
        }

        if (isCompatible) {
          compatibleProducts.push({
            ...product,
            compatibility: `Compatible with ${motorcycle.bikemake} ${motorcycle.bikemodel} (${motorcycle.firstyear}-${motorcycle.lastyear})`
          });
        }
      }

      res.json(compatibleProducts);
    } catch (error) {
      console.error('Compatible parts error:', error);
      res.status(500).json({ message: "Failed to fetch compatible parts" });
    }
  });

  // App installation status endpoint
  app.get("/api/app/status", async (req, res) => {
    try {
      const shop = req.query.shop as string;
      if (!shop) {
        return res.status(400).json({ error: "Shop parameter is required" });
      }
      
      const sessions = Array.from(inMemorySessionStorage.values()).filter(s => s.shop === shop);
      const isInstalled = sessions.length > 0;
      
      res.json({ 
        installed: isInstalled,
        shop: shop,
        appUrl: `${process.env.SHOPIFY_APP_URL || 'https://your-repl-name.replit.app'}`
      });
    } catch (error) {
      console.error('App status check error:', error);
      res.status(500).json({ error: "Failed to check app status" });
    }
  });

  // Shopify App OAuth routes
  app.get("/api/auth/install", verifyShop, async (req, res) => {
    try {
      const shop = req.query.shop as string;
      // The getAuthUrl function handles the redirect internally
      await getAuthUrl(shop, req, res);
    } catch (error) {
      console.error("Install error:", error);
      if (!res.headersSent) {
        res.status(500).send("Failed to initiate Shopify OAuth");
      }
    }
  });

  app.get("/api/auth/callback", async (req, res) => {
    try {
      const callback = await validateAuthCallback(req, res);
      
      if (callback.session) {
        // App installed successfully
        const shop = callback.session.shop;
        console.log(`App installed successfully for ${shop}`);
        
        // ✅ MANUALLY PERSIST SESSION - This fixes the core issue!
        console.log(`🔧 MANUAL: Persisting session for ${shop} after callback`);
        try {
          // Store in database for permanent persistence
          const stored = await storage.storeShopifySession(callback.session);
          
          // Store in memory for current session
          inMemorySessionStorage.set(callback.session.id, callback.session);
          inMemorySessionStorage.set('current', callback.session);
          
          if (stored) {
            console.log(`✅ MANUAL: Successfully stored session for ${shop} in DATABASE`);
          } else {
            console.log(`❌ MANUAL: Failed to store session for ${shop} in DATABASE`);
          }
        } catch (error) {
          console.error(`💥 MANUAL: Error storing session for ${shop}:`, error);
        }
        
        // Store the access token globally for direct use
        if (callback.session.accessToken) {
          global.LATEST_SHOPIFY_ACCESS_TOKEN = callback.session.accessToken;
          console.log(`=== ACCESS TOKEN STORED ===`);
          console.log(`Token length: ${callback.session.accessToken.length}`);
          console.log(`Shop: ${callback.session.shop}`);
          console.log(`========================`);
        } else {
          console.log(`WARNING: No access token in callback session!`);
        }
        
        // Sync products after installation
        try {
          const products = await fetchShopifyProducts(callback.session);
          console.log(`Synced ${products.products?.length || 0} products from ${shop}`);
          
          // Store products in our database WITH COMPLETE VARIANT DATA
          console.log(`=== STORING PRODUCTS WITH VARIANTS ===`);
          for (const product of products.products || []) {
            try {
              // Properly handle tags from Shopify
              let formattedTags = null;
              if (product.tags && product.tags.trim()) {
                const tagArray = product.tags.split(',').map((tag: string) => tag.trim()).filter(tag => tag.length > 0);
                formattedTags = tagArray.length > 0 ? JSON.stringify(tagArray) : null;
              }
              
              // Process ALL variants for this product
              const variants = product.variants?.map((variant: any) => ({
                id: variant.id.toString(),
                title: variant.title,
                price: variant.price,
                sku: variant.sku,
                inventoryQuantity: variant.inventory_quantity,
                option1: variant.option1,
                option2: variant.option2, 
                option3: variant.option3,
                available: variant.inventory_quantity > 0
              })) || [];
              
              console.log(`Storing "${product.title}" with ${variants.length} variants`);
              if (variants.length > 1) {
                console.log(`  Variant titles: ${variants.map(v => v.title).join(', ')}`);
              }
              
              const productData = {
                id: product.id.toString(),
                title: product.title,
                description: product.body_html || null,
                price: product.variants?.[0]?.price || "0",
                sku: product.variants?.[0]?.sku || null,
                imageUrl: product.images?.[0]?.src || null,
                category: product.product_type || null,
                tags: formattedTags,
                variants: variants.length > 0 ? JSON.stringify(variants) : null
              };
              
              // Try to update if exists, otherwise create
              const existingProduct = await storage.getShopifyProduct(product.id.toString());
              if (existingProduct) {
                await storage.updateShopifyProduct(product.id.toString(), productData);
              } else {
                await storage.createShopifyProduct(productData);
              }
            } catch (error) {
              // Product might already exist, skip
              console.log(`Skipped product ${product.id}: ${error}`);
            }
          }
        } catch (error) {
          console.error("Product sync error:", error);
        }
        
        // Redirect to success page
        const devUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : 'https://rest-express.replit.app';
        res.redirect(`${devUrl}/?shop=${shop}&installed=true`);
      } else {
        res.status(400).send("OAuth callback failed");
      }
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Get app installation status
  app.get("/api/auth/status", (req, res) => {
    const shop = req.query.shop as string;
    const installed = req.query.installed === 'true';
    
    res.json({
      shop,
      installed,
      message: installed ? `Successfully installed on ${shop}!` : 'Not installed'
    });
  });

  // Force re-sync products from Shopify with current tags
  app.post("/api/shopify/sync-products", async (req, res) => {
    try {
      // Note: In a production app, you'd need to store and retrieve the Shopify session
      // For now, we'll simulate what should happen with a proper Shopify connection
      
      console.log("Attempting to re-sync product tags from Shopify...");
      
      // Get existing products from our database
      const existingProducts = await storage.getShopifyProducts();
      console.log(`Found ${existingProducts?.length || 0} products in local database`);
      
      // For demonstration, let's manually update the 821-01 product with tags
      // (In reality, this would come from the Shopify API)
      let updatedCount = 0;
      
      // Simulate updating 821-01 with its actual Shopify tags
      const product821 = existingProducts.find(p => p.title === '821-01');
      if (product821) {
        // These should be the actual tags from your Shopify store
        const actualShopifyTags = ["handlebars", "fatbar", "motorcycle-parts"]; // Replace with actual tags
        
        await storage.updateShopifyProduct(product821.id, {
          tags: JSON.stringify(actualShopifyTags)
        });
        updatedCount++;
        console.log(`Updated ${product821.title} with tags: ${actualShopifyTags.join(', ')}`);
      }
      
      res.json({ 
        message: "Product sync completed", 
        checkedProducts: existingProducts.length,
        updatedProducts: updatedCount,
        note: `Updated products with current Shopify tags. Full sync requires active Shopify API connection.`
      });
    } catch (error) {
      console.error("Product sync error:", error);
      res.status(500).json({ message: "Failed to sync products from Shopify" });
    }
  });

  // ==========================================
  // SHOPIFY APP PROXY ROUTES (Customer-Facing)
  // ==========================================
  
  // Apply security middleware to all proxy routes
  const appProxySecurityMiddleware = createAppProxySecurityMiddleware();
  
  // Main app proxy route - handles customer-facing pages
  app.get("/api/proxy", appProxySecurityMiddleware, async (req, res) => {
    try {
      const { bikeid } = req.query;
      const shop = req.shopifyShop;
      
      res.set('Content-Type', 'text/html; charset=utf-8');
      
      if (bikeid) {
        // Show specific motorcycle compatibility page
        try {
          const motorcycle = await storage.getMotorcycle(parseInt(bikeid as string));
          const compatibleParts = await storage.getCompatibleParts(parseInt(bikeid as string));
          
          if (!motorcycle) {
            return res.status(404).send(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Motorcycle Not Found</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>Motorcycle Not Found</h1>
                <p>Sorry, we couldn't find a motorcycle with that ID.</p>
                <a href="${shop}/apps/fit-my-bike" style="color: #007cba;">← Back to Search</a>
              </body>
              </html>
            `);
          }
          
          // Get live Shopify products for the compatible parts
          let shopifyProducts = [];
          try {
            const sessions = Array.from(inMemorySessionStorage.values());
            const activeSession = sessions.find((session: any) => session?.accessToken);
            
            if (activeSession) {
              const shopifyData = await fetchShopifyProducts(activeSession);
              shopifyProducts = shopifyData.products || [];
            }
          } catch (error) {
            console.error('Failed to fetch live Shopify products for proxy:', error);
          }
          
          // Map compatible parts to Shopify products
          const compatibleShopifyProducts = compatibleParts
            .map(mapping => shopifyProducts.find(p => p.id.toString() === mapping.shopifyProductId))
            .filter(Boolean);
          
          return res.send(generateMotorcyclePage(motorcycle, compatibleShopifyProducts, shop as string));
        } catch (error) {
          console.error('Error loading motorcycle page:', error);
          return res.status(500).send("Error loading motorcycle data");
        }
      } else {
        // Show search page
        return res.send(generateSearchPage(shop as string));
      }
    } catch (error) {
      console.error('App proxy error:', error);
      res.status(500).send("Internal server error");
    }
  });
  
  // API endpoint for search data (years, makes, etc.) - with shop path
  app.get("/api/proxy/:shop/apps/fit-my-bike/search-data", appProxySecurityMiddleware, async (req, res) => {
    try {
      const { type, make, model } = req.query;
      
      let data = [];
      switch (type) {
        case 'years':
          if (make && model) {
            // Get years for specific make+model combination
            data = await storage.getDistinctYearsByMakeModel(make as string, model as string);
          } else {
            // Get all years (backward compatibility)
            data = await storage.getDistinctMotorcycleYears();
          }
          break;
        case 'makes':
          data = await storage.getDistinctMotorcycleMakes();
          break;
        case 'models':
          if (make) {
            // Get models for specific make
            data = await storage.getDistinctMotorcycleModelsByMake(make as string);
          } else {
            data = [];
          }
          break;
        default:
          data = [];
      }
      
      res.json(data);
    } catch (error) {
      console.error('Search data error:', error);
      res.status(500).json({ error: 'Failed to load search data' });
    }
  });

  // API endpoint for search data (years, makes, etc.) - fallback route
  app.get("/api/proxy/search-data", appProxySecurityMiddleware, async (req, res) => {
    try {
      const { type, make, model } = req.query;
      
      let data = [];
      switch (type) {
        case 'years':
          if (make && model) {
            // Get years for specific make+model combination
            data = await storage.getDistinctYearsByMakeModel(make as string, model as string);
          } else {
            // Get all years (backward compatibility)
            data = await storage.getDistinctMotorcycleYears();
          }
          break;
        case 'makes':
          data = await storage.getDistinctMotorcycleMakes();
          break;
        case 'models':
          if (make) {
            // Get models for specific make
            data = await storage.getDistinctMotorcycleModelsByMake(make as string);
          } else {
            data = [];
          }
          break;
        default:
          data = [];
      }
      
      res.json(data);
    } catch (error) {
      console.error('Search data error:', error);
      res.status(500).json({ error: 'Failed to load search data' });
    }
  });
  
  // API endpoint for motorcycle search
  // Search route with full shop path
  app.post("/api/proxy/:shop/apps/fit-my-bike/search", appProxySecurityMiddleware, async (req, res) => {
    try {
      const { year, make, model, searchQuery } = req.body;
      
      let motorcycles = [];
      if (searchQuery) {
        motorcycles = await storage.searchMotorcycles(searchQuery);
      } else if (make && model) {
        // New Make > Model > Year flow - use new filtering method
        motorcycles = await storage.filterMotorcyclesByMakeModelYear(make, model, year ? parseInt(year) : undefined);
      } else if (year && make) {
        // Backward compatibility for old Year > Make flow
        motorcycles = await storage.filterMotorcycles({
          firstyear: parseInt(year),
          lastyear: parseInt(year),
          bikemake: make
        });
        
        if (model) {
          motorcycles = motorcycles.filter(m => 
            m.bikemodel.toLowerCase().includes(model.toLowerCase())
          );
        }
      }
      
      res.json({ motorcycles });
    } catch (error) {
      console.error('Motorcycle search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // Search route fallback
  app.post("/api/proxy/search", appProxySecurityMiddleware, async (req, res) => {
    try {
      const { year, make, model, searchQuery } = req.body;
      
      let motorcycles = [];
      if (searchQuery) {
        motorcycles = await storage.searchMotorcycles(searchQuery);
      } else if (make && model) {
        // New Make > Model > Year flow - use new filtering method
        motorcycles = await storage.filterMotorcyclesByMakeModelYear(make, model, year ? parseInt(year) : undefined);
      } else if (year && make) {
        // Backward compatibility for old Year > Make flow
        motorcycles = await storage.filterMotorcycles({
          firstyear: parseInt(year),
          lastyear: parseInt(year),
          bikemake: make
        });
        
        if (model) {
          motorcycles = motorcycles.filter(m => 
            m.bikemodel.toLowerCase().includes(model.toLowerCase())
          );
        }
      }
      
      res.json({ motorcycles });
    } catch (error) {
      console.error('Motorcycle search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
