
const QUOTE_HISTORY_KEY = 'quote.history.v1';
const QUOTE_LOGO_KEY = 'quote.logo.v1';

export interface QuoteRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  org: {
    toName: string;
    toContact: string;
    toEmail: string;
    toPhone: string;
    toAddress: string;
  };
  items: Array<{
    name: string;
    price: number;
    qty: number;
  }>;
  meta: {
    quoteNo: string;
    date: string;
    taxPct: number;
    discount: number;
    notes: string;
  };
  logoDataUrl?: string | null;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function loadHistory(): QuoteRecord[] {
  try {
    const data = localStorage.getItem(QUOTE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Failed to load quote history:', error);
    return [];
  }
}

export function saveHistory(quotes: QuoteRecord[]): void {
  try {
    localStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(quotes));
  } catch (error) {
    console.error('Failed to save quote history:', error);
  }
}

export function upsertQuote(quote: QuoteRecord): void {
  const history = loadHistory();
  const existingIndex = history.findIndex(q => q.id === quote.id);
  
  if (existingIndex >= 0) {
    history[existingIndex] = { ...quote, updatedAt: new Date().toISOString() };
  } else {
    history.unshift(quote);
  }
  
  saveHistory(history);
}

export function getQuote(id: string): QuoteRecord | null {
  const history = loadHistory();
  return history.find(q => q.id === id) || null;
}

export function deleteQuote(id: string): void {
  const history = loadHistory();
  const filtered = history.filter(q => q.id !== id);
  saveHistory(filtered);
}

export function saveDefaultLogo(dataUrl: string): void {
  try {
    localStorage.setItem(QUOTE_LOGO_KEY, dataUrl);
  } catch (error) {
    console.error('Failed to save default logo:', error);
  }
}

export function getDefaultLogo(): string | null {
  try {
    return localStorage.getItem(QUOTE_LOGO_KEY);
  } catch (error) {
    console.warn('Failed to load default logo:', error);
    return null;
  }
}

export function exportQuotes(): string {
  const history = loadHistory();
  return JSON.stringify(history, null, 2);
}

export function importQuotes(jsonData: string): number {
  try {
    const importedQuotes: QuoteRecord[] = JSON.parse(jsonData);
    const currentHistory = loadHistory();
    
    // Merge without duplicates (by id)
    const existingIds = new Set(currentHistory.map(q => q.id));
    const newQuotes = importedQuotes.filter(q => !existingIds.has(q.id));
    
    const merged = [...currentHistory, ...newQuotes];
    saveHistory(merged);
    
    return newQuotes.length;
  } catch (error) {
    console.error('Failed to import quotes:', error);
    throw new Error('Invalid JSON format');
  }
}
