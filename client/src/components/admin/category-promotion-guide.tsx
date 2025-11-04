import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Code, Database, CheckCircle, AlertTriangle, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface CategoryUsage {
  fixedColumns: string[];
  jsonbCategories: { category: string; count: number }[];
}

export default function CategoryPromotionGuide() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch category usage data
  const { data: categoryUsage, isLoading: isLoadingCategories, error: categoryError } = useQuery<CategoryUsage>({
    queryKey: ['/api/motorcycles/category-usage'],
    queryFn: async () => {
      const response = await fetch('/api/motorcycles/category-usage');
      if (!response.ok) {
        throw new Error('Failed to fetch category usage');
      }
      return response.json();
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTestId = (label: string) => {
    return `button-copy-${label.toLowerCase().replace(/\s+/g, '-')}`;
  };

  const codeBlocks = {
    schema: `// shared/schema.ts
export const motorcycles = pgTable("motorcycles", {
  // ... existing columns ...
  oe_chain: text("oe_chain"),
  
  // NEW: Your promoted category
  footpegs: text("footpegs"),
  
  customParts: jsonb("custom_parts"),
});`,
    
    migrateData: `-- Copy data from customParts to new column
UPDATE motorcycles 
SET footpegs = customParts->>'footpegs' 
WHERE customParts->>'footpegs' IS NOT NULL;`,
    
    cleanup: `-- Remove from customParts after promotion
UPDATE motorcycles 
SET customParts = customParts - 'footpegs'
WHERE customParts ? 'footpegs';`,
    
    verify: `-- Verify the migration
SELECT 
  recid,
  bikemake,
  bikemodel,
  footpegs,
  customParts->>'footpegs' as old_footpegs
FROM motorcycles
WHERE footpegs IS NOT NULL OR customParts ? 'footpegs'
LIMIT 10;`
  };

  const getCategoryBadgeColor = (count: number) => {
    if (count >= 100) return "bg-green-100 text-green-800 border-green-300";
    if (count >= 10) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-gray-100 text-gray-600 border-gray-300";
  };

  return (
    <div className="space-y-6" data-testid="card-category-promotion-guide">
      {/* Category Usage Overview */}
      <Card data-testid="card-category-usage-overview">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            <CardTitle>Category Usage Overview</CardTitle>
          </div>
          <CardDescription>
            Live view of fixed database columns vs flexible JSONB categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingCategories ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading category data...</span>
            </div>
          ) : categoryError ? (
            <Alert variant="destructive" data-testid="alert-category-error">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to Load Categories</AlertTitle>
              <AlertDescription>
                Unable to fetch category usage data. Please try refreshing the page or contact support if the problem persists.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Fixed Columns */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Fixed Database Columns ({categoryUsage?.fixedColumns.length || 0})
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Permanent part categories with fast queries and easy CSV import
                </p>
                <div className="flex flex-wrap gap-2" data-testid="list-fixed-columns">
                  {categoryUsage?.fixedColumns.map((column) => (
                    <Badge 
                      key={column} 
                      variant="outline" 
                      className="bg-green-50 text-green-700 border-green-200"
                      data-testid={`badge-fixed-${column}`}
                    >
                      {column}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* JSONB Categories */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  JSONB Categories ({categoryUsage?.jsonbCategories.length || 0})
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Flexible categories stored in customParts field. Ready to promote when usage is high.
                </p>
                
                {categoryUsage && categoryUsage.jsonbCategories.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden" data-testid="table-jsonb-categories">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Motorcycles Using</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {categoryUsage.jsonbCategories.map(({ category, count }) => (
                          <tr key={category} className="hover:bg-gray-50" data-testid={`row-jsonb-${category}`}>
                            <td className="px-4 py-3 font-mono text-xs">{category}</td>
                            <td className="px-4 py-3 text-right font-semibold">{count}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge 
                                variant="outline" 
                                className={getCategoryBadgeColor(count)}
                                data-testid={`badge-status-${category}`}
                              >
                                {count >= 100 ? '✓ Ready to promote' : count >= 10 ? 'Growing' : 'Experimental'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No JSONB categories found. All categories are currently using fixed columns.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Legend */}
                {categoryUsage && categoryUsage.jsonbCategories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">✓ Ready</Badge>
                      <span>100+ motorcycles</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Growing</Badge>
                      <span>10-99 motorcycles</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">Experimental</Badge>
                      <span>1-9 motorcycles</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Category Promotion Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <CardTitle>Category Promotion Guide</CardTitle>
          </div>
          <CardDescription>
            Learn how to promote a part category from the flexible customParts field to a permanent fixed column
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview */}
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>When to Promote a Category</AlertTitle>
            <AlertDescription>
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li><strong>Heavy usage:</strong> 100+ motorcycles using this category</li>
                <li><strong>Performance needs:</strong> Frequent filtering or searching by this category</li>
                <li><strong>Core business:</strong> Standard part category that's here to stay</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Benefits Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Fixed Column Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Faster queries and filtering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Easier CSV import/export</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Type checking and validation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Shows in admin forms automatically</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  customParts Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>No migration needed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Add categories instantly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Perfect for testing new ideas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Unlimited flexibility</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Step-by-Step Process */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Code className="h-5 w-5" />
              Promotion Process
            </h3>

            {/* Step 1 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-900">Step 1</Badge>
                  <CardTitle className="text-base">Update the Schema</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Add a new column to <code className="bg-gray-100 px-1 rounded">shared/schema.ts</code>
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{codeBlocks.schema}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 px-2"
                    onClick={() => copyToClipboard(codeBlocks.schema, "Schema code")}
                    data-testid={getTestId("Schema code")}
                  >
                    <Copy className="h-4 w-4" />
                    {copiedCode === "Schema code" && <span className="ml-1 text-xs">Copied!</span>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-900">Step 2</Badge>
                  <CardTitle className="text-base">Push to Database</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Run the migration command to create the new column
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm">
                    <code>npm run db:push</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 px-2"
                    onClick={() => copyToClipboard("npm run db:push", "Push command")}
                    data-testid={getTestId("Push command")}
                  >
                    <Copy className="h-4 w-4" />
                    {copiedCode === "Push command" && <span className="ml-1 text-xs">Copied!</span>}
                  </Button>
                </div>
                <Alert className="mt-3" data-testid="alert-data-loss-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">⚠️ Data Loss Warning</AlertTitle>
                  <AlertDescription className="text-xs">
                    <p className="mb-2">
                      If you see a data-loss warning from Drizzle, <strong>STOP and review it carefully</strong>. The warning tells you what will be deleted or changed.
                    </p>
                    <p>
                      Only use <code className="bg-gray-100 px-1 rounded">npm run db:push --force</code> if:
                    </p>
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>You've backed up your data</li>
                      <li>You understand what will be lost</li>
                      <li>You're okay with that data loss</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-900">Step 3</Badge>
                  <CardTitle className="text-base">Migrate Existing Data</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Copy all existing data from customParts into the new column
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{codeBlocks.migrateData}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 px-2"
                    onClick={() => copyToClipboard(codeBlocks.migrateData, "Migrate SQL")}
                    data-testid={getTestId("Migrate SQL")}
                  >
                    <Copy className="h-4 w-4" />
                    {copiedCode === "Migrate SQL" && <span className="ml-1 text-xs">Copied!</span>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-900">Step 4</Badge>
                  <CardTitle className="text-base">Verify Migration</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Check that data was copied correctly
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{codeBlocks.verify}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 px-2"
                    onClick={() => copyToClipboard(codeBlocks.verify, "Verify SQL")}
                    data-testid={getTestId("Verify SQL")}
                  >
                    <Copy className="h-4 w-4" />
                    {copiedCode === "Verify SQL" && <span className="ml-1 text-xs">Copied!</span>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step 5 (Optional) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-gray-100 text-gray-600">Step 5 (Optional)</Badge>
                  <CardTitle className="text-base">Clean Up customParts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Remove the promoted category from customParts field to avoid duplication
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{codeBlocks.cleanup}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 px-2"
                    onClick={() => copyToClipboard(codeBlocks.cleanup, "Cleanup SQL")}
                    data-testid={getTestId("Cleanup SQL")}
                  >
                    <Copy className="h-4 w-4" />
                    {copiedCode === "Cleanup SQL" && <span className="ml-1 text-xs">Copied!</span>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Important Notes */}
          <Alert variant="default" className="bg-yellow-50 border-yellow-200" data-testid="alert-important-notes">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900">Important Notes</AlertTitle>
            <AlertDescription className="text-yellow-800">
              <ul className="list-disc ml-4 mt-2 space-y-1 text-sm">
                <li>Always backup your data before running migrations</li>
                <li>Test the SQL queries on a single motorcycle first</li>
                <li>The workflow will automatically restart after schema changes</li>
                <li>Updates to motorcycles always target the Legacy table (motorcycles)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Best Practices */}
          <Card className="border-purple-200 bg-purple-50" data-testid="card-recommended-strategy">
            <CardHeader>
              <CardTitle className="text-base text-purple-900">Recommended Strategy</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-purple-800">
              <p className="mb-3">
                <strong>Start flexible, promote when proven:</strong>
              </p>
              <ol className="list-decimal ml-4 space-y-2">
                <li>Add new categories to <code className="bg-purple-100 px-1 rounded">customParts</code> JSONB field</li>
                <li>Test and validate the category with real data</li>
                <li>Monitor usage over time</li>
                <li>Promote to fixed column when it becomes essential (100+ motorcycles)</li>
              </ol>
              <p className="mt-3 text-xs">
                Most businesses maintain 10-15 fixed columns for core categories, with customParts handling experimental or niche parts.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
