import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Clock,
  User,
  Package,
  Edit,
  Trash2,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Filter
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  event_code: string;
  actor_user_id?: string;
  actor_name?: string;
  actor_avatar?: string;
  payload?: any;
  occurred_at: string;
  event_type?: 'status_change' | 'item_added' | 'item_updated' | 'note_added' | 'assignment' | 'file_upload' | 'payment' | 'shipping';
}

interface OrderTimelineProps {
  orderId: string;
  events: TimelineEvent[];
  isLoading?: boolean;
  onAddNote?: () => void;
  className?: string;
}

export function OrderTimeline({
  events,
  isLoading = false,
  onAddNote,
  className
}: OrderTimelineProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getEventIcon = (eventCode: string) => {
    const iconMap: Record<string, any> = {
      order_created: Package,
      status_changed: ArrowRight,
      item_added: Plus,
      item_updated: Edit,
      item_removed: Trash2,
      note_added: MessageSquare,
      file_uploaded: FileText,
      design_assigned: User,
      manufacturer_assigned: User,
      payment_received: CheckCircle2,
      payment_failed: AlertTriangle,
      shipped: Package,
      delivered: CheckCircle2,
    };

    return iconMap[eventCode] || Clock;
  };

  const getEventColor = (eventCode: string) => {
    const colorMap: Record<string, string> = {
      order_created: 'bg-blue-500',
      status_changed: 'bg-purple-500',
      item_added: 'bg-green-500',
      item_updated: 'bg-yellow-500',
      item_removed: 'bg-red-500',
      note_added: 'bg-gray-500',
      file_uploaded: 'bg-indigo-500',
      design_assigned: 'bg-pink-500',
      manufacturer_assigned: 'bg-orange-500',
      payment_received: 'bg-green-600',
      payment_failed: 'bg-red-600',
      shipped: 'bg-blue-600',
      delivered: 'bg-green-700',
    };

    return colorMap[eventCode] || 'bg-gray-400';
  };

  const getEventTitle = (event: TimelineEvent) => {
    const titleMap: Record<string, string> = {
      order_created: 'Order Created',
      status_changed: 'Status Changed',
      item_added: 'Item Added',
      item_updated: 'Item Updated',
      item_removed: 'Item Removed',
      note_added: 'Note Added',
      file_uploaded: 'File Uploaded',
      design_assigned: 'Designer Assigned',
      manufacturer_assigned: 'Manufacturer Assigned',
      payment_received: 'Payment Received',
      payment_failed: 'Payment Failed',
      shipped: 'Order Shipped',
      delivered: 'Order Delivered',
    };

    return titleMap[event.event_code] || event.event_code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEventDescription = (event: TimelineEvent) => {
    const payload = event.payload || {};
    
    switch (event.event_code) {
      case 'status_changed':
        return `Status changed from "${payload.from_status || 'unknown'}" to "${payload.to_status || 'unknown'}"`;
      case 'item_added':
        return `Added "${payload.item_name || 'item'}" (Qty: ${payload.quantity || 1})`;
      case 'item_updated':
        return `Updated "${payload.item_name || 'item'}"${payload.changes ? ` - ${payload.changes}` : ''}`;
      case 'item_removed':
        return `Removed "${payload.item_name || 'item'}" from order`;
      case 'note_added':
        return payload.note || 'Added a note to the order';
      case 'file_uploaded':
        return `Uploaded "${payload.filename || 'file'}"`;
      case 'design_assigned':
        return `Assigned to designer ${payload.designer_name || 'unknown'}`;
      case 'manufacturer_assigned':
        return `Assigned to manufacturer ${payload.manufacturer_name || 'unknown'}`;
      case 'payment_received':
        return `Payment of ${payload.amount || 'unknown amount'} received`;
      case 'payment_failed':
        return `Payment failed: ${payload.reason || 'unknown reason'}`;
      case 'shipped':
        return `Shipped via ${payload.carrier || 'unknown carrier'}${payload.tracking_number ? ` (${payload.tracking_number})` : ''}`;
      case 'delivered':
        return `Delivered successfully`;
      default:
        return payload.description || 'Activity recorded';
    }
  };

  const getEventTypeLabel = (eventType?: string) => {
    const labels: Record<string, string> = {
      status_change: 'Status',
      item_added: 'Item',
      item_updated: 'Item',
      note_added: 'Note',
      assignment: 'Assignment',
      file_upload: 'File',
      payment: 'Payment',
      shipping: 'Shipping',
    };
    return labels[eventType || ''] || 'Activity';
  };

  const filteredEvents = events.filter(event => {
    if (filterType === 'all') return true;
    return event.event_type === filterType;
  });

  const eventTypes = Array.from(new Set(events.map(e => e.event_type).filter(Boolean)));

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Order Timeline ({events.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            {eventTypes.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-timeline-filter"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            )}
            {onAddNote && (
              <Button size="sm" onClick={onAddNote} data-testid="button-add-note">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            )}
          </div>
        </div>
        
        {showFilters && eventTypes.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            {eventTypes.map(type => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type || 'all')}
              >
                {getEventTypeLabel(type)}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No activity yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Order activity and events will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-6 pr-4">
              {filteredEvents.map((event, index) => {
                const Icon = getEventIcon(event.event_code);
                const iconColor = getEventColor(event.event_code);
                const isLast = index === filteredEvents.length - 1;

                return (
                  <div key={event.id} className="relative flex items-start space-x-4">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-4 top-8 h-full w-px bg-gray-200 dark:bg-gray-700" />
                    )}
                    
                    {/* Event icon */}
                    <div className={cn(
                      'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white',
                      iconColor
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {getEventTitle(event)}
                            </h4>
                            {event.event_type && (
                              <Badge variant="outline" className="text-xs">
                                {getEventTypeLabel(event.event_type)}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {getEventDescription(event)}
                          </p>

                          {event.actor_name && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              <span>by {event.actor_name}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 ml-4 flex-shrink-0">
                          {formatDate(event.occurred_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}