import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MotorcycleCategoryConfig, InsertMotorcycleCategoryConfig } from "@shared/schema";

export default function MotorcycleCategoryManagement() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ category: "", subcategory: "", sortOrder: 0 });

  const { data: categories, isLoading } = useQuery<MotorcycleCategoryConfig[]>({
    queryKey: ["/api/motorcycle-category-config"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertMotorcycleCategoryConfig) =>
      apiRequest("POST", "/api/motorcycle-category-config", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Category created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/motorcycle-category-config"] });
      setNewCategory({ category: "", subcategory: "", sortOrder: 0 });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertMotorcycleCategoryConfig> }) =>
      apiRequest("PUT", `/api/motorcycle-category-config/${id}`, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Category updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/motorcycle-category-config"] });
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/motorcycle-category-config/${id}`),
    onSuccess: () => {
      toast({ title: "Success", description: "Category deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/motorcycle-category-config"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newCategory.category) {
      toast({ title: "Error", description: "Category is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(newCategory);
  };

  const handleUpdate = (id: string, updates: Partial<InsertMotorcycleCategoryConfig>) => {
    updateMutation.mutate({ id, data: updates });
  };

  const handleDelete = (id: string, category: string, subcategory: string | null) => {
    if (window.confirm(`Delete ${category}${subcategory ? ` - ${subcategory}` : ''}?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Group categories by main category
  const groupedCategories = categories?.reduce((acc, cat) => {
    if (!acc[cat.category]) {
      acc[cat.category] = [];
    }
    acc[cat.category].push(cat);
    return acc;
  }, {} as Record<string, MotorcycleCategoryConfig[]>) || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Motorcycle Category Management</h2>
        <p className="text-gray-600">Manage motorcycle categories and subcategories</p>
      </div>

      {/* Add New Category */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Category or Subcategory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Main Category *</label>
              <Input
                placeholder="e.g., Off-Road, Street, ATV"
                value={newCategory.category}
                onChange={(e) => setNewCategory({ ...newCategory, category: e.target.value })}
                data-testid="input-new-category"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory (optional)</label>
              <Input
                placeholder="e.g., MX/Enduro, Sportbike"
                value={newCategory.subcategory}
                onChange={(e) => setNewCategory({ ...newCategory, subcategory: e.target.value || "" })}
                data-testid="input-new-subcategory"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
              <Input
                type="number"
                value={newCategory.sortOrder}
                onChange={(e) => setNewCategory({ ...newCategory, sortOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-new-sort-order"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full"
                data-testid="button-add-category"
              >
                {createMutation.isPending ? "Adding..." : "Add Category"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedCategories).map(([mainCategory, items]) => (
                <div key={mainCategory} className="border-b pb-4 last:border-0">
                  <h3 className="text-lg font-semibold mb-3">{mainCategory}</h3>
                  <div className="space-y-2">
                    {items.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        data-testid={`category-item-${cat.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{cat.category}</span>
                          {cat.subcategory && (
                            <>
                              <span className="text-gray-400">→</span>
                              <Badge variant="secondary">{cat.subcategory}</Badge>
                            </>
                          )}
                          <span className="text-xs text-gray-500">Order: {cat.sortOrder}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cat.id, cat.category, cat.subcategory)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-category-${cat.id}`}
                          >
                            <span className="material-icons text-base">delete</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No categories configured</p>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="material-icons text-blue-600">info</span>
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How to use:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Create main categories (e.g., "Off-Road", "Street", "ATV")</li>
                <li>Add subcategories by specifying both category and subcategory</li>
                <li>The same subcategory can appear in multiple categories (e.g., "Dual Sport" in both Off-Road and Street)</li>
                <li>Use sort order to control display order (lower numbers appear first)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
