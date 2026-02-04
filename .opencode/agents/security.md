# Security Guide

## Purpose

The Security Guide covers preventing accidental exposure of secrets, API keys, and personal information in the codebase through pre-commit hooks, automated scanning, and security best practices.

## Responsibilities

- Pre-commit hooks for secret scanning
- API key detection and validation (Supabase, Sefaria, AI service keys)
- Personal information detection
- Hardcoded credential scanning
- Environment variable validation
- .gitignore validation
- RLS policy validation
- Supabase key exposure prevention

## Secret Patterns to Detect

### Supabase Keys

- Supabase anon key: `eyJ[A-Za-z0-9_-]{100,}`
- Supabase service role key: **NEVER expose**
- Supabase URL: `https://[project].supabase.co`

### API Keys

- Gemini API key: `AIza[A-Za-z0-9_-]{35}`
- OpenAI API key: `sk-[A-Za-z0-9]{48}`
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
| GEMINI_API_KEY | AI generation | Edge Functions only |

### Environment File Templates

#### .env.example (commit this)

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI Services
GEMINI_API_KEY=your-key-here
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

### Before Each Commit

- No hardcoded API keys
- No .env files staged
- No secret files staged

### Weekly

- Review new dependencies for vulnerabilities
- Check for exposed secrets in recent commits
- Verify .gitignore is up to date

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

## Pre-Commit Hook Example

```bash
#!/bin/bash

# Check for common secret patterns
if git diff --cached | grep -E "(sk-[A-Za-z0-9]{48}|eyJ[A-Za-z0-9_-]{100,}|AIza[A-Za-z0-9_-]{35})"; then
  echo "ERROR: Possible secret detected in staged changes"
  exit 1
fi

# Check for .env files
if git diff --cached --name-only | grep -E "^\.env"; then
  echo "ERROR: .env file should not be committed"
  exit 1
fi
```

## Reference Documents

- **TDD Section 11**: Security
- **TDD Section 5**: Authentication Model
- **TDD Section 4**: Database Schema (RLS)
