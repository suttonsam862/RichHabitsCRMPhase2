import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, FileText, History, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { QuoteGenerator } from '@/components/quotes/QuoteGenerator';
import { useToast } from '@/hooks/use-toast';

export function QuotesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('create');
  const [searchTerm, setSearchTerm] = useState('');

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="ml-4">
              <h1 className="text-xl font-bold text-gray-900">Quote Management</h1>
              <div className="text-xs text-gray-500 mt-0.5">
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
            <QuoteGenerator 
              onQuoteGenerated={handleQuoteGenerated}
              onQuoteSaved={handleQuoteSaved}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Quotes Yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Your quote history will appear here once you start creating quotes.
                    </p>
                    <Button onClick={() => setActiveTab('create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Quote
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}