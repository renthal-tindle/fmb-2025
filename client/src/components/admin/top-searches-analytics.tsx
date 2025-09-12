import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, SearchIcon, TrendingUpIcon } from "lucide-react";

interface TopSearchResult {
  searchQuery: string;
  searchCount: number;
}

export function TopSearchesAnalytics() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");

  // Query for top searches
  const { data: topSearches, isLoading, refetch } = useQuery<TopSearchResult[]>({
    queryKey: ["/api/analytics/top-searches", appliedDateFrom, appliedDateTo],
    queryFn: async () => {
      let url = "/api/analytics/top-searches?limit=25";
      if (appliedDateFrom) {
        url += `&dateFrom=${appliedDateFrom}`;
      }
      if (appliedDateTo) {
        url += `&dateTo=${appliedDateTo}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch top searches');
      }
      return response.json();
    },
  });

  const handleDateFilter = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleClearFilter = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
  };

  // Set default date range to last 30 days
  const setLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    setDateFrom(thirtyDaysAgoStr);
    setDateTo(todayStr);
  };

  const setLast7Days = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    setDateFrom(sevenDaysAgoStr);
    setDateTo(todayStr);
  };

  const getMaxCount = () => {
    if (!topSearches || topSearches.length === 0) return 1;
    return Math.max(...topSearches.map(search => search.searchCount));
  };

  return (
    <div className="space-y-6">
      {/* Date Range Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleDateFilter} size="sm" variant="default">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Apply Filter
          </Button>
          <Button onClick={handleClearFilter} size="sm" variant="outline">
            Clear
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={setLast7Days} size="sm" variant="ghost">
            Last 7 days
          </Button>
          <Button onClick={setLast30Days} size="sm" variant="ghost">
            Last 30 days
          </Button>
        </div>
      </div>

      {/* Active Filter Display */}
      {(appliedDateFrom || appliedDateTo) && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Active filter:</span>
          <Badge variant="secondary">
            {appliedDateFrom || 'All time'} → {appliedDateTo || 'Now'}
          </Badge>
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : topSearches && topSearches.length > 0 ? (
          <div className="space-y-3">
            {topSearches.map((search, index) => (
              <div 
                key={`${search.searchQuery}-${index}`} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                data-testid={`search-result-${index}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full">
                    {index + 1}
                  </div>
                  <div className="flex items-center space-x-2">
                    <SearchIcon className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{search.searchQuery}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(search.searchCount / getMaxCount()) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUpIcon className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-900">{search.searchCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No search data available for the selected date range</p>
            <p className="text-sm text-gray-400">Try searching for some motorcycles first or adjust the date range</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TopSearchesAnalytics;