import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, FileText, History, Search, Eye, Calendar, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// QuoteGenerator component moved to dedicated page route
import { useToast } from '@/hooks/use-toast';
import { loadHistory, QuoteRecord } from '@/lib/quoteStore';
import GlowCard from '@/components/ui/GlowCard';

export function QuotesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('create');
  const [searchTerm, setSearchTerm] = useState('');
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);

  useEffect(() => {
    setQuotes(loadHistory());
  }, [activeTab]); // Reload when switching to history tab

  const handleQuoteGenerated = (quoteData: any) => {
    // Handle quote generation - download PDF, show in history, etc.
    console.log('Quote generated:', quoteData);
  };

  const handleQuoteSaved = (quoteData: any) => {
    // Handle quote save - add to drafts, show success message, etc.
    console.log('Quote saved:', quoteData);
    setActiveTab('history'); // Switch to history tab to show saved quote
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <header className="bg-gradient-to-r from-gray-900 to-black shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="ml-4">
              <h1 className="text-xl font-bold text-white">Quote Management</h1>
              <div className="text-xs text-gray-400 mt-0.5">
                Developing Habits LLC | Rich Habits
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Quote
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Quote History
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'history' && (
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>

          <TabsContent value="create" className="space-y-6">
            <GlowCard className="bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white border border-gray-800">
              <div className="p-6">
                <div className="text-center">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-2">Create New Estimate</h3>
                    <p className="text-gray-300">Generate professional estimates for your clients</p>
                  </div>
                  <div className="space-y-4">
                    <Link to="/quote">
                      <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-5 h-5 mr-2" />
                        Start New Estimate
                      </Button>
                    </Link>
                    <p className="text-sm text-gray-400">
                      You'll be taken to our full estimate generator with all the tools you need
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <GlowCard className="bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white border border-gray-800">
              <div className="p-6">
                {quotes.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Estimates Yet</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Your estimate history will appear here once you start creating estimates.
                      </p>
                      <Button onClick={() => setActiveTab('create')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Estimate
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white">Recent Estimates ({quotes.length})</h3>
                      <Link to="/quotes/history">
                        <Button variant="outline" size="sm">
                          <History className="w-4 h-4 mr-2" />
                          View All History
                        </Button>
                      </Link>
                    </div>

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Organization</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quotes.slice(0, 5).map((quote) => (
                            <TableRow key={quote.id}>
                              <TableCell className="font-medium">{quote.title}</TableCell>
                              <TableCell>{quote.org.toName || 'No organization'}</TableCell>
                              <TableCell>
                                <div className="flex items-center text-sm text-gray-500">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {new Date(quote.meta.date).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center font-medium">
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  ${quote.totals.total.toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Link to={`/quote?id=${quote.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {quotes.length > 5 && (
                      <div className="text-center">
                        <Link to="/quotes/history">
                          <Button variant="ghost">
                            View {quotes.length - 5} more estimates...
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </GlowCard>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default QuotesPage;