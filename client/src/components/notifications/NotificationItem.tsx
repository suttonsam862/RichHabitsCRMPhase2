import { formatDistanceToNow } from 'date-fns';
import { Check, AlertCircle, CheckCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
  data?: any;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNavigate: () => void;
}

export function NotificationItem({ notification, onMarkAsRead, onNavigate }: NotificationItemProps) {
  const getTypeIcon = () => {
    switch (notification.type) {
      case 'success':
      case 'order_update':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getTypeColor = () => {
    switch (notification.type) {
      case 'success':
      case 'order_update':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-blue-500';
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'normal':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-gray-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const Icon = getTypeIcon();
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      onNavigate();
    }
  };

  const content = (
    <div 
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border-l-2 transition-colors hover:bg-muted/50 cursor-pointer',
        getPriorityColor(),
        !notification.isRead && 'bg-muted/30'
      )}
      onClick={handleClick}
      data-testid={`notification-item-${notification.id}`}
    >
      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', getTypeColor())} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'text-sm font-medium line-clamp-1',
              !notification.isRead && 'font-semibold'
            )}>
              {notification.title}
            </h4>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {notification.message}
            </p>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {notification.priority !== 'normal' && (
              <Badge 
                variant={notification.priority === 'urgent' || notification.priority === 'high' ? 'destructive' : 'secondary'}
                className="text-xs px-1 py-0"
              >
                {notification.priority}
              </Badge>
            )}
            
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" data-testid="indicator-unread" />
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {notification.category}
            </Badge>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          
          {notification.actionUrl && (
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {!notification.isRead && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead(notification.id);
          }}
          data-testid={`button-mark-read-${notification.id}`}
        >
          <Check className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl}>
        {content}
      </Link>
    );
  }

  return content;
}