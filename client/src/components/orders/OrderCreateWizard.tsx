import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { CreateOrderDTO } from '@shared/dtos';
import { useAuth } from '@/auth/AuthProvider';
import { 
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Package,
  FileText,
  Search,
  Plus,
  Trash2,
  ShoppingCart
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
  customizations?: Record<string, any>;
}

// Create form schema based on CreateOrderDTO but with additional validation
const orderFormSchema = CreateOrderDTO.extend({
  // Add client-side only fields for the form
  customerName: z.string().optional(), // For display purposes
  customerEmail: z.string().email().optional(), // For display purposes
  customerPhone: z.string().optional(), // For display purposes
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    sku: z.string(),
    price: z.number().positive(),
    quantity: z.number().positive(),
    subtotal: z.number().optional(),
    customizations: z.record(z.any()).optional(),
  })).min(1, 'At least one item is required'),
}).partial().required({
  customerId: true,
  orgId: true,
});

type OrderFormData = z.infer<typeof orderFormSchema>;

const WIZARD_STEPS = [
  { id: 'customer', title: 'Customer', icon: User, description: 'Select or create customer' },
  { id: 'items', title: 'Items', icon: Package, description: 'Add products to order' },
  { id: 'details', title: 'Details', icon: FileText, description: 'Order information' },
  { id: 'review', title: 'Review', icon: Check, description: 'Confirm order details' },
];

interface OrderCreateWizardProps {
  onClose?: () => void;
  className?: string;
}

export function OrderCreateWizard({ onClose, className }: OrderCreateWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  
  // Fetch user profile to get organization context - MOVED ABOVE useForm
  const { data: userProfile, isLoading: userProfileLoading } = useQuery({
    queryKey: ['/api/v1/users/profile', user?.id],
    enabled: !!user?.id,
  });

  // Initialize form with react-hook-form and zodResolver
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: '',
      orgId: '', // Will be set via useEffect when userProfile loads
      customerContactName: '',
      customerContactEmail: '',
      customerContactPhone: '',
      priority: 'medium',
      items: [],
    },
  });
  
  const orderData = form.watch();
  
  // Initialize orgId when userProfile loads
  useEffect(() => {
    if (userProfile?.organizationId && !form.getValues('orgId')) {
      form.setValue('orgId', userProfile.organizationId);
    } else if (user?.organizationId && !form.getValues('orgId')) {
      // Fallback to useAuth().user org context
      form.setValue('orgId', user.organizationId);
    }
  }, [userProfile, user, form]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/v1/customers', { search: customerSearch }],
    enabled: customerSearch.length > 2,
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/v1/catalog/items', { search: productSearch }],
    enabled: productSearch.length > 2,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      // Transform form data to match backend DTO
      const orderPayload = {
        orgId: data.orgId,
        customerId: data.customerId,
        customerContactName: data.customerContactName,
        customerContactEmail: data.customerContactEmail,
        customerContactPhone: data.customerContactPhone,
        sportId: data.sportId,
        statusCode: 'draft',
        dueDate: data.dueDate,
        notes: data.notes,
        items: data.items?.map(item => ({
          orgId: data.orgId,
          productId: item.productId,
          nameSnapshot: item.productName,
          skuSnapshot: item.sku,
          priceSnapshot: item.price,
          quantity: item.quantity,
          statusCode: 'pending_design',
        })) || [],
      };
      
      return apiRequest('/api/v1/orders', {
        method: 'POST',
        data: orderPayload,
      });
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders/stats'] });
      toast({
        title: 'Order created',
        description: `Order ${newOrder.code} has been created successfully.`,
      });
      navigate(`/orders/${newOrder.id}/details`);
    },
    onError: (error) => {
      toast({
        title: 'Failed to create order',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
      
      // Log form errors for debugging
      console.error('Form validation errors:', form.formState.errors);
    },
  });

  const currentStepData = WIZARD_STEPS[currentStep];
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const updateOrderData = (updates: Partial<OrderFormData>) => {
    Object.entries(updates).forEach(([key, value]) => {
      form.setValue(key as keyof OrderFormData, value);
    });
  };

  const addOrderItem = (product: Product, quantity: number = 1) => {
    const currentItems = form.getValues('items') || [];
    const existingItem = currentItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      const updatedItems = currentItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * item.price }
          : item
      );
      form.setValue('items', updatedItems);
    } else {
      const newItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        price: product.price,
        quantity,
        subtotal: product.price * quantity,
      };
      form.setValue('items', [...currentItems, newItem]);
    }
  };

  const removeOrderItem = (productId: string) => {
    const currentItems = form.getValues('items') || [];
    form.setValue('items', currentItems.filter(item => item.productId !== productId));
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeOrderItem(productId);
      return;
    }

    const currentItems = form.getValues('items') || [];
    const updatedItems = currentItems.map(item =>
      item.productId === productId
        ? { ...item, quantity, subtotal: quantity * item.price }
        : item
    );
    form.setValue('items', updatedItems);
  };

  const getTotalAmount = () => {
    const items = form.getValues('items') || [];
    return items.reduce((total, item) => total + (item.subtotal || 0), 0);
  };

  const canProceed = () => {
    const values = form.getValues();
    
    // Always require orgId to be set
    if (!values.orgId) {
      return false;
    }
    
    switch (currentStep) {
      case 0: // Customer step
        // Fix field name mismatch: check customerName/customerEmail that UI actually sets
        return values.customerId && values.customerName && values.customerEmail;
      case 1: // Items step
        return values.items && values.items.length > 0;
      case 2: // Details step
        return true; // All fields are optional
      case 3: // Review step
        return form.formState.isValid && values.orgId; // Ensure orgId is set for submission
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit order with proper form validation
      form.handleSubmit((data) => {
        createOrderMutation.mutate(data);
      })();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card className={cn('max-w-4xl mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create New Order
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mt-4">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2',
                  isCompleted 
                    ? 'bg-green-500 border-green-500 text-white'
                    : isActive
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700'
                )}>
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="ml-2 hidden sm:block">
                  <div className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                  )}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {step.description}
                  </div>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className="hidden sm:block w-12 h-px bg-gray-200 dark:bg-gray-700 mx-4" />
                )}
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Loading state when fetching user profile */}
        {userProfileLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <div className="text-sm text-gray-500">Loading organization details...</div>
            </div>
          </div>
        )}
        
        {/* Show warning if orgId is not set */}
        {!userProfileLoading && !form.getValues('orgId') && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <div className="font-medium">Organization Required</div>
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Unable to determine your organization. Please contact support to resolve this issue.
            </div>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Customer</h3>
              
              {/* Customer search */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer-search">Search Customers</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="customer-search"
                      placeholder="Search by name, email, or organization..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Customer results */}
                {customers.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customers.map(customer => (
                      <div
                        key={customer.id}
                        className={cn(
                          'p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
                          orderData.customerId === customer.id && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        )}
                        onClick={() => updateOrderData({
                          customerId: customer.id,
                          customerName: customer.name,
                          customerEmail: customer.email,
                          customerPhone: customer.phone,
                          // Also set contact fields for consistency
                          customerContactName: customer.name,
                          customerContactEmail: customer.email,
                          customerContactPhone: customer.phone,
                        })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                            {customer.organization && (
                              <div className="text-xs text-gray-400">{customer.organization}</div>
                            )}
                          </div>
                          {orderData.customerId === customer.id && (
                            <Check className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual customer entry */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Or enter customer details manually:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer-name">Customer Name *</Label>
                      <Input
                        id="customer-name"
                        value={orderData.customerName}
                        onChange={(e) => updateOrderData({ 
                          customerName: e.target.value,
                          customerContactName: e.target.value
                        })}
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer-email">Email Address *</Label>
                      <Input
                        id="customer-email"
                        type="email"
                        value={orderData.customerEmail}
                        onChange={(e) => updateOrderData({ 
                          customerEmail: e.target.value,
                          customerContactEmail: e.target.value
                        })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer-phone">Phone Number</Label>
                      <Input
                        id="customer-phone"
                        value={orderData.customerPhone || ''}
                        onChange={(e) => updateOrderData({ 
                          customerPhone: e.target.value,
                          customerContactPhone: e.target.value
                        })}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Add Items to Order</h3>
              
              {/* Product search */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product-search">Search Products</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="product-search"
                      placeholder="Search products by name or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Product results */}
                {products.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                    {products.map(product => (
                      <div key={product.id} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-12 w-12 rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                            <div className="text-sm font-medium">{formatCurrency(product.price)}</div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addOrderItem(product)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current order items */}
              {orderData.items.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-3">Order Items ({orderData.items.length})</h4>
                  <div className="space-y-3">
                    {orderData.items.map(item => (
                      <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-12 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">{formatCurrency(item.price)} each</div>
                            <div className="font-medium">{formatCurrency(item.subtotal)}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeOrderItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center font-semibold">
                        <span>Total:</span>
                        <span>{formatCurrency(getTotalAmount())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Order Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={orderData.priority}
                      onValueChange={(value: any) => updateOrderData({ priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="due-date">Due Date</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={orderData.dueDate || ''}
                      onChange={(e) => updateOrderData({ dueDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Order Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter any special instructions or notes..."
                    value={orderData.notes || ''}
                    onChange={(e) => updateOrderData({ notes: e.target.value })}
                    className="min-h-24"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Review Order</h3>
              
              {/* Order summary */}
              <div className="space-y-6">
                {/* Customer info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Customer Information</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Name:</strong> {orderData.customerName}</div>
                    <div><strong>Email:</strong> {orderData.customerEmail}</div>
                    {orderData.customerPhone && (
                      <div><strong>Phone:</strong> {orderData.customerPhone}</div>
                    )}
                  </div>
                </div>

                {/* Order details */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Order Details</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Priority:</strong> <Badge variant="outline">{orderData.priority}</Badge></div>
                    {orderData.dueDate && (
                      <div><strong>Due Date:</strong> {new Date(orderData.dueDate).toLocaleDateString()}</div>
                    )}
                    {orderData.notes && (
                      <div><strong>Notes:</strong> {orderData.notes}</div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Order Items</h4>
                  <div className="space-y-2">
                    {orderData.items.map(item => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span>{item.productName} x {item.quantity}</span>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(getTotalAmount())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed() || createOrderMutation.isPending || userProfileLoading}
            data-testid={currentStep === WIZARD_STEPS.length - 1 ? 'button-create-order' : 'button-next-step'}
          >
            {currentStep === WIZARD_STEPS.length - 1 ? (
              createOrderMutation.isPending ? 'Creating...' : 'Create Order'
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}