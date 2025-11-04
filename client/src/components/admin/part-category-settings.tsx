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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PartCategoryTags, PartSection } from "@shared/schema";
import { GripVertical, Link as LinkIcon, Info } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Sortable section item component
function SortableSection({ section }: { section: PartSection }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.sectionKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border rounded-md hover:bg-gray-50 transition-colors group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 group-hover:text-gray-600"
        data-testid={`drag-handle-section-${section.sectionKey}`}
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{section.sectionLabel}</div>
        <div className="text-xs text-gray-500">Key: {section.sectionKey}</div>
      </div>
      <Badge variant="outline" className="text-xs">
        Order: {section.sortOrder}
      </Badge>
    </div>
  );
}

// Sortable category item component
function SortableCategory({ 
  category, 
  editingCategory,
  editingTags,
  editingLabel,
  editingValue,
  editingSection,
  editingDisplayMode,
  setEditingTags,
  setEditingLabel,
  setEditingValue,
  setEditingSection,
  setEditingDisplayMode,
  startEditing,
  saveCategory,
  cancelEditing,
  deleteCategoryMutation,
  saveCategoryMutation,
  sectionOptions
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.value });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Define category relationships
  const getLinkedCategory = (categoryValue: string) => {
    if (categoryValue === 'oe_fcw') return { label: 'FCW Group', value: 'fcwgroup' };
    if (categoryValue === 'oe_rcw') return { label: 'RCW Group', value: 'rcwgroup' };
    return null;
  };

  const linkedCategory = getLinkedCategory(category.value);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 hover:bg-gray-50 transition-colors ${editingCategory === category.value ? 'bg-blue-50' : ''}`}
    >
      {editingCategory === category.value ? (
        <div className="space-y-4">
          {linkedCategory && (
            <Alert className="bg-blue-50 border-blue-200" data-testid={`alert-linked-${category.value}`}>
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <strong>Note:</strong> This category requires <strong>{linkedCategory.label}</strong> to be set first on the motorcycle before it can be assigned.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                {sectionOptions.map((option: { value: string; label: string }) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor={`displaymode-${category.value}`} className="text-xs font-medium">Display Mode</Label>
            <Select value={editingDisplayMode} onValueChange={(value: "products" | "variants") => setEditingDisplayMode(value)}>
              <SelectTrigger className="h-8 text-sm mt-1" data-testid={`select-displaymode-${category.value}`}>
                <SelectValue placeholder="Select display mode..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="products">
                  📦 Products (show parent products with variant count)
                </SelectItem>
                <SelectItem value="variants">
                  🔧 Variants (show individual SKUs and sizes)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {editingDisplayMode === "products" 
                ? "Shows parent products like '292--520 Grooved Rear Sprocket' with variant count" 
                : "Shows individual variants like '292--520-13P', '292--520-14P' for direct selection"}
            </p>
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
          <div 
            {...listeners} 
            {...attributes} 
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          >
            <span className="material-icons text-gray-400">drag_indicator</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium text-sm text-gray-900">{category.label}</h4>
              {category.isSaved && <Badge variant="outline" className="text-xs text-green-600 border-green-300">Saved</Badge>}
              {!category.isDefault && <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">Custom</Badge>}
              {linkedCategory && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-blue-50 text-blue-700 border-blue-300 flex items-center gap-1"
                  data-testid={`badge-linked-${category.value}`}
                >
                  <LinkIcon className="h-3 w-3" />
                  Linked to {linkedCategory.label}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">{category.value}</p>
            <div className="flex flex-wrap gap-1">
              {category.productTags.map((tag: string, index: number) => (
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
  );
}

export default function PartCategorySettings() {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [originalCategoryValue, setOriginalCategoryValue] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState("");
  const [editingSection, setEditingSection] = useState("unassigned");
  const [editingDisplayMode, setEditingDisplayMode] = useState<"products" | "variants">("products");
  const [editingLabel, setEditingLabel] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [newCategoryTags, setNewCategoryTags] = useState("");
  const [newCategorySection, setNewCategorySection] = useState("unassigned");
  const [newCategoryDisplayMode, setNewCategoryDisplayMode] = useState<"products" | "variants">("products");
  const [showCreateSectionForm, setShowCreateSectionForm] = useState(false);
  const [newSectionKey, setNewSectionKey] = useState("");
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const { toast } = useToast();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Query for existing part category tags
  const { data: categoryTags, isLoading } = useQuery<PartCategoryTags[]>({
    queryKey: ["/api/part-category-tags"],
  });

  // Query for part sections
  const { data: partSections, isLoading: isSectionsLoading } = useQuery<PartSection[]>({
    queryKey: ["/api/part-sections"],
  });

  // Build dynamic section options from database
  const sectionOptions = [
    { value: "unassigned", label: "Unassigned" },
    ...(partSections || []).map(section => ({
      value: section.sectionKey,
      label: section.sectionLabel
    }))
  ];

  // Mutation for initializing default part sections
  const initializeSectionsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/part-sections/initialize", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-sections"] });
      toast({
        title: "Success",
        description: "Default part sections initialized",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize sections",
        variant: "destructive",
      });
    },
  });

  // Mutation for batch updating section sortOrder
  const batchUpdateSectionSortOrderMutation = useMutation({
    mutationFn: async (updates: Array<{ sectionKey: string; sortOrder: number }>) => {
      await apiRequest("POST", "/api/part-sections/batch-update-sort-order", updates);
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["/api/part-sections"] });
      const previousSections = queryClient.getQueryData<PartSection[]>(["/api/part-sections"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<PartSection[]>(["/api/part-sections"], (old) => {
        if (!old) return old;
        const updatesMap = new Map(updates.map(u => [u.sectionKey, u.sortOrder]));
        return old.map(section => ({
          ...section,
          sortOrder: updatesMap.get(section.sectionKey) ?? section.sortOrder
        })).sort((a, b) => a.sortOrder - b.sortOrder);
      });

      return { previousSections };
    },
    onError: (err, variables, context) => {
      if (context?.previousSections) {
        queryClient.setQueryData(["/api/part-sections"], context.previousSections);
      }
      toast({
        title: "Error",
        description: "Failed to update section order",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-sections"] });
    },
  });

  // Mutation for creating a new section
  const createSectionMutation = useMutation({
    mutationFn: async () => {
      const maxSortOrder = partSections && partSections.length > 0 
        ? Math.max(...partSections.map(s => s.sortOrder)) 
        : -1;
      await apiRequest("POST", "/api/part-sections", {
        sectionKey: newSectionKey,
        sectionLabel: newSectionLabel,
        sortOrder: maxSortOrder + 1,
        isActive: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-sections"] });
      setShowCreateSectionForm(false);
      setNewSectionKey("");
      setNewSectionLabel("");
      toast({
        title: "Success",
        description: "New section created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create section",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating/updating part category tags
  const saveCategoryMutation = useMutation({
    mutationFn: async ({ categoryValue, categoryLabel, productTags, assignedSection, displayMode, sortOrder, originalValue }: {
      categoryValue: string;
      categoryLabel: string;
      productTags: string;
      assignedSection?: string;
      displayMode?: "products" | "variants";
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
          displayMode,
          sortOrder
        });
      } else {
        // Create new category
        await apiRequest("POST", "/api/part-category-tags", {
          categoryValue,
          categoryLabel,
          productTags,
          assignedSection,
          displayMode,
          sortOrder
        });
      }
    },
    onSuccess: (_, variables) => {
      // Update the cache directly with the new values before invalidating
      queryClient.setQueryData(["/api/part-category-tags"], (oldData: any[]) => {
        if (!oldData) return oldData;
        return oldData.map(cat => 
          cat.categoryValue === (variables.originalValue || variables.categoryValue)
            ? { ...cat, 
                categoryValue: variables.categoryValue,
                categoryLabel: variables.categoryLabel,
                productTags: variables.productTags,
                assignedSection: variables.assignedSection,
                displayMode: variables.displayMode,
                sortOrder: variables.sortOrder
              }
            : cat
        );
      });
      
      // Then invalidate to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: ["/api/part-category-tags"] });
      
      setEditingCategory(null);
      setOriginalCategoryValue(null);
      setEditingTags("");
      setEditingSection("unassigned");
      setEditingDisplayMode("products");
      setEditingLabel("");
      setEditingValue("");
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
      // Get the max sortOrder for new categories in the same section
      const categoriesInSection = categoryTags?.filter(cat => cat.assignedSection === (newCategorySection === "unassigned" ? null : newCategorySection)) || [];
      const maxSortOrder = categoriesInSection.length > 0 ? Math.max(...categoriesInSection.map(cat => cat.sortOrder || 0)) : -1;
      await apiRequest("POST", "/api/part-category-tags", {
        categoryValue: newCategoryValue,
        categoryLabel: newCategoryLabel,
        productTags: JSON.stringify(tagsArray),
        assignedSection: newCategorySection === "unassigned" ? null : newCategorySection,
        sortOrder: maxSortOrder + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-category-tags"] });
      setShowCreateForm(false);
      setNewCategoryLabel("");
      setNewCategoryValue("");
      setNewCategoryTags("");
      setNewCategorySection("unassigned");
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

  // Mutation for batch updating sortOrder
  const batchUpdateSortOrderMutation = useMutation({
    mutationFn: async (updates: Array<{ categoryValue: string; sortOrder: number }>) => {
      const promises = updates.map(({ categoryValue, sortOrder }) =>
        apiRequest("PUT", `/api/part-category-tags/${categoryValue}`, { sortOrder })
      );
      await Promise.all(promises);
    },
    onMutate: async (updates) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/part-category-tags"] });

      // Snapshot the previous value
      const previousTags = queryClient.getQueryData(["/api/part-category-tags"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/part-category-tags"], (old: any[]) => {
        if (!old) return old;
        
        // Create a map of updates for quick lookup
        const updateMap = new Map(updates.map(u => [u.categoryValue, u.sortOrder]));
        
        // Update the sortOrder values in the cached data
        return old.map(tag => {
          const newSortOrder = updateMap.get(tag.categoryValue);
          if (newSortOrder !== undefined) {
            return { ...tag, sortOrder: newSortOrder };
          }
          return tag;
        });
      });

      // Return context with the previous value
      return { previousTags };
    },
    onError: (error: any, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousTags) {
        queryClient.setQueryData(["/api/part-category-tags"], context.previousTags);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update sort order",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/part-category-tags"] });
    },
  });

  // Handle drag end event for categories
  const handleDragEnd = (event: DragEndEvent, sectionCategories: any[]) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sectionCategories.findIndex((cat) => cat.value === active.id);
    const newIndex = sectionCategories.findIndex((cat) => cat.value === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder the categories array within this section
    const reorderedCategories = arrayMove(sectionCategories, oldIndex, newIndex);

    // Calculate new sortOrder values for the reordered categories
    const updates = reorderedCategories.map((cat, index) => ({
      categoryValue: cat.value,
      sortOrder: index,
    }));

    // Update sortOrder in the database
    batchUpdateSortOrderMutation.mutate(updates);
  };

  // Handle drag end event for sections
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !partSections) {
      return;
    }

    const oldIndex = partSections.findIndex((section) => section.sectionKey === active.id);
    const newIndex = partSections.findIndex((section) => section.sectionKey === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder the sections array
    const reorderedSections = arrayMove(partSections, oldIndex, newIndex);

    // Calculate new sortOrder values for the reordered sections
    const updates = reorderedSections.map((section, index) => ({
      sectionKey: section.sectionKey,
      sortOrder: index,
    }));

    // Update sortOrder in the database
    batchUpdateSectionSortOrderMutation.mutate(updates);
  };

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
      setEditingDisplayMode((existingCategory.displayMode as "products" | "variants") || "products");
      setEditingLabel(existingCategory.categoryLabel || category.label);
      setEditingValue(existingCategory.categoryValue);
    } else {
      setEditingTags(category.productTags.join(", "));
      setEditingSection("unassigned");
      setEditingLabel(category.label);
      setEditingValue(category.value);
    }
  };

  const saveCategory = (category: any) => {
    const tagsArray = editingTags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
    // Get the existing sortOrder from the category
    const existingCategory = categoryTags?.find(cat => cat.categoryValue === originalCategoryValue || category.value);
    saveCategoryMutation.mutate({
      categoryValue: editingValue,
      categoryLabel: editingLabel,
      productTags: JSON.stringify(tagsArray),
      assignedSection: editingSection === "unassigned" ? undefined : editingSection,
      displayMode: editingDisplayMode,
      sortOrder: existingCategory?.sortOrder || 0,
      originalValue: originalCategoryValue || undefined
    });
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setOriginalCategoryValue(null);
    setEditingTags("");
    setEditingSection("unassigned");
    setEditingDisplayMode("products");
    setEditingLabel("");
    setEditingValue("");
  };

  // Only show categories that exist in the database
  const allCategories = (categoryTags || []).map(savedCategory => {
      try {
        const tags = JSON.parse(savedCategory.productTags);
        return {
          value: savedCategory.categoryValue,
          label: savedCategory.categoryLabel || savedCategory.categoryValue,
          productTags: Array.isArray(tags) ? tags : [savedCategory.productTags],
          assignedSection: savedCategory.assignedSection || "unassigned",
          sortOrder: savedCategory.sortOrder || 0,
          isSaved: true,
          isDefault: false
        };
      } catch {
        return {
          value: savedCategory.categoryValue,
          label: savedCategory.categoryLabel || savedCategory.categoryValue,
          productTags: [savedCategory.productTags],
          assignedSection: savedCategory.assignedSection || "unassigned",
          sortOrder: savedCategory.sortOrder || 0,
          isSaved: true,
          isDefault: false
        };
      }
    });

  // Group categories by assigned section and sort by sortOrder within each section
  const categoriesBySection = allCategories.reduce((acc, category) => {
    const section = category.assignedSection || "unassigned";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(category);
    return acc;
  }, {} as Record<string, typeof allCategories>);

  // Sort categories within each section by sortOrder
  Object.keys(categoriesBySection).forEach(section => {
    categoriesBySection[section].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  });

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

      {/* Create New Category Form */}
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
                  {sectionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                }}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Order Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Section Order</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Drag sections to reorder how they appear in the parts catalog</p>
            </div>
            <div className="flex gap-2">
              {(!partSections || partSections.length === 0) && (
                <Button
                  onClick={() => initializeSectionsMutation.mutate()}
                  disabled={initializeSectionsMutation.isPending}
                  data-testid="button-initialize-sections"
                  size="sm"
                >
                  {initializeSectionsMutation.isPending ? "Initializing..." : "Initialize Sections"}
                </Button>
              )}
              {partSections && partSections.length > 0 && (
                <Button
                  onClick={() => setShowCreateSectionForm(true)}
                  disabled={showCreateSectionForm}
                  data-testid="button-create-section"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Create New Section
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isSectionsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : partSections && partSections.length > 0 ? (
            <div className="space-y-4">
              {/* Create Section Form */}
              {showCreateSectionForm && (
                <div className="border-2 border-green-200 bg-green-50 p-4 rounded-md">
                  <h3 className="font-semibold text-green-900 mb-3">Create New Section</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="new-section-label" className="text-sm font-medium">
                        Section Label
                      </Label>
                      <p className="text-xs text-gray-600 mt-1 mb-2">
                        Display name (e.g., "Exhaust Systems")
                      </p>
                      <Input
                        id="new-section-label"
                        value={newSectionLabel}
                        onChange={(e) => setNewSectionLabel(e.target.value)}
                        placeholder="Exhaust Systems"
                        data-testid="input-new-section-label"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-section-key" className="text-sm font-medium">
                        Section Key
                      </Label>
                      <p className="text-xs text-gray-600 mt-1 mb-2">
                        Internal identifier (lowercase, camelCase)
                      </p>
                      <Input
                        id="new-section-key"
                        value={newSectionKey}
                        onChange={(e) => setNewSectionKey(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                        placeholder="exhaustSystems"
                        data-testid="input-new-section-key"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => createSectionMutation.mutate()}
                      disabled={createSectionMutation.isPending || !newSectionLabel || !newSectionKey}
                      data-testid="button-create-new-section"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {createSectionMutation.isPending ? "Creating..." : "Create Section"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateSectionForm(false);
                        setNewSectionKey("");
                        setNewSectionLabel("");
                      }}
                      data-testid="button-cancel-create-section"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Sections List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSectionDragEnd}
              >
                <SortableContext
                  items={partSections.map(s => s.sectionKey)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {partSections.map((section) => (
                      <SortableSection key={section.sectionKey} section={section} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No sections configured. Click "Initialize Sections" to set up default sections.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grouped categories by section with drag-and-drop */}
      <div className="space-y-4">
        {Object.entries(categoriesBySection).sort(([a], [b]) => {
          // Sort sections: put specific sections first, unassigned last
          if (a === "unassigned") return 1;
          if (b === "unassigned") return -1;
          return a.localeCompare(b);
        }).map(([sectionKey, categories]) => {
          const sectionTitle = sectionOptions.find(opt => opt.value === sectionKey)?.label || "Unassigned";
          const categoryIds = categories.map(cat => cat.value);
          
          return (
            <Card key={sectionKey}>
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900">{sectionTitle}</CardTitle>
                    <p className="text-sm text-gray-600">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</p>
                  </div>
                  <p className="text-xs text-gray-500">Drag to reorder</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(event, categories)}
                >
                  <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                    <div className="divide-y">
                      {categories.map((category) => (
                        <SortableCategory
                          key={category.value}
                          category={category}
                          editingCategory={editingCategory}
                          editingTags={editingTags}
                          editingLabel={editingLabel}
                          editingValue={editingValue}
                          editingSection={editingSection}
                          editingDisplayMode={editingDisplayMode}
                          setEditingTags={setEditingTags}
                          setEditingLabel={setEditingLabel}
                          setEditingValue={setEditingValue}
                          setEditingSection={setEditingSection}
                          setEditingDisplayMode={setEditingDisplayMode}
                          startEditing={startEditing}
                          saveCategory={saveCategory}
                          cancelEditing={cancelEditing}
                          deleteCategoryMutation={deleteCategoryMutation}
                          saveCategoryMutation={saveCategoryMutation}
                          sectionOptions={sectionOptions}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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