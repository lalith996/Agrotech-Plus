# Security Policy

## Environment Variables

⚠️ **CRITICAL**: Never commit sensitive credentials to version control.

### Protected Files
The following files contain sensitive information and should NEVER be committed:
- `.env` - Contains database credentials, API keys, and secrets
- `.env.local` - Local environment overrides
- `.env.production.local` - Production environment variables

### What to Commit
- `.env.example` - Template with placeholder values
- `.gitignore` - Properly configured to exclude sensitive files

## Database Security

### Connection Strings
- Never expose database credentials in public repositories
- Use environment variables for all database connections
- Rotate credentials if accidentally exposed

### Neon Database
If using Neon (PostgreSQL):
- Keep your connection string secret
- Use connection pooling (included in the connection string)
- Enable SSL mode (`sslmode=require`)

## API Keys and Secrets

### Stack Auth
- `NEXT_PUBLIC_STACK_PROJECT_ID` - Safe to expose (public)
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` - Safe to expose (public)
- `STACK_SECRET_SERVER_KEY` - **MUST be kept secret** (server-side only)

### Best Practices
1. Use different credentials for development and production
2. Rotate secrets regularly
3. Use secret management services in production (e.g., Vercel Environment Variables, AWS Secrets Manager)
4. Never log sensitive information
5. Use HTTPS in production

## Reporting Security Issues

If you discover a security vulnerability, please email the maintainers directly instead of opening a public issue.

## Security Checklist for Contributors

Before committing code:
- [ ] No credentials in code or configuration files
- [ ] `.env` is in `.gitignore`
- [ ] No API keys or secrets in comments
- [ ] No sensitive data in logs or error messages
- [ ] Dependencies are up to date (`npm audit`)

## Incident Response

If credentials are accidentally committed:
1. Immediately rotate all exposed credentials
2. Remove the file from git history (use `git rm --cached`)
3. Verify `.gitignore` is properly configured
4. Update the database connection string
5. Regenerate API keys
6. Notify the team

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/deploying/production-checklist#security)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
