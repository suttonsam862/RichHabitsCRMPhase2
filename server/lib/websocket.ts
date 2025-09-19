import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { verify } from 'jsonwebtoken';
import { supabaseAdmin } from './supabaseAdmin';
import type { WebSocketMessage, WebSocketAuth, CreateRealtimeEvent } from '../../shared/dtos/NotificationDTO';
import { env } from './env';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  orgId?: string;
  isAuthenticated?: boolean;
  rooms?: Set<string>;
  lastPing?: number;
  messageCount?: number;
  lastMessageTime?: number;
  connectionTime?: number;
}

interface WebSocketRoom {
  name: string;
  orgId: string;
  clients: Set<AuthenticatedWebSocket>;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private rooms: Map<string, WebSocketRoom> = new Map();
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private pingInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;
  private allowedOrigins: string[];
  private rateLimitConfig = {
    maxMessages: 100, // Max messages per minute
    windowMs: 60000   // 1 minute window
  };

  constructor(server: any) {
    // Setup allowed origins for security
    this.allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000', 
      'https://localhost:3000',
      'https://localhost:5000',
      process.env.FRONTEND_URL,
      process.env.REPL_URL
    ].filter(Boolean);
    
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Start ping/pong heartbeat
    this.pingInterval = setInterval(this.heartbeat.bind(this), 30000);
    
    // Start cleanup for idle connections
    this.cleanupInterval = setInterval(this.cleanupIdleConnections.bind(this), 60000);
    
    console.log('🔌 WebSocket server initialized on /ws with security measures');
  }

  private verifyClient(info: { req: IncomingMessage, origin?: string }): boolean {
    // Check origin allowlist for security
    const origin = info.origin;
    if (origin && this.allowedOrigins.length > 0) {
      const isAllowed = this.allowedOrigins.some(allowedOrigin => 
        origin === allowedOrigin || 
        (allowedOrigin && origin.endsWith(allowedOrigin.replace(/^https?:\/\//, '')))
      );
      
      if (!isAllowed) {
        console.warn(`WebSocket connection rejected - invalid origin: ${origin}`);
        return false;
      }
    }
    
    // Rate limit connections per IP
    const existingConnections = Array.from(this.clients.values())
      .filter(ws => ws.readyState === WebSocket.OPEN)
      .length;
      
    if (existingConnections > 1000) { // Max 1000 concurrent connections
      console.warn(`WebSocket connection rejected - too many connections: ${existingConnections}`);
      return false;
    }
    
    return true;
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    const clientId = this.generateClientId();
    ws.userId = undefined;
    ws.orgId = undefined;
    ws.isAuthenticated = false;
    ws.rooms = new Set();
    ws.lastPing = Date.now();
    ws.messageCount = 0;
    ws.lastMessageTime = Date.now();
    ws.connectionTime = Date.now();
    
    this.clients.set(clientId, ws);

    console.log(`🔌 WebSocket client connected: ${clientId}`);

    // Set up event listeners
    ws.on('message', (data) => this.handleMessage(ws, clientId, data));
    ws.on('close', () => this.handleDisconnection(ws, clientId));
    ws.on('error', (error) => this.handleError(ws, clientId, error));
    ws.on('pong', () => { ws.lastPing = Date.now(); });

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connection_status',
      payload: { status: 'connected', clientId },
      timestamp: new Date().toISOString(),
    });

    // Request authentication within 30 seconds
    setTimeout(() => {
      if (!ws.isAuthenticated && ws.readyState === WebSocket.OPEN) {
        ws.close(1008, 'Authentication timeout');
      }
    }, 30000);
  }

  private async handleMessage(ws: AuthenticatedWebSocket, clientId: string, data: Buffer) {
    try {
      // Rate limiting check
      if (!this.checkRateLimit(ws)) {
        console.warn(`Rate limit exceeded for client ${clientId}`);
        this.sendError(ws, 'Rate limit exceeded');
        return;
      }
      
      // Message size check (max 64KB)
      if (data.length > 64 * 1024) {
        console.warn(`Message too large from client ${clientId}: ${data.length} bytes`);
        this.sendError(ws, 'Message too large');
        return;
      }
      
      const message = JSON.parse(data.toString());

      // Handle authentication first
      if (message.type === 'auth' && !ws.isAuthenticated) {
        await this.authenticateClient(ws, clientId, message.payload);
        return;
      }

      // Require authentication for all other messages
      if (!ws.isAuthenticated) {
        this.sendError(ws, 'Authentication required');
        return;
      }

      // Handle different message types
      switch (message.type) {
        case 'join_room':
          await this.joinRoom(ws, message.payload.roomName);
          break;
        case 'leave_room':
          await this.leaveRoom(ws, message.payload.roomName);
          break;
        case 'ping':
          ws.lastPing = Date.now();
          this.sendToClient(ws, {
            type: 'connection_status',
            payload: { status: 'pong' },
            timestamp: new Date().toISOString(),
          });
          break;
        default:
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`WebSocket message error for client ${clientId}:`, error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  private async authenticateClient(ws: AuthenticatedWebSocket, clientId: string, payload: any) {
    try {
      const authData = WebSocketAuth.parse(payload);
      
      // Verify JWT token
      const decoded = verify(authData.token, env.JWT_SECRET) as any;
      if (!decoded.sub || !decoded.org_id) {
        throw new Error('Invalid token payload');
      }

      // Verify user exists and has access to organization
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('id', decoded.sub)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      // Verify organization access
      const { data: orgAccess, error: orgError } = await supabaseAdmin
        .from('organization_memberships')
        .select('role')
        .eq('user_id', decoded.sub)
        .eq('org_id', decoded.org_id)
        .eq('status', 'active')
        .single();

      if (orgError || !orgAccess) {
        throw new Error('Organization access denied');
      }

      // Authentication successful
      ws.userId = decoded.sub;
      ws.orgId = decoded.org_id;
      ws.isAuthenticated = true;

      console.log(`✅ WebSocket client authenticated: ${clientId} (user: ${user.email}, org: ${decoded.org_id})`);

      // Send authentication success
      this.sendToClient(ws, {
        type: 'connection_status',
        payload: { 
          status: 'authenticated', 
          userId: ws.userId, 
          orgId: ws.orgId 
        },
        timestamp: new Date().toISOString(),
      });

      // Auto-join organization room
      await this.joinRoom(ws, `org:${ws.orgId}`);

    } catch (error) {
      console.error(`Authentication failed for client ${clientId}:`, error);
      this.sendError(ws, 'Authentication failed');
      setTimeout(() => ws.close(1008, 'Authentication failed'), 1000);
    }
  }

  private async joinRoom(ws: AuthenticatedWebSocket, roomName: string) {
    if (!ws.isAuthenticated || !ws.orgId) {
      this.sendError(ws, 'Authentication required to join rooms');
      return;
    }

    // Validate room access based on organization
    if (!this.validateRoomAccess(roomName, ws.orgId, ws.userId!)) {
      this.sendError(ws, 'Access denied to room');
      return;
    }

    const roomKey = `${ws.orgId}:${roomName}`;
    
    if (!this.rooms.has(roomKey)) {
      this.rooms.set(roomKey, {
        name: roomName,
        orgId: ws.orgId,
        clients: new Set(),
      });
    }

    const room = this.rooms.get(roomKey)!;
    room.clients.add(ws);
    ws.rooms!.add(roomKey);

    console.log(`👥 Client joined room: ${roomName} (org: ${ws.orgId})`);

    this.sendToClient(ws, {
      type: 'connection_status',
      payload: { status: 'joined_room', roomName },
      timestamp: new Date().toISOString(),
    });
  }

  private async leaveRoom(ws: AuthenticatedWebSocket, roomName: string) {
    if (!ws.orgId) return;

    const roomKey = `${ws.orgId}:${roomName}`;
    const room = this.rooms.get(roomKey);
    
    if (room) {
      room.clients.delete(ws);
      ws.rooms!.delete(roomKey);

      // Clean up empty rooms
      if (room.clients.size === 0) {
        this.rooms.delete(roomKey);
      }
    }

    this.sendToClient(ws, {
      type: 'connection_status',
      payload: { status: 'left_room', roomName },
      timestamp: new Date().toISOString(),
    });
  }

  private validateRoomAccess(roomName: string, orgId: string, userId: string): boolean {
    // Organization rooms - accessible to all org members
    if (roomName.startsWith('org:')) {
      return roomName === `org:${orgId}`;
    }

    // User-specific rooms
    if (roomName.startsWith('user:')) {
      return roomName === `user:${userId}`;
    }

    // Order-specific rooms - validate org ownership
    if (roomName.startsWith('order:')) {
      // TODO: Add database validation for order access
      return true;
    }

    // Default deny for unknown room types
    return false;
  }

  private handleDisconnection(ws: AuthenticatedWebSocket, clientId: string) {
    console.log(`🔌 WebSocket client disconnected: ${clientId}`);

    // Leave all rooms
    if (ws.rooms) {
      for (const roomKey of ws.rooms) {
        const room = this.rooms.get(roomKey);
        if (room) {
          room.clients.delete(ws);
          if (room.clients.size === 0) {
            this.rooms.delete(roomKey);
          }
        }
      }
    }

    // Remove from clients
    this.clients.delete(clientId);
  }

  private handleError(ws: AuthenticatedWebSocket, clientId: string, error: Error) {
    console.error(`WebSocket error for client ${clientId}:`, error);
  }

  private sendToClient(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  private sendError(ws: AuthenticatedWebSocket, message: string) {
    this.sendToClient(ws, {
      type: 'connection_status',
      payload: { status: 'error', message },
      timestamp: new Date().toISOString(),
    });
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private heartbeat() {
    const now = Date.now();
    this.clients.forEach((ws, clientId) => {
      if (ws.lastPing! < now - 60000) {
        // Client hasn't responded to ping in 60 seconds
        console.log(`🔌 Terminating inactive client: ${clientId}`);
        ws.terminate();
        this.clients.delete(clientId);
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }
  
  private cleanupIdleConnections() {
    const now = Date.now();
    const maxIdleTime = 24 * 60 * 60 * 1000; // 24 hours
    
    this.clients.forEach((ws, clientId) => {
      if (ws.connectionTime && now - ws.connectionTime > maxIdleTime) {
        console.log(`🔌 Closing idle WebSocket connection: ${clientId}`);
        ws.close(1001, 'Connection idle too long');
        this.clients.delete(clientId);
      }
    });
  }
  
  private checkRateLimit(ws: AuthenticatedWebSocket): boolean {
    const now = Date.now();
    
    // Reset counter if window expired
    if (!ws.lastMessageTime || now - ws.lastMessageTime > this.rateLimitConfig.windowMs) {
      ws.messageCount = 0;
      ws.lastMessageTime = now;
    }
    
    ws.messageCount = (ws.messageCount || 0) + 1;
    
    return ws.messageCount <= this.rateLimitConfig.maxMessages;
  }

  // Public methods for broadcasting events

  public broadcastToRoom(roomName: string, orgId: string, message: WebSocketMessage) {
    const roomKey = `${orgId}:${roomName}`;
    const room = this.rooms.get(roomKey);
    
    if (room) {
      room.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendToClient(ws, message);
        }
      });
    }
  }

  public broadcastToOrganization(orgId: string, message: WebSocketMessage) {
    this.broadcastToRoom(`org:${orgId}`, orgId, message);
  }

  public broadcastToUser(userId: string, orgId: string, message: WebSocketMessage) {
    this.broadcastToRoom(`user:${userId}`, orgId, message);
  }

  public async createAndBroadcastEvent(eventData: CreateRealtimeEvent) {
    try {
      // Save event to database
      const { data: event, error } = await supabaseAdmin
        .from('realtime_events')
        .insert({
          org_id: eventData.orgId,
          event_type: eventData.eventType,
          entity_type: eventData.entityType,
          entity_id: eventData.entityId,
          actor_user_id: eventData.actorUserId,
          event_data: eventData.eventData,
          broadcast_to_users: eventData.broadcastToUsers,
          broadcast_to_roles: eventData.broadcastToRoles,
          is_broadcast: eventData.isBroadcast,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving realtime event:', error);
        return;
      }

      // Broadcast event if enabled
      if (eventData.isBroadcast) {
        const message: WebSocketMessage = {
          type: this.mapEntityTypeToMessageType(eventData.entityType),
          payload: {
            event: eventData.eventType,
            entityType: eventData.entityType,
            entityId: eventData.entityId,
            data: eventData.eventData,
            actorUserId: eventData.actorUserId,
          },
          timestamp: new Date().toISOString(),
          orgId: eventData.orgId,
        };

        // Broadcast to specific users if specified
        if (eventData.broadcastToUsers?.length) {
          eventData.broadcastToUsers.forEach(userId => {
            this.broadcastToUser(userId, eventData.orgId, message);
          });
        } else {
          // Broadcast to organization
          this.broadcastToOrganization(eventData.orgId, message);
        }
      }

      // Mark event as processed
      await supabaseAdmin
        .from('realtime_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', event.id);

    } catch (error) {
      console.error('Error creating and broadcasting event:', error);
    }
  }

  private mapEntityTypeToMessageType(entityType: string): WebSocketMessage['type'] {
    switch (entityType) {
      case 'order': return 'order_update';
      case 'order_item': return 'order_item_update';
      case 'design_job': return 'design_job_update';
      case 'work_order': return 'work_order_update';
      case 'purchase_order': return 'purchase_order_update';
      case 'fulfillment': return 'fulfillment_update';
      default: return 'notification';
    }
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      authenticatedClients: Array.from(this.clients.values()).filter(ws => ws.isAuthenticated).length,
    };
  }

  public shutdown() {
    console.log('🔌 Shutting down WebSocket server...');
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all client connections
    this.clients.forEach((ws, clientId) => {
      ws.close(1001, 'Server shutdown');
    });

    this.wss.close(() => {
      console.log('🔌 WebSocket server shut down');
    });
  }
}

// Global WebSocket manager instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(server: any): WebSocketManager {
  if (wsManager) {
    throw new Error('WebSocket manager already initialized');
  }
  
  wsManager = new WebSocketManager(server);
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    throw new Error('WebSocket manager not initialized');
  }
  return wsManager;
}