# Commit Agent

Use the commit agent to commit and push changes with automatic verification of personal git user and SSH configuration.

## What it does

- ✅ Verifies and ensures git remote uses **personal SSH** (`github.com-personal`), not work SSH
- ✅ Verifies and ensures git user is set to **personal account** (`orelzion` / `orelzion@gmail.com`), not `orel-viz`
- ✅ Auto-generates precise commit messages based on file changes
- ✅ Commits and pushes with confirmation prompt

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
