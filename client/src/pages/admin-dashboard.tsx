import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import MotorcycleForm from "@/components/admin/motorcycle-form";
import PartsMapping from "@/components/admin/parts-mapping";
import DataImport from "@/components/admin/data-import";
import { CSVImport } from "@/components/admin/csv-import";
import PartCategorySettings from "@/components/admin/part-category-settings";
import { PartsInventory } from "@/components/admin/parts-inventory";
import { TopSearchesAnalytics } from "@/components/admin/top-searches-analytics";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Motorcycle } from "@shared/schema";
import { BIKE_CATEGORIES, BIKE_SUBCATEGORIES, CATEGORY_SUBCATEGORIES } from "@shared/schema";

type AdminPanel = "dashboard" | "motorcycles" | "products" | "parts" | "inventory" | "import" | "settings";

export default function AdminDashboard() {
  const [activePanel, setActivePanel] = useState<AdminPanel>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ bikemake: "", biketype: "", bikeCategory: "", bikeSubcategory: "", firstyear: "" });
  const [showMotorcycleForm, setShowMotorcycleForm] = useState(false);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const { toast } = useToast();

  // Delete motorcycle mutation
  const deleteMutation = useMutation({
    mutationFn: async (recid: number) => {
      await apiRequest("DELETE", `/api/motorcycles/${recid}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Motorcycle deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/motorcycles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Action handlers
  const handleEditMotorcycle = (motorcycle: Motorcycle) => {
    setSelectedMotorcycle(motorcycle);
    setShowMotorcycleForm(true);
  };

  const handleMapParts = (motorcycle: Motorcycle) => {
    setSelectedMotorcycle(motorcycle);
    setActivePanel("parts");
  };

  const handleDeleteMotorcycle = (motorcycle: Motorcycle) => {
    if (window.confirm(`Are you sure you want to delete ${motorcycle.bikemake} ${motorcycle.bikemodel}?`)) {
      deleteMutation.mutate(motorcycle.recid);
    }
  };

  const handleDownloadCombinedData = () => {
    const link = document.createElement('a');
    link.href = '/api/export/combined-data';
    link.download = 'motorcycles-and-parts-export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { data: stats } = useQuery<{
    totalMotorcycles: number;
    mappedParts: number;
    shopifyProducts: number;
    lastSync: string | null;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: motorcycles, isLoading } = useQuery<Motorcycle[]>({
    queryKey: ["/api/motorcycles", searchTerm, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add search parameter if exists
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      
      // Add filter parameters if exists
      if (filters.bikemake && filters.bikemake !== "all-makes") {
        params.append("bikemake", filters.bikemake);
      }
      if (filters.firstyear && filters.firstyear !== "all-years") {
        params.append("firstyear", filters.firstyear);
      }
      if (filters.biketype && filters.biketype !== "all-types") {
        params.append("biketype", filters.biketype);
      }
      if (filters.bikeCategory && filters.bikeCategory !== "all-categories") {
        params.append("bikeCategory", filters.bikeCategory);
      }
      if (filters.bikeSubcategory && filters.bikeSubcategory !== "all-subcategories") {
        params.append("bikeSubcategory", filters.bikeSubcategory);
      }
      
      const url = `/api/motorcycles${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch motorcycles');
      }
      
      return response.json();
    },
  });

  const { data: importHistory } = useQuery<any[]>({
    queryKey: ["/api/import-history"],
  });

  const { data: motorcycleMakes } = useQuery<string[]>({
    queryKey: ["/api/motorcycles/makes"],
  });

  const { data: motorcycleYears } = useQuery<number[]>({
    queryKey: ["/api/motorcycles/years"],
  });

  // Helper function to get bike category display text (supports both old and new format)
  const getBikeCategoryDisplay = (motorcycle: any): string => {
    // New format: use bikeCategory and bikeSubcategory if available
    if (motorcycle.bikeCategory) {
      if (motorcycle.bikeSubcategory) {
        return `${motorcycle.bikeCategory} - ${motorcycle.bikeSubcategory}`;
      }
      return motorcycle.bikeCategory;
    }
    
    // Legacy format: convert biketype number to text
    switch (motorcycle.biketype) {
      case 1: return "Street/Road";
      case 2: return "Dirt/Off-road";
      case 5: return "Dual Sport";
      case 6: return "ATV/Quad";
      default: return "Unknown";
    }
  };

  // No need for client-side filtering anymore - backend handles it all
  const filteredMotorcycles = motorcycles || [];

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "motorcycles", label: "Motorcycles", icon: "two_wheeler" },
    { id: "parts", label: "Parts Mapping", icon: "build" },
    { id: "inventory", label: "Parts Inventory", icon: "inventory" },
    { id: "import", label: "Data Import", icon: "cloud_upload" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  const renderDashboard = () => (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">Monitor your motorcycle catalog and parts compatibility system</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="material-icons text-primary">two_wheeler</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Motorcycles</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid="text-total-motorcycles">
                  {stats?.totalMotorcycles || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="material-icons text-success">analytics</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Coverage</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid="text-coverage-percentage">
                  {(stats as any)?.coveragePercentage || 0}%
                </p>
                <p className="text-xs text-gray-500">
                  {(stats as any)?.motorcyclesWithParts || 0} of {stats?.totalMotorcycles || 0} mapped
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="material-icons text-warning">warning</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Need Attention</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid="text-unmapped-motorcycles">
                  {(stats as any)?.unmappedMotorcycles || 0}
                </p>
                <p className="text-xs text-gray-500">Motorcycles without parts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="material-icons text-purple-600">category</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid="text-total-categories">
                  {(stats as any)?.totalCategories || 0}
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.shopifyProducts || 0} products available
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Parts Coverage by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats as any)?.categoryBreakdown && Object.keys((stats as any).categoryBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries((stats as any).categoryBreakdown).map(([category, count]: [string, any]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{category}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((Number(count) / (stats?.totalMotorcycles || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{Number(count)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No category data available</p>
            )}
          </CardContent>
        </Card>

        {/* Popular Makes */}
        <Card>
          <CardHeader>
            <CardTitle>Top Motorcycle Brands</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats as any)?.popularMakes && (stats as any).popularMakes.length > 0 ? (
              <div className="space-y-3">
                {(stats as any).popularMakes.map((item: any, index: number) => (
                  <div key={item.make} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{item.make}</span>
                    </div>
                    <span className="text-sm text-gray-600">{item.count} models</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No brand data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Year Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto"
                onClick={() => setActivePanel("import")}
              >
                <span className="material-icons mb-2 text-blue-600">upload</span>
                <span className="text-sm">Import Data</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto"
                onClick={() => setActivePanel("parts")}
              >
                <span className="material-icons mb-2 text-green-600">link</span>
                <span className="text-sm">Map Parts</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto"
                onClick={() => setActivePanel("settings")}
              >
                <span className="material-icons mb-2 text-purple-600">category</span>
                <span className="text-sm">Categories</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto"
                onClick={() => setActivePanel("motorcycles")}
              >
                <span className="material-icons mb-2 text-orange-600">two_wheeler</span>
                <span className="text-sm">View All</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Years Coverage */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Years Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats as any)?.recentYears && (stats as any).recentYears.length > 0 ? (
              <div className="space-y-3">
                {(stats as any).recentYears.map((item: any) => (
                  <div key={item.year} className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{item.year}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((item.count / Math.max(...((stats as any).recentYears?.map((r: any) => r.count) || [1]))) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No year data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Searches Analytics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top 25 Motorcycle Searches</CardTitle>
        </CardHeader>
        <CardContent>
          <TopSearchesAnalytics />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {importHistory && importHistory.length > 0 ? (
            <div className="space-y-4">
              {importHistory.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center space-x-4" data-testid={`activity-${item.id}`}>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="material-icons text-sm text-primary">
                        {item.type === "motorcycles" ? "two_wheeler" : "link"}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {item.type === "motorcycles" ? "Motorcycles imported" : "Parts mapping imported"}: {item.filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={item.status === "success" ? "default" : "destructive"}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderMotorcycles = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Motorcycles Database</h2>
          <p className="text-gray-600">Manage your motorcycle inventory and specifications</p>
        </div>
        <Button 
          onClick={() => setShowMotorcycleForm(true)}
          className="flex items-center gap-2"
          data-testid="button-add-motorcycle"
        >
          <span className="material-icons">add</span>
          Add Motorcycle
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <Input
                placeholder="Search motorcycles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-motorcycles"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
              <Select value={filters.bikemake} onValueChange={(value) => setFilters({...filters, bikemake: value})}>
                <SelectTrigger data-testid="select-filter-make">
                  <SelectValue placeholder="All Makes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-makes">All Makes</SelectItem>
                  {motorcycleMakes?.map((make) => (
                    <SelectItem key={make} value={make}>
                      {make}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <Select value={filters.firstyear} onValueChange={(value) => setFilters({...filters, firstyear: value})}>
                <SelectTrigger data-testid="select-filter-year">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-years">All Years</SelectItem>
                  {motorcycleYears?.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <Select 
                value={filters.bikeCategory} 
                onValueChange={(value) => setFilters({...filters, bikeCategory: value, bikeSubcategory: ""})}
                data-testid="select-filter-category"
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  <SelectItem value={BIKE_CATEGORIES.OFF_ROAD}>{BIKE_CATEGORIES.OFF_ROAD}</SelectItem>
                  <SelectItem value={BIKE_CATEGORIES.STREET}>{BIKE_CATEGORIES.STREET}</SelectItem>
                  <SelectItem value={BIKE_CATEGORIES.ATV}>{BIKE_CATEGORIES.ATV}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
              <Select 
                value={filters.bikeSubcategory} 
                onValueChange={(value) => setFilters({...filters, bikeSubcategory: value})}
                disabled={!filters.bikeCategory || filters.bikeCategory === "all-categories"}
                data-testid="select-filter-subcategory"
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-subcategories">All Subcategories</SelectItem>
                  {filters.bikeCategory && filters.bikeCategory !== "all-categories" && 
                    CATEGORY_SUBCATEGORIES[filters.bikeCategory]?.map((subcat) => (
                      <SelectItem key={subcat} value={subcat}>
                        {subcat}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motorcycles Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RECID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motorcycle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parts Mapped
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredMotorcycles && filteredMotorcycles.length > 0 ? (
                  filteredMotorcycles.map((motorcycle: any) => (
                    <tr key={motorcycle.recid} data-testid={`row-motorcycle-${motorcycle.recid}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {motorcycle.recid}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {motorcycle.bikemake} {motorcycle.bikemodel}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {motorcycle.firstyear === motorcycle.lastyear ? motorcycle.firstyear : `${motorcycle.firstyear}-${motorcycle.lastyear}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {motorcycle.capacity ? `${motorcycle.capacity}cc` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">{getBikeCategoryDisplay(motorcycle)}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Badge variant={motorcycle.partsCount > 0 ? "default" : "outline"} data-testid={`badge-parts-count-${motorcycle.recid}`}>
                          {motorcycle.partsCount || 0}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditMotorcycle(motorcycle)}
                          data-testid={`button-edit-motorcycle-${motorcycle.recid}`}
                        >
                          <span className="material-icons text-base">edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleMapParts(motorcycle)}
                          data-testid={`button-map-parts-${motorcycle.recid}`}
                        >
                          <span className="material-icons text-base">link</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteMotorcycle(motorcycle)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-motorcycle-${motorcycle.recid}`}
                        >
                          <span className="material-icons text-base">delete</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleDownloadCombinedData}
                          data-testid={`button-download-combined-${motorcycle.recid}`}
                          title="Download all motorcycles and parts data as CSV"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No motorcycles found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showMotorcycleForm && (
        <MotorcycleForm 
          motorcycle={selectedMotorcycle}
          onClose={() => {
            setShowMotorcycleForm(false);
            setSelectedMotorcycle(null);
          }}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <span className="material-icons text-primary text-2xl mr-3">two_wheeler</span>
            <h1 className="text-xl font-semibold text-gray-900">MotoCatalog Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" className="flex items-center gap-2" data-testid="button-import-data">
              <span className="material-icons">upload</span>
              Import Data
            </Button>
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
          <nav className="p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.id}>
                  <Button
                    variant={activePanel === item.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActivePanel(item.id as AdminPanel)}
                    data-testid={`button-nav-${item.id}`}
                  >
                    <span className="material-icons mr-3">{item.icon}</span>
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {activePanel === "dashboard" && renderDashboard()}
          {activePanel === "motorcycles" && renderMotorcycles()}
          {activePanel === "parts" && <PartsMapping selectedMotorcycle={selectedMotorcycle} />}
          {activePanel === "inventory" && (
            <div className="p-6">
              <PartsInventory />
            </div>
          )}
          {activePanel === "import" && (
            <div className="p-6">
              <CSVImport />
            </div>
          )}
          {activePanel === "settings" && (
            <div className="p-6">
              <PartCategorySettings />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
