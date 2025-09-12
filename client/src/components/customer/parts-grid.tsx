import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShopifyProduct } from "@shared/schema";

interface PartsGridProps {
  parts: ShopifyProduct[];
  isLoading: boolean;
  viewMode: "grid" | "list";
  onAddToCart: (productId: string) => void;
}

export default function PartsGrid({ parts, isLoading, viewMode, onAddToCart }: PartsGridProps) {
  if (isLoading) {
    return (
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              <Skeleton className="w-full h-48" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!parts || parts.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="material-icons text-2xl text-gray-400">search_off</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Compatible Parts Found</h3>
          <p className="text-gray-500 mb-4">
            We couldn't find any parts compatible with your selected motorcycle.
          </p>
          <p className="text-sm text-gray-400">
            Try selecting a different motorcycle or check back later for new parts.
          </p>
        </div>
      </Card>
    );
  }

  const renderStars = (rating: number = 4.2) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - Math.ceil(rating);

    return (
      <div className="flex text-yellow-400">
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="material-icons text-sm">star</span>
        ))}
        {hasHalfStar && (
          <span className="material-icons text-sm">star_half</span>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="material-icons text-sm">star_border</span>
        ))}
      </div>
    );
  };

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {parts.map((part) => (
          <Card key={part.id} className="hover:shadow-material-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex" data-testid={`part-list-${part.id}`}>
                <div className="w-32 h-32 flex-shrink-0">
                  {part.imageUrl ? (
                    <img
                      src={part.imageUrl}
                      alt={part.title}
                      className="w-full h-full object-cover rounded-l-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-l-lg flex items-center justify-center">
                      <span className="material-icons text-gray-400">image</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Compatible
                        </Badge>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid={`text-part-title-${part.id}`}>
                        {part.title}
                      </h3>
                      {part.description && (
                        <p className="text-gray-600 mb-3" data-testid={`text-part-description-${part.id}`}>
                          {part.description}
                        </p>
                      )}
                      {part.sku && (
                        <p className="text-sm text-gray-500 mb-3">SKU: {part.sku}</p>
                      )}
                      <div className="flex items-center">
                        {renderStars()}
                        <span className="text-xs text-gray-500 ml-2">(42)</span>
                      </div>
                    </div>
                    <div className="text-right ml-6">
                      <p className="text-2xl font-semibold text-gray-900 mb-4" data-testid={`text-part-price-${part.id}`}>
                        ${part.price}
                      </p>
                      <Button
                        onClick={() => onAddToCart(part.id)}
                        className="px-6 py-2"
                        data-testid={`button-add-to-cart-${part.id}`}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {parts.map((part) => (
        <Card
          key={part.id}
          className="hover:shadow-material-lg transition-shadow overflow-hidden"
          data-testid={`part-card-${part.id}`}
        >
          <CardContent className="p-0">
            <div className="aspect-w-1 aspect-h-1">
              {part.imageUrl ? (
                <img
                  src={part.imageUrl}
                  alt={part.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <span className="material-icons text-gray-400 text-4xl">image</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center mb-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Compatible
                </Badge>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2" data-testid={`text-part-title-${part.id}`}>
                {part.title}
              </h3>
              {part.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2" data-testid={`text-part-description-${part.id}`}>
                  {part.description}
                </p>
              )}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  {renderStars()}
                  <span className="text-xs text-gray-500 ml-1">(42)</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900" data-testid={`text-part-price-${part.id}`}>
                    ${part.price}
                  </p>
                  {part.sku && (
                    <p className="text-xs text-gray-500">SKU: {part.sku}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => onAddToCart(part.id)}
                className="w-full"
                data-testid={`button-add-to-cart-${part.id}`}
              >
                Add to Cart
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
