import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { OrderStatusBadge } from './OrderStatusBadge';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Package,
  User,
  Factory,
  Palette,
  FileText,
  Save,
  X
} from 'lucide-react';

interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  name_snapshot: string;
  sku_snapshot?: string;
  price_snapshot: number;
  quantity: number;
  status_code: string;
  designer_id?: string;
  designer_name?: string;
  manufacturer_id?: string;
  manufacturer_name?: string;
  pantone_json?: any;
  build_overrides_text?: string;
  variant_image_url?: string;
  created_at: string;
  updated_at: string;
}

interface OrderItemsTableProps {
  orderId: string;
  items: OrderItem[];
  isLoading?: boolean;
  onAddItem?: () => void;
  onEditItem?: (item: OrderItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onUpdateStatus?: (itemId: string, status: string) => void;
  className?: string;
}

export function OrderItemsTable({
  orderId,
  items,
  isLoading = false,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onUpdateQuantity,
  onUpdateStatus,
  className
}: OrderItemsTableProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleQuantityEdit = (item: OrderItem) => {
    setEditingItem(item.id);
    setEditQuantity(item.quantity);
  };

  const handleQuantitySave = (itemId: string) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(itemId, editQuantity);
    }
    setEditingItem(null);
  };

  const handleQuantityCancel = () => {
    setEditingItem(null);
    setEditQuantity(0);
  };

  const getTotalValue = () => {
    return items.reduce((total, item) => total + (item.price_snapshot * item.quantity), 0);
  };

  const getTotalQuantity = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Items ({items.length})
          </CardTitle>
          <Button onClick={onAddItem} data-testid="button-add-item">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No items yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add items to this order to get started.
            </p>
            <Button onClick={onAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.variant_image_url ? (
                            <img
                              src={item.variant_image_url}
                              alt={item.name_snapshot}
                              className="h-10 w-10 rounded-md object-cover bg-gray-100"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium" data-testid={`text-item-name-${item.id}`}>
                              {item.name_snapshot}
                            </div>
                            {item.sku_snapshot && (
                              <div className="text-sm text-gray-500">
                                SKU: {item.sku_snapshot}
                              </div>
                            )}
                            {item.pantone_json && (
                              <div className="flex items-center gap-1 mt-1">
                                <Palette className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  Custom colors
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Select
                          value={item.status_code}
                          onValueChange={(value) => onUpdateStatus?.(item.id, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue>
                              <OrderStatusBadge status={item.status_code} size="sm" />
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending_design">Pending Design</SelectItem>
                            <SelectItem value="designing">Designing</SelectItem>
                            <SelectItem value="design_approved">Design Approved</SelectItem>
                            <SelectItem value="manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="quality_check">Quality Check</SelectItem>
                            <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      <TableCell>
                        {editingItem === item.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(Number(e.target.value))}
                              className="w-20"
                              min="1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantitySave(item.id)}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleQuantityCancel}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityEdit(item)}
                            className="h-8 px-2"
                            data-testid={`button-edit-quantity-${item.id}`}
                          >
                            {item.quantity}
                            <Edit className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <span data-testid={`text-price-${item.id}`}>
                          {formatCurrency(item.price_snapshot)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-medium" data-testid={`text-total-${item.id}`}>
                          {formatCurrency(item.price_snapshot * item.quantity)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {item.designer_name && (
                            <div className="flex items-center gap-1 text-xs">
                              <User className="h-3 w-3 text-gray-400" />
                              <span>{item.designer_name}</span>
                            </div>
                          )}
                          {item.manufacturer_name && (
                            <div className="flex items-center gap-1 text-xs">
                              <Factory className="h-3 w-3 text-gray-400" />
                              <span>{item.manufacturer_name}</span>
                            </div>
                          )}
                          {item.build_overrides_text && (
                            <div className="flex items-center gap-1 text-xs">
                              <FileText className="h-3 w-3 text-gray-400" />
                              <span>Special instructions</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              data-testid={`button-item-menu-${item.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditItem?.(item)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDeleteItem?.(item.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="flex justify-end">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-w-64">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span className="font-medium">{getTotalQuantity()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(getTotalValue())}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-medium">
                      <span>Order Total:</span>
                      <span data-testid="text-order-total">
                        {formatCurrency(getTotalValue())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}