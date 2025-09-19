import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ChevronDown,
  Play,
  Pause,
  Archive,
  Trash2,
  Copy,
  Download,
  Mail,
  Edit,
  Tag,
  X
} from 'lucide-react';

interface OrderBulkActionsProps {
  selectedCount: number;
  onAction: (action: string) => void;
  onClear: () => void;
  className?: string;
}

export function OrderBulkActions({ selectedCount, onAction, onClear, className }: OrderBulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleAction = (action: string) => {
    if (action === 'delete') {
      setShowDeleteDialog(true);
    } else if (action === 'archive') {
      setShowArchiveDialog(true);
    } else {
      onAction(action);
    }
  };

  const confirmDelete = () => {
    onAction('delete');
    setShowDeleteDialog(false);
  };

  const confirmArchive = () => {
    onAction('archive');
    setShowArchiveDialog(false);
  };

  return (
    <>
      <div className={cn(
        'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 flex items-center gap-4',
        className
      )}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-medium">
            {selectedCount} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 w-6 p-0"
            data-testid="button-clear-selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('start')}
            data-testid="button-bulk-start"
          >
            <Play className="h-4 w-4 mr-2" />
            Start
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('pause')}
            data-testid="button-bulk-pause"
          >
            <Pause className="h-4 w-4 mr-2" />
            Hold
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('export')}
            data-testid="button-bulk-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                data-testid="button-bulk-more"
              >
                More
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleAction('duplicate')}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Orders
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleAction('edit_status')}>
                <Edit className="h-4 w-4 mr-2" />
                Change Status
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleAction('assign_salesperson')}>
                <Tag className="h-4 w-4 mr-2" />
                Assign Salesperson
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleAction('send_email')}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email Update
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleAction('archive')}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => handleAction('delete')}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} order{selectedCount > 1 ? 's' : ''}? 
              This action cannot be undone and will remove all associated data including order items, 
              design files, and production records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete {selectedCount} Order{selectedCount > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {selectedCount} order{selectedCount > 1 ? 's' : ''}? 
              Archived orders will be moved out of active views but can be restored later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive}>
              Archive {selectedCount} Order{selectedCount > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}