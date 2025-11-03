import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Database, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SystemModeToggle() {
  const { toast } = useToast();
  
  const { data: modeData, isLoading } = useQuery<{ mode: string }>({
    queryKey: ["/api/system/mode"],
  });

  const currentMode = modeData?.mode || "legacy";
  const isExtendedMode = currentMode === "extended";

  const switchModeMutation = useMutation({
    mutationFn: async (newMode: string) => {
      return await apiRequest("POST", "/api/system/mode", { mode: newMode });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/mode"] });
      queryClient.invalidateQueries({ queryKey: ["/api/motorcycles"] });
      toast({
        title: "Success",
        description: `Switched to ${data.mode === "legacy" ? "Legacy" : "Extended"} mode`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to switch mode",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/system/sync-to-extended", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Synced ${data.syncedCount} motorcycles to Extended table`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync motorcycles",
        variant: "destructive",
      });
    },
  });

  const handleModeToggle = (checked: boolean) => {
    const newMode = checked ? "extended" : "legacy";
    switchModeMutation.mutate(newMode);
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-system-mode">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          System Mode
        </CardTitle>
        <CardDescription>
          Switch between Legacy and Extended data modes for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Testing Mode</AlertTitle>
          <AlertDescription>
            This allows you to test the new JSONB-based dynamic category system without affecting your current setup.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="mode-switch" className="text-base font-semibold">
              {isExtendedMode ? "Extended Mode" : "Legacy Mode"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isExtendedMode 
                ? "Using motorcycles_extended table with JSONB dynamic categories"
                : "Using motorcycles table with fixed columns"}
            </p>
          </div>
          <Switch
            id="mode-switch"
            checked={isExtendedMode}
            onCheckedChange={handleModeToggle}
            disabled={switchModeMutation.isPending}
            data-testid="switch-mode"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Sync Data to Extended Table</h4>
              <p className="text-sm text-muted-foreground">
                Copy all motorcycles from the legacy table to extended table for testing
              </p>
            </div>
            <Button
              onClick={handleSync}
              disabled={syncMutation.isPending}
              variant="outline"
              size="sm"
              data-testid="button-sync"
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="text-sm font-semibold">Current Status:</h4>
          <div className="text-sm space-y-1">
            <p><strong>Active Mode:</strong> {currentMode === "legacy" ? "Legacy (motorcycles)" : "Extended (motorcycles_extended)"}</p>
            <p><strong>Data Table:</strong> {currentMode === "legacy" ? "motorcycles" : "motorcycles_extended"}</p>
            <p><strong>Category System:</strong> {currentMode === "legacy" ? "Fixed Columns" : "JSONB Dynamic"}</p>
          </div>
        </div>

        <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">How to Test</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <ol className="list-decimal ml-4 mt-2 space-y-1">
              <li>Click "Sync Now" to copy all motorcycles to the extended table</li>
              <li>Toggle the switch to "Extended Mode"</li>
              <li>Test the new dynamic category system</li>
              <li>Switch back to "Legacy Mode" if needed - your original data is safe</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
