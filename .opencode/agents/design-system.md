# Design System Guide

## Purpose

The Design System Guide maintains visual consistency across all platforms through shared design tokens, typography specifications, shared string resources, and component guidelines following the "Desert Oasis" theme.

## Responsibilities

- Design tokens (colors, typography, spacing)
- Font asset management across platforms
- Component library specifications
- Cross-platform design consistency
- "Desert Oasis" theme implementation
- RTL (Right-to-Left) layout guidelines
- Shared string resources across all platforms
- Light/Dark/System theme support

## Theme: "Desert Oasis"

A calm, warm design inspired by parchment and quiet study spaces. Evokes the serenity of Torah study in a desert oasis.

## Theme Modes

All clients MUST support three theme modes:
1. **Light** - Default Desert Oasis theme
2. **Dark** - Dark mode variant
3. **System** - Follow device setting (default)

## Color Palette

### Light Theme Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-background` | `#FEFAE0` | Study screen background |
| `secondary-background` | `#E9EDC9` | Home screen, headers |
| `card-surface` | `#FAEDCD` | Track cards, containers |
| `accent` | `#D4A373` | Streak flame, Done button |
| `muted-accent` | `#CCD5AE` | Icons, dividers |
| `text-primary` | `#1A1A1A` | Main text |
| `text-secondary` | `#4A4A4A` | Secondary text |

### Dark Theme Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-background` | `#121212` | Study screen background |
| `secondary-background` | `#1E1E1E` | Home screen, headers |
| `card-surface` | `#2D2D2D` | Track cards, containers |
| `accent` | `#D4A373` | Streak flame, Done button (same) |
| `muted-accent` | `#8A9A7A` | Icons, dividers (adjusted) |
| `text-primary` | `#FEFAE0` | Main text (inverted) |
| `text-secondary` | `#B0B0B0` | Secondary text |

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
| `headline-large` | 24px | 32 | Bold | Mishnah text |
| `headline-medium` | 20px | 28 | Bold | Section headers |
| `body-large` | 16px | 24 | Regular | AI explanation |
| `body-medium` | 14px | 20 | Regular | UI text |
| `caption` | 12px | 16 | Regular | Timestamps, metadata |

## Spacing System

### Base Unit

8px base unit for consistent spacing.

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | 4px | Inline spacing |
| `space-sm` | 8px | Tight spacing |
| `space-md` | 16px | Standard padding |
| `space-lg` | 24px | Section spacing |
| `space-xl` | 32px | Large gaps |
| `space-2xl` | 48px | Screen padding |

## Shared String Resources

### Overview

All user-facing strings are maintained in a single master JSON file and generated into platform-specific formats:

**Location:** `shared/strings/strings.json`

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

Generates platform-specific formats:
- Web: `web/locales/he/common.json` (uses `{{count}}` for parameters)
- Android: `android/.../values/strings.xml` (uses `%d` for parameters)
- iOS: `ios/.../Localizable.strings` (uses `%d` for parameters)

### Platform Usage

**Web (i18next):**
```typescript
const { t } = useTranslation('common');
<span>{t('done_button')}</span>
<span>{t('streak_count', { count: 5 })}</span>
```

## Components

### Track Card

```
Background: card-surface
Border radius: 12px
Shadow: subtle (0 2 4 rgba(0,0,0,0.1))
Padding: space-md (16px)
```

### Done Button

```
Background: accent (#D4A373)
Text: white (both themes)
Border radius: 12px
Width: full width with space-md padding
Height: 48-56px
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

### Web Implementation

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
- [ ] Components match specifications
- [ ] Accessibility requirements met
- [ ] Haptic feedback implemented

## Reference Documents

- **PRD Section 6**: User Experience & Design System
- **TDD Section 3**: Design System (Global, All Platforms)
