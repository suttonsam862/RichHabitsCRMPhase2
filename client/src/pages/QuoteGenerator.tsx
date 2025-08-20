
import { useMemo, useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calendar, FileText, Plus, Trash2, Upload, History, Download } from "lucide-react";

type Item = { id: string; name: string; price: number; qty: number };
type Quote = {
  id: string;
  quote_number: string;
  date: string;
  organization_name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  tax_percent: number;
  discount: number;
  notes: string;
  items: Item[];
  subtotal: number;
  total: number;
  created_at: string;
  logo_url?: string;
};

const currency = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function QuoteGenerator() {
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [org, setOrg] = useState({ toName: "", toContact: "", toEmail: "", toPhone: "", toAddress: "" });
  const [quoteMeta, setQuoteMeta] = useState({
    quoteNo: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
    taxPct: 0,
    discount: 0,
  });
  const [items, setItems] = useState<Item[]>([{ id: crypto.randomUUID(), name: "", price: 0, qty: 1 }]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Generate automatic quote number on load
  useEffect(() => {
    generateQuoteNumber();
    fetchQuotes();
  }, []);

  const generateQuoteNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    setQuoteMeta(prev => ({ ...prev, quoteNo: `Q-${timestamp}-${random}` }));
  };

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes');
      if (response.ok) {
        const data = await response.json();
        setQuotes(data);
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    }
  };

  const saveQuote = async () => {
    try {
      const quoteData = {
        quote_number: quoteMeta.quoteNo,
        date: quoteMeta.date,
        organization_name: org.toName,
        contact_person: org.toContact,
        contact_email: org.toEmail,
        contact_phone: org.toPhone,
        contact_address: org.toAddress,
        tax_percent: quoteMeta.taxPct,
        discount: quoteMeta.discount,
        notes: quoteMeta.notes,
        items: items,
        subtotal: totals.subtotal,
        total: totals.total,
        logo_url: logoDataUrl
      };

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      });

      if (response.ok) {
        fetchQuotes();
        generateQuoteNumber(); // Generate new quote number
      }
    } catch (error) {
      console.error('Failed to save quote:', error);
    }
  };

  const loadQuote = (quote: Quote) => {
    setOrg({
      toName: quote.organization_name,
      toContact: quote.contact_person,
      toEmail: quote.contact_email,
      toPhone: quote.contact_phone,
      toAddress: quote.contact_address
    });
    setQuoteMeta({
      quoteNo: quote.quote_number,
      date: quote.date,
      notes: quote.notes,
      taxPct: quote.tax_percent,
      discount: quote.discount
    });
    setItems(quote.items);
    setLogoDataUrl(quote.logo_url || null);
    setIsHistoryOpen(false);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
    const discount = Number(quoteMeta.discount) || 0;
    const tax = ((Number(quoteMeta.taxPct) || 0) / 100) * Math.max(subtotal - discount, 0);
    const total = Math.max(subtotal - discount, 0) + tax;
    return { subtotal, discount, tax, total };
  }, [items, quoteMeta]);

  const updateItem = (id: string, patch: Partial<Item>) => setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addItem = () => setItems((arr) => [...arr, { id: crypto.randomUUID(), name: "", price: 0, qty: 1 }]);
  const removeItem = (id: string) => setItems((arr) => (arr.length > 1 ? arr.filter((it) => it.id !== id) : arr));
  const onLogoPick = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => setLogoDataUrl(String(r.result)); r.readAsDataURL(f); };

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
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-slate-600 bg-slate-800 hover:bg-slate-700">
                  <History className="w-4 h-4 mr-2" />
                  Quote History
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Quote History</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Quote #</TableHead>
                        <TableHead className="text-slate-300">Date</TableHead>
                        <TableHead className="text-slate-300">Organization</TableHead>
                        <TableHead className="text-slate-300">Total</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.map((quote) => (
                        <TableRow key={quote.id} className="border-slate-700 hover:bg-slate-800">
                          <TableCell className="text-white">{quote.quote_number}</TableCell>
                          <TableCell className="text-slate-300">{new Date(quote.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-slate-300">{quote.organization_name}</TableCell>
                          <TableCell className="text-slate-300">{currency(quote.total)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => loadQuote(quote)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                            >
                              Load
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button onClick={saveQuote} className="bg-green-600 hover:bg-green-700">
              Save Quote
            </Button>
            
            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Quote Content */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm print:bg-white print:border-gray-300 print:shadow-none">
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
                    value={quoteMeta.quoteNo} 
                    onChange={(e) => setQuoteMeta({ ...quoteMeta, quoteNo: e.target.value })} 
                    className="w-40 bg-slate-700 border-slate-600 text-white print:bg-white print:border-gray-300 print:text-black"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-slate-300 print:text-gray-600">Date</Label>
                  <Input 
                    type="date" 
                    value={quoteMeta.date} 
                    onChange={(e) => setQuoteMeta({ ...quoteMeta, date: e.target.value })} 
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
                  onChange={(e) => onLogoPick(e.target.files?.[0])} 
                  className="bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white file:border-0 file:mr-3"
                />
                <Upload className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              </div>
            </div>

            <Tabs defaultValue="details" className="space-y-6">
              <TabsList className="bg-slate-700 border-slate-600 print:hidden">
                <TabsTrigger value="details" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                  Quote Details
                </TabsTrigger>
                <TabsTrigger value="items" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                  Line Items
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Bill To Section */}
                  <Card className="bg-slate-700/50 border-slate-600 print:bg-transparent print:border-gray-300">
                    <CardHeader>
                      <CardTitle className="text-white print:text-black flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Bill To / Organization
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-slate-300 print:text-gray-600">Organization Name</Label>
                        <Input 
                          value={org.toName} 
                          onChange={(e) => setOrg({ ...org, toName: e.target.value })} 
                          className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                          placeholder="Enter organization name"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 print:text-gray-600">Contact Person</Label>
                        <Input 
                          value={org.toContact} 
                          onChange={(e) => setOrg({ ...org, toContact: e.target.value })} 
                          className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                          placeholder="Enter contact person"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 print:text-gray-600">Email</Label>
                        <Input 
                          type="email"
                          value={org.toEmail} 
                          onChange={(e) => setOrg({ ...org, toEmail: e.target.value })} 
                          className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 print:text-gray-600">Phone</Label>
                        <Input 
                          value={org.toPhone} 
                          onChange={(e) => setOrg({ ...org, toPhone: e.target.value })} 
                          className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 print:text-gray-600">Address</Label>
                        <Textarea 
                          value={org.toAddress} 
                          onChange={(e) => setOrg({ ...org, toAddress: e.target.value })} 
                          className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black resize-none"
                          placeholder="Enter full address"
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
                            value={quoteMeta.taxPct} 
                            onChange={(e) => setQuoteMeta({ ...quoteMeta, taxPct: Number(e.target.value) })} 
                            className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 print:text-gray-600">Discount ($)</Label>
                          <Input 
                            type="number" 
                            min={0} 
                            step="0.01" 
                            value={quoteMeta.discount} 
                            onChange={(e) => setQuoteMeta({ ...quoteMeta, discount: Number(e.target.value) })} 
                            className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300 print:text-gray-600">Notes / Terms</Label>
                        <Textarea 
                          value={quoteMeta.notes} 
                          onChange={(e) => setQuoteMeta({ ...quoteMeta, notes: e.target.value })} 
                          className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black resize-none"
                          placeholder="Add any additional notes or terms"
                          rows={6}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-6">
                {/* Line Items */}
                <Card className="bg-slate-700/50 border-slate-600 print:bg-transparent print:border-gray-300">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white print:text-black">Line Items</CardTitle>
                    <Button 
                      onClick={addItem} 
                      variant="outline"
                      size="sm"
                      className="border-slate-600 bg-slate-600 hover:bg-slate-500 text-white print:hidden"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-slate-600 rounded-lg overflow-hidden print:border-gray-300">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-600 border-slate-500 print:bg-gray-100 print:border-gray-300">
                            <TableHead className="text-slate-200 print:text-gray-800">Item Description</TableHead>
                            <TableHead className="text-slate-200 print:text-gray-800 w-24">Price</TableHead>
                            <TableHead className="text-slate-200 print:text-gray-800 w-20">Qty</TableHead>
                            <TableHead className="text-slate-200 print:text-gray-800 w-24">Amount</TableHead>
                            <TableHead className="print:hidden w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, index) => {
                            const amount = (Number(item.price) || 0) * (Number(item.qty) || 0);
                            return (
                              <TableRow key={item.id} className="border-slate-600 print:border-gray-300">
                                <TableCell className="p-2">
                                  <Input 
                                    placeholder="Describe the item…" 
                                    value={item.name} 
                                    onChange={(e) => updateItem(item.id, { name: e.target.value })} 
                                    className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                                  />
                                </TableCell>
                                <TableCell className="p-2">
                                  <Input 
                                    type="number" 
                                    min={0} 
                                    step="0.01" 
                                    value={item.price} 
                                    onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })} 
                                    className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                                  />
                                </TableCell>
                                <TableCell className="p-2">
                                  <Input 
                                    type="number" 
                                    min={0} 
                                    step="1" 
                                    value={item.qty} 
                                    onChange={(e) => updateItem(item.id, { qty: Number(e.target.value) })} 
                                    className="bg-slate-600 border-slate-500 text-white print:bg-white print:border-gray-300 print:text-black"
                                  />
                                </TableCell>
                                <TableCell className="p-2 text-white print:text-black font-medium">
                                  {currency(amount)}
                                </TableCell>
                                <TableCell className="p-2 print:hidden">
                                  <Button 
                                    onClick={() => removeItem(item.id)} 
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300 hover:bg-slate-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Totals */}
                <div className="flex justify-end">
                  <Card className="w-full max-w-md bg-slate-700/50 border-slate-600 print:bg-transparent print:border-gray-300">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-slate-300 print:text-gray-600">
                          <span>Subtotal</span>
                          <span>{currency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 print:text-gray-600">
                          <span>Discount</span>
                          <span>-{currency(totals.discount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 print:text-gray-600">
                          <span>Tax</span>
                          <span>{currency(totals.tax)}</span>
                        </div>
                        <Separator className="bg-slate-600 print:bg-gray-300" />
                        <div className="flex justify-between text-xl font-bold text-white print:text-black">
                          <span>Total</span>
                          <span>{currency(totals.total)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

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
