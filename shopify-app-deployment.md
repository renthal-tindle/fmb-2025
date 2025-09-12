# FMB Motorcycle Parts Finder - Shopify App Deployment Guide

## Prerequisites

1. **Shopify Partner Account**: Create one at [partners.shopify.com](https://partners.shopify.com)
2. **Replit App**: Your motorcycle parts app running on Replit
3. **Domain**: Your Replit app URL (e.g., `https://your-repl-name.replit.app`)

## Step 1: Create Shopify App in Partner Dashboard

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click "Create app" → "Custom app"
3. Fill in app details:
   - **App name**: "FMB Motorcycle Parts Finder"
   - **App URL**: `https://your-repl-name.replit.app`
   - **Allowed redirection URLs**: `https://your-repl-name.replit.app/api/auth/callback`

4. Note down your:
   - **Client ID** (API key)
   - **Client Secret** (API secret key)

## Step 2: Update Configuration Files

### Update shopify.app.toml
```toml
name = "FMB Motorcycle Parts Finder"
client_id = "YOUR_ACTUAL_CLIENT_ID_HERE"
application_url = "https://your-actual-repl-name.replit.app"
```

### Set Environment Variables in Replit
Add these to your Replit Secrets:
- `SHOPIFY_API_KEY`: Your Client ID from Step 1
- `SHOPIFY_API_SECRET`: Your Client Secret from Step 1
- `SHOPIFY_APP_URL`: Your Replit app URL

## Step 3: Deploy the App Extension

Run these commands in your Replit Shell:

```bash
# Install Shopify CLI
npm install -g @shopify/cli @shopify/theme

# Login to Shopify
shopify auth login

# Deploy the theme extension
shopify app deploy

# Generate app installation URL
shopify app info --web-env
```

## Step 4: Configure App Scopes

In your Partner Dashboard:
1. Go to your app → App setup
2. Set **App scopes**:
   - `read_products` - Read product catalog
   - `write_products` - Modify product data  
   - `read_orders` - Read order information
   - `write_orders` - Create orders

3. Set **App URLs**:
   - **App URL**: `https://your-repl-name.replit.app`
   - **Allowed redirection URLs**: `https://your-repl-name.replit.app/api/auth/callback`

## Step 5: Test Installation

1. Get the installation URL from Partner Dashboard
2. Install on a development store
3. Check that the app appears in the store admin
4. Go to theme customizer → Add section → Look for "FMB-REPLIT-V2"

## Step 6: Configure the App Block

Once installed, merchants can:
1. Go to Online Store → Themes → Customize
2. Add a new section
3. Select "FMB-REPLIT-V2" from the app blocks
4. Configure settings:
   - **API Base URL**: `https://your-repl-name.replit.app`
   - **Widget Title**: Custom title
   - **Compact Mode**: Enable/disable
   - **Maximum Parts**: 6-24 results

## Troubleshooting

### App Block Not Appearing
- Check that the extension deployed successfully: `shopify app info`
- Verify the app is installed on the store
- Refresh the theme customizer page

### Authentication Errors
- Verify SHOPIFY_API_KEY and SHOPIFY_API_SECRET are set correctly
- Check that redirect URLs match exactly
- Ensure your Replit app is public and accessible

### Widget Not Loading
- Check that your Replit app is running
- Verify the API Base URL is correct in block settings
- Check browser console for error messages

## Production Deployment

### For Shopify App Store
1. Complete Shopify's app review process
2. Submit app for approval
3. Once approved, merchants can install from App Store

### For Private Use
1. The app can be used immediately on stores you own
2. Share installation URL with specific stores
3. No app store submission required

## Monitoring

Check these endpoints for debugging:
- `https://your-repl-name.replit.app/api/app/status?shop=yourstore.myshopify.com`
- `https://your-repl-name.replit.app/shopify-widget` (test widget)

## Security

- API keys are stored securely in Replit Secrets
- All API calls go through your backend
- Widget loads in secure iframe
- Shopify handles authentication and authorization

## Next Steps

1. Test thoroughly on development store
2. Gather feedback from test merchants
3. Submit for Shopify App Store review (optional)
4. Monitor usage and performance metrics