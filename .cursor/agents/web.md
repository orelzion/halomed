---
name: web
model: fast
---

# Web Agent

## Purpose

The Web Agent is responsible for implementing the web client using Next.js and React, including PowerSync Web (IndexedDB-backed SQLite), PWA setup, and the "Desert Oasis" design system with Tailwind CSS.

## Responsibilities

- Next.js + React setup
- Tailwind CSS configuration
- PowerSync Web (IndexedDB-backed SQLite)
- PWA setup with service worker
- UI implementation (Home, Study screens)
- Design system implementation with light/dark/system theme
- Font bundling (Frank Ruhl Libre, Noto Sans Hebrew)
- Supabase Auth integration (Google, Apple)
- All strings via i18n (no hardcoded strings)

## Dependencies

- **Receives tasks from**: Architect Agent
- **Consults**: Design System Agent (UI specs, shared strings), Sync Agent (PowerSync), Backend Agent (API)
- **Coordinates with**: Client Testing Agent (Maestro tests)

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| UI Library | React 18 |
| Styling | Tailwind CSS |
| Local Database | PowerSync Web (IndexedDB SQLite) |
| Authentication | Supabase Auth JS |
| PWA | next-pwa |
| i18n | next-i18next |
| State Management | React Context + Hooks |
| Theme | next-themes |

## Critical Rules

### No Hardcoded Strings

**NEVER use hardcoded strings in code.** All user-facing text must use the i18n system:

```typescript
// BAD - Never do this
<span>סיימתי</span>
<p>האם למדת היום?</p>

// GOOD - Always use translations
import { useTranslation } from 'next-i18next';

const { t } = useTranslation('common');

<span>{t('done_button')}</span>
<p>{t('have_you_studied_today')}</p>
```

String resources are generated from the shared master file. See `design-system.md` for the shared string resources system.

## Project Structure

```
web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── study/
│   │   └── [trackId]/
│   │       └── page.tsx
│   └── api/
│       └── auth/
│           └── callback/
│               └── route.ts
├── components/
│   ├── ui/
│   │   ├── TrackCard.tsx
│   │   ├── StreakIndicator.tsx
│   │   ├── DoneButton.tsx
│   │   ├── ExpandableSection.tsx
│   │   └── ThemeToggle.tsx
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   └── StudyScreen.tsx
│   └── providers/
│       ├── PowerSyncProvider.tsx
│       ├── AuthProvider.tsx
│       └── ThemeProvider.tsx
├── lib/
│   ├── powersync/
│   │   ├── schema.ts
│   │   ├── database.ts
│   │   └── connector.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── auth.ts
│   └── hooks/
│       ├── useStudyUnit.ts
│       ├── useStreak.ts
│       └── useTracks.ts
├── locales/
│   └── he/
│       └── common.json
├── public/
│   ├── fonts/
│   │   ├── FrankRuhlLibre-Bold.ttf
│   │   └── NotoSansHebrew-Regular.ttf
│   ├── manifest.json
│   └── sw.js
├── styles/
│   └── fonts.css
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## Design System Implementation

### Theme Support (Light/Dark/System)

**Requirements:**
- Use next-themes for theme management
- Support light, dark, and system theme modes
- Use CSS variables for theme colors
- Follow design system colors (see `design-system.md`)
- Default to system theme preference

**Implementation Pattern:**
- Wrap app with ThemeProvider from next-themes
- Define CSS variables in globals.css for light/dark themes
- Use Tailwind darkMode: 'class' configuration
- Apply theme via className or CSS variables
typescript
// components/providers/ThemeProvider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

### Tailwind Configuration

**Requirements:**
- Configure Tailwind with darkMode: 'class'
- Extend theme with design system colors
- Define custom font families (Frank Ruhl Libre, Noto Sans Hebrew)
- Use CSS variables for theme colors

**Color Tokens:**
- Define desert-oasis color palette
- Support both light and dark variants
- See `design-system.md` for exact hex values
typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'desert-oasis': {
          // Light theme
          'primary': '#FEFAE0',
          'secondary': '#E9EDC9',
          'card': '#FAEDCD',
          'accent': '#D4A373',
          'muted': '#CCD5AE',
          // Dark theme
          'dark-primary': '#121212',
          'dark-secondary': '#1E1E1E',
          'dark-card': '#2D2D2D',
        },
      },
      fontFamily: {
        'source': ['Frank Ruhl Libre', 'serif'],
        'explanation': ['Noto Sans Hebrew', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

### Global Styles (globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: 'Frank Ruhl Libre';
  src: url('/fonts/FrankRuhlLibre-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Noto Sans Hebrew';
  src: url('/fonts/NotoSansHebrew-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* RTL support */
html {
  direction: rtl;
}

body {
  font-family: 'Noto Sans Hebrew', sans-serif;
}

/* Theme colors */
:root {
  --bg-primary: #FEFAE0;
  --bg-secondary: #E9EDC9;
  --bg-card: #FAEDCD;
  --text-primary: #1A1A1A;
  --text-secondary: #4A4A4A;
}

.dark {
  --bg-primary: #121212;
  --bg-secondary: #1E1E1E;
  --bg-card: #2D2D2D;
  --text-primary: #FEFAE0;
  --text-secondary: #B0B0B0;
}
```

## String Resources

### Generated from Shared Master (locales/he/common.json)

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
  "streak_count": "{{count}} ימים רצופים",
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

See `design-system.md` for the shared string resources system that generates these files.

## Screen Implementations

### Root Layout (app/layout.tsx)

```tsx
import { PowerSyncProvider } from '@/components/providers/PowerSyncProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './globals.css'

export const metadata = {
  title: 'הלומד - HaLomeid',
  description: 'לימוד יומי',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <PowerSyncProvider>
              {children}
            </PowerSyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Home Page (app/page.tsx)

```tsx
'use client'

import { useTracks } from '@/lib/hooks/useTracks'
import { useStreak } from '@/lib/hooks/useStreak'
import { TrackCard } from '@/components/ui/TrackCard'
import { useTranslation } from 'next-i18next'

export default function HomePage() {
  const { tracks, completedToday } = useTracks()
  const { streaks } = useStreak()
  const { t } = useTranslation('common')

  return (
    <main className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary p-4">
      <h1 className="text-2xl font-source text-center mb-6 text-[var(--text-primary)]">
        {t('app_name')}
      </h1>
      
      <div className="space-y-4 max-w-md mx-auto">
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            streak={streaks[track.id] || 0}
            hasStudiedToday={completedToday.includes(track.id)}
          />
        ))}
      </div>
    </main>
  )
}
```

### Done Button (components/ui/DoneButton.tsx)

```tsx
'use client'

import { useTranslation } from 'next-i18next'

interface DoneButtonProps {
  isCompleted: boolean
  onClick: () => void
}

export function DoneButton({ isCompleted, onClick }: DoneButtonProps) {
  const { t } = useTranslation('common')
  
  const handleClick = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      className="w-full py-4 px-6 bg-desert-oasis-accent text-white rounded-xl font-explanation text-lg transition-transform active:scale-95"
    >
      {t(isCompleted ? 'done_completed' : 'done_button')}
    </button>
  )
}
```

### Theme Toggle (components/ui/ThemeToggle.tsx)

```tsx
'use client'

import { useTheme } from 'next-themes'
import { useTranslation } from 'next-i18next'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation('common')
  
  return (
    <div className="flex gap-2">
      <button
        onClick={() => setTheme('light')}
        className={theme === 'light' ? 'font-bold' : ''}
      >
        {t('theme_light')}
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={theme === 'dark' ? 'font-bold' : ''}
      >
        {t('theme_dark')}
      </button>
      <button
        onClick={() => setTheme('system')}
        className={theme === 'system' ? 'font-bold' : ''}
      >
        {t('theme_system')}
      </button>
    </div>
  )
}
```

## PowerSync Integration

### Schema (lib/powersync/schema.ts)

```typescript
import { Schema, Table, Column, ColumnType } from '@powersync/web'

export const AppSchema = new Schema([
  new Table('user_study_log', [
    new Column('id', ColumnType.TEXT),
    new Column('user_id', ColumnType.TEXT),
    new Column('track_id', ColumnType.TEXT),
    new Column('study_date', ColumnType.TEXT),
    new Column('content_id', ColumnType.TEXT),
    new Column('is_completed', ColumnType.INTEGER),
    new Column('completed_at', ColumnType.TEXT),
  ]),
  new Table('content_cache', [
    new Column('id', ColumnType.TEXT),
    new Column('ref_id', ColumnType.TEXT),
    new Column('source_text_he', ColumnType.TEXT),
    new Column('ai_explanation_he', ColumnType.TEXT),
    new Column('ai_deep_dive_json', ColumnType.TEXT),
    new Column('created_at', ColumnType.TEXT),
  ]),
  new Table('tracks', [
    new Column('id', ColumnType.TEXT),
    new Column('title', ColumnType.TEXT),
    new Column('source_endpoint', ColumnType.TEXT),
    new Column('schedule_type', ColumnType.TEXT),
  ]),
])
```

## PWA Configuration

### Manifest (public/manifest.json)

```json
{
  "name": "הלומד - HaLomeid",
  "short_name": "הלומד",
  "description": "לימוד יומי",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FEFAE0",
  "theme_color": "#D4A373",
  "dir": "rtl",
  "lang": "he",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Key Dependencies (package.json)

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "@powersync/web": "^0.x.x",
    "@supabase/supabase-js": "^2.x.x",
    "next-pwa": "^5.x.x",
    "next-themes": "^0.x.x",
    "next-i18next": "^15.x.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x",
    "@types/node": "^20.x",
    "@types/react": "^18.x"
  }
}
```

## Testing

See `client-testing.md` for Maestro E2E tests covering:
- Home screen display
- Study screen navigation
- Completion marking
- Streak display
- Offline behavior (service worker)
- PWA installation
- Theme switching (light/dark)

## Reference Documents

- **TDD Section 10.3**: Web implementation
- **TDD Section 3**: Design System
- **PRD Section 6**: User Experience
- **PRD Section 7**: Core App Flow
- **PRD Section 11**: Web Platform
- **design-system.md**: Shared string resources, theming
