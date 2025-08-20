import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Eye, Edit, Package } from "lucide-react";
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

export default function ProductsList() {
  // Mock products data
  const mockProducts = [
    {
      id: "PROD-001",
      sku: "TS-001",
      name: "Custom Corporate T-Shirt",
      category: ProductCategory.SHIRTS,
      basePrice: 15.00,
      variants: 12,
      isActive: true,
      images: []
    },
    {
      id: "PROD-002",
      sku: "PL-001", 
      name: "Premium Polo Shirt",
      category: ProductCategory.POLOS,
      basePrice: 25.00,
      variants: 8,
      isActive: true,
      images: []
    },
    {
      id: "PROD-003",
      sku: "HD-001",
      name: "Heavyweight Hoodie",
      category: ProductCategory.HOODIES,
      basePrice: 35.00,
      variants: 6,
      isActive: false,
      images: []
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Product Catalog
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your product offerings and customization options
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" data-testid="button-import-products">
            Import Products
          </Button>
          <Button data-testid="button-create-product">
            <Plus className="w-4 h-4 mr-2" />
            New Product
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products by name, SKU, or description..."
            className="pl-10"
            data-testid="input-search-products"
          />
        </div>
        
        <Select>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.values(ProductCategory).map((category) => (
              <SelectItem key={category} value={category}>
                {formatCategory(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select>
          <SelectTrigger className="w-32" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              {/* Product Image Placeholder */}
              <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      SKU: {product.sku}
                    </p>
                  </div>
                  <Badge 
                    className={`${getCategoryColor(product.category)} text-white text-xs`}
                  >
                    {formatCategory(product.category)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">${product.basePrice.toFixed(2)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {product.variants} variant{product.variants !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <Badge variant={product.isActive ? "default" : "secondary"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-product-${product.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-product-${product.id}`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {mockProducts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No products in catalog</h3>
              <p>Add your first product to start building your catalog</p>
            </div>
            <Button data-testid="button-create-first-product">
              <Plus className="w-4 h-4 mr-2" />
              Add First Product
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {mockProducts.length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {mockProducts.filter(p => p.isActive).length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {Object.values(ProductCategory).length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {mockProducts.reduce((sum, p) => sum + p.variants, 0)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Variants</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}