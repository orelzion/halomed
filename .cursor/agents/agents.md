---
name: agents
model: fast
---

# HaLomeid Agent Orchestration

This document serves as the master orchestration guide for all agents in the HaLomeid project.

## Overview

HaLomeid uses a multi-agent architecture to develop an offline-first, multi-platform Torah learning application. Each agent has specific responsibilities and boundaries, working together to deliver a cohesive product.

## Available Agents

| Agent | File | Primary Responsibility |
|-------|------|----------------------|
| Architect | `architect.md` | Breaks down PRD/TDD into implementor tasks |
| Backend | `backend.md` | Supabase, database, Edge Functions |
| Content Generation | `content-generation.md` | Sefaria API, AI explanations |
| Scheduling | `scheduling.md` | Track scheduling logic |
| Sync | `sync.md` | PowerSync configuration |
| Android | `android.md` | Android/Kotlin/Compose client |
| iOS | `ios.md` | iOS/Swift/SwiftUI client |
| Web | `web.md` | Next.js/React web client |
| Design System | `design-system.md` | Design tokens, fonts, components |
| Client Testing | `client-testing.md` | Maestro E2E tests |
| Server Testing | `server-testing.md` | Supabase/Deno tests |
| Security | `security.md` | Pre-commit security checks |

| Regulations | `regulations.md` | GDPR, CCPA, accessibility, cookies compliance |


| PR | `pr.md` | Pull Request workflow, merging to main |

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

## Orchestration Patterns

### Starting a New Feature

1. **Consult Architect Agent** first
   - Provide the feature requirement from PRD
   - Architect breaks it down into implementor-specific tasks
   - Architect identifies dependencies and sequencing

2. **Execute in Order**
   - Backend/Sync agents first (data layer)
   - Design System agent (UI specifications)
   - Platform agents (Android, iOS, Web) in parallel
   - Testing agents (validation)

3. **Security Check**
   - Security agent runs before any commit
   - Validates no secrets or PII are exposed

### Cross-Agent Dependencies

| When working on... | Consult first... |
|-------------------|------------------|
| Any new feature | Architect |
| Any UI work | Design System |
| Any client work | Sync, Backend |
| Content generation | Backend, Scheduling |
| Scheduling logic | Backend |
| Any commit | Security |
| Privacy, cookies, accessibility | Regulations |

## Reference Documents

- **PRD**: `docs/halomed_prd.md` - Product requirements
- **TDD**: `docs/halomed_tdd.md` - Technical design

## Agent Invocation

To invoke a specific agent, reference its file:
- `@architect.md` - For task breakdowns
- `@backend.md` - For Supabase/database work
- `@android.md` - For Android-specific implementation
- etc.

## MVP Scope

For MVP, focus on:
1. Backend setup (Supabase, schema, auth)
2. Scheduling logic (DAILY_WEEKDAYS_ONLY)
3. Content generation (Sefaria + AI)
4. Sync layer (PowerSync)
5. All three clients (Android, iOS, Web)
6. Testing coverage
7. Security validation

Non-MVP features are explicitly documented in the PRD Section 12.
