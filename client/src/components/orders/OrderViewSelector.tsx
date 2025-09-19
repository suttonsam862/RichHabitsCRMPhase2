import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Grid3X3, List, Kanban } from 'lucide-react';

export type OrderViewType = 'list' | 'grid' | 'kanban';

interface OrderViewSelectorProps {
  currentView: OrderViewType;
  onViewChange: (view: OrderViewType) => void;
  className?: string;
}

export function OrderViewSelector({ currentView, onViewChange, className }: OrderViewSelectorProps) {
  const views = [
    { type: 'list' as const, icon: List, label: 'List View' },
    { type: 'grid' as const, icon: Grid3X3, label: 'Grid View' },
    { type: 'kanban' as const, icon: Kanban, label: 'Kanban Board' },
  ];

  return (
    <div className={cn('flex items-center border rounded-lg p-1 bg-gray-50 dark:bg-gray-800', className)}>
      {views.map((view) => {
        const Icon = view.icon;
        return (
          <Button
            key={view.type}
            variant={currentView === view.type ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange(view.type)}
            className={cn(
              'h-8 px-3',
              currentView === view.type 
                ? 'bg-white dark:bg-gray-700 shadow-sm' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            data-testid={`button-view-${view.type}`}
          >
            <Icon className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}