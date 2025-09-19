# Deployment & Scalability Guide - ORD-13 Production Readiness

## 🚀 Production Deployment Constraints

### Current Architecture Limitations

**CRITICAL CONSTRAINT: Single Instance Deployment Required**

The current WebSocket implementation is designed for **single-instance deployment only**. This is a known limitation that must be understood before production deployment.

### Why Single Instance Only?

1. **In-Memory WebSocket Management**: WebSocketManager stores active connections and rooms in local memory Maps
2. **No Cross-Instance Communication**: Events are broadcast only to WebSocket connections on the same server instance
3. **Session Affinity Required**: All WebSocket connections from a user must stay on the same server instance

### Deployment Requirements

#### ✅ Supported Deployment Patterns
- **Single server instance** with load balancer (if needed for HTTP traffic)
- **Container deployment** with 1 replica only
- **Replit deployment** (naturally single instance)

#### ❌ Unsupported Deployment Patterns
- Multiple server instances without Redis pub/sub
- Kubernetes horizontal scaling > 1 replica
- Load-balanced WebSocket connections across multiple servers

### WebSocket Architecture Overview

```
Client Browser
    ↓ WebSocket connection
Single Server Instance
├── WebSocketManager (in-memory)
├── Room management (in-memory)
├── Client registry (in-memory)
└── Database (shared/external)
```

### Scaling Options

#### Option 1: Current Implementation (Recommended for MVP)
- **Constraint**: Single instance deployment
- **Pros**: Simple, no additional infrastructure
- **Cons**: Limited to single server capacity
- **Max Capacity**: ~1000 concurrent WebSocket connections

#### Option 2: Redis Pub/Sub (Future Enhancement)
To enable multi-instance deployment, implement Redis pub/sub:

```typescript
// Future enhancement - not currently implemented
export class RedisWebSocketManager extends WebSocketManager {
  private redisClient: Redis;
  
  async broadcastToOrganization(orgId: string, message: WebSocketMessage) {
    // Broadcast locally
    super.broadcastToOrganization(orgId, message);
    
    // Broadcast to other instances via Redis
    await this.redisClient.publish(`ws:org:${orgId}`, JSON.stringify(message));
  }
}
```

## 🔧 Production Deployment Checklist

### Environment Variables
```bash
# WebSocket Configuration
WS_MAX_CONNECTIONS=1000
WS_PING_INTERVAL=30000
WS_IDLE_TIMEOUT=86400000

# CORS Origins for WebSocket
FRONTEND_URL=https://your-domain.com
REPL_URL=https://your-repl-domain.replit.app
```

### Load Balancer Configuration

#### ✅ HTTP Load Balancing (Supported)
```nginx
upstream app_servers {
    server app:3000;
}

server {
    location /api/ {
        proxy_pass http://app_servers;
        # Standard HTTP load balancing works fine
    }
}
```

#### ⚠️ WebSocket Load Balancing (Session Affinity Required)
```nginx
upstream app_servers {
    server app:3000;
    # Only one server for WebSocket routes
}

server {
    location /ws {
        proxy_pass http://app_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        # Session affinity required for multi-instance
        ip_hash; # Ensures same client goes to same server
    }
}
```

### Docker Configuration
```dockerfile
# Single instance deployment
FROM node:18-alpine

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

EXPOSE 3000

# Important: Only run 1 replica
CMD ["npm", "run", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    # Important: No replicas or scale settings
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - WS_MAX_CONNECTIONS=1000
```

### Kubernetes Deployment (Single Replica)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rich-habits-crm
spec:
  # CRITICAL: Only 1 replica for WebSocket support
  replicas: 1
  selector:
    matchLabels:
      app: rich-habits-crm
  template:
    metadata:
      labels:
        app: rich-habits-crm
    spec:
      containers:
      - name: app
        image: rich-habits-crm:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: WS_MAX_CONNECTIONS
          value: "1000"
```

## 📊 Monitoring & Observability

### WebSocket Metrics to Monitor
```typescript
// Available via GET /api/health/websocket
{
  "connectedClients": 150,
  "activeRooms": 45,
  "authenticatedClients": 142,
  "uptime": "2h 15m",
  "memoryUsage": "245MB"
}
```

### Performance Limits
- **Max WebSocket Connections**: 1000 (configurable)
- **Rate Limiting**: 100 messages/minute per client
- **Message Size Limit**: 64KB per message
- **Connection Timeout**: 24 hours idle
- **Heartbeat Interval**: 30 seconds

### Scaling Indicators
Monitor these metrics to determine when Redis pub/sub is needed:
- **WebSocket connection count** approaching 800+
- **Memory usage** for WebSocket manager exceeding 500MB
- **CPU usage** for message broadcasting exceeding 70%

## 🚨 Production Warnings

### ⚠️ Critical Limitations
1. **Single Point of Failure**: One server instance handles all WebSocket connections
2. **No Hot Failover**: WebSocket connections will be dropped during deployment
3. **Memory Constraints**: All active connections stored in server memory
4. **Network Partitions**: No recovery mechanism for split-brain scenarios

### 🔄 Deployment Strategies

#### Blue-Green Deployment (WebSocket Incompatible)
- ❌ **Not recommended**: Causes connection drops
- WebSocket connections cannot be transferred between instances

#### Rolling Updates (WebSocket Incompatible)
- ❌ **Not recommended**: Partial connection loss
- Some users will lose real-time functionality

#### Maintenance Window Deployment (Recommended)
- ✅ **Recommended**: Schedule during low usage
- Notify users of planned downtime
- Use graceful shutdown with connection drain

### Graceful Shutdown Implementation
```typescript
// Already implemented in WebSocketManager
process.on('SIGTERM', () => {
  console.log('🔌 Graceful shutdown initiated...');
  wsManager.shutdown(); // Closes all connections cleanly
  server.close(() => {
    process.exit(0);
  });
});
```

## 🔮 Future Scalability Roadmap

### Phase 1: Current (Single Instance)
- ✅ In-memory WebSocket management
- ✅ Single server deployment
- ✅ Up to 1000 concurrent connections

### Phase 2: Redis Pub/Sub (Multi-Instance)
- 🔄 Implement Redis pub/sub for cross-instance communication
- 🔄 Add sticky session support
- 🔄 Horizontal scaling support

### Phase 3: Dedicated WebSocket Service
- 🔄 Separate WebSocket service from main API
- 🔄 Multiple WebSocket instances with Redis cluster
- 🔄 Message queuing for reliability

## 📋 Pre-Production Checklist

### Infrastructure
- [ ] Single instance deployment configured
- [ ] Database connection pool sized appropriately
- [ ] WebSocket CORS origins configured
- [ ] Load balancer session affinity (if applicable)

### Monitoring
- [ ] WebSocket connection metrics enabled
- [ ] Memory usage alerts configured
- [ ] Error rate monitoring for WebSocket routes
- [ ] Performance testing completed

### Security
- [ ] WebSocket authentication working
- [ ] Rate limiting configured
- [ ] CORS origins restricted to production domains
- [ ] SSL/TLS termination for WSS connections

### Documentation
- [ ] Operations team trained on single-instance constraint
- [ ] Deployment procedures documented
- [ ] Rollback procedures defined
- [ ] Monitoring runbooks created

---

**Last Updated**: September 19, 2025  
**Architecture Review**: Required before implementing Redis pub/sub  
**Contact**: Development Team for scaling questions