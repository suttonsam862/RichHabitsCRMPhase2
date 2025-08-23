# Deployment Guide

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16.x database
- Supabase account with configured project
- Environment variables properly configured

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET=your-jwt-secret

# Server
PORT=5000
NODE_ENV=production
ORIGINS=https://your-domain.com
```

## Deployment Steps

### 1. Pre-deployment Checks

Run the preflight script to verify your environment:

```bash
npm run preflight
```

This checks:
- Node.js version
- Environment variables
- Database connection
- Required files
- TypeScript compilation

### 2. Database Setup

Initialize or update the database schema:

```bash
# Push schema changes to database
npm run db:push

# If you get data-loss warnings and you're sure, use:
npm run db:push --force
```

### 3. Build Application

Build the production bundle:

```bash
npm run build
```

### 4. Run Tests

Ensure all tests pass before deployment:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### 5. Deploy to Replit

For Replit deployments:

1. Click the "Deploy" button in your Replit workspace
2. Select "Production" deployment
3. Configure environment variables in the Deployments tab
4. Click "Deploy" to start the deployment

The application will be available at: `https://your-app.replit.app`

## Post-Deployment

### Verify Deployment

After deployment, verify the application:

```bash
# Check API health
curl https://your-app.replit.app/api/health

# Verify routes
npm run route:verify
```

### Monitor Application

Monitor the application using:
- Replit's built-in monitoring dashboard
- Application logs in the Console tab
- Database metrics in Supabase dashboard

### Database Backups

Set up regular backups:

```bash
# Manual backup
npm run backup

# Restore from backup
psql $DATABASE_URL < backups/backup-TIMESTAMP.sql
```

## Rollback Procedure

If issues occur after deployment:

1. **Immediate Rollback**: Use Replit's "View Checkpoints" feature to restore previous version
2. **Database Rollback**: Restore from latest backup
3. **Code Rollback**: Revert to previous git commit and redeploy

## Security Checklist

Before going to production:

- [ ] All environment variables are set
- [ ] JWT_SECRET is strong and unique
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] Database has proper indexes
- [ ] Sensitive data is not logged
- [ ] HTTPS is enforced
- [ ] Security headers are configured (Helmet.js)

## Performance Optimization

### Database
- Ensure proper indexes on frequently queried columns
- Use the org_summary RPC to avoid N+1 queries
- Monitor slow queries in Supabase dashboard

### Application
- Enable compression middleware
- Use CDN for static assets
- Implement caching where appropriate
- Monitor memory usage and optimize as needed

## Troubleshooting

### Common Issues

**Server won't start**
- Check environment variables with `npm run preflight`
- Verify database connection
- Check for port conflicts

**Database errors**
- Verify DATABASE_URL is correct
- Check database server is running
- Run migrations: `npm run db:push`

**Authentication failures**
- Verify JWT_SECRET matches across environments
- Check Supabase credentials
- Ensure CORS is properly configured

**Performance issues**
- Check database query performance
- Monitor memory usage
- Review rate limiting settings
- Check for N+1 queries

## Support

For issues or questions:
- Check application logs
- Review error messages in browser console
- Contact Replit support for deployment issues
- Check Supabase status page for service issues