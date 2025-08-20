import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { useDebounce } from '../hooks/use-debounce';
import { Building2, FileText, Download, Upload, Calculator, Mail, Phone, MapPin, Plus, Trash2, Save, Copy, History } from 'lucide-react';
import { 
  upsertQuote, 
  getQuote, 
  generateId, 
  saveDefaultLogo, 
  getDefaultLogo,
  QuoteRecord 
} from '../lib/quoteStore';

export default function QuoteGenerator() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form state
  const [toName, setToName] = useState('');
  const [toContact, setToContact] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [toPhone, setToPhone] = useState('');
  const [toAddress, setToAddress] = useState('');

  // Quote meta
  const [quoteNo, setQuoteNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxPct, setTaxPct] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Items
  const [items, setItems] = useState<Array<{ name: string; price: number; qty: number }>>([]);

  // Logo
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(() => getDefaultLogo());
  const logoInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Create a debounced version of form state for auto-saving
  const debouncedFormState = useDebounce({
    toName, toContact, toEmail, toPhone, toAddress,
    items, quoteNo, date, taxPct, discount, notes
  }, 1000);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = subtotal * (discount / 100);
  const taxAmount = (subtotal - discountAmount) * (taxPct / 100);
  const total = subtotal - discountAmount + taxAmount;

  // Load quote from URL parameter on mount
  useEffect(() => {
    const quoteId = searchParams.get('id');
    if (quoteId) {
      const savedQuote = getQuote(quoteId);
      if (savedQuote) {
        setCurrentQuoteId(quoteId);
        // Hydrate form state
        setToName(savedQuote.org.toName);
        setToContact(savedQuote.org.toContact);
        setToEmail(savedQuote.org.toEmail);
        setToPhone(savedQuote.org.toPhone);
        setToAddress(savedQuote.org.toAddress);
        setItems(savedQuote.items);
        setQuoteNo(savedQuote.meta.quoteNo);
        setDate(savedQuote.meta.date);
        setTaxPct(savedQuote.meta.taxPct);
        setDiscount(savedQuote.meta.discount);
        setNotes(savedQuote.meta.notes);
        setLogoDataUrl(savedQuote.logoDataUrl || getDefaultLogo());
        setHasUnsavedChanges(false);
      }
    }
  }, [searchParams]);

  // Auto-save when form data changes (debounced)
  useEffect(() => {
    if (currentQuoteId && !hasUnsavedChanges) {
      return; // Skip if no changes to save
    }

    if (currentQuoteId) {
      const quoteData = createQuoteRecord(currentQuoteId);
      upsertQuote(quoteData);
      setHasUnsavedChanges(false);
    }
  }, [debouncedFormState, currentQuoteId, hasUnsavedChanges, createQuoteRecord]);

  // Mark as having unsaved changes when form data changes
  useEffect(() => {
    if (currentQuoteId) {
      setHasUnsavedChanges(true);
    }
  }, [toName, toContact, toEmail, toPhone, toAddress, items, quoteNo, date, taxPct, discount, notes, logoDataUrl]);

  const createQuoteRecord = useCallback((id?: string): QuoteRecord => {
    const title = toName || 'Untitled Quote';
    return {
      id: id || generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title,
      org: { toName, toContact, toEmail, toPhone, toAddress },
      items: items.map(item => ({
        name: item.name,
        price: item.price,
        qty: item.qty
      })),
      meta: { quoteNo, date, taxPct, discount, notes },
      logoDataUrl,
      totals: { subtotal, discount: discountAmount, tax: taxAmount, total }
    };
  }, [toName, toContact, toEmail, toPhone, toAddress, items, quoteNo, date, taxPct, discount, notes, logoDataUrl, subtotal, discountAmount, taxAmount, total]);

  const handleLogoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setLogoDataUrl(dataUrl);
          saveDefaultLogo(dataUrl); // Save as default for future quotes
        };
      reader.readAsDataURL(file);
    }
    event.target.value = ''; // Clear the input value to allow uploading the same file again
  }, []);

  const handleAddItem = useCallback(() => {
    setItems(prev => [...prev, { name: '', price: 0, qty: 1 }]);
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleItemChange = useCallback((index: number, field: keyof { name: string; price: number; qty: number }, value: string | number) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }, []);

  const handleQuoteNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuoteNo(e.target.value);
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  }, []);

  const handleTaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTaxPct(parseFloat(e.target.value));
  }, []);

  const handleDiscountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscount(parseFloat(e.target.value));
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  const handleToNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToName(e.target.value);
  }, []);

  const handleToContactChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToContact(e.target.value);
  }, []);

  const handleToEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToEmail(e.target.value);
  }, []);

  const handleToPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToPhone(e.target.value);
  }, []);

  const handleToAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToAddress(e.target.value);
  }, []);

  const handleSaveQuote = useCallback(() => {
    const id = currentQuoteId || generateId();
    const quoteData = createQuoteRecord(id);

    upsertQuote(quoteData);
    setCurrentQuoteId(id);
    setHasUnsavedChanges(false);

    toast({
      title: "Quote saved",
      description: "Your quote has been saved to local storage.",
    });
  }, [currentQuoteId, createQuoteRecord, toast]);

  const handleSaveAsNew = useCallback(() => {
    const newId = generateId();
    const quoteData = createQuoteRecord(newId);
    quoteData.title = `${quoteData.title} (Copy)`;

    upsertQuote(quoteData);
    setCurrentQuoteId(newId);
    setHasUnsavedChanges(false);

    toast({
      title: "Quote duplicated",
      description: "A new copy of your quote has been saved.",
    });
  }, [createQuoteRecord, toast]);

  const handlePrint = useCallback(() => {
    const printContents = printRef.current?.innerHTML;
    const originalContents = document.body.innerHTML;
    if (printContents) {
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore original state and event listeners
    }
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <CardTitle className="text-2xl font-bold">Quote Generator</CardTitle>
        <div className="flex gap-2 print:hidden">
            <Link to="/quotes/history">
              <Button variant="outline">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
            <Button onClick={handleSaveQuote} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Quote
              {hasUnsavedChanges && <span className="ml-1 text-yellow-400">*</span>}
            </Button>
            {currentQuoteId && (
              <Button onClick={handleSaveAsNew} variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Save As New
              </Button>
            )}
            <Button onClick={handlePrint} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Print Quote
            </Button>
            <Button onClick={() => logoInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Logo
            </Button>
            <input
              type="file"
              accept="image/*"
              ref={logoInputRef}
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
      </div>

      <Card ref={printRef} className="p-6">
        <CardHeader className="flex flex-row items-center justify-between p-0 mb-6">
          <div className="flex items-center gap-4">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo" className="h-16 w-auto" />
            ) : (
              <Building2 className="h-16 w-16 text-gray-400" />
            )}
            <div>
              <CardTitle className="text-3xl font-bold">Quote</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="quoteNo">Quote #:</Label>
                <Input id="quoteNo" value={quoteNo} onChange={handleQuoteNumberChange} className="w-32 h-8 p-1 border-none focus:ring-0 focus:border-b focus:border-primary" />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Date:</p>
            <Input type="date" value={date} onChange={handleDateChange} className="w-36 h-8 p-1 border-none focus:ring-0 focus:border-b focus:border-primary" />
          </div>
        </CardHeader>

        <Separator className="my-4" />

        <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* From Section */}
          <div>
            <Label className="text-lg font-semibold">From:</Label>
            <div className="mt-2 space-y-2">
              <Input placeholder="Your Company Name" value={toName} onChange={handleToNameChange} className="focus:ring-0 focus:border-b focus:border-primary" />
              <Input placeholder="Contact Person" value={toContact} onChange={handleToContactChange} className="focus:ring-0 focus:border-b focus:border-primary" />
              <Input type="email" placeholder="Email" value={toEmail} onChange={handleToEmailChange} className="focus:ring-0 focus:border-b focus:border-primary" />
              <Input type="tel" placeholder="Phone" value={toPhone} onChange={handleToPhoneChange} className="focus:ring-0 focus:border-b focus:border-primary" />
              <Textarea placeholder="Address" value={toAddress} onChange={handleToAddressChange} className="focus:ring-0 focus:border-b focus:border-primary h-20" />
            </div>
          </div>

          {/* To Section */}
          <div>
            <Label className="text-lg font-semibold">To:</Label>
            <div className="mt-2 space-y-2">
              <Input placeholder="Client Name" value={toName} onChange={handleToNameChange} className="focus:ring-0 focus:border-b focus:border-primary" />
              <Input placeholder="Contact Person" value={toContact} onChange={handleToContactChange} className="focus:ring-0 focus:border-b focus:border-primary" />
              <Input type="email" placeholder="Email" value={toEmail} onChange={handleToEmailChange} className="focus:ring-0 focus:border-b focus:border-primary" />
              <Input type="tel" placeholder="Phone" value={toPhone} onChange={handleToPhoneChange} className="focus:ring-0 focus:border-b focus:border-primary" />
              <Textarea placeholder="Address" value={toAddress} onChange={handleToAddressChange} className="focus:ring-0 focus:border-b focus:border-primary h-20" />
            </div>
          </div>
        </CardContent>

        <Separator className="my-6" />

        {/* Items Section */}
        <CardContent className="p-0">
          <div className="flex justify-between items-center mb-4">
            <Label className="text-lg font-semibold">Items:</Label>
            <Button variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 font-medium">Item Name</th>
                  <th className="py-2 px-3 font-medium text-right">Price</th>
                  <th className="py-2 px-3 font-medium text-center">Quantity</th>
                  <th className="py-2 px-3 font-medium text-right">Total</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b last:border-none">
                    <td className="py-2 px-3">
                      <Input
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="focus:ring-0 focus:border-b focus:border-primary w-full"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                        className="focus:ring-0 focus:border-b focus:border-primary text-right w-full"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', parseInt(e.target.value))}
                        className="focus:ring-0 focus:border-b focus:border-primary text-center w-full"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      {(item.price * item.qty).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>

        <Separator className="my-6" />

        {/* Notes and Totals */}
        <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Notes:</Label>
            <Textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Add any relevant notes here..."
              className="h-32 focus:ring-0 focus:border-b focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Subtotal:</Label>
              <p>${subtotal.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <Label>Discount:</Label>
              <div className="flex items-center w-32">
                <Input
                  type="number"
                  value={discount}
                  onChange={handleDiscountChange}
                  className="focus:ring-0 focus:border-b focus:border-primary text-right w-full"
                />
                <span className="ml-2">%</span>
              </div>
              <p>-${discountAmount.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <Label>Tax:</Label>
              <div className="flex items-center w-32">
                <Input
                  type="number"
                  value={taxPct}
                  onChange={handleTaxChange}
                  className="focus:ring-0 focus:border-b focus:border-primary text-right w-full"
                />
                <span className="ml-2">%</span>
              </div>
              <p>+${taxAmount.toFixed(2)}</p>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <Label>Total:</Label>
              <p>${total.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}