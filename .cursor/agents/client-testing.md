---
name: client-testing
model: fast
---

# Client Testing Agent

## Purpose

The Client Testing Agent is responsible for end-to-end (E2E) testing of all client applications (Android, iOS, Web) using Maestro, a modern mobile and web testing framework.

## Responsibilities

- Maestro E2E testing framework setup
- Cross-platform UI tests (Android, iOS, Web)
- Test flows for Home screen, Study screen
- Completion marking tests
- Streak display tests
- Offline behavior tests
- Maestro Studio integration
- CI/CD integration for client tests

## Dependencies

- **Receives tasks from**: Architect Agent
- **Coordinates with**: Android Agent, iOS Agent, Web Agent
- **References**: PRD Section 7 (Core App Flow), All platform agents

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
- Free CLI and Maestro Studio

## Setup

### Installation

```bash
# macOS
curl -Ls "https://get.maestro.mobile.dev" | bash

# Or via Homebrew
brew tap mobile-dev-inc/tap
brew install maestro
```

### Maestro Studio (Desktop IDE)

Download from [maestro.dev](https://maestro.dev/):
- Visual test recording
- Element inspector
- AI-assisted test generation

## Project Structure

```
tests/
├── maestro/
│   ├── config.yaml
│   ├── flows/
│   │   ├── auth/
│   │   │   ├── login_anonymous.yaml
│   │   │   ├── login_google.yaml
│   │   │   └── login_apple.yaml
│   │   ├── home/
│   │   │   ├── home_display.yaml
│   │   │   └── navigate_to_study.yaml
│   │   ├── study/
│   │   │   ├── study_display.yaml
│   │   │   ├── mark_complete.yaml
│   │   │   └── deep_dive_expand.yaml
│   │   ├── streak/
│   │   │   ├── streak_display.yaml
│   │   │   └── streak_update.yaml
│   │   └── offline/
│   │       ├── offline_read.yaml
│   │       └── offline_complete.yaml
│   └── shared/
│       └── setup.yaml
```

## Test Flows

### Authentication Tests

#### Anonymous Login (login_anonymous.yaml)

```yaml
appId: com.halomeid.app
---
- launchApp
- assertVisible: "התחבר"
- tapOn: "המשך כאורח"
- assertVisible: "הלומד"
- assertVisible: "משנה יומית"
```

#### Google Login (login_google.yaml)

```yaml
appId: com.halomeid.app
---
- launchApp
- assertVisible: "התחבר"
- tapOn:
    text: "Google"
    index: 0
# Google OAuth flow handled by system
- assertVisible: "הלומד"
```

### Home Screen Tests

#### Home Display (home_display.yaml)

```yaml
appId: com.halomeid.app
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

#### Navigate to Study (navigate_to_study.yaml)

```yaml
appId: com.halomeid.app
---
- launchApp
- runFlow: ../auth/login_anonymous.yaml

# Tap on track card
- tapOn:
    id: "track_card"
    
# Verify study screen
- assertVisible:
    id: "study_screen"
- assertVisible:
    id: "mishna_text"
- assertVisible:
    id: "explanation_text"
```

### Study Screen Tests

#### Study Display (study_display.yaml)

```yaml
appId: com.halomeid.app
---
- launchApp
- runFlow: ../home/navigate_to_study.yaml

# Verify content structure
- assertVisible:
    id: "mishna_text"
    
- assertVisible:
    id: "explanation_text"
    
# Verify done button
- assertVisible:
    text: "סיימתי"
    
# Verify expandable section (collapsed)
- assertVisible:
    text: "סיכום פרשנויות"
```

#### Mark Complete (mark_complete.yaml)

```yaml
appId: com.halomeid.app
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

#### Deep Dive Expand (deep_dive_expand.yaml)

```yaml
appId: com.halomeid.app
---
- launchApp
- runFlow: ../home/navigate_to_study.yaml

# Tap expandable section
- tapOn:
    text: "סיכום פרשנויות"
    
# Verify expanded content
- assertVisible:
    id: "deep_dive_content"
    
# Collapse
- tapOn:
    text: "סיכום פרשנויות"
    
# Verify collapsed
- assertNotVisible:
    id: "deep_dive_content"
```

### Streak Tests

#### Streak Display (streak_display.yaml)

```yaml
appId: com.halomeid.app
---
- launchApp
- runFlow: ../auth/login_anonymous.yaml

# Verify streak indicator on home
- assertVisible:
    id: "streak_indicator"
    
# Verify streak count
- assertVisible:
    text: "🔥"
```

#### Streak Update (streak_update.yaml)

```yaml
appId: com.halomeid.app
---
- launchApp
- runFlow: ../auth/login_anonymous.yaml

# Get initial streak value
- copyTextFrom:
    id: "streak_count"
    
# Complete today's study
- runFlow: ../study/mark_complete.yaml

# Go back to home
- back

# Verify streak incremented
# (Note: May need to wait for sync)
- wait: 2000
- assertVisible:
    id: "streak_indicator"
```

### Offline Tests

#### Offline Read (offline_read.yaml)

```yaml
appId: com.halomeid.app
---
- launchApp
- runFlow: ../auth/login_anonymous.yaml

# Wait for initial sync
- wait: 3000

# Disable network (platform-specific)
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

#### Offline Complete (offline_complete.yaml)

```yaml
appId: com.halomeid.app
---
- launchApp
- runFlow: ../auth/login_anonymous.yaml
- wait: 3000

# Go offline
- toggleAirplaneMode

# Navigate and complete
- runFlow: ../study/mark_complete.yaml

# Verify local state
- assertVisible:
    text: "✓ סיימתי"
    
# Go back online
- toggleAirplaneMode

# Wait for sync
- wait: 3000

# Verify state persisted
- back
- tapOn:
    id: "track_card"
- assertVisible:
    text: "✓ סיימתי"
```

## Running Tests

### Single Flow

```bash
# Run single test
maestro test tests/maestro/flows/auth/login_anonymous.yaml
```

### All Flows

```bash
# Run all tests
maestro test tests/maestro/flows/
```

### Platform-Specific

```bash
# Android
maestro test --platform android tests/maestro/flows/

# iOS
maestro test --platform ios tests/maestro/flows/

# Web
maestro test --platform web tests/maestro/flows/
```

### With Maestro Studio

```bash
# Start Maestro Studio for visual testing
maestro studio
```

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
  e2e-android:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash
        
      - name: Build Android APK
        run: ./gradlew assembleDebug
        working-directory: android
        
      - name: Run E2E Tests
        run: maestro test tests/maestro/flows/

  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash
        
      - name: Build iOS App
        run: xcodebuild build -scheme HaLomeid -sdk iphonesimulator
        working-directory: ios
        
      - name: Run E2E Tests
        run: maestro test tests/maestro/flows/
```

### Maestro Cloud

For parallel test execution:

```bash
# Upload to Maestro Cloud
maestro cloud tests/maestro/flows/ \
  --apiKey $MAESTRO_API_KEY \
  --app path/to/app.apk
```

## Element Identification

### Best Practices

1. **Use test IDs**: Add `testTag` (Compose), `accessibilityIdentifier` (SwiftUI), `data-testid` (Web)

2. **Android (Compose)**:
```kotlin
Modifier.testTag("track_card")
```

3. **iOS (SwiftUI)**:
```swift
.accessibilityIdentifier("track_card")
```

4. **Web (React)**:
```tsx
<div data-testid="track_card">
```

### Fallback Selectors

- Text content: `text: "סיימתי"`
- Index: `index: 0`
- Class: `className: "TrackCard"`

## Test Data Management

### Setup/Teardown

```yaml
# setup.yaml (shared)
---
- clearState  # Clear app data
- launchApp
- runFlow: auth/login_anonymous.yaml
```

### Test User

For authenticated tests, use a dedicated test account configured in Supabase.

## Accessibility Testing

Maestro can validate accessibility:

```yaml
- assertVisible:
    id: "done_button"
    traits:
      - "button"
```

## Reference Documents

- **PRD Section 7**: Core App Flow (test scenarios)
- **TDD Section 10**: Platform Implementations (element IDs)
- **Maestro Docs**: https://maestro.mobile.dev/
