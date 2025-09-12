import { useEffect, useState } from "react";
import MotorcyclePartsWidget from "@/components/shopify/motorcycle-parts-widget";

interface ShopifyWidgetPageProps {
  // URL parameters that can be passed when embedding
  compact?: boolean;
  maxResults?: number;
  shopDomain?: string;
  apiBaseUrl?: string;
  theme?: 'light' | 'dark';
}

export default function ShopifyWidgetPage() {
  const [config, setConfig] = useState<ShopifyWidgetPageProps>({});

  useEffect(() => {
    // Parse URL parameters for widget configuration
    const urlParams = new URLSearchParams(window.location.search);
    const newConfig: ShopifyWidgetPageProps = {
      compact: urlParams.get('compact') === 'true',
      maxResults: urlParams.get('maxResults') ? parseInt(urlParams.get('maxResults')!) : 12,
      shopDomain: urlParams.get('shopDomain') || undefined,
      apiBaseUrl: urlParams.get('apiBaseUrl') || window.location.origin,
      theme: (urlParams.get('theme') as 'light' | 'dark') || 'light',
    };
    
    setConfig(newConfig);

    // Apply theme if specified
    if (newConfig.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Remove default page margins for embedding
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    // Post message to parent window when widget is ready (for iframe embedding)
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'motorcycle-widget-ready',
        config: newConfig
      }, '*');
    }

    // Listen for configuration updates from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'update-widget-config') {
        setConfig(prev => ({ ...prev, ...event.data.config }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle cart events and notify parent window
  useEffect(() => {
    const handleCartEvent = (event: CustomEvent) => {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'cart-item-added',
          data: event.detail
        }, '*');
      }
    };

    window.addEventListener('cart:item-added', handleCartEvent as EventListener);
    return () => window.removeEventListener('cart:item-added', handleCartEvent as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <MotorcyclePartsWidget
        compact={config.compact}
        maxResults={config.maxResults}
        shopDomain={config.shopDomain}
        apiBaseUrl={config.apiBaseUrl}
        className="max-w-6xl mx-auto"
      />
      
      {/* Embedding Instructions (only show when not embedded) */}
      {window.parent === window && (
        <div className="max-w-4xl mx-auto mt-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Embed in Your Shopify Store</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Option 1: Direct Iframe Embed</h3>
              <p className="text-gray-600 mb-3">Add this code to your Shopify theme or page:</p>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<iframe 
  src="${window.location.origin}/shopify-widget"
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Option 2: Compact Widget</h3>
              <p className="text-gray-600 mb-3">For smaller spaces, use the compact version:</p>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<iframe 
  src="${window.location.origin}/shopify-widget?compact=true&maxResults=6"
  width="100%" 
  height="400" 
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Customization Options</h3>
              <p className="text-gray-600 mb-3">You can customize the widget using URL parameters:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <code>compact=true</code> - Shows collapsed version initially</li>
                <li>• <code>maxResults=6</code> - Limits number of parts displayed</li>
                <li>• <code>theme=dark</code> - Uses dark theme styling</li>
                <li>• <code>shopDomain=yourstore.myshopify.com</code> - Your Shopify domain</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Important Notes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• The widget automatically integrates with your Shopify cart</li>
                <li>• Products must have compatible motorcycle data to appear</li>
                <li>• The widget works with most Shopify themes</li>
                <li>• Mobile responsive design included</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}