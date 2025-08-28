import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, FileText, Download, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Quote item interface
interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

// Customer information interface
interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

// Quote configuration interface
interface QuoteConfig {
  quoteNumber: string;
  expirationDays: number;
  taxRate: number;
  discountPercent: number;
  notes: string;
  terms: string;
}

interface QuoteGeneratorProps {
  onQuoteGenerated?: (quote: any) => void;
  onQuoteSaved?: (quote: any) => void;
}

export function QuoteGenerator({ onQuoteGenerated, onQuoteSaved }: QuoteGeneratorProps) {
  const { toast } = useToast();

  // State management
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const [quoteConfig, setQuoteConfig] = useState<QuoteConfig>({
    quoteNumber: `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    expirationDays: 30,
    taxRate: 8.5,
    discountPercent: 0,
    notes: '',
    terms: 'Payment is due within 30 days of invoice date. Late payments may be subject to 1.5% monthly service charge.'
  });

  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      category: 'custom-clothing'
    }
  ]);

  // Item categories
  const categories = [
    { value: 'custom-clothing', label: 'Custom Clothing' },
    { value: 'embroidery', label: 'Embroidery' },
    { value: 'screen-printing', label: 'Screen Printing' },
    { value: 'design-services', label: 'Design Services' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'other', label: 'Other' }
  ];

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * quoteConfig.discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * quoteConfig.taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  // Add new item
  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      category: 'custom-clothing'
    };
    setItems([...items, newItem]);
  };

  // Update item
  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate total when quantity or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Remove item
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Generate PDF quote
  const generateQuote = async () => {
    try {
      const quoteData = {
        quoteNumber: quoteConfig.quoteNumber,
        date: new Date().toISOString(),
        expirationDate: new Date(Date.now() + quoteConfig.expirationDays * 24 * 60 * 60 * 1000).toISOString(),
        customer: customerInfo,
        items: items.filter(item => item.description.trim() !== ''),
        subtotal,
        discountPercent: quoteConfig.discountPercent,
        discountAmount,
        taxRate: quoteConfig.taxRate,
        taxAmount,
        grandTotal,
        notes: quoteConfig.notes,
        terms: quoteConfig.terms
      };

      // Generate PDF (this would typically be an API call)
      const response = await generateQuotePDF(quoteData);
      
      toast({
        title: "Quote Generated",
        description: "Your quote has been generated successfully.",
      });

      if (onQuoteGenerated) {
        onQuoteGenerated(quoteData);
      }

      return response;
    } catch (error) {
      toast({
        title: "Error Generating Quote",
        description: "Failed to generate quote. Please try again.",
        variant: "destructive",
      });
      console.error('Quote generation error:', error);
    }
  };

  // Save quote
  const saveQuote = async () => {
    try {
      const quoteData = {
        quoteNumber: quoteConfig.quoteNumber,
        date: new Date().toISOString(),
        customer: customerInfo,
        items: items.filter(item => item.description.trim() !== ''),
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        notes: quoteConfig.notes,
        terms: quoteConfig.terms,
        status: 'draft'
      };

      // Save quote (this would typically be an API call)
      // const response = await saveQuoteAPI(quoteData);
      
      toast({
        title: "Quote Saved",
        description: "Your quote has been saved as a draft.",
      });

      if (onQuoteSaved) {
        onQuoteSaved(quoteData);
      }
    } catch (error) {
      toast({
        title: "Error Saving Quote",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
      console.error('Quote save error:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quote Generator</h1>
          <p className="text-muted-foreground">Create professional quotes for your customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveQuote}>
            <FileText className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={generateQuote}>
            <Download className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Quote Configuration */}
        <div className="space-y-6">
          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quoteNumber">Quote Number</Label>
                  <Input
                    id="quoteNumber"
                    value={quoteConfig.quoteNumber}
                    onChange={(e) => setQuoteConfig({ ...quoteConfig, quoteNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="expirationDays">Valid for (days)</Label>
                  <Input
                    id="expirationDays"
                    type="number"
                    value={quoteConfig.expirationDays}
                    onChange={(e) => setQuoteConfig({ ...quoteConfig, expirationDays: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    value={quoteConfig.taxRate}
                    onChange={(e) => setQuoteConfig({ ...quoteConfig, taxRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="discountPercent">Discount (%)</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    step="0.1"
                    value={quoteConfig.discountPercent}
                    onChange={(e) => setQuoteConfig({ ...quoteConfig, discountPercent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="customerCompany">Company (Optional)</Label>
                  <Input
                    id="customerCompany"
                    value={customerInfo.company}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, company: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customerStreet">Address</Label>
                <Input
                  id="customerStreet"
                  value={customerInfo.address.street}
                  onChange={(e) => setCustomerInfo({ 
                    ...customerInfo, 
                    address: { ...customerInfo.address, street: e.target.value }
                  })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="customerCity">City</Label>
                  <Input
                    id="customerCity"
                    value={customerInfo.address.city}
                    onChange={(e) => setCustomerInfo({ 
                      ...customerInfo, 
                      address: { ...customerInfo.address, city: e.target.value }
                    })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="customerState">State</Label>
                  <Input
                    id="customerState"
                    value={customerInfo.address.state}
                    onChange={(e) => setCustomerInfo({ 
                      ...customerInfo, 
                      address: { ...customerInfo.address, state: e.target.value }
                    })}
                    placeholder="ST"
                  />
                </div>
                <div>
                  <Label htmlFor="customerZip">ZIP Code</Label>
                  <Input
                    id="customerZip"
                    value={customerInfo.address.zipCode}
                    onChange={(e) => setCustomerInfo({ 
                      ...customerInfo, 
                      address: { ...customerInfo.address, zipCode: e.target.value }
                    })}
                    placeholder="12345"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Items and Totals */}
        <div className="space-y-6">
          {/* Quote Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Quote Items</CardTitle>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Item {index + 1}</Badge>
                    {items.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Describe the item or service..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select 
                      value={item.category} 
                      onValueChange={(value) => updateItem(item.id, 'category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Unit Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>Total ($)</Label>
                      <Input
                        value={item.total.toFixed(2)}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {quoteConfig.discountPercent > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({quoteConfig.discountPercent}%):</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Tax ({quoteConfig.taxRate}%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Grand Total:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={quoteConfig.notes}
                  onChange={(e) => setQuoteConfig({ ...quoteConfig, notes: e.target.value })}
                  placeholder="Any additional notes or special instructions..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={quoteConfig.terms}
                  onChange={(e) => setQuoteConfig({ ...quoteConfig, terms: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Placeholder function for PDF generation
async function generateQuotePDF(quoteData: any): Promise<any> {
  // This would integrate with a PDF generation service
  // For now, just simulate the process
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        pdfUrl: `quote-${quoteData.quoteNumber}.pdf`,
        data: quoteData
      });
    }, 1000);
  });
}