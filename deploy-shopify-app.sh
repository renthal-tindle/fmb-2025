#!/bin/bash

# FMB Motorcycle Parts Finder - Shopify App Deployment Script

echo "🏍️  FMB Motorcycle Parts Finder - Shopify App Deployment"
echo "========================================================="

# Check if required environment variables are set
if [ -z "$SHOPIFY_API_KEY" ] || [ -z "$SHOPIFY_API_SECRET" ]; then
    echo "❌ Error: SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set in Replit Secrets"
    echo "   Please add them in the Secrets tab and run this script again"
    exit 1
fi

# Get the current Replit URL
REPL_URL=$(printenv REPL_URL || echo "https://your-repl-name.replit.app")
echo "📍 Using Replit URL: $REPL_URL"

# Update shopify.app.toml with actual values
echo "🔧 Updating shopify.app.toml..."
sed -i "s|your_client_id_placeholder|$SHOPIFY_API_KEY|g" shopify.app.toml
sed -i "s|your-repl-name.replit.app|${REPL_URL#https://}|g" shopify.app.toml

# Update extension configuration
echo "🔧 Updating extension configuration..."
sed -i "s|your-repl-name.replit.app|${REPL_URL#https://}|g" extensions/fmb-motorcycle-parts/shopify.extension.toml
sed -i "s|your-repl-name.replit.app|${REPL_URL#https://}|g" extensions/fmb-motorcycle-parts/blocks/motorcycle-parts-finder.liquid

echo "✅ Configuration files updated!"
echo ""

# Check if Shopify CLI is installed
if ! command -v shopify &> /dev/null; then
    echo "📦 Installing Shopify CLI..."
    npm install -g @shopify/cli
fi

echo "🚀 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Run: shopify auth login"
echo "2. Run: shopify app deploy"
echo "3. Follow the deployment guide in shopify-app-deployment.md"
echo ""
echo "📚 For detailed instructions, see: shopify-app-deployment.md"
echo "🔗 Test widget at: $REPL_URL/shopify-widget"
echo ""
echo "Once deployed, the 'FMB-REPLIT-V2' block will appear in Shopify theme customizers!"