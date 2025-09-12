import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import AdminDashboard from "@/pages/admin-dashboard";
import CustomerCatalog from "@/pages/customer-catalog";
import ShopifyWidget from "@/pages/shopify-widget";
import ViewToggle from "@/components/ui/view-toggle";
import NotFound from "@/pages/not-found";

function Router() {
  const [currentView, setCurrentView] = useState<"admin" | "customer">("admin");

  return (
    <div className="min-h-screen bg-background">
      <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
      
      <Switch>
        <Route path="/shopify-widget" component={ShopifyWidget} />
        <Route path="/">
          {currentView === "admin" ? <AdminDashboard /> : <CustomerCatalog />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
