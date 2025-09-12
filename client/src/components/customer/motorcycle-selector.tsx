import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Motorcycle } from "@shared/schema";

interface MotorcycleSelectorProps {
  selectedMotorcycle: Motorcycle | null;
  onMotorcycleSelect: (motorcycle: Motorcycle | null) => void;
}

export default function MotorcycleSelector({ 
  selectedMotorcycle, 
  onMotorcycleSelect 
}: MotorcycleSelectorProps) {
  const [filters, setFilters] = useState({
    make: "",
    model: "",
    year: "",
  });

  const { data: motorcycles } = useQuery<Motorcycle[]>({
    queryKey: ["/api/motorcycles"],
  });

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
    if (!filters.make || !filters.model || !filters.year) {
      return;
    }

    const selectedYear = parseInt(filters.year);
    const motorcycle = motorcycles?.find((m: Motorcycle) => 
      m.bikemake === filters.make && 
      m.bikemodel === filters.model && 
      selectedYear >= m.firstyear && 
      selectedYear <= m.lastyear
    );

    if (motorcycle) {
      onMotorcycleSelect(motorcycle);
    }
  };

  const handleClearSelection = () => {
    onMotorcycleSelect(null);
    setFilters({ make: "", model: "", year: "" });
  };

  return (
    <div>
      {/* Search and Filter Form */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
              <Select 
                value={filters.make} 
                onValueChange={(value) => setFilters({...filters, make: value, model: "", year: ""})}
              >
                <SelectTrigger data-testid="select-make">
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
                <SelectTrigger data-testid="select-model">
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
                <SelectTrigger data-testid="select-year">
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
                data-testid="button-find-parts"
              >
                Find Parts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Motorcycle Display */}
      {selectedMotorcycle && (
        <Card className="bg-blue-50 border-blue-200 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center">
              {selectedMotorcycle.imageUrl && (
                <div className="w-20 h-15 bg-gray-200 rounded flex items-center justify-center mr-4">
                  <span className="material-icons text-gray-500 text-2xl">two_wheeler</span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900" data-testid="text-selected-motorcycle">
                  {filters.year} {selectedMotorcycle.bikemake} {selectedMotorcycle.bikemodel}
                </h3>
                <p className="text-gray-600">
                  {selectedMotorcycle.capacity}cc • Type: {selectedMotorcycle.biketype}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleClearSelection}
                data-testid="button-clear-selection"
              >
                <span className="material-icons">close</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
