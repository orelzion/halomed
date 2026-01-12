#!/usr/bin/env python3
"""
Commit and Push Agent
Ensures precise commit messages and uses personal git user (not orel-viz)
"""

import subprocess
import sys
import re
from pathlib import Path
from typing import List, Tuple, Optional


class CommitAgent:
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path).resolve()
        self.personal_user = "orelzion"
        self.personal_email = "orelzion@gmail.com"
        
    def run_git(self, *args: str, check: bool = True) -> Tuple[str, str]:
        """Run a git command and return stdout, stderr"""
        cmd = ["git"] + list(args)
        result = subprocess.run(
            cmd,
            cwd=self.repo_path,
            capture_output=True,
            text=True,
            check=check
        )
        return result.stdout.strip(), result.stderr.strip()
    
    def check_ssh_remote(self) -> bool:
        """Verify remote URL uses personal SSH host (github.com-personal), not work (github.com)"""
        try:
            remote_url, _ = self.run_git("config", "--get", "remote.origin.url")
            
            if not remote_url:
                print("⚠️  No remote origin found")
                return False
            
            # Check if using work SSH (github.com) instead of personal (github.com-personal)
            if remote_url.startswith("git@github.com:") and not remote_url.startswith("git@github.com-personal:"):
                print(f"⚠️  Remote is using work SSH (github.com)")
                print(f"   Current: {remote_url}")
                
                # Convert to personal SSH host
                personal_url = remote_url.replace("git@github.com:", "git@github.com-personal:")
                print(f"   Updating to personal SSH: {personal_url}")
                
                self.run_git("remote", "set-url", "origin", personal_url)
                print(f"✓ Updated remote to use personal SSH")
                return True
            
            if remote_url.startswith("git@github.com-personal:"):
                print(f"✓ Remote using personal SSH: {remote_url}")
                return True
            
            print(f"ℹ️  Remote URL: {remote_url}")
            return True
        except subprocess.CalledProcessError:
            print("⚠️  Could not check remote URL")
            return False
    
    def check_git_user(self) -> bool:
        """Verify git user is set to personal user, not orel-viz"""
        try:
            name, _ = self.run_git("config", "user.name")
            email, _ = self.run_git("config", "user.email")
            
            if "orel-viz" in name.lower() or "orel-viz" in email.lower():
                print(f"⚠️  Warning: Git user contains 'orel-viz'")
                print(f"   Current: {name} <{email}>")
                print(f"   Setting to personal user: {self.personal_user} <{self.personal_email}>")
                self.run_git("config", "user.name", self.personal_user)
                self.run_git("config", "user.email", self.personal_email)
                return False
            
            print(f"✓ Git user: {name} <{email}>")
            return True
        except subprocess.CalledProcessError:
            # Git config not set, set it now
            print(f"Setting git user to: {self.personal_user} <{self.personal_email}>")
            self.run_git("config", "user.name", self.personal_user)
            self.run_git("config", "user.email", self.personal_email)
            return True
    
    def get_status(self) -> Tuple[List[str], List[str], List[str]]:
        """Get staged, modified, and untracked files"""
        stdout, _ = self.run_git("status", "--porcelain")
        
        staged = []
        modified = []
        untracked = []
        
        for line in stdout.split("\n"):
            if not line.strip():
                continue
            
            status = line[:2]
            filename = line[3:]
            
            if status[0] in ["A", "M", "D", "R", "C"]:  # Staged
                staged.append((status, filename))
            elif status[1] in ["M", "D"]:  # Modified but not staged
                modified.append((status, filename))
            elif status == "??":  # Untracked
                untracked.append(filename)
        
        return staged, modified, untracked
    
    def analyze_changes(self) -> str:
        """Analyze git changes to generate a precise commit message"""
        staged, modified, untracked = self.get_status()
        
        if not staged and not untracked:
            if modified:
                print("⚠️  You have unstaged changes. Staging them now...")
                self.run_git("add", "-u")
                staged, _, _ = self.get_status()
            else:
                print("ℹ️  No changes to commit")
                sys.exit(0)
        
        # Get diff for staged changes
        diff_output, _ = self.run_git("diff", "--cached", "--stat")
        
        # Analyze file types and changes
        files_changed = []
        for status, filename in staged:
            files_changed.append(filename)
        
        for filename in untracked:
            files_changed.append(filename)
        
        # Generate commit message based on changes
        message_parts = []
        
        # Categorize changes
        added_files = [f for f in files_changed if any(s[0] == "A" or s[0] == "??" for s in staged + [(None, f)])]
        modified_files = [f for f in files_changed if any("M" in s[0] for s in staged)]
        deleted_files = [f for f in files_changed if any("D" in s[0] for s in staged)]
        
        # Get more detailed diff for better message
        detailed_diff, _ = self.run_git("diff", "--cached", check=False)
        
        # Analyze content changes
        if detailed_diff:
            lines_added = len([l for l in detailed_diff.split("\n") if l.startswith("+") and not l.startswith("+++")])
            lines_removed = len([l for l in detailed_diff.split("\n") if l.startswith("-") and not l.startswith("---")])
            
            # Try to extract meaningful change description
            change_type = self._infer_change_type(files_changed, detailed_diff)
            message_parts.append(change_type)
            
            if lines_added > 0 or lines_removed > 0:
                if lines_added > 50 or lines_removed > 50:
                    message_parts.append(f"({lines_added}+/{lines_removed}- lines)")
        else:
            # New files only
            if added_files:
                file_types = self._categorize_files(added_files)
                message_parts.append(f"Add {file_types}")
        
        # Add file context if few files
        if len(files_changed) <= 3:
            file_names = ", ".join([Path(f).name for f in files_changed])
            message_parts.append(f": {file_names}")
        
        commit_message = " ".join(message_parts) if message_parts else "Update files"
        
        return commit_message
    
    def _infer_change_type(self, files: List[str], diff: str) -> str:
        """Infer the type of change from files and diff"""
        file_extensions = [Path(f).suffix.lower() for f in files]
        
        # Check for common patterns
        if any(f.endswith(".md") for f in files):
            if "add" in diff.lower()[:500] or len([l for l in diff.split("\n") if l.startswith("+")]) > 20:
                return "Add documentation"
            return "Update documentation"
        
        if any(ext in [".py", ".js", ".ts", ".tsx", ".jsx"] for ext in file_extensions):
            # Check diff for function/class additions
            if re.search(r'^\+\s*(def|function|class|export)', diff, re.MULTILINE):
                return "Add feature"
            if re.search(r'^\+\s*(fix|bug|error)', diff, re.IGNORECASE | re.MULTILINE):
                return "Fix bug"
            return "Update code"
        
        if any(ext in [".json", ".yaml", ".yml"] for ext in file_extensions):
            return "Update configuration"
        
        if any(ext in [".sh", ".bash"] for ext in file_extensions):
            return "Add script"
        
        return "Update"
    
    def _categorize_files(self, files: List[str]) -> str:
        """Categorize files for commit message"""
        categories = {
            "documentation": [".md", ".txt", ".rst"],
            "code": [".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".kt", ".swift"],
            "config": [".json", ".yaml", ".yml", ".toml", ".ini"],
            "scripts": [".sh", ".bash", ".zsh"],
        }
        
        file_types = set()
        for f in files:
            ext = Path(f).suffix.lower()
            for cat, exts in categories.items():
                if ext in exts:
                    file_types.add(cat)
                    break
        
        if len(file_types) == 1:
            return list(file_types)[0]
        elif len(file_types) > 1:
            return "files"
        else:
            return "files"
    
    def commit_and_push(self, message: Optional[str] = None, branch: Optional[str] = None) -> bool:
        """Commit changes and push to remote"""
        # Verify SSH remote uses personal host
        self.check_ssh_remote()
        
        # Verify git user
        self.check_git_user()
        
        # Get current branch if not specified
        if not branch:
            try:
                branch, _ = self.run_git("rev-parse", "--abbrev-ref", "HEAD")
            except subprocess.CalledProcessError:
                # No commits yet, try to get default branch from config
                branch, _ = self.run_git("config", "--get", "init.defaultBranch", check=False)
                if not branch:
                    branch = "main"  # Default fallback
                print(f"ℹ️  No commits yet, using branch: {branch}")
        
        # Check for changes
        staged, modified, untracked = self.get_status()
        
        if not staged and not untracked:
            if modified:
                print("📝 Staging modified files...")
                self.run_git("add", "-u")
            else:
                print("ℹ️  No changes to commit")
                return False
        
        # Stage untracked files
        if untracked:
            print(f"📝 Staging {len(untracked)} untracked file(s)...")
            for file in untracked:
                self.run_git("add", file)
        
        # Generate commit message if not provided
        if not message:
            message = self.analyze_changes()
        
        print(f"\n📝 Commit message: {message}")
        print(f"🌿 Branch: {branch}\n")
        
        # Confirm
        response = input("Proceed with commit? [y/N]: ").strip().lower()
        if response != 'y':
            print("❌ Commit cancelled")
            return False
        
        # Commit
        try:
            self.run_git("commit", "-m", message)
            print("✓ Committed successfully")
        except subprocess.CalledProcessError as e:
            print(f"❌ Commit failed: {e}")
            return False
        
        # Push
        try:
            print(f"🚀 Pushing to origin/{branch}...")
            # Check if this is the first push (no upstream set)
            try:
                self.run_git("rev-parse", "@{u}", check=False)
                # Upstream exists, use simple push
                self.run_git("push", "origin", branch)
            except subprocess.CalledProcessError:
                # No upstream, set it with -u flag
                self.run_git("push", "-u", "origin", branch)
            print("✓ Pushed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Push failed: {e}")
            print("💡 You may need to pull first or set upstream branch")
            return False


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Commit and push agent with precise commit messages"
    )
    parser.add_argument(
        "-m", "--message",
        help="Custom commit message (otherwise auto-generated)"
    )
    parser.add_argument(
        "-b", "--branch",
        help="Branch to push to (default: current branch)"
    )
    parser.add_argument(
        "--no-push",
        action="store_true",
        help="Commit only, don't push"
    )
    
    args = parser.parse_args()
    
    agent = CommitAgent()
    
    if args.no_push:
        # Just commit
        agent.check_ssh_remote()
        agent.check_git_user()
        staged, modified, untracked = agent.get_status()
        
        if not staged and not untracked:
            if modified:
                agent.run_git("add", "-u")
            else:
                print("ℹ️  No changes to commit")
                return
        
        if untracked:
            for file in untracked:
                agent.run_git("add", file)
        
        message = args.message or agent.analyze_changes()
        print(f"\n📝 Commit message: {message}\n")
        
        response = input("Proceed with commit? [y/N]: ").strip().lower()
        if response != 'y':
            print("❌ Commit cancelled")
            return
        
        agent.run_git("commit", "-m", message)
        print("✓ Committed successfully")
    else:
        # Commit and push
        success = agent.commit_and_push(message=args.message, branch=args.branch)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
