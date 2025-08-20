# Yaak API Collection for Rich Habits Custom Clothing

This directory contains Yaak API collections for testing the Rich Habits business management system APIs.

## Quick Start

### 1. Install Yaak
Download and install [Yaak](https://yaak.app/) - a modern API testing tool.

### 2. Import Collection
1. Open Yaak
2. Click **Import** or **File → Import**
3. Select `yaak/organizations.yaak.json`
4. The collection will be imported with all requests and environment variables

### 3. Configure Environment
The collection uses these environment variables:

```json
{
  "BASE_URL": "http://localhost:5000",
  "AUTH_HEADER": ""
}
```

**To modify environment:**
1. In Yaak, go to **Environments**
2. Select the imported environment
3. Update `BASE_URL` if your server runs on a different port
4. Add `AUTH_HEADER` value if authentication is required (format: `Bearer your-token`)

### 4. Test the API

#### Available Requests:

**GET Organizations List**
- Endpoint: `GET /api/organizations`
- Description: Retrieve all organizations
- Includes cache-busting timestamp parameter

**GET Organization by ID**
- Endpoint: `GET /api/organizations/:id`
- Description: Get specific organization with sports data
- Variables: Set `ORGANIZATION_ID` before running

**POST Create Organization**
- Endpoint: `POST /api/organizations`
- Description: Create new organization
- Body: JSON with name, state, address, phone, email, etc.

**PATCH Update Organization**
- Endpoint: `PATCH /api/organizations/:id`
- Description: Partial update of organization fields
- Variables: Set `ORGANIZATION_ID` before running

**DELETE Organization**
- Endpoint: `DELETE /api/organizations/:id`
- Description: Delete organization (use with test data only!)
- Variables: Set `ORGANIZATION_ID` before running

## Usage Workflow

### Testing Complete CRUD Flow:

1. **List Organizations**: Run `GET Organizations List` to see existing data
2. **Get Specific Org**: Copy an ID and run `GET Organization by ID`
3. **Create New Org**: Run `POST Create Organization` 
4. **Update the Org**: Copy the new ID, set `ORGANIZATION_ID` variable, run `PATCH Update Organization`
5. **Delete Test Org**: Run `DELETE Organization` (only for test data!)

### Setting Variables:
1. Select a request that uses `{{ORGANIZATION_ID}}`
2. In the **Variables** tab, update the `ORGANIZATION_ID` value
3. Or set it globally in **Environments**

## Features

- **Environment Variables**: Easy switching between development/production
- **Auto Timestamps**: Cache-busting timestamps automatically added
- **Request Tests**: Built-in assertions to verify responses
- **Pre/Post Scripts**: Automatic logging and debugging
- **Organized Folders**: Requests grouped by functionality

## Authentication

If your API requires authentication:
1. Go to **Environments**
2. Set `AUTH_HEADER` to your auth token (e.g., `Bearer your-jwt-token`)
3. Enable the Authorization header in requests that need it

## Troubleshooting

**Connection Refused**: 
- Ensure your dev server is running (`npm run dev`)
- Check that `BASE_URL` matches your server port

**404 Not Found**: 
- Verify API endpoints exist in your server routes
- Check request URLs match your backend routing

**500 Server Error**: 
- Check server logs for detailed error information
- Verify database connection is working

## Advanced Usage

### Custom Pre-Request Scripts:
```javascript
// Generate dynamic test data
const timestamp = Date.now();
yaak.globals.set('test_org_name', `Test Org ${timestamp}`);
```

### Response Testing:
```javascript
// Custom validation
expect(response.data.name).toMatch(/^[A-Za-z]/);
expect(response.data.created_at).toBeDefined();
```

### Environment Switching:
Create multiple environments for different stages:
- **Development**: `http://localhost:5000`
- **Staging**: `https://staging.yourdomain.com`
- **Production**: `https://api.yourdomain.com`

## Collection Structure

```
yaak/
├── organizations.yaak.json    # Main API collection
└── README_yaak.md            # This documentation

Requests:
├── Organization Management/
│   ├── GET Organizations List
│   ├── GET Organization by ID  
│   ├── POST Create Organization
│   ├── PATCH Update Organization
│   └── DELETE Organization
```

---

**Note**: Always use test data when running DELETE operations. Never delete production organizations through API testing!