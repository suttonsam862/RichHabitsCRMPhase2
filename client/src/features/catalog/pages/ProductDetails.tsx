import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Package, Image, Settings } from "lucide-react";
import { ProductCategory } from "../types";

const formatCategory = (category: ProductCategory) => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const getCategoryColor = (category: ProductCategory) => {
  switch (category) {
    case ProductCategory.SHIRTS: return "bg-blue-500";
    case ProductCategory.POLOS: return "bg-green-500";
    case ProductCategory.HOODIES: return "bg-purple-500";
    case ProductCategory.JACKETS: return "bg-orange-500";
    case ProductCategory.ACCESSORIES: return "bg-pink-500";
    case ProductCategory.CUSTOM: return "bg-gray-500";
    default: return "bg-gray-500";
  }
};

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();

  // Mock product data
  const mockProduct = {
    id: "PROD-001",
    sku: "TS-001",
    name: "Custom Corporate T-Shirt",
    description: "High-quality 100% cotton t-shirt perfect for corporate branding and events. Pre-shrunk fabric with reinforced seams for durability.",
    category: ProductCategory.SHIRTS,
    basePrice: 15.00,
    variants: [
      {
        id: "VAR-001",
        name: "Small - Navy Blue",
        sku: "TS-001-S-NV",
        priceModifier: 0,
        stockQuantity: 50
      },
      {
        id: "VAR-002", 
        name: "Medium - Navy Blue",
        sku: "TS-001-M-NV",
        priceModifier: 0,
        stockQuantity: 75
      },
      {
        id: "VAR-003",
        name: "Large - Navy Blue",
        sku: "TS-001-L-NV",
        priceModifier: 0,
        stockQuantity: 60
      },
      {
        id: "VAR-004",
        name: "XL - Navy Blue", 
        sku: "TS-001-XL-NV",
        priceModifier: 2.00,
        stockQuantity: 30
      }
    ],
    specifications: {
      "Material": "100% Cotton",
      "Weight": "6.1 oz",
      "Fit": "Regular",
      "Sleeve Type": "Short Sleeve",
      "Neckline": "Crew Neck"
    },
    images: [],
    isActive: true,
    minimumQuantity: 10,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-15T14:30:00Z",
  };

  const totalStock = mockProduct.variants.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/catalog" data-testid="link-back-to-catalog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Catalog
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {mockProduct.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">SKU: {mockProduct.sku}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge 
            className={`${getCategoryColor(mockProduct.category)} text-white`}
          >
            {formatCategory(mockProduct.category)}
          </Badge>
          <Badge variant={mockProduct.isActive ? "default" : "secondary"}>
            {mockProduct.isActive ? "Active" : "Inactive"}
          </Badge>
          <Button data-testid="button-edit-product">
            <Edit className="w-4 h-4 mr-2" />
            Edit Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="variants" data-testid="tab-variants">Variants</TabsTrigger>
              <TabsTrigger value="images" data-testid="tab-images">Images</TabsTrigger>
              <TabsTrigger value="specs" data-testid="tab-specifications">Specs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Product Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {mockProduct.description}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Base Price</label>
                      <p className="font-semibold text-lg">${mockProduct.basePrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Minimum Quantity</label>
                      <p className="font-semibold text-lg">{mockProduct.minimumQuantity}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Stock</label>
                      <p className="font-semibold text-lg">{totalStock} units</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Variants</label>
                      <p className="font-semibold text-lg">{mockProduct.variants.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variants">
              <Card>
                <CardHeader>
                  <CardTitle>Product Variants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockProduct.variants.map((variant) => (
                      <div key={variant.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold">{variant.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                            SKU: {variant.sku}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">
                              ${(mockProduct.basePrice + variant.priceModifier).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Stock: {variant.stockQuantity || 0}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" data-testid={`button-edit-variant-${variant.id}`}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" data-testid="button-add-variant">
                      <Package className="w-4 h-4 mr-2" />
                      Add New Variant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="images">
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                </CardHeader>
                <CardContent>
                  {mockProduct.images.length === 0 ? (
                    <div className="text-center py-12">
                      <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold mb-2">No images uploaded</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Upload product images to showcase your items
                      </p>
                      <Button data-testid="button-upload-images">
                        <Image className="w-4 h-4 mr-2" />
                        Upload Images
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {mockProduct.images.map((image, index) => (
                        <div key={index} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specs">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(mockProduct.specifications || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>
                        <span className="text-gray-600 dark:text-gray-400">{value}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" data-testid="button-edit-specs">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Specifications
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalStock}</div>
                <p className="text-sm text-blue-800 dark:text-blue-200">Units in Stock</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    ${mockProduct.basePrice.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Base Price</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    {mockProduct.variants.length}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Variants</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" data-testid="button-duplicate-product">
                Duplicate Product
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-toggle-status">
                {mockProduct.isActive ? "Deactivate" : "Activate"} Product
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-export-product">
                Export Data
              </Button>
              <Separator />
              <Button className="w-full" variant="destructive" data-testid="button-delete-product">
                Delete Product
              </Button>
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span>{new Date(mockProduct.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated:</span>
                <span>{new Date(mockProduct.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Product ID:</span>
                <span className="font-mono">{mockProduct.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}