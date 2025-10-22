import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronDown, Filter, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { ShopifyProduct, ShopifyProductWithVariants, Motorcycle, PartCategoryTags, PartSection } from "@shared/schema";

interface PartsMappingProps {
  selectedMotorcycle?: Motorcycle | null;
}

// Build dynamic sections from database categories and sections
const buildDynamicPartSections = (categoryTags: PartCategoryTags[], partSections: PartSection[] | undefined) => {
  // If no sections from database, use default fallback
  if (!partSections || partSections.length === 0) {
    const defaultSectionTitles = {
      handlebars: "Handlebars",
      frontSprocket: "Front Sprocket", 
      rearSprockets: "Rear Sprockets",
      chain: "Chain",
      brakePads: "Brake Pads",
      barMounts: "Bar Mounts",
      driveConversions: "Drive Conversions",
      others: "Others",
    };
    
    const sections: Record<string, { title: string; icon: string; categories: any[]; sortOrder: number }> = {};
    
    Object.entries(defaultSectionTitles).forEach(([key, title], index) => {
      sections[key] = { title, icon: "", categories: [], sortOrder: index };
    });

    categoryTags.forEach(categoryTag => {
      let productTags: string[] = [];
      try {
        productTags = JSON.parse(categoryTag.productTags);
        if (!Array.isArray(productTags)) {
          productTags = [categoryTag.productTags];
        }
      } catch {
        productTags = [categoryTag.productTags];
      }

      const category = {
        value: categoryTag.categoryValue,
        label: categoryTag.categoryLabel || categoryTag.categoryValue,
        productTags
      };

      const assignedSection = categoryTag.assignedSection || "others";
      if (sections[assignedSection]) {
        sections[assignedSection].categories.push(category);
      } else {
        sections.others.categories.push(category);
      }
    });

    return sections;
  }

  // Build sections from database configuration (sorted by sortOrder)
  const sections: Record<string, { title: string; icon: string; categories: any[]; sortOrder: number }> = {};
  
  // Initialize sections from database
  partSections.forEach(section => {
    sections[section.sectionKey] = { 
      title: section.sectionLabel, 
      icon: "", 
      categories: [],
      sortOrder: section.sortOrder
    };
  });

  // Add categories to their assigned sections
  categoryTags.forEach(categoryTag => {
    let productTags: string[] = [];
    try {
      productTags = JSON.parse(categoryTag.productTags);
      if (!Array.isArray(productTags)) {
        productTags = [categoryTag.productTags];
      }
    } catch {
      productTags = [categoryTag.productTags];
    }

    const category = {
      value: categoryTag.categoryValue,
      label: categoryTag.categoryLabel || categoryTag.categoryValue,
      productTags
    };

    const assignedSection = categoryTag.assignedSection || "others";
    if (sections[assignedSection]) {
      sections[assignedSection].categories.push(category);
    } else {
      // If section doesn't exist in database, add to others if it exists
      if (sections.others) {
        sections.others.categories.push(category);
      }
    }
  });

  return sections;
};

// Filter products based on part category using configurable tags
const getFilteredProducts = (products: ShopifyProduct[], categoryValue: string, categoryTags: PartCategoryTags[]): ShopifyProduct[] => {
  if (!products || products.length === 0) return [];
  
  const savedCategory = categoryTags.find(cat => cat.categoryValue === categoryValue);
  if (!savedCategory) {
    return products; // Return all products if category not found
  }
  
  // Parse the saved tags from JSON
  let tagsArray: string[] = [];
  try {
    tagsArray = JSON.parse(savedCategory.productTags);
    if (!Array.isArray(tagsArray)) {
      tagsArray = [savedCategory.productTags];
    }
  } catch {
    tagsArray = [savedCategory.productTags];
  }
  
  return products.filter(product => {
    // Parse product tags from JSON
    let productTags: string[] = [];
    try {
      if (product.tags) {
        productTags = JSON.parse(product.tags);
        if (!Array.isArray(productTags)) {
          productTags = [product.tags];
        }
      }
    } catch {
      productTags = product.tags ? [product.tags] : [];
    }
    
    const productTagsLower = productTags.map(tag => tag.toLowerCase());
    
    return tagsArray.some(tag => 
      productTagsLower.includes(tag.toLowerCase())
    );
  });
};

export default function PartsMapping({ selectedMotorcycle }: PartsMappingProps) {
  const [motorcycleSearch, setMotorcycleSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [motorcycleFilters, setMotorcycleFilters] = useState({ bikemake: "", biketype: "", firstyear: "" });
  const [currentMotorcycle, setCurrentMotorcycle] = useState<Motorcycle | null>(selectedMotorcycle || null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productVariant, setProductVariant] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [showVariantDropdown, setShowVariantDropdown] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for part category tags to get dynamic section assignments
  const { data: categoryTags } = useQuery<PartCategoryTags[]>({
    queryKey: ["/api/part-category-tags"],
  });

  // Query for part sections to get dynamic section ordering
  const { data: partSections } = useQuery<PartSection[]>({
    queryKey: ["/api/part-sections"],
  });
  
  // Build dynamic sections based on category tag assignments and section ordering from database
  const dynamicSections = useMemo(() => {
    if (!categoryTags) return buildDynamicPartSections([], partSections);
    return buildDynamicPartSections(categoryTags, partSections);
  }, [categoryTags, partSections]);
  
  // Update current motorcycle if prop changes
  useEffect(() => {
    if (selectedMotorcycle) {
      setCurrentMotorcycle(selectedMotorcycle);
    }
  }, [selectedMotorcycle]);

  // Query for motorcycles if no specific one selected
  const { data: motorcycles, isLoading: loadingMotorcycles } = useQuery<Motorcycle[]>({
    queryKey: ["/api/motorcycles", motorcycleSearch, motorcycleFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add search parameter if exists
      if (motorcycleSearch.trim()) {
        params.append("search", motorcycleSearch.trim());
      }
      
      // Add filter parameters if exists
      if (motorcycleFilters.bikemake && motorcycleFilters.bikemake !== "all-makes") {
        params.append("bikemake", motorcycleFilters.bikemake);
      }
      if (motorcycleFilters.firstyear && motorcycleFilters.firstyear !== "all-years") {
        params.append("firstyear", motorcycleFilters.firstyear);
      }
      if (motorcycleFilters.biketype && motorcycleFilters.biketype !== "all-types") {
        params.append("biketype", motorcycleFilters.biketype);
      }
      
      const url = `/api/motorcycles${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch motorcycles');
      }
      
      return response.json();
    },
    enabled: !currentMotorcycle,
  });

  // Query for dropdown filter data
  const { data: availableMakes } = useQuery<string[]>({
    queryKey: ["/api/motorcycles/makes"],
    enabled: !currentMotorcycle,
  });

  const { data: availableYears } = useQuery<number[]>({
    queryKey: ["/api/motorcycles/years"],
    enabled: !currentMotorcycle,
  });

  // Query for products
  const { data: products, isLoading: loadingProducts } = useQuery<ShopifyProductWithVariants[]>({
    queryKey: ["/api/products", productSearch],
  });

  // Query for motorcycle part assignments
  const { data: motorcycleParts, isLoading: partsLoading, error: partsError } = useQuery<Record<string, string | null>>({
    queryKey: [`/api/motorcycles`, currentMotorcycle?.recid, `/parts`],
    enabled: !!currentMotorcycle?.recid,
    queryFn: async () => {
      if (!currentMotorcycle?.recid) throw new Error('No motorcycle selected');
      
      const response = await fetch(`/api/motorcycles/${currentMotorcycle.recid}/parts`);
      
      // Handle HTTP 304 as success (browser will use cached data)
      if (response.status === 304) {
        // Force refresh to get actual data instead of relying on cache
        const freshResponse = await fetch(`/api/motorcycles/${currentMotorcycle.recid}/parts`, {
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!freshResponse.ok) {
          throw new Error(`Failed to fetch parts: ${freshResponse.status} ${freshResponse.statusText}`);
        }
        return freshResponse.json();
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch parts: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  // Debug logging for troubleshooting
  useEffect(() => {
    if (currentMotorcycle) {
      console.log('PartsMapping Debug:', {
        motorcycleId: currentMotorcycle.recid,
        motorcycleParts: motorcycleParts,
        partsLoading: partsLoading,
        partsError: partsError,
        categoryTags: categoryTags?.length || 0
      });
    }
  }, [currentMotorcycle, motorcycleParts, partsLoading, partsError, categoryTags]);

  // Mutation for assigning parts to specific categories
  const assignPartMutation = useMutation({
    mutationFn: async ({ motorcycleId, partCategory, productVariant }: {
      motorcycleId: number;
      partCategory: string;
      productVariant: string;
    }) => {
      const response = await fetch(`/api/motorcycles/${motorcycleId}/parts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partCategory, productVariant }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign part');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/motorcycles`, variables.motorcycleId, `/parts`] });
      const categoryTag = categoryTags?.find(c => c.categoryValue === variables.partCategory);
      toast({
        title: "Part assigned successfully",
        description: `Assigned ${variables.productVariant} to ${categoryTag?.categoryLabel || variables.partCategory}`,
      });
      
      // Special handling for RCW Group - clear OE Rear Sprocket when RCW Group changes
      if (variables.partCategory === 'rcwgroup' && motorcycleParts?.oe_rcw) {
        // Clear the OE Rear Sprocket since the RCW Group changed
        fetch(`/api/motorcycles/${variables.motorcycleId}/parts`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partCategory: 'oe_rcw', productVariant: null }),
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/motorcycles`, variables.motorcycleId, `/parts`] });
          toast({
            title: "OE Rear Sprocket cleared",
            description: "Please select a new OE Rear Sprocket variant for the updated RCW Group",
          });
        });
      }
      
      // Special handling for FCW Group - clear OE Front Sprocket when FCW Group changes
      if (variables.partCategory === 'fcwgroup' && motorcycleParts?.oe_fcw) {
        // Clear the OE Front Sprocket since the FCW Group changed
        fetch(`/api/motorcycles/${variables.motorcycleId}/parts`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partCategory: 'oe_fcw', productVariant: null }),
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/motorcycles`, variables.motorcycleId, `/parts`] });
          toast({
            title: "OE Front Sprocket cleared", 
            description: "Please select a new OE Front Sprocket variant for the updated FCW Group",
          });
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error assigning part",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignProduct = (partCategory: string, productVariant: string) => {
    if (!currentMotorcycle) return;

    assignPartMutation.mutate({
      motorcycleId: currentMotorcycle.recid,
      partCategory,
      productVariant,
    });
  };

  const startEditing = (category: string, currentValue: string | null) => {
    // For OE Rear Sprocket, check if RCW Group is selected first
    if (category === 'oe_rcw' && !motorcycleParts?.rcwgroup) {
      toast({
        title: "RCW Group Required",
        description: "Please select RCW Group first before choosing OE Rear Sprocket",
        variant: "destructive",
      });
      return;
    }
    
    // For OE Front Sprocket, check if FCW Group is selected first
    if (category === 'oe_fcw' && !motorcycleParts?.fcwgroup) {
      toast({
        title: "FCW Group Required",
        description: "Please select FCW Group first before choosing OE Front Sprocket",
        variant: "destructive",
      });
      return;
    }
    
    setEditingCategory(category);
    setEditingValue(currentValue || "");
  };

  const saveEdit = () => {
    if (!editingCategory || !currentMotorcycle) return;

    assignProduct(editingCategory, editingValue);
    setEditingCategory(null);
    setEditingValue("");
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setEditingValue("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔧 Parts Mapping 
            <Badge variant="outline">Map motorcycle parts to products</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Motorcycle Selection */}
      {!currentMotorcycle && (
        <Card>
          <CardHeader>
            <CardTitle>Select Motorcycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search motorcycles (RECID, make, model)..."
                  value={motorcycleSearch}
                  onChange={(e) => setMotorcycleSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-motorcycle-search"
                />
              </div>

              <Select 
                value={motorcycleFilters.bikemake} 
                onValueChange={(value) => setMotorcycleFilters(prev => ({ ...prev, bikemake: value }))}
              >
                <SelectTrigger data-testid="select-make-filter">
                  <SelectValue placeholder="All Makes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-makes">All Makes</SelectItem>
                  {availableMakes?.map((make) => (
                    <SelectItem key={make} value={make}>{make}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={motorcycleFilters.firstyear} 
                onValueChange={(value) => setMotorcycleFilters(prev => ({ ...prev, firstyear: value }))}
              >
                <SelectTrigger data-testid="select-year-filter">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-years">All Years</SelectItem>
                  {availableYears?.sort((a, b) => b - a).map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={motorcycleFilters.biketype} 
                onValueChange={(value) => setMotorcycleFilters(prev => ({ ...prev, biketype: value }))}
              >
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">All Types</SelectItem>
                  <SelectItem value="1">Road</SelectItem>
                  <SelectItem value="2">Dirt</SelectItem>
                  <SelectItem value="3">ATV/Quad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motorcycle Results */}
            {motorcycles && motorcycles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {motorcycles.map((motorcycle) => (
                  <div
                    key={motorcycle.recid}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setCurrentMotorcycle(motorcycle)}
                    data-testid={`card-motorcycle-${motorcycle.recid}`}
                  >
                    <div className="font-semibold">
                      {motorcycle.bikemake} {motorcycle.bikemodel}
                    </div>
                    <div className="text-sm text-gray-600">
                      RECID: {motorcycle.recid} • {motorcycle.firstyear}-{motorcycle.lastyear}
                    </div>
                  </div>
                ))}
              </div>
            ) : motorcycles && motorcycles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No motorcycles found
              </div>
            ) : loadingMotorcycles ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Selected Motorcycle Display */}
      {currentMotorcycle && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {currentMotorcycle.bikemake} {currentMotorcycle.bikemodel}
                </h3>
                <p className="text-gray-600">
                  RECID: {currentMotorcycle.recid} • {currentMotorcycle.firstyear}-{currentMotorcycle.lastyear}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentMotorcycle(null);
                  setMotorcycleSearch("");
                  setMotorcycleFilters({ bikemake: "", biketype: "", firstyear: "" });
                }}
                data-testid="button-change-motorcycle"
              >
                Change Motorcycle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug: Show loading state */}
      {currentMotorcycle && partsLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">Loading parts data for {currentMotorcycle.bikemake} {currentMotorcycle.bikemodel}...</div>
          </CardContent>
        </Card>
      )}

      {/* Debug: Show error state */}
      {currentMotorcycle && partsError && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Error loading parts: {partsError.message}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Part Assignments */}
      {currentMotorcycle && motorcycleParts && (
        <div className="space-y-6">
          <h3 className="font-semibold text-lg">Part Assignments - Click to Edit</h3>
          
          {Object.entries(dynamicSections)
            .sort((a, b) => {
              const sectionA = a[1] as { sortOrder: number };
              const sectionB = b[1] as { sortOrder: number };
              return sectionA.sortOrder - sectionB.sortOrder;
            })
            .map(([sectionKey, section]) => {
            const sectionData = section as { title: string; categories: any[] };
            return (
              <div key={sectionKey} className="space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-blue-200 pb-3 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-t-lg">
                <div className="w-3 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                <h4 className="font-bold text-xl text-gray-900 tracking-wide">{sectionData.title}</h4>
                <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800 font-semibold px-3 py-1">
                  {sectionData.categories.length} items
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sectionData.categories.map((category: any) => {
              const assignedPart = motorcycleParts[category.value];
              const isEditing = editingCategory === category.value;
              
              // Special handling for two-step workflows
              const isRCWGroup = category.value === 'rcwgroup';
              const isOERearSprocket = category.value === 'oe_rcw';
              const isFCWGroup = category.value === 'fcwgroup';
              const isOEFrontSprocket = category.value === 'oe_fcw';
              const selectedRCWGroup = motorcycleParts['rcwgroup'];
              const selectedFCWGroup = motorcycleParts['fcwgroup'];
              
              return (
                <div
                  key={category.value}
                  className={`p-3 border rounded-lg transition-all ${
                    assignedPart 
                      ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-50 hover:bg-gray-100 border-dashed cursor-pointer'
                  } ${isOERearSprocket && !selectedRCWGroup ? 'opacity-50' : ''} ${isOEFrontSprocket && !selectedFCWGroup ? 'opacity-50' : ''}`}
                  data-testid={`card-category-${category.value}`}
                >
                  <div className="space-y-2">
                    <div className="font-medium text-sm">{category.label}</div>
                    
                    {/* Special message for OE Rear Sprocket if RCW Group not selected */}
                    {isOERearSprocket && !selectedRCWGroup && !isEditing && (
                      <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
                        ⚠️ Select RCW Group first to choose specific sprocket variants
                      </div>
                    )}
                    
                    {/* Special message for OE Front Sprocket if FCW Group not selected */}
                    {isOEFrontSprocket && !selectedFCWGroup && !isEditing && (
                      <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
                        ⚠️ Select FCW Group first to choose specific sprocket variants
                      </div>
                    )}
                    
                    {isEditing ? (
                      <div className="space-y-2">
                        {assignedPart ? (
                          // Editing existing assignment - show text input
                          <>
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              placeholder="Enter product variant (e.g., 821-01)"
                              className="text-sm"
                              data-testid={`input-edit-${category.value}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveEdit();
                                } else if (e.key === 'Escape') {
                                  cancelEditing();
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={assignPartMutation.isPending}
                                className="text-xs px-2 py-1"
                                data-testid={`button-save-${category.value}`}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                className="text-xs px-2 py-1"
                                data-testid={`button-cancel-${category.value}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          // Adding new assignment - show product selection
                          <div className="space-y-2">
                            <Select 
                              value=""
                              onValueChange={(value) => {
                                if (value) {
                                  assignProduct(category.value, value);
                                  setEditingCategory(null);
                                }
                              }}
                              open
                              onOpenChange={(open) => {
                                if (!open) {
                                  cancelEditing();
                                }
                              }}
                            >
                              <SelectTrigger data-testid={`select-product-${category.value}`}>
                                <SelectValue placeholder="Select a product..." />
                              </SelectTrigger>
                              <SelectContent>
                                {loadingProducts ? (
                                  <div className="p-4 text-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                                  </div>
                                ) : products && products.length > 0 ? (
                                  (() => {
                                    // Special handling for two-step workflows
                                    if (isRCWGroup) {
                                      // RCW Group: Show base sprocket products (no variants) - use title as value
                                      const filteredProducts = getFilteredProducts(products, category.value, categoryTags || []);
                                      return (
                                        <>
                                          {filteredProducts.map((product: any) => (
                                            <SelectItem 
                                              key={product.id} 
                                              value={product.title || `product-${product.id}`}
                                              data-testid={`option-product-${product.id}`}
                                            >
                                              <div className="flex flex-col">
                                                <span className="font-medium">{product.title}</span>
                                                <div className="flex gap-2 text-xs text-gray-500">
                                                  <span>${product.price}</span>
                                                  {product.variants && (
                                                    <span className="text-blue-600">
                                                      {product.variants.length} variants available
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </>
                                      );
                                    } else if (isFCWGroup) {
                                      // FCW Group: Show base sprocket products (no variants) - use title as value
                                      const filteredProducts = getFilteredProducts(products, category.value, categoryTags || []);
                                      return (
                                        <>
                                          {filteredProducts.map((product: any) => (
                                            <SelectItem 
                                              key={product.id} 
                                              value={product.title || `product-${product.id}`}
                                              data-testid={`option-product-${product.id}`}
                                            >
                                              <div className="flex flex-col">
                                                <span className="font-medium">{product.title}</span>
                                                <div className="flex gap-2 text-xs text-gray-500">
                                                  <span>${product.price}</span>
                                                  {product.variants && (
                                                    <span className="text-blue-600">
                                                      {product.variants.length} variants available
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </>
                                      );
                                    } else if (isOERearSprocket) {
                                      // OE Rear Sprocket: Show variants of selected RCW Group only
                                      if (!selectedRCWGroup) {
                                        return (
                                          <div className="p-4 text-center text-gray-500">
                                            Please select RCW Group first
                                          </div>
                                        );
                                      }
                                      
                                      // Find the selected RCW Group product by SKU (or fallback to title for legacy data)
                                      const selectedProduct = products.find(p => p.sku === selectedRCWGroup || p.title === selectedRCWGroup) as ShopifyProductWithVariants;
                                      
                                      if (!selectedProduct || !selectedProduct.variants || selectedProduct.variants.length === 0) {
                                        return (
                                          <div className="p-4 text-center text-gray-500">
                                            No variants found for selected RCW Group
                                          </div>
                                        );
                                      }
                                      
                                      return (
                                        <>
                                          <div className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50">
                                            {selectedProduct.title} - Select Variant
                                          </div>
                                          {selectedProduct.variants.map((variant) => (
                                            <SelectItem 
                                              key={variant.id} 
                                              value={variant.sku || `${selectedProduct.sku || selectedProduct.title}-${variant.title || variant.id}`}
                                              data-testid={`option-variant-${variant.id}`}
                                            >
                                              <div className="flex flex-col ml-4">
                                                <span className="font-medium">
                                                  {variant.title !== 'Default Title' ? variant.title : 'Standard'}
                                                </span>
                                                <div className="flex gap-2 text-xs text-gray-500">
                                                  {variant.sku && <span>SKU: {variant.sku}</span>}
                                                  <span>${variant.price}</span>
                                                  {variant.option1 && <span>{variant.option1}</span>}
                                                  {variant.option2 && <span>{variant.option2}</span>}
                                                  <span className={variant.available ? "text-green-600" : "text-red-500"}>
                                                    {variant.available ? "In Stock" : "Out of Stock"}
                                                  </span>
                                                </div>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </>
                                      );
                                    } else if (isOEFrontSprocket) {
                                      // OE Front Sprocket: Show variants of selected FCW Group only
                                      if (!selectedFCWGroup) {
                                        return (
                                          <div className="p-4 text-center text-gray-500">
                                            Please select FCW Group first
                                          </div>
                                        );
                                      }
                                      
                                      // Find the selected FCW Group product by SKU (or fallback to title for legacy data)
                                      const selectedProduct = products.find(p => p.sku === selectedFCWGroup || p.title === selectedFCWGroup) as ShopifyProductWithVariants;
                                      
                                      if (!selectedProduct || !selectedProduct.variants || selectedProduct.variants.length === 0) {
                                        return (
                                          <div className="p-4 text-center text-gray-500">
                                            No variants found for selected FCW Group
                                          </div>
                                        );
                                      }
                                      
                                      return (
                                        <>
                                          <div className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50">
                                            {selectedProduct.title} - Select Variant
                                          </div>
                                          {selectedProduct.variants.map((variant) => (
                                            <SelectItem 
                                              key={variant.id} 
                                              value={variant.sku || `${selectedProduct.sku || selectedProduct.title}-${variant.title || variant.id}`}
                                              data-testid={`option-variant-${variant.id}`}
                                            >
                                              <div className="flex flex-col ml-4">
                                                <span className="font-medium">
                                                  {variant.title !== 'Default Title' ? variant.title : 'Standard'}
                                                </span>
                                                <div className="flex gap-2 text-xs text-gray-500">
                                                  {variant.sku && <span>SKU: {variant.sku}</span>}
                                                  <span>${variant.price}</span>
                                                  {variant.option1 && <span>{variant.option1}</span>}
                                                  {variant.option2 && <span>{variant.option2}</span>}
                                                  <span className={variant.available ? "text-green-600" : "text-red-500"}>
                                                    {variant.available ? "In Stock" : "Out of Stock"}
                                                  </span>
                                                </div>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </>
                                      );
                                    } else {
                                      // Regular product selection for other categories
                                      const filteredProducts = getFilteredProducts(products, category.value, categoryTags || []);
                                      
                                      if (filteredProducts.length > 0) {
                                        return (
                                          <>
                                            {filteredProducts.map((product: any) => (
                                              <SelectItem 
                                                key={product.id} 
                                                value={product.sku || product.title || `product-${product.id}`}
                                                data-testid={`option-product-${product.id}`}
                                              >
                                                <div className="flex flex-col">
                                                  <span className="font-medium">{product.sku || product.title}</span>
                                                  {product.sku && product.title && (
                                                    <div className="flex gap-2 text-xs text-gray-500">
                                                      <span>{product.title}</span>
                                                    </div>
                                                  )}
                                                  <div className="flex gap-2 text-xs text-gray-500">
                                                    <span>${product.price}</span>
                                                  </div>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </>
                                        );
                                      } else {
                                        return <div className="p-4 text-center text-gray-500">No {category.label.toLowerCase()} products found</div>;
                                      }
                                    }
                                  })()
                                ) : (
                                  <div className="p-4 text-center text-gray-500">No products found</div>
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              className="text-xs px-2 py-1 w-full"
                              data-testid={`button-cancel-${category.value}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {assignedPart ? (
                          <div
                            className="text-lg font-semibold text-green-700 cursor-pointer hover:text-green-800"
                            onClick={() => startEditing(category.value, assignedPart)}
                            data-testid={`text-assigned-${category.value}`}
                          >
                            {assignedPart}
                          </div>
                        ) : (
                          <div
                            className="text-sm text-blue-600 cursor-pointer hover:text-blue-700 hover:bg-blue-50 py-3 border-2 border-dashed border-blue-300 rounded text-center transition-all"
                            onClick={() => startEditing(category.value, null)}
                            data-testid={`button-add-${category.value}`}
                          >
                            + Select Product
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}