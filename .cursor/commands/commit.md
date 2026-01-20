# Commit Agent

Use the commit agent to commit and push changes with automatic verification of personal git user and SSH configuration.

## What it does

- ✅ Verifies and ensures git remote uses **personal SSH** (`github.com-personal`), not work SSH
- ✅ Verifies and ensures git user is set to **personal account** (`orelzion` / `orelzion@gmail.com`), not `orel-viz`
- ✅ Auto-generates precise commit messages based on file changes
- ✅ Commits and pushes with confirmation prompt
- ✅ Runs **pre-commit hooks** automatically:
  - 🔒 **Security checks** - Scans for secrets, API keys, .env files (`.cursor/agents/security.md`)
  - 📋 **Regulations checks** - Validates accessibility, cookie consent, privacy compliance (`.cursor/agents/regulations.md`)

## Usage

### Basic usage (auto-generate commit message)
```bash
./commit
# or
python3 commit_agent.py
```

### Custom commit message
```bash
./commit -m "Your custom commit message"
# or
python3 commit_agent.py -m "Your custom commit message"
```

### Commit only (don't push)
```bash
./commit --no-push
# or
python3 commit_agent.py --no-push
```

### Specify branch
```bash
./commit -b feature-branch
# or
python3 commit_agent.py -b feature-branch
```

## Important Notes

1. **Git Email**: The agent ensures commits use `orelzion@gmail.com` (personal email), not `orel@viz.ai` (work email)
2. **SSH Host**: The agent automatically converts `git@github.com` (work) to `git@github.com-personal` (personal)
3. **Confirmation**: The agent will prompt for confirmation before committing/pushing
4. **First Commit**: Handles initial commits gracefully (no HEAD yet)
5. **Pre-commit Hooks**: Security and regulations checks run automatically on every commit

## Pre-commit Checks

The following checks run automatically before each commit:

### Security Checks (`.cursor/agents/security.md`)
- No hardcoded Supabase/API keys
- No .env files committed
- No secret files (credentials.json, .pem, .key)
- .gitignore has required security patterns

### Regulations Checks (`.cursor/agents/regulations.md`)
- Cookie consent compliance (analytics blocked by default)
- Accessibility attributes (aria-hidden on decorative SVGs)
- Touch target sizes (minimum 44px for WCAG)
- Keyboard accessibility (clickable elements should be buttons)
- Privacy policy links in footer/layout
- Legal pages have noindex meta tags

To bypass checks (use with caution):
```bash
git commit --no-verify -m "message"
```

## Configuration

The commit agent uses these personal settings:
- **Git User**: `orelzion`
- **Git Email**: `orelzion@gmail.com`
- **SSH Host**: `github.com-personal` (uses `~/.ssh/personal` key)

## Examples

```bash
# Auto-commit with generated message
./commit

# Commit with custom message
./commit -m "Fix authentication bug"

# Commit to specific branch
./commit -b develop -m "Add new feature"

# Commit without pushing
./commit --no-push
```
