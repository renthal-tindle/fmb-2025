import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DataImport() {
  const [motorcycleFile, setMotorcycleFile] = useState<File | null>(null);
  const [mappingFile, setMappingFile] = useState<File | null>(null);
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const motorcycleFileRef = useRef<HTMLInputElement>(null);
  const mappingFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: importHistory } = useQuery<any[]>({
    queryKey: ["/api/import-history"],
  });

  const importMotorcyclesMutation = useMutation({
    mutationFn: (data: { data: any[], filename: string }) => 
      apiRequest("POST", "/api/import/motorcycles", data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/motorcycles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import-history"] });
      toast({
        title: "Success",
        description: response.message || "Motorcycles imported successfully",
      });
      setMotorcycleFile(null);
      if (motorcycleFileRef.current) motorcycleFileRef.current.value = "";
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-history"] });
      toast({
        title: "Error",
        description: error.message || "Failed to import motorcycles",
        variant: "destructive",
      });
    },
  });

  const importMappingsMutation = useMutation({
    mutationFn: (data: { data: any[], filename: string }) => 
      apiRequest("POST", "/api/import/mappings", data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import-history"] });
      toast({
        title: "Success",
        description: response.message || "Mappings imported successfully",
      });
      setMappingFile(null);
      if (mappingFileRef.current) mappingFileRef.current.value = "";
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-history"] });
      toast({
        title: "Error",
        description: error.message || "Failed to import mappings",
        variant: "destructive",
      });
    },
  });

  const shopifySyncMutation = useMutation({
    mutationFn: (data: { shop: string; accessToken: string }) => 
      apiRequest("POST", "/api/shopify/sync-products", data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: response.note || `Verified ${response.checkedProducts || 0} products`,
      });
      setShopDomain("");
      setAccessToken("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync products from Shopify",
        variant: "destructive",
      });
    },
  });

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          const data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim());
              const row: any = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              return row;
            });
          
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleMotorcycleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setMotorcycleFile(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
    }
  };

  const handleMappingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setMappingFile(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
    }
  };

  const handleMotorcycleImport = async () => {
    if (!motorcycleFile) return;

    try {
      const data = await parseCSV(motorcycleFile);
      importMotorcyclesMutation.mutate({
        data,
        filename: motorcycleFile.name,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse CSV file",
        variant: "destructive",
      });
    }
  };

  const handleMappingImport = async () => {
    if (!mappingFile) return;

    try {
      const data = await parseCSV(mappingFile);
      importMappingsMutation.mutate({
        data,
        filename: mappingFile.name,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse CSV file",
        variant: "destructive",
      });
    }
  };

  const generateMotorcycleTemplate = () => {
    const headers = ["RECID", "BIKETYPE", "BIKEMAKE", "BIKEMODEL", "FIRSTYEAR", "LASTYEAR", "CAPACITY", "OE_HANDLEBAR", "OE_FCW", "OE_RCW", "FRONT_BRAKEPADS", "REAR_BRAKEPADS"];
    const sampleData = [
      "10001,1,Honda,CBR600RR,2023,2023,599,,,,,",
      "10002,1,Yamaha,MT-09,2023,2023,889,,,,,",
      "10003,1,Kawasaki,Ninja ZX-6R,2022,2022,636,,,,,",
    ];
    
    const csv = [headers.join(","), ...sampleData].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "motorcycles_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateMappingTemplate = () => {
    const headers = ["shopifyProductId", "motorcycleRecid", "compatible"];
    const sampleData = [
      "brake-disc-001,10001,true",
      "chain-kit-002,10001,true",
      "exhaust-003,10002,true",
    ];
    
    const csv = [headers.join(","), ...sampleData].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mappings_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Data Import</h2>
        <p className="text-gray-600">Import motorcycles and parts mappings from CSV files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Motorcycle Import */}
        <Card>
          <CardHeader>
            <CardTitle>Import Motorcycles</CardTitle>
            <p className="text-sm text-gray-600">Upload CSV file with motorcycle data</p>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <span className="material-icons text-4xl text-gray-400 mb-4 block">cloud_upload</span>
              <p className="text-sm font-medium text-gray-900 mb-2">
                {motorcycleFile ? motorcycleFile.name : "Drop your CSV file here or click to browse"}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supported format: RECID, BIKETYPE, BIKEMAKE, BIKEMODEL, FIRSTYEAR, LASTYEAR, CAPACITY, etc.
              </p>
              <input
                ref={motorcycleFileRef}
                type="file"
                accept=".csv"
                onChange={handleMotorcycleFileChange}
                className="hidden"
                data-testid="input-motorcycle-csv"
              />
              <Button
                onClick={() => motorcycleFileRef.current?.click()}
                variant="outline"
                className="mb-4"
                data-testid="button-choose-motorcycle-file"
              >
                Choose File
              </Button>
              {motorcycleFile && (
                <Button
                  onClick={handleMotorcycleImport}
                  disabled={importMotorcyclesMutation.isPending}
                  className="block w-full"
                  data-testid="button-import-motorcycles"
                >
                  {importMotorcyclesMutation.isPending ? "Importing..." : "Import Motorcycles"}
                </Button>
              )}
            </div>
            <div className="mt-4">
              <Button
                variant="link"
                onClick={generateMotorcycleTemplate}
                className="text-sm p-0"
                data-testid="button-download-motorcycle-template"
              >
                <span className="material-icons text-base mr-1">download</span>
                Download CSV Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Parts Mapping Import */}
        <Card>
          <CardHeader>
            <CardTitle>Import Parts Mappings</CardTitle>
            <p className="text-sm text-gray-600">Upload CSV file with parts compatibility data</p>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <span className="material-icons text-4xl text-gray-400 mb-4 block">cloud_upload</span>
              <p className="text-sm font-medium text-gray-900 mb-2">
                {mappingFile ? mappingFile.name : "Drop your CSV file here or click to browse"}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supported format: shopifyProductId, motorcycleId, compatible
              </p>
              <input
                ref={mappingFileRef}
                type="file"
                accept=".csv"
                onChange={handleMappingFileChange}
                className="hidden"
                data-testid="input-mapping-csv"
              />
              <Button
                onClick={() => mappingFileRef.current?.click()}
                variant="outline"
                className="mb-4"
                data-testid="button-choose-mapping-file"
              >
                Choose File
              </Button>
              {mappingFile && (
                <Button
                  onClick={handleMappingImport}
                  disabled={importMappingsMutation.isPending}
                  className="block w-full"
                  data-testid="button-import-mappings"
                >
                  {importMappingsMutation.isPending ? "Importing..." : "Import Mappings"}
                </Button>
              )}
            </div>
            <div className="mt-4">
              <Button
                variant="link"
                onClick={generateMappingTemplate}
                className="text-sm p-0"
                data-testid="button-download-mapping-template"
              >
                <span className="material-icons text-base mr-1">download</span>
                Download CSV Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shopify App Installation */}
        <Card>
          <CardHeader>
            <CardTitle>Connect to Shopify Store</CardTitle>
            <p className="text-sm text-gray-600">Install the app on your Shopify store for live product data</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                To access live product data with current tags, you need to install this app on your Shopify store.
              </p>
              <Button
                onClick={() => {
                  const shopDomain = prompt("Enter your Shopify store domain (e.g., mystore.myshopify.com):");
                  if (shopDomain) {
                    window.open(`/api/auth/install?shop=${shopDomain}`, '_blank');
                  }
                }}
                className="w-full"
                data-testid="button-install-shopify"
              >
                Install Shopify App
              </Button>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  After installation, the system will automatically fetch live product data with current tags and variants from your Shopify store.
                </p>
              </div>
              
              {/* Add refresh button for live data */}
              <div className="border-t pt-4">
                <Button
                  onClick={() => {
                    // Force refresh products with variants by invalidating cache
                    window.location.reload();
                  }}
                  variant="outline"
                  className="w-full"
                  data-testid="button-refresh-products"
                >
                  🔄 Refresh Product Data with Variants
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Fetches latest products with all variants from Shopify
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importHistory && importHistory.length > 0 ? (
                  importHistory.map((record: any) => (
                    <tr key={record.id} data-testid={`row-import-${record.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {record.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.recordsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={record.status === "success" ? "default" : "destructive"}>
                          {record.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No import history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
