# Shopify App Block Installation Guide

## Overview

This guide will help you install the Motorcycle Parts Finder as a Shopify App Block that can be added to any theme using the store customizer.

## Files Included

```
shopify-app/
├── blocks/
│   └── motorcycle-parts-finder.liquid
├── assets/
│   ├── motorcycle-parts-finder.css
│   └── motorcycle-parts-finder.js
└── app-block-installation-guide.md
```

## Installation Steps

### Step 1: Add Block to Your Shopify App

1. Copy the `motorcycle-parts-finder.liquid` file to your app's `blocks/` directory
2. Copy the CSS and JS files to your app's `assets/` directory

### Step 2: Update Your App Configuration

Add the following to your app's configuration:

```json
{
  "extension_points": [
    {
      "target": "purchase.checkout.block.render",
      "name": "Motorcycle Parts Finder Block"
    }
  ]
}
```

### Step 3: Configure the API Base URL

Update the `api_base_url` in the block settings to point to your Replit app:

```liquid
assign api_base_url = block.settings.api_base_url | default: 'https://your-replit-app-name.replit.app'
```

Replace `your-replit-app-name` with your actual Replit app domain.

### Step 4: Test the Installation

1. Install your app on a development store
2. Go to the theme customizer
3. Add a section and look for "Motorcycle Parts Finder"
4. Add the block and configure the settings

## Configuration Options

The app block includes the following customizable settings:

### Content Settings
- **Widget Title**: The headline displayed above the widget
- **Widget Description**: Descriptive text below the title
- **Show Header**: Toggle to show/hide the title and description

### Functionality Settings
- **API Base URL**: Your motorcycle parts service URL
- **Compact Mode**: Show widget in collapsed state initially
- **Maximum Parts to Show**: Limit the number of results (6-24)
- **Theme Style**: Choose between light and dark themes

### Appearance Settings
- **Top Margin**: Space above the widget (0-100px)
- **Bottom Margin**: Space below the widget (0-100px)

## How It Works

1. **Widget Loading**: The block creates an iframe that loads your motorcycle parts widget
2. **Motorcycle Selection**: Customers select their motorcycle make, model, and year
3. **Parts Display**: Compatible parts are shown based on your part mapping data
4. **Cart Integration**: Products are added to the Shopify cart using the AJAX Cart API
5. **Theme Integration**: The widget adapts to the store's theme colors and styling

## Customization

### Styling
The included CSS file uses Shopify's CSS custom properties for theme integration:
- `--color-foreground`: Text color
- `--color-background`: Background color
- `--color-button`: Primary button color
- `--font-body-family`: Body font family

### JavaScript Events
The widget dispatches several custom events you can listen for:

```javascript
// Widget ready
document.addEventListener('motorcycle-widget:ready', function(event) {
  console.log('Widget ready for block:', event.detail.blockId);
});

// Item added to cart
document.addEventListener('cart:item-added', function(event) {
  console.log('Item added:', event.detail);
});

// Motorcycle selected
document.addEventListener('motorcycle-widget:motorcycle-selected', function(event) {
  console.log('Motorcycle selected:', event.detail);
});
```

## Troubleshooting

### Common Issues

1. **Widget not loading**: Check that the API Base URL is correct and accessible
2. **Parts not showing**: Verify your motorcycle and parts data is properly mapped
3. **Cart not updating**: Ensure your theme supports Shopify's AJAX Cart API

### Error Handling

The widget includes built-in error handling:
- Network errors show a retry button
- Invalid configurations show helpful error messages
- Loading states prevent user confusion

### Browser Support

The app block supports:
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile and tablet devices
- Screen readers and accessibility tools
- High contrast and reduced motion preferences

## Support

For technical support:
1. Check the browser console for error messages
2. Verify your API endpoints are responding correctly
3. Test with different motorcycle makes and models
4. Contact your development team with specific error details

## Security Considerations

- The widget loads in an iframe for security isolation
- All API calls go through your backend service
- No customer data is stored in the widget
- Cart operations use Shopify's secure APIs

## Performance

The app block is optimized for performance:
- Lazy loading when the widget comes into view
- Minimal JavaScript footprint
- CSS follows Shopify's performance guidelines
- Images are loaded on-demand