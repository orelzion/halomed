# Client Testing Guide

## Purpose

The Client Testing Guide covers end-to-end (E2E) testing of client applications using Maestro, a modern mobile and web testing framework.

## Responsibilities

- Maestro E2E testing framework setup
- Cross-platform UI tests (Android, iOS, Web)
- Test flows for Home screen, Study screen
- Completion marking tests
- Streak display tests
- Offline behavior tests
- CI/CD integration for client tests

## Technology: Maestro

[Maestro](https://maestro.dev/) is an end-to-end UI testing framework that:
- Supports iOS, Android, and Web
- Uses YAML-based test definitions
- Provides visual testing and recording
- Integrates with CI/CD pipelines

### Why Maestro?

- Single test framework for all platforms
- Simple YAML syntax
- Built-in retry and wait mechanisms
- AI-assisted test generation

## Setup

### Installation

```bash
# macOS
curl -Ls "https://get.maestro.mobile.dev" | bash

# Or via Homebrew
brew tap mobile-dev-inc/tap
brew install maestro
```

## Project Structure

```
tests/
├── maestro/
│   ├── config.yaml
│   ├── flows/
│   │   ├── web/
│   │   │   ├── auth/
│   │   │   ├── home/
│   │   │   ├── study/
│   │   │   ├── streak/
│   │   │   └── offline/
│   │   ├── android/
│   │   └── ios/
│   └── shared/
│       └── setup.yaml
```

## Test Flows Examples

### Authentication (Web)

```yaml
# login_anonymous.yaml
appId: halomeid-web
---
- launchApp
- assertVisible: "התחבר"
- tapOn: "המשך כאורח"
- assertVisible: "הלומד"
- assertVisible: "משנה יומית"
```

### Home Screen

```yaml
# home_display.yaml
appId: halomeid-web
---
- launchApp:
    clearState: true
- runFlow: ../auth/login_anonymous.yaml

# Verify home screen elements
- assertVisible: "הלומד"
- assertVisible: "משנה יומית"

# Verify track card
- assertVisible:
    id: "track_card"

# Verify streak indicator
- assertVisible:
    id: "streak_indicator"
```

### Mark Complete

```yaml
# mark_complete.yaml
appId: halomeid-web
---
- launchApp
- runFlow: ../home/navigate_to_study.yaml

# Initial state: not completed
- assertVisible:
    text: "סיימתי"

# Tap done button
- tapOn:
    text: "סיימתי"

# Verify completed state
- assertVisible:
    text: "✓ סיימתי"

# Toggle back
- tapOn:
    text: "✓ סיימתי"

# Verify toggled
- assertVisible:
    text: "סיימתי"
```

### Offline Read

```yaml
# offline_read.yaml
appId: halomeid-web
---
- launchApp
- runFlow: ../auth/login_anonymous.yaml

# Wait for initial sync
- wait: 3000

# Disable network
- toggleAirplaneMode

# Navigate to study
- tapOn:
    id: "track_card"

# Verify content loads from local cache
- assertVisible:
    id: "mishna_text"
- assertVisible:
    id: "explanation_text"

# Re-enable network
- toggleAirplaneMode
```

## Running Tests

### Single Flow

```bash
maestro test tests/maestro/flows/web/auth/login_anonymous.yaml
```

### All Flows

```bash
maestro test tests/maestro/flows/web/
```

### Platform-Specific

```bash
# Web
maestro test --platform web tests/maestro/flows/web/

# Android
maestro test --platform android tests/maestro/flows/android/

# iOS
maestro test --platform ios tests/maestro/flows/ios/
```

### With Maestro Studio

```bash
# Start Maestro Studio for visual testing
maestro studio
```

## Element Identification

### Best Practices

1. **Use test IDs**: Add `data-testid` (Web), `testTag` (Compose), `accessibilityIdentifier` (SwiftUI)

2. **Web (React)**:
```tsx
<div data-testid="track_card">
```

3. **Android (Compose)**:
```kotlin
Modifier.testTag("track_card")
```

4. **iOS (SwiftUI)**:
```swift
.accessibilityIdentifier("track_card")
```

### Fallback Selectors

- Text content: `text: "סיימתי"`
- Index: `index: 0`
- Class: `className: "TrackCard"`

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd web && npm ci

      - name: Build
        run: cd web && npm run build

      - name: Setup Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Run E2E Tests
        run: maestro test tests/maestro/flows/web/
```

## Key Test Scenarios

| Scenario | Test File | Description |
|----------|-----------|-------------|
| Anonymous Login | `auth/login_anonymous.yaml` | Login as guest user |
| Home Display | `home/home_display.yaml` | Verify home screen elements |
| Study Navigation | `home/navigate_to_study.yaml` | Navigate to study screen |
| Mark Complete | `study/mark_complete.yaml` | Toggle completion state |
| Expand Deep Dive | `study/deep_dive_expand.yaml` | Expand/collapse commentaries |
| Streak Display | `streak/streak_display.yaml` | Verify streak indicator |
| Offline Read | `offline/offline_read.yaml` | Read content offline |
| Offline Complete | `offline/offline_complete.yaml` | Mark complete offline |

## Reference Documents

- **PRD Section 7**: Core App Flow (test scenarios)
- **TDD Section 10**: Platform Implementations
- **Maestro Docs**: https://maestro.mobile.dev/
