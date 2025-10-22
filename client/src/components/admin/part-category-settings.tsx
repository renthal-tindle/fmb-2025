import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PartCategoryTags } from "@shared/schema";

const DEFAULT_CATEGORIES = [
  { value: "oe_handlebar", label: "OE Handlebar", productTags: ["handlebar"] },
  { value: "fcwgroup", label: "FCW Group", productTags: ["sprocket", "front sprocket", "chainwheel"] },
  { value: "oe_fcw", label: "OE Front Sprocket", productTags: ["sprocket", "front sprocket", "chainwheel"] },
  { value: "rcwgroup", label: "RCW Group", productTags: ["sprocket", "rear sprocket", "chainwheel"] },
  { value: "oe_rcw", label: "OE Rear Sprocket", productTags: ["sprocket", "rear sprocket", "chainwheel"] },
  { value: "front_brakepads", label: "Front Brake Pads", productTags: ["brake pad", "brake pads", "front brake"] },
  { value: "rear_brakepads", label: "Rear Brake Pads", productTags: ["brake pad", "brake pads", "rear brake"] },
  { value: "handlebars_78", label: "7/8\" Handlebars", productTags: ["handlebar"] },
  { value: "twinwall", label: "Twinwall Handlebars", productTags: ["handlebar", "twinwall"] },
  { value: "fatbar", label: "Fatbar Handlebars", productTags: ["handlebar", "fatbar"] },
  { value: "fatbar36", label: "Fatbar 36 Handlebars", productTags: ["handlebar", "fatbar"] },
  { value: "grips", label: "Grips", productTags: ["grip", "grips"] },
  { value: "cam", label: "Cam Chain", productTags: ["chain", "cam chain"] },
  { value: "oe_barmount", label: "OE Bar Mount", productTags: ["bar mount", "mount"] },
  { value: "barmount28", label: "28mm Bar Mount", productTags: ["bar mount", "mount"] },
  { value: "barmount36", label: "36mm Bar Mount", productTags: ["bar mount", "mount"] },
  { value: "fcwconv", label: "FCW Conversion", productTags: ["sprocket", "front sprocket", "chainwheel"] },
  { value: "rcwconv", label: "RCW Conversion", productTags: ["sprocket", "rear sprocket", "chainwheel"] },
  { value: "twinring", label: "Twin Ring", productTags: ["sprocket", "chainwheel", "twin ring"] },
  { value: "oe_chain", label: "OE Chain", productTags: ["chain"] },
  { value: "chainconv", label: "Chain Conversion", productTags: ["chain"] },
  { value: "r1_chain", label: "R1 Chain", productTags: ["chain"] },
  { value: "r3_chain", label: "R3 Chain", productTags: ["chain"] },
  { value: "r4_chain", label: "R4 Chain", productTags: ["chain"] },
  { value: "rr4_chain", label: "RR4 Chain", productTags: ["chain"] },
  { value: "clipon", label: "Clip-on", productTags: ["clip-on", "clipon", "handlebar"] },
  { value: "rcwcarrier", label: "RCW Carrier", productTags: ["carrier", "sprocket", "chainwheel"] },
];

const SECTION_OPTIONS = [
  { value: "unassigned", label: "Unassigned" },
  { value: "handlebars", label: "Handlebars" },
  { value: "frontSprocket", label: "Front Sprocket" },
  { value: "rearSprockets", label: "Rear Sprockets" },
  { value: "chain", label: "Chain" },
  { value: "brakePads", label: "Brake Pads" },
  { value: "barMounts", label: "Bar Mounts" },
  { value: "driveConversions", label: "Drive Conversions" },
  { value: "others", label: "Others" },
];

export default function PartCategorySettings() {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [originalCategoryValue, setOriginalCategoryValue] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState("");
  const [editingSection, setEditingSection] = useState("unassigned");
  const [editingLabel, setEditingLabel] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [editingSortOrder, setEditingSortOrder] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [newCategoryTags, setNewCategoryTags] = useState("");
  const [newCategorySection, setNewCategorySection] = useState("unassigned");
  const [newCategorySortOrder, setNewCategorySortOrder] = useState(0);
  const { toast } = useToast();

  // Query for existing part category tags
  const { data: categoryTags, isLoading } = useQuery<PartCategoryTags[]>({
    queryKey: ["/api/part-category-tags"],
  });

  // Mutation for creating/updating part category tags
  const saveCategoryMutation = useMutation({
    mutationFn: async ({ categoryValue, categoryLabel, productTags, assignedSection, sortOrder, originalValue }: {
      categoryValue: string;
      categoryLabel: string;
      productTags: string;
      assignedSection?: string;
      sortOrder?: number;
      originalValue?: string;
    }) => {
      if (originalValue) {
        // Update existing category (use original value for the URL)
        await apiRequest("PUT", `/api/part-category-tags/${originalValue}`, {
          categoryValue, // New value to update to
          categoryLabel,
          productTags,
          assignedSection,
          sortOrder
        });
      } else {
        // Create new category
        await apiRequest("POST", "/api/part-category-tags", {
          categoryValue,
          categoryLabel,
          productTags,
          assignedSection,
          sortOrder
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-category-tags"] });
      setEditingCategory(null);
      setOriginalCategoryValue(null);
      setEditingTags("");
      setEditingSection("unassigned");
      setEditingLabel("");
      setEditingValue("");
      setEditingSortOrder(0);
      toast({
        title: "Success",
        description: "Part category tags updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update part category tags",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating new category
  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const tagsArray = newCategoryTags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
      await apiRequest("POST", "/api/part-category-tags", {
        categoryValue: newCategoryValue,
        categoryLabel: newCategoryLabel,
        productTags: JSON.stringify(tagsArray),
        assignedSection: newCategorySection === "unassigned" ? null : newCategorySection,
        sortOrder: newCategorySortOrder
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-category-tags"] });
      setShowCreateForm(false);
      setNewCategoryLabel("");
      setNewCategoryValue("");
      setNewCategoryTags("");
      setNewCategorySection("unassigned");
      setNewCategorySortOrder(0);
      toast({
        title: "Success",
        description: "New part category created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create new category",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryValue: string) => {
      await apiRequest("DELETE", `/api/part-category-tags/${categoryValue}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-category-tags"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  // Initialize default categories if none exist
  const initializeDefaultsMutation = useMutation({
    mutationFn: async () => {
      const promises = DEFAULT_CATEGORIES.map((category, index) => 
        apiRequest("POST", "/api/part-category-tags", {
          categoryValue: category.value,
          categoryLabel: category.label,
          productTags: JSON.stringify(category.productTags),
          sortOrder: index
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-category-tags"] });
      toast({
        title: "Success",
        description: "Default part categories initialized",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize default categories",
        variant: "destructive",
      });
    },
  });

  const startEditing = (category: any) => {
    setEditingCategory(category.value);
    setOriginalCategoryValue(category.value); // Track the original value
    const existingCategory = categoryTags?.find(cat => cat.categoryValue === category.value);
    if (existingCategory) {
      // Parse the stored JSON tags
      try {
        const tags = JSON.parse(existingCategory.productTags);
        setEditingTags(Array.isArray(tags) ? tags.join(", ") : existingCategory.productTags);
      } catch {
        setEditingTags(existingCategory.productTags);
      }
      setEditingSection(existingCategory.assignedSection || "unassigned");
      setEditingLabel(existingCategory.categoryLabel || category.label);
      setEditingValue(existingCategory.categoryValue);
      setEditingSortOrder(existingCategory.sortOrder || 0);
    } else {
      setEditingTags(category.productTags.join(", "));
      setEditingSection("unassigned");
      setEditingLabel(category.label);
      setEditingValue(category.value);
      setEditingSortOrder(0);
    }
  };

  const saveCategory = (category: any) => {
    const tagsArray = editingTags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
    saveCategoryMutation.mutate({
      categoryValue: editingValue,
      categoryLabel: editingLabel,
      productTags: JSON.stringify(tagsArray),
      assignedSection: editingSection === "unassigned" ? undefined : editingSection,
      sortOrder: editingSortOrder,
      originalValue: originalCategoryValue || undefined
    });
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setOriginalCategoryValue(null);
    setEditingTags("");
    setEditingSection("unassigned");
    setEditingLabel("");
    setEditingValue("");
    setEditingSortOrder(0);
  };

  // Merge default categories with saved ones and add custom categories
  const defaultCategoryValues = DEFAULT_CATEGORIES.map(cat => cat.value);
  const defaultCategoriesUpdated = DEFAULT_CATEGORIES.map(defaultCategory => {
    const savedCategory = categoryTags?.find(saved => saved.categoryValue === defaultCategory.value);
    if (savedCategory) {
      try {
        const tags = JSON.parse(savedCategory.productTags);
        return {
          ...defaultCategory,
          productTags: Array.isArray(tags) ? tags : [savedCategory.productTags],
          assignedSection: savedCategory.assignedSection || "unassigned",
          isSaved: true,
          isDefault: true
        };
      } catch {
        return {
          ...defaultCategory,
          productTags: [savedCategory.productTags],
          assignedSection: savedCategory.assignedSection || "unassigned",
          isSaved: true,
          isDefault: true
        };
      }
    }
    return { ...defaultCategory, assignedSection: "unassigned", isSaved: false, isDefault: true };
  });

  // Add custom categories (not in default list)
  const customCategories = (categoryTags || [])
    .filter(saved => !defaultCategoryValues.includes(saved.categoryValue))
    .map(savedCategory => {
      try {
        const tags = JSON.parse(savedCategory.productTags);
        return {
          value: savedCategory.categoryValue,
          label: savedCategory.categoryLabel || savedCategory.categoryValue,
          productTags: Array.isArray(tags) ? tags : [savedCategory.productTags],
          assignedSection: savedCategory.assignedSection || "unassigned",
          isSaved: true,
          isDefault: false
        };
      } catch {
        return {
          value: savedCategory.categoryValue,
          label: savedCategory.categoryLabel || savedCategory.categoryValue,
          productTags: [savedCategory.productTags],
          assignedSection: savedCategory.assignedSection || "unassigned",
          isSaved: true,
          isDefault: false
        };
      }
    });

  const allCategories = [...defaultCategoriesUpdated, ...customCategories];

  // Group categories by assigned section
  const categoriesBySection = allCategories.reduce((acc, category) => {
    const section = category.assignedSection || "unassigned";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(category);
    return acc;
  }, {} as Record<string, typeof allCategories>);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Part Category Settings</h2>
          <p className="text-gray-600 mt-1">Configure which product tags are used for each part category</p>
        </div>
        
        <div className="flex gap-3">
          {(!categoryTags || categoryTags.length === 0) && (
            <Button 
              onClick={() => initializeDefaultsMutation.mutate()}
              disabled={initializeDefaultsMutation.isPending}
              data-testid="button-initialize-defaults"
            >
              {initializeDefaultsMutation.isPending ? "Initializing..." : "Initialize Defaults"}
            </Button>
          )}
          <Button 
            onClick={() => setShowCreateForm(true)}
            data-testid="button-create-category"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create New Category
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-xl text-blue-900">Create New Part Category</CardTitle>
            <p className="text-blue-700">Add a custom part category that's not in the default list</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-category-label" className="text-sm font-medium">
                  Category Label
                </Label>
                <p className="text-xs text-gray-600 mt-1 mb-2">
                  Display name for this category (e.g., "V-Twin Handlebars")
                </p>
                <Input
                  id="new-category-label"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="V-Twin Handlebars"
                  data-testid="input-new-category-label"
                />
              </div>
              
              <div>
                <Label htmlFor="new-category-value" className="text-sm font-medium">
                  Category Value
                </Label>
                <p className="text-xs text-gray-600 mt-1 mb-2">
                  Internal identifier (lowercase, underscores, no spaces)
                </p>
                <Input
                  id="new-category-value"
                  value={newCategoryValue}
                  onChange={(e) => setNewCategoryValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="vtwin_handlebars"
                  data-testid="input-new-category-value"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="new-category-tags" className="text-sm font-medium">
                Product Tags
              </Label>
              <p className="text-xs text-gray-600 mt-1 mb-2">
                Search terms that will match against product titles and categories
              </p>
              <Textarea
                id="new-category-tags"
                value={newCategoryTags}
                onChange={(e) => setNewCategoryTags(e.target.value)}
                placeholder="v-twin, vtwin, twin, handlebar"
                className="min-h-[80px]"
                data-testid="textarea-new-category-tags"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-category-section" className="text-sm font-medium">
                  Assign to Section
                </Label>
                <p className="text-xs text-gray-600 mt-1 mb-2">
                  Choose which section this category will appear in during part assignment
                </p>
                <Select value={newCategorySection} onValueChange={setNewCategorySection}>
                  <SelectTrigger data-testid="select-new-category-section">
                    <SelectValue placeholder="Select a section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-category-sort-order" className="text-sm font-medium">
                  Sort Order
                </Label>
                <p className="text-xs text-gray-600 mt-1 mb-2">
                  Lower numbers appear first (e.g., 1 before 10)
                </p>
                <Input
                  id="new-category-sort-order"
                  type="number"
                  value={newCategorySortOrder}
                  onChange={(e) => setNewCategorySortOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  data-testid="input-new-category-sort-order"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => createCategoryMutation.mutate()}
                disabled={createCategoryMutation.isPending || !newCategoryLabel || !newCategoryValue || !newCategoryTags}
                data-testid="button-create-new-category"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewCategoryLabel("");
                  setNewCategoryValue("");
                  setNewCategoryTags("");
                  setNewCategorySection("unassigned");
                  setNewCategorySortOrder(0);
                }}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped categories by section */}
      <div className="space-y-4">
        {Object.entries(categoriesBySection).sort(([a], [b]) => {
          // Sort sections: put specific sections first, unassigned last
          if (a === "unassigned") return 1;
          if (b === "unassigned") return -1;
          return a.localeCompare(b);
        }).map(([sectionKey, categories]) => {
          const sectionTitle = SECTION_OPTIONS.find(opt => opt.value === sectionKey)?.label || "Unassigned";
          
          return (
            <Card key={sectionKey}>
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-lg font-bold text-gray-900">{sectionTitle}</CardTitle>
                <p className="text-sm text-gray-600">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {categories.map((category) => (
                    <div key={category.value} className={`p-4 hover:bg-gray-50 transition-colors ${editingCategory === category.value ? 'bg-blue-50' : ''}`}>
                      {editingCategory === category.value ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label htmlFor={`label-${category.value}`} className="text-xs font-medium">Label</Label>
                              <Input
                                id={`label-${category.value}`}
                                value={editingLabel}
                                onChange={(e) => setEditingLabel(e.target.value)}
                                placeholder="V-Twin Handlebars"
                                className="h-8 text-sm"
                                data-testid={`input-label-${category.value}`}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`value-${category.value}`} className="text-xs font-medium">Value</Label>
                              <Input
                                id={`value-${category.value}`}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                placeholder="vtwin_handlebars"
                                className="h-8 text-sm"
                                data-testid={`input-value-${category.value}`}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`sort-order-${category.value}`} className="text-xs font-medium">Sort Order</Label>
                              <Input
                                id={`sort-order-${category.value}`}
                                type="number"
                                value={editingSortOrder}
                                onChange={(e) => setEditingSortOrder(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="h-8 text-sm"
                                data-testid={`input-sort-order-${category.value}`}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor={`tags-${category.value}`} className="text-xs font-medium">Product Tags (comma-separated)</Label>
                            <Textarea
                              id={`tags-${category.value}`}
                              value={editingTags}
                              onChange={(e) => setEditingTags(e.target.value)}
                              placeholder="handlebar, fatbar, twinwall"
                              className="min-h-[60px] text-sm mt-1"
                              data-testid={`textarea-tags-${category.value}`}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`section-${category.value}`} className="text-xs font-medium">Section</Label>
                            <Select value={editingSection} onValueChange={setEditingSection}>
                              <SelectTrigger className="h-8 text-sm mt-1" data-testid={`select-section-${category.value}`}>
                                <SelectValue placeholder="Select a section..." />
                              </SelectTrigger>
                              <SelectContent>
                                {SECTION_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => saveCategory(category)}
                              disabled={saveCategoryMutation.isPending}
                              size="sm"
                              data-testid={`button-save-${category.value}`}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {saveCategoryMutation.isPending ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEditing}
                              data-testid={`button-cancel-${category.value}`}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteCategoryMutation.mutate(category.value)}
                              disabled={deleteCategoryMutation.isPending}
                              data-testid={`button-delete-${category.value}`}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm text-gray-900">{category.label}</h4>
                              {category.isSaved && <Badge variant="outline" className="text-xs text-green-600 border-green-300">Saved</Badge>}
                              {!category.isDefault && <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">Custom</Badge>}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{category.value}</p>
                            <div className="flex flex-wrap gap-1">
                              {category.productTags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(category)}
                            className="shrink-0"
                            data-testid={`button-edit-${category.value}`}
                          >
                            <span className="material-icons text-base">edit</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How Product Filtering Works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• When assigning parts, each category only shows products matching its tags</li>
            <li>• Tags are matched against both product titles and categories (case-insensitive)</li>
            <li>• Multiple tags work as OR conditions - products matching any tag will appear</li>
            <li>• Example: "handlebar" tag matches products with "Handlebar" in title or category</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}