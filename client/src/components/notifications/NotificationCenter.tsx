import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useNotificationUpdates } from '@/hooks/useWebSocket';
import { NotificationItem } from './NotificationItem';
import { ConnectionStatus } from '@/components/ui/connection-status';

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

interface NotificationStats {
  total: number;
  byCategory: {
    order: number;
    design: number;
    manufacturing: number;
    fulfillment: number;
    system: number;
  };
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get real-time notification updates
  const lastNotification = useNotificationUpdates();

  // Fetch unread count
  const { data: stats, refetch: refetchStats } = useQuery<NotificationStats>({
    queryKey: ['notifications', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/stats');
      if (!response.ok) throw new Error('Failed to fetch notification stats');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });

  // Fetch notifications
  const { data: notifications, isLoading, refetch: refetchNotifications } = useQuery<{
    data: Notification[];
    pagination: any;
  }>({
    queryKey: ['notifications', categoryFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '50',
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(statusFilter === 'unread' && { isRead: 'false' }),
        ...(statusFilter === 'read' && { isRead: 'true' }),
      });
      
      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: isOpen,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchStats();
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async (category?: string) => {
      return apiRequest('/api/notifications/mark-all-read', {
        method: 'PATCH',
        data: { category: category !== 'all' ? category : undefined },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchStats();
    },
  });

  // Refetch when real-time updates arrive
  useEffect(() => {
    if (lastNotification) {
      refetchStats();
      if (isOpen) {
        refetchNotifications();
      }
    }
  }, [lastNotification, isOpen, refetchStats, refetchNotifications]);

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(categoryFilter !== 'all' ? categoryFilter : undefined);
  };

  const filteredNotifications = notifications?.data || [];
  const unreadCount = stats?.total || 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" data-testid="popover-notification-center">
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              <ConnectionStatus variant="compact" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32" data-testid="select-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="order">Orders</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="fulfillment">Fulfillment</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-24" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-pulse text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {statusFilter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onNavigate={() => setIsOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {stats && (
          <div className="border-t p-3 bg-muted/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Unread by category:</span>
              <div className="flex items-center gap-2">
                {stats.byCategory.order > 0 && (
                  <span>Orders: {stats.byCategory.order}</span>
                )}
                {stats.byCategory.design > 0 && (
                  <span>Design: {stats.byCategory.design}</span>
                )}
                {stats.byCategory.manufacturing > 0 && (
                  <span>Mfg: {stats.byCategory.manufacturing}</span>
                )}
                {stats.byCategory.fulfillment > 0 && (
                  <span>Ship: {stats.byCategory.fulfillment}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}