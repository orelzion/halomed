---
name: design-system
model: fast
---

# Design System Agent

## Purpose

The Design System Agent is responsible for maintaining visual consistency across all platforms (Android, iOS, Web) through shared design tokens, typography specifications, shared string resources, and component guidelines following the "Desert Oasis" theme.

## Responsibilities

- Design tokens (colors, typography, spacing)
- Font asset management across platforms
- Component library specifications
- Cross-platform design consistency
- "Desert Oasis" theme implementation
- RTL (Right-to-Left) layout guidelines
- **Shared string resources across all platforms**
- **Light/Dark/System theme support**

## Dependencies

- **Receives tasks from**: Architect Agent
- **Consulted by**: Android Agent, iOS Agent, Web Agent
- **References**: PRD Section 6, TDD Section 3

## Shared String Resources

### Overview

All user-facing strings are maintained in a single master JSON file and generated into platform-specific formats. This ensures:
- Consistency across platforms
- Single source of truth
- Easy future localization
- No hardcoded strings in code

### Master Strings File

Location: `shared/strings/strings.json`

```json
{
  "app_name": "הלומד",
  "done_button": "סיימתי",
  "done_completed": "✓ סיימתי",
  "have_you_studied_today": "האם למדת היום?",
  "studied_today": "למדת היום ✓",
  "summary_of_commentaries": "סיכום פרשנויות",
  "continue_as_guest": "המשך כאורח",
  "sign_in_with_google": "התחבר עם Google",
  "sign_in_with_apple": "התחבר עם Apple",
  "daily_mishna": "משנה יומית",
  "streak_count": "{count} ימים רצופים",
  "login_title": "התחבר",
  "well_done": "כל הכבוד!",
  "todays_study_complete": "הלימוד היומי הושלם",
  "no_study_today": "אין לימוד מתוכנן להיום",
  "offline_mode": "מצב לא מקוון",
  "syncing": "מסנכרן...",
  "error_generic": "אירעה שגיאה",
  "retry": "נסה שוב",
  "settings": "הגדרות",
  "theme_light": "בהיר",
  "theme_dark": "כהה",
  "theme_system": "לפי המערכת"
}
```

### Generation Script

**Location:** `scripts/generate-strings.js`

**Requirements:**
- Read master `strings.json` file
- Generate Android `strings.xml` (both `values/` and `values-iw/`)
- Generate iOS `Localizable.strings` (in `he.lproj/`)
- Generate Web `common.json` (in `locales/he/`)
- Convert parameter placeholders: `{count}` → `%d` (Android/iOS) or `{{count}}` (Web)
- Escape XML characters for Android
- Create directories if they don't exist

**Implementation Pattern:**
- Use Node.js fs module
- Parse JSON master file
- Transform strings per platform format
- Write to platform-specific locations
- Log generation status

  
  // Write to values-iw/ (explicit Hebrew locale)
  // Android uses "iw" for Hebrew (legacy ISO 639-1 code), not "he"
  const valuesIwPath = path.join(androidResPath, 'values-iw/strings.xml');
  fs.mkdirSync(path.dirname(valuesIwPath), { recursive: true });
  fs.writeFileSync(valuesIwPath, xml);
  console.log('Generated Android values-iw/strings.xml (Hebrew locale)');
}

// Generate iOS Localizable.strings
function generateIOS() {
  let strings = '';
  
  for (const [key, value] of Object.entries(masterStrings)) {
    // Convert {count} to %d for iOS
    const iosValue = value.replace(/{(\w+)}/g, '%d');
    strings += '"' + key + '" = "' + iosValue + '";\n';
  }
  
  const iosPath = path.join(__dirname, '../ios/HaLomeid/Resources/he.lproj/Localizable.strings');
  fs.mkdirSync(path.dirname(iosPath), { recursive: true });
  fs.writeFileSync(iosPath, strings);
  console.log('Generated iOS Localizable.strings');
}

// Generate Web i18n JSON
function generateWeb() {
  const webStrings = {};
  
  for (const [key, value] of Object.entries(masterStrings)) {
    // Convert {count} to {{count}} for i18next
    webStrings[key] = value.replace(/{(\w+)}/g, '{{$1}}');
  }
  
  const webPath = path.join(__dirname, '../web/locales/he/common.json');
  fs.mkdirSync(path.dirname(webPath), { recursive: true });
  fs.writeFileSync(webPath, JSON.stringify(webStrings, null, 2));
  console.log('Generated Web common.json');
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
}

generateAndroid();
generateIOS();
generateWeb();

console.log('\nAll string resources generated successfully!');
```

### Output Structure

The script generates:

```
android/app/src/main/res/
├── values/
│   └── strings.xml          (Hebrew - default fallback)
└── values-iw/
    └── strings.xml          (Hebrew - explicit locale)

ios/HaLomeid/Resources/
└── he.lproj/
    └── Localizable.strings  (Hebrew)

web/locales/
└── he/
    └── common.json          (Hebrew)
```

### Android Locale Note

Android uses **`values-iw/`** for Hebrew (legacy ISO 639-1 code "iw"), not "he". Both `values/` and `values-iw/` contain the same Hebrew strings to ensure:
- `values/` - Default for devices without Hebrew locale
- `values-iw/` - Matches devices with Hebrew locale setting

### Build Integration

Add to CI/CD pipeline:

```yaml
- name: Generate string resources
  run: node scripts/generate-strings.js
```

### Platform Usage

#### Android

**Pattern:**
- Use `stringResource(R.string.xxx)` for all text
- Support parameterized strings: `stringResource(R.string.streak_count, count)`

#### iOS

**Pattern:**
- SwiftUI automatically localizes string literals in `Text`, `Label`, `Button`, etc.
- Simply use: `Text("done_button")` - no need for `NSLocalizedString`
- For parameterized strings: `Text("streak_count \(count)")` - SwiftUI handles format specifiers automatically
- For non-SwiftUI contexts: `String(localized: "key", comment: "")`

#### Web

**Pattern:**
- Use `useTranslation('common')` hook from next-i18next
- Support parameterized strings: `t('streak_count', { count })`


## Theme: "Desert Oasis"

A calm, warm design inspired by parchment and quiet study spaces. Evokes the serenity of Torah study in a desert oasis.

## Theme Modes

### Light/Dark/System Support

All clients MUST support three theme modes:
1. **Light** - Default Desert Oasis theme
2. **Dark** - Dark mode variant
3. **System** - Follow device setting (default)

### Color Palette

#### Light Theme Colors

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `primary-background` | `#FEFAE0` | rgb(254, 250, 224) | Study screen background |
| `secondary-background` | `#E9EDC9` | rgb(233, 237, 201) | Home screen, headers |
| `card-surface` | `#FAEDCD` | rgb(250, 237, 205) | Track cards, containers |
| `accent` | `#D4A373` | rgb(212, 163, 115) | Streak flame, Done button |
| `muted-accent` | `#CCD5AE` | rgb(204, 213, 174) | Icons, dividers |
| `text-primary` | `#1A1A1A` | rgb(26, 26, 26) | Main text |
| `text-secondary` | `#4A4A4A` | rgb(74, 74, 74) | Secondary text |

#### Dark Theme Colors

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `primary-background` | `#121212` | rgb(18, 18, 18) | Study screen background |
| `secondary-background` | `#1E1E1E` | rgb(30, 30, 30) | Home screen, headers |
| `card-surface` | `#2D2D2D` | rgb(45, 45, 45) | Track cards, containers |
| `accent` | `#D4A373` | rgb(212, 163, 115) | Streak flame, Done button (same) |
| `muted-accent` | `#8A9A7A` | rgb(138, 154, 122) | Icons, dividers (adjusted) |
| `text-primary` | `#FEFAE0` | rgb(254, 250, 224) | Main text (inverted) |
| `text-secondary` | `#B0B0B0` | rgb(176, 176, 176) | Secondary text |

### Platform Implementation

#### Android (Compose)

```kotlin
@Composable
fun HalomeidTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    
    MaterialTheme(
        colorScheme = colorScheme,
        typography = HalomeidTypography,
        content = content
    )
}
```

#### iOS (SwiftUI)

```swift
struct HalomeidTheme {
    @Environment(\.colorScheme) var colorScheme
    
    var primaryBackground: Color {
        colorScheme == .dark ? Color(hex: "121212") : Color(hex: "FEFAE0")
    }
    
    var cardSurface: Color {
        colorScheme == .dark ? Color(hex: "2D2D2D") : Color(hex: "FAEDCD")
    }
    
    // ... other colors
}
```

#### Web (Tailwind + CSS Variables)

```css
:root {
  --primary-background: #FEFAE0;
  --card-surface: #FAEDCD;
  --text-primary: #1A1A1A;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-background: #121212;
    --card-surface: #2D2D2D;
    --text-primary: #FEFAE0;
  }
}

/* Or with class-based toggle */
.dark {
  --primary-background: #121212;
  --card-surface: #2D2D2D;
  --text-primary: #FEFAE0;
}
```

## Typography

### Font Families

| Font | Weight | Usage | Hebrew Support |
|------|--------|-------|----------------|
| Frank Ruhl Libre | Bold (700) | Source text (Mishnah) | Full |
| Noto Sans Hebrew | Regular (400) | AI explanations, UI text | Full |

### Font Sources

Download from Google Fonts:
- [Frank Ruhl Libre](https://fonts.google.com/specimen/Frank+Ruhl+Libre)
- [Noto Sans Hebrew](https://fonts.google.com/specimen/Noto+Sans+Hebrew)

### Font Bundling Requirements

**All platforms must bundle fonts locally:**
- No reliance on external CDNs
- No platform-specific font substitutions
- Ensure offline availability

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `headline-large` | 24sp/pt/px | 32 | Bold | Mishnah text |
| `headline-medium` | 20sp/pt/px | 28 | Bold | Section headers |
| `body-large` | 16sp/pt/px | 24 | Regular | AI explanation |
| `body-medium` | 14sp/pt/px | 20 | Regular | UI text |
| `caption` | 12sp/pt/px | 16 | Regular | Timestamps, metadata |

## Spacing System

### Base Unit

8dp/pt/px base unit for consistent spacing.

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | 4 | Inline spacing |
| `space-sm` | 8 | Tight spacing |
| `space-md` | 16 | Standard padding |
| `space-lg` | 24 | Section spacing |
| `space-xl` | 32 | Large gaps |
| `space-2xl` | 48 | Screen padding |

## Components

### Track Card

```
Background: card-surface
Border radius: 12
Shadow: subtle (0 2 4 rgba(0,0,0,0.1))
Padding: space-md (16)
```

### Done Button

```
Background: accent (#D4A373)
Text: white (both themes)
Border radius: 12
Width: full width with space-md padding
Height: 48-56
State: Toggle between done_button and done_completed strings
Feedback: Haptic on tap
```

### Expandable Section

```
Header: body-medium, muted-accent icon
Content: Collapsed by default
Animation: Smooth expand/collapse (200-300ms)
Divider: muted-accent, 1px
```

## RTL (Right-to-Left) Guidelines

### Layout Direction

All layouts must support RTL for Hebrew.

### Platform Implementation

#### Android

```kotlin
android:supportsRtl="true"

CompositionLocalProvider(
    LocalLayoutDirection provides LayoutDirection.Rtl
) { content() }
```

#### iOS

```swift
.environment(\.layoutDirection, .rightToLeft)
```

#### Web

```css
html {
  direction: rtl;
}
```

## Accessibility

### Color Contrast

All text must meet WCAG 2.1 AA standards:
- Regular text: 4.5:1 minimum contrast ratio
- Large text (18pt+): 3:1 minimum contrast ratio

### Touch Targets

Minimum touch target size:
- Android: 48dp x 48dp
- iOS: 44pt x 44pt
- Web: 44px x 44px

## Implementation Checklist

For each platform, verify:

- [ ] Colors match hex values exactly (both light and dark)
- [ ] Theme follows system preference by default
- [ ] User can override theme preference
- [ ] Fonts are bundled locally
- [ ] Typography scale is consistent
- [ ] Spacing follows 8-unit grid
- [ ] RTL layout is correct
- [ ] All strings from shared resources (no hardcoded)
- [ ] String generation script runs in CI
- [ ] Android has both values/ and values-iw/ folders
- [ ] Components match specifications
- [ ] Accessibility requirements met
- [ ] Haptic feedback implemented

## Reference Documents

- **PRD Section 6**: User Experience & Design System
- **TDD Section 3**: Design System (Global, All Platforms)
