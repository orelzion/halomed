# Production-Ready Commit Hook System

This repository includes a comprehensive production-ready commit hook system that ensures security compliance, regulatory adherence, and TypeScript validation before allowing commits and pushes.

## Overview

The hook system is designed to:
- **Prevent security issues** by scanning for secrets, API keys, and credentials
- **Ensure regulatory compliance** with GDPR, accessibility, and privacy requirements  
- **Validate production readiness** with TypeScript type checking
- **Catch issues early** before they reach production

## Hook Structure

### Pre-Commit Hook (`pre-commit`)
Runs before every commit and checks:
- ✅ **Security validation** - `@security` agent compliance
- ✅ **Regulations compliance** - `@regulations` agent compliance  
- ✅ **TypeScript validation** - Type checking for TS/JS files
- ✅ **Migration validation** - Post-migration checks

### Pre-Push Hook (`pre-push`) 
Runs before every push and includes:
- ✅ **Production build validation** - Full TypeScript build
- ✅ **Environment checks** - .env.example and .gitignore validation
- ✅ **Security pattern verification**

## Scripts

### Core Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| `security-check.sh` | Comprehensive security scanning | `scripts/` |
| `regulations-check.sh` | GDPR & accessibility compliance | `scripts/` |
| `typescript-check.sh` | TypeScript type validation | `scripts/` |
| `setup-hooks.sh` | Install git hooks in repository | `scripts/` |

### Hook Files

| Hook | When Runs | Integration |
|------|-----------|-------------|
| `.git/hooks/pre-commit` | Before `git commit` | Production-ready validation |
| `scripts/hooks/pre-commit` | Template for installation | Uses comprehensive scripts |
| `scripts/hooks/pre-push` | Before `git push` | Production build validation |

## Installation

### Automatic Installation (Recommended)
```bash
# Install all hooks with proper configuration
bash scripts/setup-hooks.sh
```

### Manual Installation
```bash
# Copy production-ready pre-commit hook
cp .git/hooks/pre-commit scripts/hooks/pre-commit

# Copy pre-push hook  
cp scripts/hooks/pre-push .git/hooks/pre-push

# Make hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
```

## Security Validation (@security)

Based on `.claude/agents/security.md`, the security checks include:

### Secret Detection
- **Supabase keys**: JWT tokens and API keys
- **Google API keys**: Gemini AI service keys
- **OpenAI API keys**: Standard OpenAI key patterns  
- **AWS access keys**: AWS IAM credentials
- **Private keys**: PEM/PKCS certificate files

### File Validation
- **Environment files**: Blocks .env files from commits
- **Secret files**: Prevents .pem, .key, secrets.json
- **Configuration files**: Validates .gitignore patterns

### Service Role Key Protection
- Ensures SUPABASE_SERVICE_ROLE_KEY only appears in Edge Functions
- Warns if service role key found in client-side code

## Regulations Compliance (@regulations)

Based on `.claude/agents/regulations.md`, the compliance checks include:

### Cookie Consent (ePrivacy Directive)
- **Analytics consent**: Verifies PostHog usage includes consent checks
- **Implementation**: Ensures reject button as prominent as accept
- **GDPR compliance**: Blocks analytics by default

### Accessibility (WCAG 2.2 AA)
- **Touch targets**: Warns about interactive elements < 44px
- **Keyboard access**: Identifies clickable divs without proper keyboard support
- **Screen reader support**: Checks for missing aria-labels on decorative elements
- **SVG icons**: Ensures decorative SVGs have aria-hidden="true"

### Privacy & Legal
- **Privacy policy links**: Validates footer/settings include privacy links
- **Legal pages**: Ensures noindex meta tags on privacy/cookie pages
- **Israel compliance**: Hebrew RTL support validation

## TypeScript Validation

### Type Checking
- **Fast validation**: Uses `tsc --noEmit` for quick type checks
- **Production builds**: Full build validation in pre-push hook
- **Error reporting**: Pretty formatted TypeScript errors

### Integration
- **Next.js aware**: Automatically detects web/ directory structure
- **Dependency checking**: Verifies TypeScript is installed
- **Build validation**: Optional production build verification

## Migration Validation

Special validation for recent migrations:

### Learning Path → Position Migration
- **Old references**: Detects remaining `learning_path` references
- **Schema validation**: Checks migration files for common issues
- **Foreign key validation**: Verifies database relationships

## Usage Examples

### Making a Commit
```bash
# Stage your changes
git add .

# Attempt commit (runs pre-commit hook)
git commit -m "feat: add new feature"

# Hook output example:
# 🔒 Running production readiness checks...
# 
# === SECURITY VALIDATION (@security) ===
# 🔒 Running security checks...
# ✅ Security validation passed
# 
# === REGULATIONS COMPLIANCE (@regulations) ===  
# 📋 Running regulations compliance checks...
# ✅ Regulations compliance check passed
# 
# === TYPESCRIPT VALIDATION ===
# 📝 TypeScript validation...
# Running type checking...
# ✅ TypeScript validation passed
# 
# === PRODUCTION READINESS SUMMARY ===
# ✅ All production readiness checks passed! ✨
# 🚀 Your code is ready for production deployment
```

### Making a Push
```bash
# Push to remote (runs pre-push hook)
git push origin develop

# Hook output example:
# 🔍 Running pre-push production checks...
# 📝 TypeScript validation...
# Running type checking...
# ✅ TypeScript validation passed
# Running production build check...
# ✅ Production build successful
# 
# 🏗️  Running additional production checks...
# ✅ All pre-push checks passed!
# 🚀 Ready to push to remote
```

### Bypassing Hooks (Emergency Only)
```bash
# Bypass pre-commit hook (not recommended)
git commit --no-verify -m "emergency fix"

# Bypass pre-push hook (not recommended)  
git push --no-verify origin develop
```

## Troubleshooting

### Common Issues

**Hook not running?**
```bash
# Check hook permissions
ls -la .git/hooks/pre-commit

# Make executable if needed
chmod +x .git/hooks/pre-commit
```

**TypeScript errors?**
```bash
# Run TypeScript check manually
cd web && npx tsc --noEmit

# Install missing dependencies
cd web && npm install
```

**Security check fails?**
```bash
# Run security check manually for details
bash scripts/security-check.sh

# Check for false positives
grep -r "AIza" . --exclude-dir=node_modules --exclude-dir=.git
```

**Regulations check fails?**
```bash
# Run regulations check manually
bash scripts/regulations-check.sh

# Review warnings
# Most warnings are informative and won't block commits
```

## Development Workflow

### Before Each Commit
1. **Security scan**: Automatic secret detection
2. **Compliance check**: GDPR & accessibility validation  
3. **Type checking**: TypeScript compilation verification
4. **Migration check**: Post-migration validation

### Before Each Push
1. **Production build**: Full build validation
2. **Environment check**: .env.example and .gitignore validation
3. **Security patterns**: Final security verification

### Best Practices
- **Fix issues early**: Address hook feedback immediately
- **Review warnings**: Even non-blocking warnings deserve attention
- **Test locally**: Run scripts manually before commits
- **Document exceptions**: Use --no-verify only for genuine emergencies

## Agent Integration

The hook system integrates with these agent guides:

- **`@security`** - `.claude/agents/security.md`
- **`@regulations`** - `.claude/agents/regulations.md`  
- **`@web`** - TypeScript and Next.js best practices
- **`@sync`** - Database migration validation

## Maintenance

### Updating Hooks
```bash
# Reinstall hooks after updates
bash scripts/setup-hooks.sh

# Check hook versions
git log --oneline scripts/hooks/
```

### Adding New Checks
1. Update relevant script in `scripts/`
2. Test with staged changes
3. Update documentation
4. Commit changes (hooks validate themselves!)

### Performance
- **Fast checks**: Most validations complete in < 2 seconds
- **Selective scanning**: Only scans staged files
- **Caching**: TypeScript compiler caches results

## Support

For hook-related issues:
1. Check this README first
2. Run individual scripts manually
3. Consult agent guides in `.claude/agents/`
4. Review hook output for specific error messages

**Remember**: These hooks protect production quality and security. Take their warnings seriously!