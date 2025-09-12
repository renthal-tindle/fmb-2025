import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Motorcycle, ShopifyProduct } from "@shared/schema";

interface ShopifyCartProduct {
  variant_id: string;
  quantity: number;
  properties?: Record<string, string>;
}

interface MotorcyclePartsWidgetProps {
  /** Shopify store domain (e.g., 'mystore.myshopify.com') */
  shopDomain?: string;
  /** API base URL for the motorcycle parts service */
  apiBaseUrl?: string;
  /** Custom CSS classes for styling */
  className?: string;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Maximum number of parts to display */
  maxResults?: number;
}

interface ExtendedShopifyProduct extends ShopifyProduct {
  compatibility?: string;
  variant_id?: string;
}

export default function MotorcyclePartsWidget({
  shopDomain,
  apiBaseUrl = window.location.origin,
  className = "",
  compact = false,
  maxResults = 12
}: MotorcyclePartsWidgetProps) {
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    make: "",
    model: "",
    year: "",
  });

  // Fetch motorcycles for the selector
  const { data: motorcycles } = useQuery<Motorcycle[]>({
    queryKey: [`${apiBaseUrl}/api/motorcycles`],
  });

  // Fetch compatible parts for selected motorcycle
  const { data: compatibleParts, isLoading: isLoadingParts } = useQuery<ExtendedShopifyProduct[]>({
    queryKey: [`${apiBaseUrl}/api/customer/motorcycles`, selectedMotorcycle?.recid, "compatible-parts"],
    enabled: !!selectedMotorcycle,
  });

  // Process motorcycle data for dropdowns
  const makes = Array.from(new Set(motorcycles?.map((m: Motorcycle) => m.bikemake) || []));
  
  const availableModels = motorcycles?.filter((m: Motorcycle) => 
    !filters.make || m.bikemake === filters.make
  ).map((m: Motorcycle) => m.bikemodel) || [];
  const models = Array.from(new Set(availableModels));
  
  const availableYears = motorcycles?.filter((m: Motorcycle) => 
    (!filters.make || m.bikemake === filters.make) &&
    (!filters.model || m.bikemodel === filters.model)
  ).flatMap((m: Motorcycle) => {
    const years = [];
    for (let year = m.firstyear; year <= m.lastyear; year++) {
      years.push(year);
    }
    return years;
  }) || [];
  const years = Array.from(new Set(availableYears)).sort((a, b) => b - a);

  const handleFindParts = () => {
    if (!filters.make || !filters.model || !filters.year) return;

    const selectedYear = parseInt(filters.year);
    const motorcycle = motorcycles?.find((m: Motorcycle) => 
      m.bikemake === filters.make && 
      m.bikemodel === filters.model && 
      selectedYear >= m.firstyear && 
      selectedYear <= m.lastyear
    );

    if (motorcycle) {
      setSelectedMotorcycle(motorcycle);
      if (compact) setIsExpanded(true);
    }
  };

  const addToShopifyCart = async (product: ExtendedShopifyProduct) => {
    setAddingToCart(product.id);
    
    try {
      // Use Shopify's AJAX API to add product to cart
      const cartItem: ShopifyCartProduct = {
        variant_id: product.variant_id || product.id,
        quantity: 1,
        properties: selectedMotorcycle ? {
          'Compatible with': `${filters.year} ${selectedMotorcycle.bikemake} ${selectedMotorcycle.bikemodel}`,
          'Motorcycle ID': selectedMotorcycle.recid.toString()
        } : undefined
      };

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartItem)
      });

      if (response.ok) {
        // Trigger Shopify cart refresh if available
        if ((window as any).Shopify && (window as any).Shopify.onItemAdded) {
          (window as any).Shopify.onItemAdded();
        }
        
        // Update cart drawer or refresh cart
        if ((window as any).theme && (window as any).theme.cartDrawer) {
          (window as any).theme.cartDrawer.refresh();
        }
        
        // Custom event for other cart implementations
        window.dispatchEvent(new CustomEvent('cart:item-added', {
          detail: { product, motorcycle: selectedMotorcycle }
        }));
        
        alert(`${product.title} added to cart!`);
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Sorry, there was an error adding this item to your cart.');
    } finally {
      setAddingToCart(null);
    }
  };

  const displayedParts = compatibleParts?.slice(0, maxResults) || [];
  const hasMoreParts = (compatibleParts?.length || 0) > maxResults;

  if (compact && !isExpanded) {
    return (
      <div className={`motorcycle-parts-widget ${className}`}>
        <Card className="border-2 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="material-icons text-blue-600">two_wheeler</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Find Compatible Parts</h3>
                  <p className="text-sm text-gray-600">Select your motorcycle model</p>
                </div>
              </div>
              <Button 
                onClick={() => setIsExpanded(true)}
                variant="outline"
                size="sm"
                data-testid="button-expand-widget"
              >
                Find Parts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`motorcycle-parts-widget ${className}`}>
      <Card className="border-2 border-blue-200">
        <CardContent className="p-6">
          {/* Widget Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="material-icons text-blue-600">two_wheeler</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Find Compatible Parts</h2>
                <p className="text-gray-600">Select your motorcycle to see compatible parts</p>
              </div>
            </div>
            {compact && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsExpanded(false)}
                data-testid="button-collapse-widget"
              >
                <span className="material-icons">close</span>
              </Button>
            )}
          </div>

          {/* Motorcycle Selector */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                <Select 
                  value={filters.make} 
                  onValueChange={(value) => setFilters({...filters, make: value, model: "", year: ""})}
                >
                  <SelectTrigger data-testid="widget-select-make">
                    <SelectValue placeholder="Select Make" />
                  </SelectTrigger>
                  <SelectContent>
                    {makes.map((make) => (
                      <SelectItem key={make} value={make}>{make}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <Select 
                  value={filters.model} 
                  onValueChange={(value) => setFilters({...filters, model: value, year: ""})}
                  disabled={!filters.make}
                >
                  <SelectTrigger data-testid="widget-select-model">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <Select 
                  value={filters.year} 
                  onValueChange={(value) => setFilters({...filters, year: value})}
                  disabled={!filters.model}
                >
                  <SelectTrigger data-testid="widget-select-year">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={handleFindParts}
                  disabled={!filters.make || !filters.model || !filters.year}
                  className="w-full"
                  data-testid="widget-button-find-parts"
                >
                  Find Parts
                </Button>
              </div>
            </div>
          </div>

          {/* Selected Motorcycle */}
          {selectedMotorcycle && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800" data-testid="widget-selected-motorcycle">
                    {filters.year} {selectedMotorcycle.bikemake} {selectedMotorcycle.bikemodel}
                  </h3>
                  <p className="text-sm text-green-700">
                    {selectedMotorcycle.capacity}cc • Finding compatible parts...
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedMotorcycle(null);
                    setFilters({ make: "", model: "", year: "" });
                  }}
                  data-testid="widget-button-clear"
                >
                  <span className="material-icons text-green-700">close</span>
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingParts && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Finding compatible parts...</p>
            </div>
          )}

          {/* Compatible Parts */}
          {displayedParts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Compatible Parts ({compatibleParts?.length || 0} found)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedParts.map((part) => (
                  <Card key={part.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="aspect-square mb-3">
                        {part.imageUrl ? (
                          <img
                            src={part.imageUrl}
                            alt={part.title}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                            <span className="material-icons text-gray-400 text-4xl">image</span>
                          </div>
                        )}
                      </div>
                      
                      <Badge variant="secondary" className="bg-green-100 text-green-800 mb-2">
                        Compatible
                      </Badge>
                      
                      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2" data-testid={`widget-part-title-${part.id}`}>
                        {part.title}
                      </h4>
                      
                      <p className="text-lg font-bold text-gray-900 mb-3" data-testid={`widget-part-price-${part.id}`}>
                        ${part.price}
                      </p>
                      
                      <Button
                        onClick={() => addToShopifyCart(part)}
                        disabled={addingToCart === part.id}
                        className="w-full"
                        data-testid={`widget-button-add-to-cart-${part.id}`}
                      >
                        {addingToCart === part.id ? "Adding..." : "Add to Cart"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {hasMoreParts && (
                <div className="text-center mt-6">
                  <p className="text-gray-600 text-sm">
                    Showing {maxResults} of {compatibleParts?.length} compatible parts
                  </p>
                </div>
              )}
            </div>
          )}

          {/* No Parts Found */}
          {selectedMotorcycle && !isLoadingParts && displayedParts.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="material-icons text-gray-400 text-2xl">search_off</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Compatible Parts Found</h3>
              <p className="text-gray-600">
                We couldn't find any parts compatible with your selected motorcycle.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}