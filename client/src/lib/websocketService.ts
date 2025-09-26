import { WebSocketMessage } from '../../../shared/dtos/NotificationDTO';
import { queryClient } from './queryClient';

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isAuthenticated: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isAuthenticated: false,
    isReconnecting: false,
    reconnectAttempts: 0,
  };
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private authToken: string | null = null;
  private orgId: string | null = null;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(token: string, orgId: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('WebSocket is already connected');
      return;
    }

    this.authToken = token;
    this.orgId = orgId;

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
      
      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          this.updateConnectionStatus({
            isConnected: true,
            isAuthenticated: false,
            isReconnecting: false,
          });
          resolve();
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      // Authenticate after connection
      await this.authenticate();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.updateConnectionStatus({
        lastError: error instanceof Error ? error.message : 'Connection failed',
      });
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateConnectionStatus({
      isConnected: false,
      isAuthenticated: false,
      isReconnecting: false,
      reconnectAttempts: 0,
    });
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket is not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }

  /**
   * Join a room
   */
  joinRoom(roomName: string): void {
    this.send({
      type: 'join_room',
      payload: { roomName }
    });
  }

  /**
   * Leave a room
   */
  leaveRoom(roomName: string): void {
    this.send({
      type: 'leave_room',
      payload: { roomName }
    });
  }

  /**
   * Subscribe to message type
   */
  subscribe(messageType: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    
    // Call immediately with current status
    listener(this.connectionStatus);

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.updateConnectionStatus({
        isConnected: true,
        reconnectAttempts: 0,
      });
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.updateConnectionStatus({
        isConnected: false,
        isAuthenticated: false,
      });

      // Attempt to reconnect if not a manual disconnect
      if (event.code !== 1000 && this.connectionStatus.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus({
        lastError: 'Connection error',
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  private async authenticate(): Promise<void> {
    if (!this.authToken || !this.orgId) {
      throw new Error('Authentication credentials not set');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      // Listen for auth response
      const unsubscribe = this.subscribe('connection_status', (data) => {
        if (data.status === 'authenticated') {
          clearTimeout(timeout);
          this.updateConnectionStatus({ isAuthenticated: true });
          this.startHeartbeat();
          unsubscribe();
          resolve();
        } else if (data.status === 'error' && data.message?.includes('Authentication')) {
          clearTimeout(timeout);
          unsubscribe();
          reject(new Error(data.message));
        }
      });

      // Send auth message
      this.send({
        type: 'auth',
        payload: {
          token: this.authToken,
          orgId: this.orgId,
        }
      });
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle connection status messages
    if (message.type === 'connection_status') {
      // These are handled by specific subscribers
    }

    // Handle real-time data updates
    if (['order_update', 'order_item_update', 'design_job_update', 'work_order_update', 'fulfillment_update'].includes(message.type)) {
      this.handleDataUpdate(message);
    }

    // Handle notifications
    if (message.type === 'notification') {
      this.handleNotification(message);
    }

    // Broadcast to specific message type subscribers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.payload);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
  }

  private handleDataUpdate(message: WebSocketMessage): void {
    const { payload } = message;
    
    try {
      // Invalidate related queries based on the entity type
      switch (message.type) {
        case 'order_update':
          this.invalidateOrderQueries(payload);
          break;
        case 'order_item_update':
          this.invalidateOrderItemQueries(payload);
          break;
        case 'design_job_update':
          this.invalidateDesignJobQueries(payload);
          break;
        case 'work_order_update':
          this.invalidateWorkOrderQueries(payload);
          break;
        case 'fulfillment_update':
          this.invalidateFulfillmentQueries(payload);
          break;
      }
    } catch (error) {
      console.error('Error handling data update:', error);
    }
  }

  private handleNotification(message: WebSocketMessage): void {
    // Invalidate notification queries
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    
    // You can add toast notifications here if needed
    // toast.success(message.payload.notification.title);
  }

  private invalidateOrderQueries(payload: any): void {
    // Invalidate order list queries
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    
    // Invalidate specific order if we have the ID
    if (payload.entityId) {
      queryClient.invalidateQueries({ queryKey: ['orders', payload.entityId] });
    }
    
    // Invalidate order stats
    queryClient.invalidateQueries({ queryKey: ['orders', 'stats'] });
  }

  private invalidateOrderItemQueries(payload: any): void {
    // Invalidate order queries (since order items affect order totals)
    if (payload.orderId) {
      queryClient.invalidateQueries({ queryKey: ['orders', payload.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders', payload.orderId, 'items'] });
    }
    
    // Invalidate order lists
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }

  private invalidateDesignJobQueries(payload: any): void {
    // Invalidate design job queries
    queryClient.invalidateQueries({ queryKey: ['design-jobs'] });
    
    if (payload.entityId) {
      queryClient.invalidateQueries({ queryKey: ['design-jobs', payload.entityId] });
    }
    
    // Invalidate related order queries
    if (payload.orderId) {
      queryClient.invalidateQueries({ queryKey: ['orders', payload.orderId] });
    }
  }

  private invalidateWorkOrderQueries(payload: any): void {
    // Invalidate work order queries
    queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    
    if (payload.entityId) {
      queryClient.invalidateQueries({ queryKey: ['work-orders', payload.entityId] });
    }
    
    // Invalidate related order queries
    if (payload.orderId) {
      queryClient.invalidateQueries({ queryKey: ['orders', payload.orderId] });
    }
  }

  private invalidateFulfillmentQueries(payload: any): void {
    // Invalidate fulfillment queries
    queryClient.invalidateQueries({ queryKey: ['fulfillment'] });
    
    // Invalidate related order queries
    if (payload.orderId) {
      queryClient.invalidateQueries({ queryKey: ['orders', payload.orderId] });
    }
  }

  private attemptReconnect(): void {
    if (this.connectionStatus.isReconnecting) return;

    this.updateConnectionStatus({
      isReconnecting: true,
      reconnectAttempts: this.connectionStatus.reconnectAttempts + 1,
    });

    this.reconnectTimeout = setTimeout(async () => {
      try {
        if (this.authToken && this.orgId) {
          await this.connect(this.authToken, this.orgId);
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        if (this.connectionStatus.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          this.updateConnectionStatus({
            isReconnecting: false,
            lastError: 'Max reconnection attempts reached',
          });
        }
      }
    }, this.config.reconnectInterval * Math.pow(2, this.connectionStatus.reconnectAttempts));
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  private updateConnectionStatus(update: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...update };
    
    // Notify all status listeners
    this.statusListeners.forEach(listener => {
      try {
        listener(this.connectionStatus);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }
}

// Default configuration
const defaultConfig: WebSocketConfig = {
  url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
  reconnectInterval: 1000, // Start with 1 second, exponential backoff
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000, // 30 seconds
};

// Global WebSocket service instance
export const websocketService = new WebSocketService(defaultConfig);