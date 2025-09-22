# Orders System API

This application provides a REST API for managing orders with comprehensive authentication and authorization.

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

The server will start at `http://localhost:5000` with both backend API and frontend served.

## Dev Bypass

For development and testing purposes, the API supports a development bypass authentication mechanism using the `x-dev-auth` header.

### Setting up Dev API Key

Set the `DEV_API_KEY` environment variable (defaults to `dev-allow` if not set):

```bash
export DEV_API_KEY=your-dev-key
```

### Sample curl commands

```bash
# Health check
curl -H "x-dev-auth: dev-allow" http://localhost:5000/healthz

# Get orders list
curl -H "x-dev-auth: dev-allow" \
     -H "Content-Type: application/json" \
     http://localhost:5000/api/v1/orders?limit=5
```

### Running smoke tests

Use the provided script to run quick development smoke tests:

```bash
bash scripts/dev-smoke.sh
```

The script will test both the health endpoint and orders list endpoint using the dev bypass authentication.

## Running tests safely

The test suite includes automatic production database protection to prevent accidental connections to live data during testing.

### Database Safety Features

- **Automatic Detection**: Tests automatically detect if `DATABASE_URL` contains production indicators (like "supabase.co")
- **Safe Fallback**: When production DB is detected and `TEST_DATABASE_URL` is configured, tests automatically switch to the test database
- **Skip Behavior**: If production DB is detected but no `TEST_DATABASE_URL` is set, database integration tests are automatically skipped with clear warnings

### Configuration

Set up a test database URL for safe testing:

```bash
export TEST_DATABASE_URL="postgresql://test:test@localhost:5432/test_db"
# or for Supabase test projects:
export TEST_DATABASE_URL="postgresql://postgres:[password]@db.[your-test-project].supabase.co:5432/postgres"
```

### Running Tests

```bash
# Run all tests (will use TEST_DATABASE_URL if DATABASE_URL is production)
npm run test

# Silent mode (reduces output)
npm run test -s
```

When tests detect a production database:
- ✅ **With TEST_DATABASE_URL**: Tests run safely against test database
- ⚠️ **Without TEST_DATABASE_URL**: Integration tests are skipped with warning, unit tests continue

### Postman Collection

Import the dev bypass Postman collection for easy API testing:
- File: `postman/DevBypass.postman_collection.json`  
- Contains pre-configured requests with dev auth headers
- Base URL variable set to `http://localhost:5000`

## API Documentation

### Authentication
- Production: Bearer token authentication
- Development: `x-dev-auth` header bypass

### Endpoints
- `GET /healthz` - Health check
- `GET /api/v1/orders` - List orders with filtering and pagination
- `GET /api/v1/orders/:id` - Get specific order
- `PATCH /api/v1/orders/:id/status` - Update order status
- `POST /api/v1/orders/bulk-action` - Bulk operations on orders

## Development Notes

- All order operations are tenant-scoped for security
- Uses Supabase for data persistence
- Service layer pattern for database operations
- Comprehensive error handling and logging