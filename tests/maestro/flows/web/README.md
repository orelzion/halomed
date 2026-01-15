# Maestro E2E Tests for Web App

This directory contains Maestro E2E test flows for the HaLomeid web application.

## Prerequisites

1. **Maestro CLI** installed (v2.0.10+)
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Maestro Studio** (for recording and visual testing)
   - Download from: https://maestro.dev/
   - macOS: Available in App Store or direct download

3. **Development Server Running**
   ```bash
   cd web
   npm run dev -- --webpack
   ```

## Test Files

- `project_setup.yaml` - Validates basic app setup
- `design_system.yaml` - Tests design system components
- `i18n.yaml` - Tests internationalization
- `powersync.yaml` - Tests PowerSync integration
- `auth_anonymous.yaml` - Tests anonymous authentication
- `auth_google.yaml` - Tests Google OAuth
- `pwa.yaml` - Tests PWA functionality
- `home.yaml` - Tests home screen
- `study.yaml` - Tests study screen
- `completion.yaml` - Tests completion marking
- `streak.yaml` - Tests streak calculation
- `offline.yaml` - Tests offline behavior
- `theme.yaml` - Tests theme switching

## Running Tests

### Using Maestro Studio (Recommended for Recording)

1. **Start Maestro Studio**
   ```bash
   maestro studio
   ```

2. **Open Test Flow**
   - Click "Open Flow" in Maestro Studio
   - Select a `.yaml` file from this directory
   - Click "Run" to execute
   - Click "Record" to create a video recording

3. **Record Test Run**
   - Maestro Studio automatically records test executions
   - Recordings are saved in the Studio interface
   - You can export recordings as video files

### Using CLI (Headless)

For CI/CD or automated testing:

```bash
# Run single test
maestro test tests/maestro/flows/web/project_setup.yaml --headless

# Run all tests
maestro test tests/maestro/flows/web/ --headless

# Run with recording (requires Maestro Studio)
maestro record tests/maestro/flows/web/project_setup.yaml --local --output recordings/project_setup.mp4
```

## Recording Test Runs

### Method 1: Maestro Studio (Easiest)

1. Open Maestro Studio
2. Load a test flow
3. Click "Run" - Studio automatically records
4. Export recording from Studio interface

### Method 2: CLI Recording

```bash
# Record a single test
maestro record tests/maestro/flows/web/home.yaml --local --output recordings/home.mp4

# Record all tests
for test in tests/maestro/flows/web/*.yaml; do
  name=$(basename "$test" .yaml)
  maestro record "$test" --local --output "recordings/${name}.mp4"
done
```

## Test Structure

Each test file follows this structure:

```yaml
appId: web
---
# Launch app
- launchApp:
    url: "http://localhost:3000"

# Wait for elements (handled by assertions)
# - wait: 2000  # ❌ Not supported - use assertions instead

# Verify elements
- assertVisible:
    text: "הלומד"
    optional: true

# Interact with elements
- tapOn:
    id: "track_card"
    optional: true
```

## Notes

- **No `wait:` command**: Maestro doesn't support `wait:` - use assertions which have built-in waits
- **TDD Approach**: Tests should FAIL until features are implemented. Do NOT use `optional: true` unless the element is truly optional (e.g., advanced features that may not exist in all states)
- **Flow references**: Use `runFlow: filename.yaml` (not `runFlow: path/filename.yaml`)
- **Web platform**: Tests use `appId: web` and run in Chrome/Chromium

## Troubleshooting

### Server Not Running
```bash
# Check if server is running
curl http://localhost:3000

# Start server
cd web && npm run dev -- --webpack
```

### Maestro Can't Find Browser
- Ensure Chrome/Chromium is installed
- Try running Maestro Studio first to set up browser

### Tests Failing
- Check server logs: `tail -f /tmp/nextjs-dev.log`
- Verify elements exist: Check browser DevTools
- Use Maestro Studio to debug visually

## CI/CD Integration

For GitHub Actions or CI pipelines:

```yaml
- name: Run Maestro Tests
  run: |
    cd web && npm run dev -- --webpack &
    sleep 10
    maestro test tests/maestro/flows/web/ --headless
```
