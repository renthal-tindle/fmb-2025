import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Search, Package, ListOrdered } from "lucide-react";
import type { ShopifyProductWithVariants } from "@shared/schema";

export function PartsInventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Fetch all products with variants
  const { data: products, isLoading } = useQuery<ShopifyProductWithVariants[]>({
    queryKey: ["/api/products/"],
    queryFn: async () => {
      const response = await fetch("/api/products/");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    }
  });

  // Filter products based on search query
  const filteredProducts = products?.filter(product => {
    const searchLower = searchQuery.toLowerCase();
    return (
      product.title.toLowerCase().includes(searchLower) ||
      (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
      (product.variants && product.variants.some(variant => 
        (variant.sku && variant.sku.toLowerCase().includes(searchLower)) ||
        variant.title.toLowerCase().includes(searchLower)
      ))
    );
  }) || [];

  // Toggle product expansion
  const toggleExpanded = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  // Expand all products
  const expandAll = () => {
    if (filteredProducts) {
      setExpandedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Collapse all products
  const collapseAll = () => {
    setExpandedProducts(new Set());
  };

  // Get total part count
  const totalParts = filteredProducts.reduce((sum, product) => {
    return sum + 1 + (product.variants?.length || 0);
  }, 0);

  const totalVariants = filteredProducts.reduce((sum, product) => {
    return sum + (product.variants?.length || 0);
  }, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading parts inventory...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Parts Inventory</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{filteredProducts.length} Products</span>
              <span>•</span>
              <span>{totalVariants} Variants</span>
              <span>•</span>
              <span>{totalParts} Total Parts</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Controls */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by product name, SKU, or variant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-parts-search"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={expandAll}
                data-testid="button-expand-all"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={collapseAll}
                data-testid="button-collapse-all"
              >
                <ChevronRight className="h-4 w-4 mr-1" />
                Collapse All
              </Button>
            </div>
          </div>

          {/* Products List */}
          <div className="space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "No parts found matching your search." : "No parts available."}
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isExpanded = expandedProducts.has(product.id);
                const hasVariants = product.variants && product.variants.length > 0;
                
                return (
                  <Collapsible key={product.id} open={isExpanded} onOpenChange={() => toggleExpanded(product.id)}>
                    <Card className="border">
                      <CollapsibleTrigger asChild>
                        <div 
                          className="w-full p-4 hover:bg-gray-50 cursor-pointer"
                          data-testid={`product-header-${product.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {hasVariants ? (
                                isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                )
                              ) : (
                                <div className="w-4 h-4" />
                              )}
                              
                              <div className="flex-1">
                                <div className="font-medium text-left">{product.title}</div>
                                <div className="flex gap-2 mt-1">
                                  {product.sku && (
                                    <Badge variant="outline" className="text-xs">
                                      SKU: {product.sku}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    ${product.price}
                                  </Badge>
                                  {hasVariants && (
                                    <Badge variant="secondary" className="text-xs">
                                      {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      {hasVariants && (
                        <CollapsibleContent>
                          <div className="border-t bg-gray-50/50 p-4">
                            <div className="text-sm font-medium mb-3 flex items-center gap-2">
                              <ListOrdered className="h-4 w-4" />
                              Available Variants
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {product.variants.map((variant) => (
                                <div 
                                  key={variant.id} 
                                  className="bg-white border rounded-lg p-3"
                                  data-testid={`variant-${variant.id}`}
                                >
                                  <div className="font-medium text-sm">
                                    {variant.title !== 'Default Title' ? variant.title : 'Standard'}
                                  </div>
                                  <div className="space-y-1 mt-2">
                                    {variant.sku && (
                                      <Badge variant="outline" className="text-xs">
                                        SKU: {variant.sku}
                                      </Badge>
                                    )}
                                    <div className="flex gap-2 text-xs text-gray-600">
                                      <span>${variant.price}</span>
                                      {variant.option1 && <span>{variant.option1}</span>}
                                      {variant.option2 && <span>{variant.option2}</span>}
                                    </div>
                                    <div className="text-xs">
                                      <span className={variant.available ? "text-green-600" : "text-red-500"}>
                                        {variant.available ? "✓ In Stock" : "✗ Out of Stock"}
                                      </span>
                                      {variant.inventoryQuantity !== undefined && (
                                        <span className="ml-2 text-gray-500">
                                          ({variant.inventoryQuantity} qty)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      )}
                    </Card>
                  </Collapsible>
                );
              })
            )}
          </div>
          
          {/* Summary Footer */}
          {filteredProducts.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Inventory Summary:</strong> 
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} with {totalVariants} variant{totalVariants !== 1 ? 's' : ''} 
                ({totalParts} total part numbers available for mapping)
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}