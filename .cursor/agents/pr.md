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

## Critical Rules

### NEVER checkout main locally
- **Always stay on `develop`** or feature branches
- All changes to `main` happen through PRs only
- Use `gh pr merge` to merge PRs, never `git merge` to main locally
- If you accidentally checkout main, immediately switch back: `git checkout develop`

### Feature Branch Cleanup
- After merging a feature branch to develop, **delete it**:
  ```bash
  git branch -D feature/branch-name
  git push origin --delete feature/branch-name  # if pushed
  ```
- Keep the repository clean - no stale branches

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
# Merge using squash strategy (preferred)
gh pr merge <PR_NUMBER> --squash --delete-branch=false

# Or merge with merge commit (preserves history)
gh pr merge <PR_NUMBER> --merge --delete-branch=false
```

**Note:** Use `--delete-branch=false` because we're merging `develop`, which we want to keep. Only delete feature branches.

### Step 6: Sync Develop with Main (REQUIRED)

**CRITICAL:** After every squash merge, sync develop with main to prevent conflicts:

```bash
git checkout develop
git pull origin main
git push origin develop
```

This is required because squash merges create new commits on main that don't exist in develop's history. Without syncing, the next PR will have conflicts on any files that were changed.

## Feature Branch Workflow

When working on a complex feature that needs isolation:

### 1. Create Feature Branch (from develop)

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### 2. Work on Feature

Make commits, push to remote if needed for backup:
```bash
git push -u origin feature/my-feature
```

### 3. Merge Feature to Develop

```bash
git checkout develop
git pull origin develop
git merge feature/my-feature --no-edit
git push origin develop
```

### 4. Delete Feature Branch (REQUIRED)

```bash
# Delete local branch
git branch -D feature/my-feature

# Delete remote branch (if pushed)
git push origin --delete feature/my-feature
```

### 5. Create PR to Main (when ready for production)

Follow the PR creation workflow below.

---

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
main (production) ← NEVER checkout locally, only PRs
  ↑
  └── PR (squash merge via `gh pr merge`)
        ↑
        develop (staging/development) ← PRIMARY working branch
          ↑
          └── feature branches (temporary, delete after merge)
```

### Key Principles

1. **`develop` is the primary working branch** - Always work here or on feature branches
2. **`main` is production** - Only modified through PRs, never directly
3. **Feature branches are temporary** - Create for complex features, delete after merging to develop
4. **Sync after PR merge** - After merging develop→main, sync develop with main

**Important:** After each squash merge to main, develop must be synced with main to maintain alignment.
