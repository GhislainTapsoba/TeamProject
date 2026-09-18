# Security Policy - TeamProject SaaS Multi-Tenant

## 🔒 Security Overview

This document outlines the security measures implemented in TeamProject to protect data, ensure multi-tenant isolation, and maintain compliance with security best practices.

## 🚨 Reporting Security Vulnerabilities

If you discover a security vulnerability, please **DO NOT** create a public issue. Instead:

1. Email: security@deep-technologies.com
2. Include details about the vulnerability
3. Allow us 48 hours to respond before disclosing

## Security Architecture

### Multi-Tenant Isolation

- **Schema-level isolation**: Each tenant has a separate PostgreSQL schema
- **Subdomain routing**: Tenant resolution via subdomain prevents cross-tenant access
- **Middleware enforcement**: `TenantMainMiddleware` ensures every request is tenant-scoped
- **RBAC**: Role-based access control at tenant level (admin, manager, employee)

### Data Protection

- **Encryption at rest**: Sensitive credentials (Mailjet API keys) encrypted with Fernet (AES-256)
- **Encryption in transit**: HTTPS enforced with SSL wildcard certificates
- **Secure secrets**: Never committed to git, stored in environment variables or secret managers

### Authentication & Authorization

- **JWT with short-lived tokens**: Access tokens expire in 15 minutes
- **Refresh tokens**: Longer-lived, revocable server-side
- **HTTP-only cookies**: JWT stored in httpOnly, secure cookies
- **RBAC enforcement**: All DRF endpoints verify roles via permission classes

### Infrastructure Security

- **Docker hardening**: Images scanned with Trivy before deployment
- **Least privilege**: VPS user with minimal permissions
- **Network segmentation**: Internal services not exposed publicly
- **SSL/TLS**: Certbot wildcard DNS challenge for `*.deep-technologies.com`

## CI/CD Security

### GitHub Actions Pipeline

- **Trivy vulnerability scanning**: On every push and PR
- **Docker image scanning**: Before deployment (CRITICAL/HIGH severity only)
- **Branch protection**: Main branch requires PR approval
- **Manual deployment trigger**: `workflow_dispatch` for controlled deployments
- **Environment protection**: Production deployment requires approval
- **Script safety**: `script_stop: true` to prevent partial deployments

### Terraform Security

- **State encryption**: S3 backend with `encrypt: true` (to be configured)
- **State locking**: DynamoDB table for concurrent operation prevention
- **Sensitive variables**: All secrets marked as `sensitive = true`
- **Backend disabled by default**: Requires explicit configuration for production

## Secrets Management

### Required Secrets

#### GitHub Actions
- `VPS_HOST` - VPS IP address or hostname
- `VPS_USER` - SSH username
- `VPS_SSH_KEY` - SSH private key
- `VPS_PORT` - SSH port (optional, default: 22)

#### Backend Environment (.env)
- `SECRET_KEY` - Django secret key (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- `POSTGRES_PASSWORD` - PostgreSQL password
- `CINETPAY_API_KEY` - CinetPay API key
- `CINETPAY_SITE_ID` - CinetPay site ID
- `ENCRYPTION_KEY` - Fernet encryption key (generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)

#### Terraform (terraform.tfvars)
- `cloudflare_api_token` - Cloudflare API token
- `cloudflare_zone_id` - Cloudflare zone ID
- `vps_ip_address` - VPS IP address
- `digitalocean_token` - DigitalOcean token (if creating new VPS)
- `do_ssh_key_fingerprint` - SSH key fingerprint (if creating new VPS)

### Secret Storage Best Practices

1. **Never commit secrets to git**
2. **Use environment variables** for runtime secrets
3. **Use secret managers** (AWS Secrets Manager, HashiCorp Vault) for production
4. **Rotate secrets regularly** (every 90 days)
5. **Audit secret access** regularly

## Payment Security (CinetPay)

- **Server-side verification**: Always verify transactions via `/v2/payment/check`
- **Webhook idempotency**: Handle duplicate webhook notifications safely
- **No card data storage**: Never store card numbers or mobile money identifiers
- **Reference only**: Store only `provider_reference` (transaction ID)

## Audit & Logging

- **ActivityLog table**: Tracks all sensitive operations (project creation, role changes, etc.)
- **Access logs**: Nginx access logs for all HTTP requests
- **Error logs**: Application error logs for debugging
- **Regular audits**: Monthly review of access logs and activity logs

## Compliance

- **Data retention**: Define retention policy for each data type
- **Right to deletion**: Implement user data deletion on request
- **Data export**: Allow users to export their data
- **Privacy policy**: Clearly state data usage and storage

## Security Checklist

### Before Deployment

- [ ] All secrets are stored in environment variables or secret managers
- [ ] SSL certificates are valid and not expired
- [ ] Database backups are enabled and tested
- [ ] Firewall rules restrict access to necessary ports only
- [ ] JWT token expiration is configured (< 15 minutes for access tokens)
- [ ] Rate limiting is enabled on authentication endpoints
- [ ] CORS is configured to allow only trusted origins
- [ ] Security headers (CSP, X-Frame-Options, etc.) are configured

### Regular Maintenance

- [ ] Update dependencies weekly
- [ ] Review and rotate secrets monthly
- [ ] Run security scans (Trivy) weekly
- [ ] Review access logs monthly
- [ ] Test backup restoration quarterly
- [ ] Audit user access rights quarterly

## Incident Response

### Breach Detection

1. Monitor activity logs for suspicious patterns
2. Set up alerts for failed authentication attempts
3. Monitor for unusual tenant access patterns

### Response Procedure

1. **Immediate**: Isolate affected systems
2. **Assessment**: Determine scope and impact
3. **Containment**: Prevent further unauthorized access
4. **Eradication**: Remove vulnerabilities
5. **Recovery**: Restore from clean backups
6. **Lessons learned**: Document and improve procedures

## Dependency Management

- **Pinned versions**: Use specific versions in requirements.txt and package.json
- **Vulnerability scanning**: Trivy scans on every CI/CD run
- **Update policy**: Review and update dependencies weekly
- **Security advisories**: Subscribe to security mailing lists for all dependencies

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security](https://docs.djangoproject.com/en/5.0/topics/security/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [CinetPay Security](https://docs.cinetpay.com/)

## Version History

- **v1.0** (2024-09-18): Initial security policy with CI/CD hardening
