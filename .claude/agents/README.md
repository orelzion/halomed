# HaLomeid Agent Guides for Claude Code

This directory contains role-specific development guides for the HaLomeid project. These guides help Claude Code (and developers) understand the responsibilities, patterns, and best practices for each area of the codebase.

## How to Use These Guides

When working on a specific area of the project, reference the appropriate guide to understand:
- Responsibilities and scope
- Key files and components
- Implementation patterns
- Dependencies on other areas
- Reference documents (PRD/TDD sections)

### Example Prompts

```
Read .claude/agents/web.md and help me implement the study screen
```

```
Following the patterns in .claude/agents/backend.md, create a new Edge Function
```

```
Check .claude/agents/sync.md for the correct offline-first pattern
```

## Available Guides

### Architecture & Planning

| Guide | File | Purpose |
|-------|------|---------|
| **Architect** | `architect.md` | Breaking down PRD/TDD into tasks, planning features |

### Infrastructure

| Guide | File | Purpose |
|-------|------|---------|
| **Backend** | `backend.md` | Supabase, PostgreSQL, RLS, Edge Functions |
| **Sync** | `sync.md` | RxDB, offline-first patterns, 14-day window |
| **Scheduling** | `scheduling.md` | Track scheduling, DAILY_WEEKDAYS_ONLY |
| **Content Generation** | `content-generation.md` | Sefaria API, AI explanations |

### Client Platforms

| Guide | File | Purpose |
|-------|------|---------|
| **Web** | `web.md` | Next.js, React, Tailwind, PWA |
| **Android** | `android.md` | Kotlin, Compose, Room (future) |
| **iOS** | `ios.md` | Swift, SwiftUI, SQLite (future) |

### Design & Quality

| Guide | File | Purpose |
|-------|------|---------|
| **Design System** | `design-system.md` | Colors, typography, themes |
| **Client Testing** | `client-testing.md` | Maestro E2E tests |
| **Server Testing** | `server-testing.md` | Supabase/Deno tests |
| **Security** | `security.md` | Pre-commit hooks, secret scanning |
| **Regulations** | `regulations.md` | GDPR, CCPA, accessibility, cookies |

## Agent Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      ARCHITECT                               │
│            (Reads PRD/TDD, creates task breakdowns)          │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────────┐
    │ BACKEND  │   │   SYNC   │   │ DESIGN SYSTEM│
    └────┬─────┘   └────┬─────┘   └──────┬───────┘
         │              │                │
    ┌────┴────┐         │         ┌──────┴──────┐
    │         │         │         │             │
    ▼         ▼         │         ▼             ▼
┌────────┐ ┌──────────┐ │   ┌─────────┐   ┌─────────┐
│CONTENT │ │SCHEDULING│ │   │ ANDROID │   │   iOS   │
│  GEN   │ │          │ │   │         │   │         │
└────────┘ └──────────┘ │   └─────────┘   └─────────┘
                        │         │             │
                        │         └──────┬──────┘
                        │                │
                        └────────┬───────┘
                                 │
                                 ▼
                           ┌──────────┐
                           │   WEB    │
                           └──────────┘

┌─────────────────────────────────────────────────────────────┐
│                      TESTING LAYER                           │
├────────────────────────┬────────────────────────────────────┤
│    CLIENT TESTING      │        SERVER TESTING              │
│    (Maestro E2E)       │        (Deno/Supabase)             │
└────────────────────────┴────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      SECURITY                                │
│            (Pre-commit hooks, secret scanning)               │
│            Runs before ALL commits                           │
└─────────────────────────────────────────────────────────────┘
```

## Cross-Guide Dependencies

| When working on... | Also consult... |
|-------------------|------------------|
| Any new feature | Architect |
| Any UI work | Design System |
| Any client work | Sync, Backend |
| Content generation | Backend, Scheduling |
| Scheduling logic | Backend |
| Any commit | Security |
| Privacy, cookies, accessibility | Regulations |

## Difference from Cursor Agents

These guides are adapted from the Cursor agent files in `.cursor/agents/`. The key differences:

1. **No Model Specification** - Claude Code automatically uses Claude, no need to specify `model: claude-4.5-opus`
2. **No Frontmatter** - Guides are pure markdown documentation
3. **Reference Style** - Instead of `@agent.md` invocation, you reference guides in prompts
4. **Context Integration** - Claude Code reads CLAUDE.md automatically and can be pointed to specific guides

## Reference Documents

- **PRD**: `docs/halomed_prd.md` - Product requirements (Sections 1-13)
- **TDD**: `docs/halomed_tdd.md` - Technical design (Sections 1-13)
- **Main Guide**: `CLAUDE.md` - Project overview and quick reference
