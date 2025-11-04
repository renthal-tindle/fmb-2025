import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Code, Database, CheckCircle, AlertTriangle, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function CategoryPromotionGuide() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  return (
    <div className="space-y-6" data-testid="card-category-promotion-guide">
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
