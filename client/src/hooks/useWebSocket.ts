import { useState, useEffect, useRef, useCallback } from 'react';
import { websocketService, ConnectionStatus } from '../lib/websocketService';
import { useAuth } from '../auth/auth-context';

export function useWebSocket() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>(() => websocketService.getStatus());
  const isInitializedRef = useRef(false);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize connection when user is available
  useEffect(() => {
    if (!user || isInitializedRef.current) return;

    const token = localStorage.getItem('token');
    if (!token || !user.organization_id) return;

    // Subscribe to status changes
    statusUnsubscribeRef.current = websocketService.onStatusChange(setStatus);

    // Connect to WebSocket
    websocketService.connect(token, user.organization_id).then(() => {
      console.log('WebSocket connected and authenticated');
      isInitializedRef.current = true;
    }).catch(error => {
      console.error('Failed to initialize WebSocket:', error);
    });

    return () => {
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
        statusUnsubscribeRef.current = null;
      }
    };
  }, [user]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      websocketService.disconnect();
      isInitializedRef.current = false;
    };
  }, []);

  const subscribe = useCallback((messageType: string, handler: (data: any) => void) => {
    return websocketService.subscribe(messageType, handler);
  }, []);

  const joinRoom = useCallback((roomName: string) => {
    websocketService.joinRoom(roomName);
  }, []);

  const leaveRoom = useCallback((roomName: string) => {
    websocketService.leaveRoom(roomName);
  }, []);

  const send = useCallback((message: any) => {
    websocketService.send(message);
  }, []);

  return {
    status,
    isConnected: status.isConnected,
    isAuthenticated: status.isAuthenticated,
    isReconnecting: status.isReconnecting,
    lastError: status.lastError,
    subscribe,
    joinRoom,
    leaveRoom,
    send,
  };
}

/**
 * Hook for subscribing to specific message types
 */
export function useWebSocketSubscription(messageType: string, handler: (data: any) => void) {
  const { subscribe } = useWebSocket();
  const handlerRef = useRef(handler);

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const stableHandler = (data: any) => handlerRef.current(data);
    const unsubscribe = subscribe(messageType, stableHandler);

    return unsubscribe;
  }, [messageType, subscribe]);
}

/**
 * Hook for joining/leaving rooms automatically
 */
export function useWebSocketRoom(roomName: string | null) {
  const { joinRoom, leaveRoom, isAuthenticated } = useWebSocket();

  useEffect(() => {
    if (!roomName || !isAuthenticated) return;

    joinRoom(roomName);

    return () => {
      leaveRoom(roomName);
    };
  }, [roomName, isAuthenticated, joinRoom, leaveRoom]);
}

/**
 * Hook for real-time order updates
 */
export function useOrderRealtimeUpdates(orderId?: string) {
  const { subscribe } = useWebSocket();
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useWebSocketRoom(orderId ? `order:${orderId}` : null);

  useEffect(() => {
    const unsubscribeOrder = subscribe('order_update', (data) => {
      if (!orderId || data.entityId === orderId) {
        setLastUpdate({ type: 'order', data, timestamp: Date.now() });
      }
    });

    const unsubscribeItem = subscribe('order_item_update', (data) => {
      if (!orderId || data.orderId === orderId) {
        setLastUpdate({ type: 'order_item', data, timestamp: Date.now() });
      }
    });

    return () => {
      unsubscribeOrder();
      unsubscribeItem();
    };
  }, [subscribe, orderId]);

  return lastUpdate;
}

/**
 * Hook for real-time notification updates
 */
export function useNotificationUpdates() {
  const { subscribe } = useWebSocket();
  const [lastNotification, setLastNotification] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = subscribe('notification', (data) => {
      setLastNotification({ ...data, timestamp: Date.now() });
    });

    return unsubscribe;
  }, [subscribe]);

  return lastNotification;
}