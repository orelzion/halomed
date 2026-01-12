---
name: security
model: fast
---

# Security Agent

## Purpose

The Security Agent is responsible for preventing the accidental exposure of secrets, API keys, and personal information in the codebase through pre-commit hooks, automated scanning, and security best practices.

## Responsibilities

- Pre-commit hooks for secret scanning
- API key detection and validation (Supabase, Sefaria, AI service keys)
- Personal information detection (emails, phone numbers, addresses)
- Hardcoded credential scanning
- Environment variable validation
- .gitignore validation
- Git hooks integration (pre-commit, pre-push)
- Secret scanning tools integration
- RLS policy validation
- Supabase key exposure prevention
- PowerSync configuration security checks
- Regular security audit recommendations

## Dependencies

- **Consulted by**: All agents before commits
- **Integrates with**: commit_agent.py
- **References**: TDD Section 11 (Security)

## Pre-Commit Hook Setup

### Installation

```bash
# Install pre-commit framework
pip install pre-commit

# Or via Homebrew
brew install pre-commit

# Install hooks in repo
pre-commit install
```

### Configuration (.pre-commit-config.yaml)

```yaml
repos:
  # Secret detection
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
        
  # Gitleaks (comprehensive secret scanner)
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

## Secret Patterns to Detect

### Supabase Keys

- Supabase anon key: eyJ[A-Za-z0-9_-]{100,}
- Supabase service role key: NEVER expose
- Supabase URL: https://[project].supabase.co

### API Keys

- OpenAI API key: sk-[A-Za-z0-9]{48}
- Generic API key patterns

### Personal Information

- Email addresses
- Phone numbers
- Credit card numbers

## Environment Variable Validation

### Required Environment Variables

| Variable | Purpose | Where Used |
|----------|---------|------------|
| SUPABASE_URL | Supabase project URL | All clients, Edge Functions |
| SUPABASE_ANON_KEY | Public API key | All clients |
| SUPABASE_SERVICE_ROLE_KEY | Admin key | Edge Functions only |
| OPENAI_API_KEY | AI generation | Edge Functions only |
| POWERSYNC_URL | PowerSync endpoint | All clients |

### Environment File Templates

#### .env.example (commit this)

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI Services
OPENAI_API_KEY=sk-your-key-here

# PowerSync
POWERSYNC_URL=https://your-instance.powersync.com
```

#### .env (NEVER commit)

Copy from .env.example and fill with real values.

## .gitignore Validation

### Required Entries

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.production

# Secret files
*.pem
*.key
*.p12
*.pfx
secrets.json
credentials.json

# Platform-specific
google-services.json
local.properties
GoogleService-Info.plist
*.mobileprovision
*.p8
supabase/.env
```

## Integration with commit_agent.py

Add security scanning to the commit agent. The SecurityChecker class should:

1. Scan staged files for secret patterns
2. Detect API keys, JWTs, and credentials
3. Block commits containing secrets
4. Suggest using environment variables instead

## RLS Policy Validation

### RLS Checklist

- user_study_log: RLS enabled, user can only access own rows
- content_cache: RLS enabled, authenticated users can read
- tracks: RLS enabled, all users can read

## Supabase Key Security

### Client-Side Keys

**Safe to expose (anon key)**:
- Used in mobile apps and web clients
- Limited by RLS policies

**NEVER expose (service role key)**:
- Bypasses all RLS
- Full database access
- Only used in Edge Functions

## Security Audit Checklist

### Weekly
- Review new dependencies for vulnerabilities
- Check for exposed secrets in recent commits
- Verify .gitignore is up to date

### Monthly
- Run full secret scan on entire repo
- Review RLS policies
- Check Supabase audit logs

### Before Release
- Full security scan
- Verify all API keys are in environment variables
- Review OAuth configurations
- Verify RLS policies in production

## Emergency: Secret Exposed

If a secret is accidentally committed:

1. **Immediately rotate the key**
2. **Remove from git history** using BFG Repo-Cleaner
3. **Audit access** via service logs
4. **Document and learn**

## Reference Documents

- **TDD Section 11**: Security
- **TDD Section 5**: Authentication Model
- **TDD Section 4**: Database Schema (RLS)
