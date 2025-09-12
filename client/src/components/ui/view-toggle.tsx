import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  currentView: "admin" | "customer";
  onViewChange: (view: "admin" | "customer") => void;
}

export default function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-white shadow-material rounded-lg p-2">
      <div className="flex bg-gray-100 rounded-md p-1">
        <Button
          variant={currentView === "admin" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange("admin")}
          className="flex items-center gap-2"
          data-testid="button-admin-toggle"
        >
          <span className="material-icons text-base">dashboard</span>
          Admin
        </Button>
        <Button
          variant={currentView === "customer" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange("customer")}
          className="flex items-center gap-2"
          data-testid="button-customer-toggle"
        >
          <span className="material-icons text-base">storefront</span>
          Catalog
        </Button>
      </div>
    </div>
  );
}
