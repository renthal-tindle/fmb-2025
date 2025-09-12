import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import MotorcycleSelector from "@/components/customer/motorcycle-selector";
import PartsGrid from "@/components/customer/parts-grid";
import type { Motorcycle, ShopifyProduct } from "@shared/schema";

export default function CustomerCatalog() {
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: compatibleParts, isLoading: isLoadingParts } = useQuery<ShopifyProduct[]>({
    queryKey: ["/api/customer/motorcycles", selectedMotorcycle?.recid, "compatible-parts"],
    enabled: !!selectedMotorcycle,
  });

  const categories = [
    { slug: "engine", name: "Engine", icon: "build", count: 342 },
    { slug: "brakes", name: "Brakes", icon: "settings", count: 156 },
    { slug: "wheels", name: "Wheels", icon: "tire_repair", count: 89 },
    { slug: "electrical", name: "Electrical", icon: "electrical_services", count: 234 },
    { slug: "body", name: "Body", icon: "style", count: 298 },
    { slug: "performance", name: "Performance", icon: "tune", count: 167 },
  ];

  const handleSearch = () => {
    // Implementation for search functionality
    console.log("Searching for:", searchTerm);
  };

  const handleAddToCart = (productId: string) => {
    // Implementation for adding to Shopify cart
    console.log("Adding to cart:", productId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <span className="material-icons text-primary text-2xl mr-3">two_wheeler</span>
              <h1 className="text-xl font-semibold text-gray-900">MotoCatalog</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-900 font-medium">Browse</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">Categories</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">Brands</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">Support</a>
            </nav>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" data-testid="button-search">
                <span className="material-icons">search</span>
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-cart">
                <span className="material-icons">shopping_cart</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gray-900 text-white">
        <div 
          className="relative bg-cover bg-center h-96"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400')",
            backgroundBlendMode: "overlay"
          }}
        >
          <div className="absolute inset-0 bg-gray-900 bg-opacity-60"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold mb-4">Find the Perfect Parts for Your Motorcycle</h1>
              <p className="text-xl text-gray-300 mb-8">
                Search our extensive catalog of compatible parts for hundreds of motorcycle models
              </p>
              <div className="flex max-w-md">
                <Input
                  placeholder="Enter your motorcycle model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 text-gray-900 rounded-r-none"
                  data-testid="input-hero-search"
                />
                <Button 
                  onClick={handleSearch}
                  className="rounded-l-none"
                  data-testid="button-hero-search"
                >
                  <span className="material-icons">search</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Motorcycle Selection */}
        <section className="mb-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Find Parts for Your Motorcycle</h2>
            <p className="text-gray-600">Select your motorcycle to see compatible parts</p>
          </div>

          <MotorcycleSelector 
            selectedMotorcycle={selectedMotorcycle}
            onMotorcycleSelect={setSelectedMotorcycle}
          />
        </section>

        {/* Parts Categories */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Card 
                key={category.slug}
                className="hover:shadow-material-lg transition-shadow cursor-pointer"
                data-testid={`card-category-${category.slug}`}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <span className="material-icons text-gray-600">{category.icon}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
                  <p className="text-xs text-gray-500">{category.count} parts</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Compatible Parts */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Compatible Parts</h2>
              <p className="text-gray-600" data-testid="text-parts-count">
                {selectedMotorcycle 
                  ? `Showing ${compatibleParts?.length || 0} parts for your motorcycle`
                  : "Select a motorcycle to see compatible parts"
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48" data-testid="select-sort-parts">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Sort by Relevance</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Customer Rating</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border border-gray-300 rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-grid-view"
                >
                  <span className="material-icons text-sm">grid_view</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  data-testid="button-list-view"
                >
                  <span className="material-icons text-sm">view_list</span>
                </Button>
              </div>
            </div>
          </div>

          <PartsGrid 
            parts={compatibleParts || []}
            isLoading={isLoadingParts}
            viewMode={viewMode}
            onAddToCart={handleAddToCart}
          />

          {compatibleParts && compatibleParts.length > 0 && (
            <div className="text-center mt-8">
              <Button 
                variant="outline"
                data-testid="button-load-more"
              >
                Load More Parts
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <span className="material-icons text-primary text-2xl mr-3">two_wheeler</span>
                <h3 className="text-lg font-semibold">MotoCatalog</h3>
              </div>
              <p className="text-gray-400">Your trusted source for motorcycle parts and accessories.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">FAQ</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Returns</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Warranty</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">Categories</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Engine Parts</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Brake Systems</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Electrical</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Performance</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">Connect</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Newsletter</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Social Media</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8">
            <p className="text-gray-400 text-center">&copy; 2024 MotoCatalog. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
