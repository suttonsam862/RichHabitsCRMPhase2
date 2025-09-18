# Secret Rotation Guide - Phase 0 SEC-3

## Critical Secrets Requiring Immediate Rotation

### 1. Database Credentials
- **Location**: `DATABASE_URL` environment variable
- **Action**: Rotate in Supabase dashboard → Settings → Database
- **Frequency**: Every 90 days or immediately if exposed

### 2. Supabase Service Role Key
- **Location**: `SUPABASE_SERVICE_ROLE_KEY` environment variable
- **Risk**: Full database access bypassing RLS
- **Action**: Regenerate in Supabase dashboard → Settings → API
- **Frequency**: Every 90 days or immediately if exposed

### 3. JWT Secret
- **Location**: `JWT_SECRET` environment variable
- **Risk**: Token forgery if compromised
- **Action**: Generate new 32+ character secret
- **Command**: `openssl rand -base64 32`
- **Frequency**: Every 90 days

## Rotation Procedure

### Pre-Rotation Checklist
- [ ] Schedule maintenance window
- [ ] Backup current configuration
- [ ] Prepare rollback plan
- [ ] Test new credentials in staging

### Rotation Steps

1. **Generate New Secrets**
   ```bash
   # Generate secure random secrets
   openssl rand -base64 32  # For JWT_SECRET
   ```

2. **Update Environment Variables**
   ```bash
   # Update .env file or deployment configuration
   DATABASE_URL=<new_connection_string>
   SUPABASE_SERVICE_ROLE_KEY=<new_service_key>
   JWT_SECRET=<new_jwt_secret>
   ```

3. **Deploy Changes**
   - Update production environment variables
   - Restart application services
   - Verify health checks pass

4. **Validate**
   - Test authentication flows
   - Verify database connections
   - Check API endpoints
   - Review audit logs for errors

### Post-Rotation
- [ ] Update documentation
- [ ] Notify team of rotation completion
- [ ] Schedule next rotation
- [ ] Destroy old credentials securely

## Emergency Rotation (Breach Response)

If secrets are exposed:

1. **IMMEDIATE ACTIONS** (< 5 minutes)
   - Rotate all affected credentials
   - Revoke existing sessions
   - Enable audit logging

2. **INVESTIGATION** (< 1 hour)
   - Review audit logs for unauthorized access
   - Check for data exfiltration
   - Identify exposure vector

3. **REMEDIATION** (< 24 hours)
   - Patch vulnerability
   - Reset all user passwords if auth compromised
   - Notify affected users if required

## Secret Management Best Practices

### Never Do This
- ❌ Commit secrets to git
- ❌ Log secrets in plaintext
- ❌ Share secrets via email/chat
- ❌ Use weak/default passwords
- ❌ Reuse secrets across environments

### Always Do This
- ✅ Use environment variables
- ✅ Implement secret scanning in CI/CD
- ✅ Use secure secret storage (e.g., HashiCorp Vault)
- ✅ Rotate regularly (90-day maximum)
- ✅ Audit access to secrets
- ✅ Use different secrets per environment

## Monitoring

### Automated Checks
```javascript
// Add to health check endpoint
function checkSecretExpiry() {
  const secretAge = Date.now() - LAST_ROTATION_DATE;
  const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
  
  if (secretAge > maxAge) {
    console.warn('[SECURITY] Secrets due for rotation');
    return false;
  }
  return true;
}
```

### Audit Events to Monitor
- Multiple failed authentication attempts
- Access from new IP addresses
- Elevated privilege operations
- Bulk data exports
- Configuration changes

## Tools

### Secret Scanning
```bash
# Pre-commit hook for secret detection
npm install -g gitleaks
gitleaks detect --source . --verbose
```

### Environment Validation
```javascript
// See server/lib/env.ts for validation
```

## Compliance Notes

- PCI DSS: Rotate every 90 days
- SOC 2: Document rotation procedures
- HIPAA: Audit all secret access
- GDPR: Encrypt secrets at rest

## Contact

Security incidents: security@company.com
On-call: Use PagerDuty escalation