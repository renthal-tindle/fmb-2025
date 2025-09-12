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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ShopifyProduct } from "@shared/schema";

export default function ProductManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<ShopifyProduct | null>(null);
  const [editingTags, setEditingTags] = useState("");
  const { toast } = useToast();

  // Query for products with search
  const { data: products, isLoading } = useQuery<ShopifyProduct[]>({
    queryKey: ["/api/products", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Mutation for updating product tags
  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, tags }: { productId: string; tags: string }) => {
      await apiRequest("PUT", `/api/products/${productId}`, { tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProduct(null);
      setEditingTags("");
      toast({
        title: "Success",
        description: "Product tags updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product tags",
        variant: "destructive",
      });
    },
  });

  const startEditing = (product: ShopifyProduct) => {
    setEditingProduct(product);
    if (product.tags) {
      try {
        const tags = JSON.parse(product.tags);
        setEditingTags(Array.isArray(tags) ? tags.join(", ") : product.tags);
      } catch {
        setEditingTags(product.tags);
      }
    } else {
      setEditingTags("");
    }
  };

  const saveProduct = () => {
    if (!editingProduct) return;
    
    const tagsArray = editingTags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
    updateProductMutation.mutate({
      productId: editingProduct.id,
      tags: JSON.stringify(tagsArray)
    });
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setEditingTags("");
  };

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
          <h2 className="text-2xl font-semibold text-gray-900">Product Management</h2>
          <p className="text-gray-600 mt-1">Manage product tags for categorized filtering</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Label htmlFor="product-search">Search Products</Label>
          <Input
            id="product-search"
            type="text"
            placeholder="Search by title, SKU, or product ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-product-search"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map((product) => {
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

          return (
            <Card key={product.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg truncate">{product.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(product)}
                    data-testid={`button-edit-product-${product.id}`}
                  >
                    <span className="material-icons text-base">edit</span>
                  </Button>
                </div>
                <div className="space-y-1">
                  {product.sku && (
                    <Badge variant="outline" className="text-xs">
                      SKU: {product.sku}
                    </Badge>
                  )}
                  <p className="text-sm font-medium text-green-600">${product.price}</p>
                  {product.category && (
                    <p className="text-xs text-gray-500">Category: {product.category}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {productTags.length > 0 ? (
                      productTags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">No tags</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editingProduct && (
        <Dialog open onOpenChange={cancelEditing}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Product Tags</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-medium">{editingProduct.title}</p>
                {editingProduct.sku && (
                  <p className="text-sm text-gray-600">SKU: {editingProduct.sku}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="product-tags" className="text-sm font-medium">
                  Product Tags
                </Label>
                <p className="text-xs text-gray-600 mt-1 mb-3">
                  Enter tags separated by commas. These tags will be used to match products to part categories.
                </p>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mb-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">Examples:</p>
                  <p className="text-xs text-blue-700">twinwall, handlebar, motocross</p>
                  <p className="text-xs text-blue-700">brake pad, front brake, racing</p>
                </div>
                <Textarea
                  id="product-tags"
                  value={editingTags}
                  onChange={(e) => setEditingTags(e.target.value)}
                  placeholder="twinwall, handlebar, motocross"
                  className="min-h-[80px] text-sm"
                  data-testid="textarea-product-tags"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={saveProduct}
                  disabled={updateProductMutation.isPending}
                  data-testid="button-save-product"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {updateProductMutation.isPending ? "Saving..." : "Save Tags"}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  data-testid="button-cancel-product"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How Product Tags Work</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Product tags determine which category sections show this product</li>
            <li>• When you tag a product with "twinwall", it will appear in the Twinwall category</li>
            <li>• Multiple tags allow a product to appear in multiple categories</li>
            <li>• Tags are matched exactly (case-insensitive) with category tag settings</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}