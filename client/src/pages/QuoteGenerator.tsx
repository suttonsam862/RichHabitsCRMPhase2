
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
import { Building2, FileText, Download, Upload, Calculator, Mail, Phone, MapPin, Plus, Trash2, Save, Copy, History } from 'lucide-react';
import { 
  upsertQuote, 
  getQuote, 
  generateId, 
  saveDefaultLogo, 
  getDefaultLogo,
  QuoteRecord 
} from '../lib/quoteStore';

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white print:bg-white print:text-black">
      <div className="container mx-auto p-6 print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Quote Generator
              </h1>
              <p className="text-slate-400">Create professional quotes with ease</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/quotes/history">
              <Button variant="outline" className="border-slate-600 bg-slate-800 hover:bg-slate-700">
                <History className="w-4 h-4 mr-2" />
                Quote History
              </Button>
            </Link>
            
            <Button onClick={handleSaveQuote} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save Quote
              {hasUnsavedChanges && <span className="ml-1 text-yellow-400">*</span>}
            </Button>

            {currentQuoteId && (
              <Button onClick={handleSaveAsNew} variant="outline" className="border-slate-600 bg-slate-800 hover:bg-slate-700">
                <Copy className="w-4 h-4 mr-2" />
                Save As New
              </Button>
            )}
            
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Quote Content */}
        <Card ref={printRef} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm print:bg-white print:border-gray-300 print:shadow-none">
          <CardHeader className="border-b border-slate-700 print:border-gray-300">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                {logoDataUrl ? 
                  <img src={logoDataUrl} alt="Logo" className="h-16 w-16 object-contain rounded-lg" /> :
                  <div className="h-16 w-16 bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-400 text-xs print:bg-gray-200 print:border-gray-400">
                    LOGO
                  </div>
                }
                <div>
                  <h2 className="text-2xl font-bold text-white print:text-black">Rich Habits</h2>
                  <p className="text-slate-400 print:text-gray-600">Professional Quote</p>
                </div>
              </div>
              
              <div className="text-right space-y-2">
                <div className="flex items-center gap-3">
                  <Label className="text-slate-300 print:text-gray-600">Quote #</Label>
                  <Input 
                    value={quoteNo} 
                    onChange={(e) => setQuoteNo(e.target.value)}
                    className="w-40 bg-slate-700 border-slate-600 text-white print:bg-white print:border-gray-300 print:text-black"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-slate-300 print:text-gray-600">Date</Label>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="bg-slate-700 border-slate-600 text-white print:bg-white print:border-gray-300 print:text-black"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {/* Logo Upload */}
            <div className="mb-6 print:hidden">
              <Label className="text-slate-300 mb-2 block">Company Logo</Label>
              <div className="relative">
                <Input 
                  type="file" 
                  accept="image/*,.svg" 
                  onChange={handleLogoUpload} 
                  className="bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white file:border-0 file:mr-3"
                />
                <Upload className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              </div>
            </div>

            {/* Organization Details */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <Card className="bg-slate-700/50 border-slate-600 print:bg-transparent print:border-gray-300">
                <CardHeader>
                  <CardTitle className="text-white print:text-black flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Bill To / Organization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300 print:text-gray-600">Organization Name</Label>
                    <Input 
                      value={toName} 
                      onChange={(e) => setToName(e.target.value)} 
                      placeholder="Enter organization name"
                      className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 print:text-gray-600">Contact Person</Label>
                    <Input 
                      value={toContact} 
                      onChange={(e) => setToContact(e.target.value)} 
                      placeholder="Enter contact person"
                      className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 print:text-gray-600">Email</Label>
                    <Input 
                      type="email"
                      value={toEmail} 
                      onChange={(e) => setToEmail(e.target.value)} 
                      placeholder="Enter email address"
                      className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 print:text-gray-600">Phone</Label>
                    <Input 
                      type="tel"
                      value={toPhone} 
                      onChange={(e) => setToPhone(e.target.value)} 
                      placeholder="Enter phone number"
                      className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 print:text-gray-600">Address</Label>
                    <Textarea 
                      value={toAddress} 
                      onChange={(e) => setToAddress(e.target.value)} 
                      placeholder="Enter full address"
                      className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black resize-none"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Quote Settings */}
              <Card className="bg-slate-700/50 border-slate-600 print:bg-transparent print:border-gray-300">
                <CardHeader>
                  <CardTitle className="text-white print:text-black">Quote Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 print:text-gray-600">Tax (%)</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01" 
                        value={taxPct} 
                        onChange={(e) => setTaxPct(Number(e.target.value))} 
                        className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 print:text-gray-600">Discount (%)</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01" 
                        value={discount} 
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300 print:text-gray-600">Notes / Terms</Label>
                    <Textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black resize-none"
                      placeholder="Add any additional notes or terms"
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Items */}
            <Card className="bg-slate-700/50 border-slate-600 print:bg-transparent print:border-gray-300 mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white print:text-black">Line Items</CardTitle>
                <Button 
                  onClick={handleAddItem} 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 print:hidden"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-600 print:border-gray-300">
                        <th className="text-left p-3 text-slate-300 print:text-gray-600">Item</th>
                        <th className="text-right p-3 text-slate-300 print:text-gray-600">Price</th>
                        <th className="text-center p-3 text-slate-300 print:text-gray-600">Qty</th>
                        <th className="text-right p-3 text-slate-300 print:text-gray-600">Total</th>
                        <th className="p-3 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b border-slate-600/50 print:border-gray-200">
                          <td className="p-3">
                            <Input 
                              value={item.name} 
                              onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                              placeholder="Item description"
                              className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                            />
                          </td>
                          <td className="p-3">
                            <Input 
                              type="number" 
                              value={item.price} 
                              onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                              className="bg-slate-600 border-slate-500 text-white text-right print:bg-white print:border-gray-300 print:text-black"
                            />
                          </td>
                          <td className="p-3">
                            <Input 
                              type="number" 
                              value={item.qty} 
                              onChange={(e) => handleItemChange(index, 'qty', parseInt(e.target.value) || 0)}
                              className="bg-slate-600 border-slate-500 text-white text-center print:bg-white print:border-gray-300 print:text-black"
                              min="0"
                            />
                          </td>
                          <td className="p-3 text-right text-white print:text-black">
                            ${(item.price * item.qty).toFixed(2)}
                          </td>
                          <td className="p-3 print:hidden">
                            <Button 
                              onClick={() => handleRemoveItem(index)} 
                              size="sm" 
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <div className="flex justify-end">
              <Card className="w-80 bg-slate-700/50 border-slate-600 print:bg-transparent print:border-gray-300">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-300 print:text-gray-600">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 print:text-gray-600">
                      <span>Discount ({discount}%):</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 print:text-gray-600">
                      <span>Tax ({taxPct}%):</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-slate-600 print:bg-gray-300" />
                    <div className="flex justify-between text-xl font-bold text-white print:text-black">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-xs text-slate-500 mt-8 print:text-gray-500">
              This quote is an estimate based on the information provided and is subject to change.
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:text-black { color: black !important; }
          .print\\:text-gray-600 { color: #6b7280 !important; }
          .print\\:text-gray-800 { color: #1f2937 !important; }
          .print\\:text-gray-500 { color: #9ca3af !important; }
          .print\\:bg-gray-100 { background: #f3f4f6 !important; }
          .print\\:bg-gray-200 { background: #e5e7eb !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          @page { size: A4; margin: 18mm; }
        }
      `}</style>
    </div>
  );
}
