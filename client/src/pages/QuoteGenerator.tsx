
import { useState, useCallback, useRef, useEffect } from 'react';
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
import richHabitsLogo from '@assets/BlackPNG_New_Rich_Habits_Logo_caa84ddc-c1dc-49fa-a3cf-063db73499d3_1757019113547.png';
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

// Generate auto estimate number
function generateEstimateNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6); // Last 6 digits for uniqueness
  return `EST${year}${month}-${timestamp}`;
}

export default function QuoteGenerator() {
  // Updated with clean PDF styling and contact info
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
  const [quoteNo, setQuoteNo] = useState(() => generateEstimateNumber());
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
    const newEstimateNumber = generateEstimateNumber();
    
    // Update the estimate number for the new quote
    setQuoteNo(newEstimateNumber);
    
    // Create quote record with new estimate number
    const quoteData = createQuoteRecord(newId);
    quoteData.title = `${quoteData.title} (Copy)`;
    quoteData.meta.quoteNo = newEstimateNumber;

    upsertQuote(quoteData);
    setCurrentQuoteId(newId);
    setHasUnsavedChanges(false);

    toast({
      title: "Quote duplicated",
      description: "A new copy of your quote has been saved with a fresh estimate number.",
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Estimate Generator
              </h1>
              <p className="text-gray-600">Create professional estimates with ease</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/quotes/history">
              <Button variant="outline">
                <History className="w-4 h-4 mr-2" />
                Estimate History
              </Button>
            </Link>
            
            <Button onClick={handleSaveQuote} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save Estimate
              {hasUnsavedChanges && <span className="ml-1 text-yellow-400">*</span>}
            </Button>

            {currentQuoteId && (
              <Button onClick={handleSaveAsNew} variant="outline">
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
        <Card ref={printRef} className="bg-white border-gray-300 shadow-lg print:shadow-none">
          <CardHeader className="border-b border-gray-300 bg-white p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <img src={logoDataUrl || richHabitsLogo} alt="Rich Habits Logo" className="h-20 w-20 object-contain" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">ESTIMATE</h2>
                  <p className="text-gray-600">Developing Habits, LLC d/b/a Rich Habits</p>
                  <p className="text-sm text-gray-500">3101 Whitehall Rd, Birmingham, AL 35209</p>
                  <p className="text-sm text-gray-500">Phone: 2055869574 | Email: samsutton@rich-habits.com</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="mb-4">
                  <Label className="text-gray-600 block mb-1">Estimate Number:</Label>
                  <Input 
                    value={quoteNo} 
                    onChange={(e) => setQuoteNo(e.target.value)}
                    placeholder="EST###-####"
                    className="w-40 text-right font-mono"
                  />
                </div>
                <div>
                  <Label className="text-gray-600 block mb-1">Date:</Label>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-40"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 bg-white">
            {/* Logo Upload */}
            <div className="mb-6 print:hidden">
              <Label className="text-gray-700 mb-2 block">Custom Logo (Optional)</Label>
              <div className="relative">
                <Input 
                  type="file" 
                  accept="image/*,.svg" 
                  onChange={handleLogoUpload} 
                  className="file:bg-blue-500 file:text-white file:border-0 file:mr-3 file:px-4 file:py-2 file:rounded"
                />
                <Upload className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
              </div>
            </div>

            {/* Client and Project Information */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="border border-gray-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Client Information</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-700 font-medium">Name</Label>
                    <Input 
                      value={toName} 
                      onChange={(e) => setToName(e.target.value)} 
                      placeholder="Client name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">Address</Label>
                    <Textarea 
                      value={toAddress} 
                      onChange={(e) => setToAddress(e.target.value)} 
                      placeholder="Full address"
                      className="mt-1 resize-none"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">Phone</Label>
                    <Input 
                      type="tel"
                      value={toPhone} 
                      onChange={(e) => setToPhone(e.target.value)} 
                      placeholder="Phone number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium">Email</Label>
                    <Input 
                      type="email"
                      value={toEmail} 
                      onChange={(e) => setToEmail(e.target.value)} 
                      placeholder="Email address"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Project Information</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-700 font-medium">Project Name</Label>
                    <Input 
                      value={toContact} 
                      onChange={(e) => setToContact(e.target.value)} 
                      placeholder="Project title"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-700 font-medium">Tax Rate (%)</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01" 
                        value={taxPct} 
                        onChange={(e) => setTaxPct(Number(e.target.value))} 
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium">Discount (%)</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01" 
                        value={discount} 
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Project Details</h3>
                <Button 
                  onClick={handleAddItem} 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 print:hidden"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left p-3 font-semibold">Description</th>
                      <th className="text-center p-3 font-semibold">Quantity</th>
                      <th className="text-right p-3 font-semibold">Unit Price</th>
                      <th className="text-right p-3 font-semibold">Amount</th>
                      <th className="p-3 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 last:border-b-0">
                        <td className="p-3">
                          <Input 
                            value={item.name} 
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            placeholder="Service description"
                            className="border-0 shadow-none focus:ring-0 p-0"
                          />
                        </td>
                        <td className="p-3">
                          <Input 
                            type="text" 
                            value={item.qty} 
                            onChange={(e) => handleItemChange(index, 'qty', parseInt(e.target.value) || 0)}
                            className="border-0 shadow-none focus:ring-0 p-0 text-center"
                            placeholder="1"
                          />
                        </td>
                        <td className="p-3">
                          <Input 
                            type="number" 
                            value={item.price} 
                            onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                            className="border-0 shadow-none focus:ring-0 p-0 text-right"
                            placeholder="$0.00"
                          />
                        </td>
                        <td className="p-3 text-right font-semibold text-gray-900">
                          ${(item.price * item.qty).toFixed(2)}
                        </td>
                        <td className="p-3 print:hidden">
                          <Button 
                            onClick={() => handleRemoveItem(index)} 
                            size="sm" 
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals and Notes Section */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Additional Notes */}
              <div className="border border-gray-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Additional Notes</h3>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  className="resize-none h-32"
                  placeholder="Please ensure all areas to be worked on are cleared of any obstructions prior to our team's arrival."
                />
              </div>

              {/* Total Cost */}
              <div>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-700">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-gray-700">
                          <span>Discount ({discount}%)</span>
                          <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-700">
                        <span>Tax ({taxPct}%)</span>
                        <span>${taxAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-600 text-white p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Grand Total</span>
                      <span className="text-2xl font-bold">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Total Cost</h4>
                  <div className="text-3xl font-bold text-blue-600">${total.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="mt-8 border border-gray-300 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Terms and Conditions</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>1. The prices listed above are estimates and may change based on actual site conditions.</p>
                <p>2. Payment will be made in 2 stages: 50% prior to order placement, 50% post delivery. Online payment is preferred.</p>
                <p>3. Orders take approximately 35 days or less from the date of design completion.</p>
                <p>4. This estimate is valid for 30 days from the date issued.</p>
                <p>5. Work will commence upon receipt of signed approval and initial payment.</p>
              </div>
              
              <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>(205) 555-0123</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>info@richhabits.com</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          * { 
            print-color-adjust: exact !important; 
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          body { 
            background: white !important; 
            margin: 0 !important; 
            color: #000000 !important;
            font-family: Arial, sans-serif !important;
          }
          
          .print\\:hidden { display: none !important; }
          .container { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          
          /* CRITICAL: Remove ALL input/textarea styling completely */
          input[type="text"], input[type="email"], input[type="tel"], input[type="date"], textarea, select {
            border: none !important;
            background: none !important;
            background-color: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #000000 !important;
            font-family: Arial, sans-serif !important;
            font-size: inherit !important;
            outline: none !important;
            appearance: none !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
          }
          
          /* Remove card styling */
          .border, .border-gray-300 { 
            border: none !important; 
          }
          .rounded-lg { border-radius: 0 !important; }
          .shadow-lg { box-shadow: none !important; }
          .bg-white { background: white !important; }
          
          /* Clean table styling */
          .bg-blue-600 { 
            background-color: #000000 !important; 
            color: #ffffff !important;
          }
          .text-white { color: #ffffff !important; }
          
          /* Compact spacing for 2-page layout */
          .p-8, .p-6, .p-4, .p-3 { padding: 8px !important; }
          .mb-8, .mb-6, .mb-4 { margin-bottom: 8px !important; }
          .mt-8, .mt-6, .mt-4 { margin-top: 8px !important; }
          
          /* Text colors - force black */
          .text-gray-900, .text-gray-700, .text-gray-600, .text-gray-500, 
          h1, h2, h3, h4, h5, h6, p, div, span, label {
            color: #000000 !important;
          }
          
          /* Page layout */
          @page { 
            size: A4; 
            margin: 12mm;
          }
          
          /* Grid layout for print */
          .grid { display: block !important; }
          .md\\:grid-cols-2 > div { 
            width: 48% !important; 
            display: inline-block !important; 
            vertical-align: top !important; 
            margin-right: 2% !important;
            border: 1px solid #cccccc !important;
            padding: 8px !important;
            margin-bottom: 8px !important;
          }
          .md\\:grid-cols-2 > div:last-child { 
            margin-right: 0 !important; 
          }
          
          /* Logo sizing */
          img {
            max-height: 50px !important;
            max-width: 50px !important;
          }
          
          /* Table styling */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin: 8px 0 !important;
          }
          
          thead tr {
            background-color: #000000 !important;
            color: #ffffff !important;
          }
          
          td, th {
            border: 1px solid #000000 !important;
            padding: 6px !important;
            color: #000000 !important;
          }
          
          thead td, thead th {
            color: #ffffff !important;
          }
          
          /* Ensure page breaks */
          table { page-break-inside: avoid; }
          .md\\:grid-cols-2 > div { page-break-inside: avoid; }
          h1, h2, h3 { page-break-after: avoid; }
        }
      `}</style>
    </div>
  );
}
