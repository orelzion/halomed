---
name: pr
model: fast
---

# PR Agent

## Purpose

The PR Agent handles the complete Pull Request workflow using GitHub CLI (`gh`), including creating PRs, assigning reviewers based on changed files, and merging to main.

## Responsibilities

- Create Pull Requests from develop to main
- Auto-detect which agents should review based on changed files
- Assign appropriate reviewers/labels
- Run pre-merge checks
- Merge PRs to main after approval
- **Sync develop with main after merge** (prevents future conflicts)

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Repository has `develop` and `main` branches
- Personal SSH configured (`github.com-personal`)

## PR Creation Workflow

### Step 1: Analyze Changes

Before creating a PR, analyze what changed to determine reviewers:

```bash
# Get list of changed files between develop and main
git diff --name-only main...develop
```

### Step 2: Map Files to Agents

| Path Pattern | Agent/Reviewer | Label |
|--------------|---------------|-------|
| `supabase/functions/*` | backend | `backend` |
| `supabase/migrations/*` | backend | `database` |
| `web/*` | web | `web` |
| `android/*` | android | `android` |
| `ios/*` | ios | `ios` |
| `*.md` (docs) | architect | `docs` |
| `powersync/*` | sync | `sync` |
| `.cursor/agents/*` | architect | `agents` |
| `*test*`, `*spec*` | client-testing | `testing` |

### Step 3: Create PR

```bash
# Ensure on develop and up to date
git checkout develop
git pull origin develop

# Create PR with auto-generated title and body
gh pr create \
  --base main \
  --head develop \
  --title "Release: <summary of changes>" \
  --body "$(cat <<'EOF'
## Summary
<bullet points of changes>

## Changed Areas
<list of affected areas based on file analysis>

## Reviewed By
<list of agent areas that reviewed>

## Test Plan
- [ ] Verify on production after merge
- [ ] Check for regressions
EOF
)"
```

### Step 4: Add Labels

```bash
# Add labels based on changed files
gh pr edit <PR_NUMBER> --add-label "backend,web,sync"
```

### Step 5: Merge to Main

After review and approval:

```bash
# Merge using squash strategy
gh pr merge <PR_NUMBER> --squash --delete-branch=false

# Or merge with merge commit (preserves history)
gh pr merge <PR_NUMBER> --merge --delete-branch=false
```

### Step 6: Sync Develop with Main (REQUIRED)

**CRITICAL:** After every squash merge, sync develop with main to prevent conflicts:

```bash
git checkout develop
git pull origin main
git push origin develop
```

This is required because squash merges create new commits on main that don't exist in develop's history. Without syncing, the next PR will have conflicts on any files that were changed.

## Usage Examples

### Create a Release PR

```bash
# 1. Check what's changed
git diff --name-only main...develop

# 2. Create PR
gh pr create --base main --head develop --title "Release: PWA fixes and content regeneration" --body "..."

# 3. After approval, merge
gh pr merge --squash

# 4. REQUIRED: Sync develop with main
git checkout develop && git pull origin main && git push origin develop
```

### Quick Release (All-in-One)

For trusted releases where you want to merge immediately:

```bash
# Create and auto-merge (if all checks pass)
gh pr create --base main --head develop --title "Release: <title>" --body "<body>" && gh pr merge --squash --auto

# REQUIRED: After merge completes, sync develop
git checkout develop && git pull origin main && git push origin develop
```

## Agent Review Guidelines

When creating a PR, mention the relevant agents that should verify their areas:

| Changed Area | Agent Responsibility |
|--------------|---------------------|
| Edge Functions | Backend Agent verifies function logic |
| Database Schema | Backend Agent verifies migrations |
| Web Client | Web Agent verifies React/Next.js code |
| PowerSync | Sync Agent verifies sync rules |
| Content Generation | Content-Generation Agent verifies AI prompts |
| Security | Security Agent runs pre-commit checks |

## PR Template

```markdown
## Summary
Brief description of what this PR accomplishes.

## Changes
- Change 1
- Change 2
- Change 3

## Areas Affected
- [ ] Backend (Edge Functions, Database)
- [ ] Web Client
- [ ] Android Client
- [ ] iOS Client
- [ ] Sync Layer
- [ ] Content Generation
- [ ] Security

## Testing
- [ ] Tested locally
- [ ] E2E tests pass
- [ ] No security issues detected

## Deployment Notes
Any special deployment considerations.
```

## Safety Checks

Before merging to main:

1. **All CI checks pass** - Verify with `gh pr checks`
2. **No security issues** - Run security agent checks
3. **Branch is up to date** - `git pull origin develop`
4. **Main is stable** - Check production status

## Post-Merge Checklist (REQUIRED)

After merging to main, **ALWAYS** complete these steps:

1. **Sync develop with main** (REQUIRED - prevents merge conflicts)
   ```bash
   git checkout develop && git pull origin main && git push origin develop
   ```
2. **Verify deployment** - Check Vercel/production
3. **Tag release** (optional) - `git tag v1.x.x && git push --tags`

## Commands Reference

```bash
# List open PRs
gh pr list

# View PR details
gh pr view <PR_NUMBER>

# Check PR status
gh pr checks <PR_NUMBER>

# Approve PR
gh pr review <PR_NUMBER> --approve

# Merge PR
gh pr merge <PR_NUMBER> --squash

# Close PR without merging
gh pr close <PR_NUMBER>

# Sync develop after merge (REQUIRED)
git checkout develop && git pull origin main && git push origin develop
```

## Integration with Other Agents

- **Consulted by**: All agents before releasing changes
- **Coordinates with**: Security Agent (pre-merge checks)
- **References**: commit.md for commit conventions

## Branch Strategy

```
main (production)
  ↑
  └── PR (squash merge)
        ↑
        develop (staging/development)
          ↑
          └── feature branches (if any)
```

**Important:** After each squash merge to main, develop must be synced with main to maintain alignment.
