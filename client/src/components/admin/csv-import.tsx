import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Download, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export function CSVImport() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importType, setImportType] = useState<'motorcycles' | 'parts' | 'combined'>('combined');
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.endsWith('.csv'));
    
    if (csvFile) {
      handleFileUpload(csvFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('type', importType);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setImportResult(result);

      if (result.success) {
        toast({
          title: "Import successful!",
          description: `Imported ${result.successCount} rows successfully`,
        });
      } else {
        toast({
          title: "Import completed with errors",
          description: `${result.successCount} successful, ${result.errorCount} failed`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again or check your file format",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    }
  };

  const downloadTemplate = () => {
    console.log('Downloading template for type:', importType);
    const templateUrl = `/api/import/template?type=${importType}`;
    console.log('Template URL:', templateUrl);
    
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = `${importType}-import-template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template downloaded",
      description: `Fill out the ${importType} template and upload it back`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV Data Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Import Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Import Type</label>
            <Select 
              value={importType} 
              onValueChange={(value) => {
                console.log('Import type changed to:', value);
                setImportType(value as 'motorcycles' | 'parts' | 'combined');
                setImportResult(null); // Clear previous results when switching types
              }}
            >
              <SelectTrigger className="w-full" data-testid="select-import-type">
                <SelectValue placeholder="Select import type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="combined">Motorcycles + Parts (Combined)</SelectItem>
                <SelectItem value="motorcycles">Motorcycles Data</SelectItem>
                <SelectItem value="parts">Parts Mapping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">Download Template</h3>
                <p className="text-sm text-blue-700">
                  Get the {
                    importType === 'motorcycles' ? 'motorcycle' : 
                    importType === 'parts' ? 'parts mapping' : 
                    'combined motorcycle and parts'
                  } CSV template with proper column headers
                </p>
              </div>
            </div>
            <Button onClick={downloadTemplate} variant="outline" className="border-blue-300">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragging 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="csv-upload-area"
          >
            {isUploading ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                <div>
                  <p className="font-medium">Uploading and processing...</p>
                  <Progress value={uploadProgress} className="w-full mt-2" />
                  <p className="text-sm text-gray-500 mt-1">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Drop your CSV file here</h3>
                <p className="text-gray-500 mb-4">or click to browse and select</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-file-input"
                  data-testid="csv-file-input"
                />
                <Button asChild variant="outline">
                  <label htmlFor="csv-file-input" className="cursor-pointer">
                    Choose File
                  </label>
                </Button>
              </div>
            )}
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                {importResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">
                      Import Summary: {importResult.successCount}/{importResult.totalRows} rows imported successfully
                    </p>
                    {importResult.errorCount > 0 && (
                      <p className="text-sm">
                        {importResult.errorCount} rows had errors and were skipped
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-red-600">Import Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                          <strong>Row {error.row}:</strong> {error.field} - {error.message}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}