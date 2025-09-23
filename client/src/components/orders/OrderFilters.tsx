import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Search, Filter, X, Calendar as CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';

export interface OrderFiltersData {
  search: string;
  status: string;
  customer: string;
  salesperson: string;
  sport: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
  amountRange: {
    min?: number;
    max?: number;
  };
}

interface OrderFiltersProps {
  filters: OrderFiltersData;
  onFiltersChange: (filters: OrderFiltersData) => void;
  onExport?: () => void;
  className?: string;
}

export function OrderFilters({ filters, onFiltersChange, onExport, className }: OrderFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof OrderFiltersData, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilter = (key: keyof OrderFiltersData) => {
    const defaultValues = {
      search: '',
      status: 'all',
      customer: 'all',
      salesperson: 'all',
      sport: 'all',
      dateRange: {},
      amountRange: {},
    };
    updateFilter(key, defaultValues[key]);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      customer: 'all',
      salesperson: 'all',
      sport: 'all',
      dateRange: {},
      amountRange: {},
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.customer && filters.customer !== 'all') count++;
    if (filters.salesperson && filters.salesperson !== 'all') count++;
    if (filters.sport && filters.sport !== 'all') count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.amountRange.min || filters.amountRange.max) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search orders by code, customer, or notes..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
            data-testid="input-search-orders"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearFilter('search')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="manufacturing">Manufacturing</SelectItem>
            <SelectItem value="fulfillment">Fulfillment</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="relative"
          data-testid="button-advanced-filters"
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced
          {activeFilterCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Export Button */}
        {onExport && (
          <Button variant="outline" onClick={onExport} data-testid="button-export-orders">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={clearAllFilters} data-testid="button-clear-filters">
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {/* Customer Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Customer</label>
            <Select value={filters.customer} onValueChange={(value) => updateFilter('customer', value)}>
              <SelectTrigger data-testid="select-customer-filter">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {/* TODO: Populate with actual customers */}
                <SelectItem value="customer1">Customer 1</SelectItem>
                <SelectItem value="customer2">Customer 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Salesperson Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Salesperson</label>
            <Select value={filters.salesperson} onValueChange={(value) => updateFilter('salesperson', value)}>
              <SelectTrigger data-testid="select-salesperson-filter">
                <SelectValue placeholder="All Salespeople" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Salespeople</SelectItem>
                {/* TODO: Populate with actual salespeople */}
                <SelectItem value="sales1">Sales Person 1</SelectItem>
                <SelectItem value="sales2">Sales Person 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sport Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Sport/Team</label>
            <Select value={filters.sport} onValueChange={(value) => updateFilter('sport', value)}>
              <SelectTrigger data-testid="select-sport-filter">
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                {/* TODO: Populate with actual sports */}
                <SelectItem value="basketball">Basketball</SelectItem>
                <SelectItem value="football">Football</SelectItem>
                <SelectItem value="baseball">Baseball</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                        {format(filters.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange.from}
                  selected={filters.dateRange}
                  onSelect={(range) => updateFilter('dateRange', range || {})}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount Range Filter */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-2 block">Amount Range</label>
            <div className="flex gap-2">
              <Input
                placeholder="Min amount"
                type="number"
                value={filters.amountRange.min || ''}
                onChange={(e) => updateFilter('amountRange', { 
                  ...filters.amountRange, 
                  min: e.target.value ? Number(e.target.value) : undefined 
                })}
                data-testid="input-amount-min"
              />
              <Input
                placeholder="Max amount"
                type="number"
                value={filters.amountRange.max || ''}
                onChange={(e) => updateFilter('amountRange', { 
                  ...filters.amountRange, 
                  max: e.target.value ? Number(e.target.value) : undefined 
                })}
                data-testid="input-amount-max"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('search')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.status && filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('status')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {/* Add more active filter badges as needed */}
        </div>
      )}
    </div>
  );
}