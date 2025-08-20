
import React, { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/use-toast';
import { 
  loadHistory, 
  deleteQuote, 
  exportQuotes, 
  importQuotes, 
  upsertQuote, 
  generateId,
  QuoteRecord 
} from '../lib/quoteStore';
import { 
  Eye, 
  Copy, 
  Trash2, 
  Plus, 
  Download, 
  Upload, 
  FileText,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function QuoteHistory() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>(() => loadHistory());
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredQuotes = quotes.filter(quote => 
    quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.org.toName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.meta.quoteNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = useCallback((id: string) => {
    if (deleteConfirm === id) {
      deleteQuote(id);
      setQuotes(loadHistory());
      setDeleteConfirm(null);
      toast({
        title: "Quote deleted",
        description: "The quote has been permanently removed.",
      });
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  }, [deleteConfirm, toast]);

  const handleDuplicate = useCallback((quote: QuoteRecord) => {
    const duplicated: QuoteRecord = {
      ...quote,
      id: generateId(),
      title: `${quote.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    upsertQuote(duplicated);
    setQuotes(loadHistory());
    
    toast({
      title: "Quote duplicated",
      description: "A copy of the quote has been created.",
    });
  }, [toast]);

  const handleExport = useCallback(() => {
    const data = exportQuotes();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export complete",
      description: "Quote history has been downloaded.",
    });
  }, [toast]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const imported = importQuotes(jsonData);
        setQuotes(loadHistory());
        
        toast({
          title: "Import successful",
          description: `${imported} new quotes have been imported.`,
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Please check the file format and try again.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [toast]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Quote History</h1>
            <p className="text-white/70">Manage your saved quotes and proposals</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={quotes.length === 0}
              className="border-slate-600 bg-slate-800 hover:bg-slate-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <Button 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-slate-600 bg-slate-800 hover:bg-slate-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Link to="/quote">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Quote
              </Button>
            </Link>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />

        {quotes.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Search & Filter</CardTitle>
                <Badge variant="secondary">{filteredQuotes.length} of {quotes.length} quotes</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by title, organization, or quote number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </CardContent>
          </Card>
        )}

        {quotes.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-white/40 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No saved quotes yet</h3>
              <p className="text-white/70 text-center mb-6">
                Create your first quote to start building your history
              </p>
              <Link to="/quote">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Quote
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Saved Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-600">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-600">
                      <TableHead className="text-white/80">Title</TableHead>
                      <TableHead className="text-white/80">Organization</TableHead>
                      <TableHead className="text-white/80">Quote #</TableHead>
                      <TableHead className="text-white/80">Date</TableHead>
                      <TableHead className="text-white/80">Total</TableHead>
                      <TableHead className="text-white/80">Updated</TableHead>
                      <TableHead className="text-white/80 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id} className="border-slate-600">
                        <TableCell className="text-white font-medium">
                          {quote.title}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {quote.org.toName || 'No organization'}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {quote.meta.quoteNo || 'N/A'}
                        </TableCell>
                        <TableCell className="text-white/80">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(quote.meta.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-white/80">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(quote.totals.total)}
                          </div>
                        </TableCell>
                        <TableCell className="text-white/60 text-sm">
                          {formatDate(quote.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/quote?id=${quote.id}`)}
                              title="Open quote"
                              className="text-white/80 hover:text-white hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(quote)}
                              title="Duplicate quote"
                              className="text-white/80 hover:text-white hover:bg-slate-700"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/quote?id=${quote.id}`, '_blank')}
                              title="Print quote"
                              className="text-white/80 hover:text-white hover:bg-slate-700"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={deleteConfirm === quote.id ? "destructive" : "ghost"}
                              size="sm"
                              onClick={() => handleDelete(quote.id)}
                              title={deleteConfirm === quote.id ? "Click again to confirm deletion" : "Delete quote"}
                              className={deleteConfirm === quote.id ? "" : "text-red-400 hover:text-red-300 hover:bg-red-900/20"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {deleteConfirm && (
          <Alert className="border-red-500/50 bg-red-950/50">
            <Trash2 className="h-4 w-4" />
            <AlertDescription className="text-white">
              Click the delete button again within 3 seconds to confirm permanent deletion.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
