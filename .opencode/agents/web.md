# Web Guide

## Purpose

The Web Guide covers the Next.js/React web client implementation, including RxDB for offline-first sync, PWA setup, and the "Desert Oasis" design system with Tailwind CSS.

## Responsibilities

- Next.js + React setup
- Tailwind CSS configuration
- RxDB (IndexedDB) for offline-first sync
- PWA setup with service worker
- UI implementation (Home, Study screens)
- Design system implementation with light/dark/system theme
- Font bundling (Frank Ruhl Libre, Noto Sans Hebrew)
- Supabase Auth integration (Google, Apple)
- All strings via i18n (no hardcoded strings)

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS |
| Local Database | RxDB (IndexedDB) |
| Sync | RxDB Supabase Plugin |
| Authentication | Supabase Auth JS |
| PWA | Serwist + Service Worker |
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

### No Arbitrary Delays

Never use `setTimeout` to wait for data. Use reactive patterns:

```typescript
// BAD
setTimeout(() => doSomething(), 500);

// GOOD
useEffect(() => {
  if (data && isReady) doSomething();
}, [data, isReady]);
```

## Project Structure

```
web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── (auth)/
│   │   └── login/
│   ├── study/
│   │   └── [trackId]/
│   ├── review/
│   ├── quiz/
│   ├── schedule/
│   └── api/
├── components/
│   ├── ui/
│   ├── screens/
│   └── providers/
├── lib/
│   ├── database/
│   ├── sync/
│   ├── supabase/
│   └── hooks/
├── locales/
│   └── he/
│       └── common.json
├── public/
│   ├── fonts/
│   ├── manifest.json
│   └── sw.js
├── tailwind.config.ts
└── package.json
```

## Design System Implementation

### Theme Support (Light/Dark/System)

Use next-themes for theme management:

```typescript
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

```typescript
// tailwind.config.ts
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
          'primary': '#FEFAE0',
          'secondary': '#E9EDC9',
          'card': '#FAEDCD',
          'accent': '#D4A373',
          'muted': '#CCD5AE',
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

### Global Styles

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

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

## RxDB Integration

### Database Setup

```typescript
// lib/database/database.ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

export async function createDatabase() {
  const db = await createRxDatabase({
    name: 'halomeid',
    storage: getRxStorageDexie(),
  });

  await db.addCollections({
    user_study_log: { schema: userStudyLogSchema },
    content_cache: { schema: contentCacheSchema },
    tracks: { schema: tracksSchema },
  });

  return db;
}
```

### Replication Setup

```typescript
// lib/sync/replication.ts
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';

export async function setupReplication(db: RxDatabase, userId: string) {
  const window = getDateWindow(); // ±14 days

  const userStudyLogReplication = replicateSupabase({
    collection: db.user_study_log,
    client: supabase,
    tableName: 'user_study_log',
    pull: {
      queryBuilder: ({ query }) => {
        return query
          .eq('user_id', userId)
          .gte('study_date', window.start)
          .lte('study_date', window.end);
      },
    },
  });

  await userStudyLogReplication.awaitInitialReplication();
}
```

## Component Examples

### Done Button

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

### Theme Toggle

```tsx
'use client'

import { useTheme } from 'next-themes'
import { useTranslation } from 'next-i18next'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation('common')

  return (
    <div className="flex gap-2">
      <button onClick={() => setTheme('light')}>
        {t('theme_light')}
      </button>
      <button onClick={() => setTheme('dark')}>
        {t('theme_dark')}
      </button>
      <button onClick={() => setTheme('system')}>
        {t('theme_system')}
      </button>
    </div>
  )
}
```

## PWA Configuration

### Manifest

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

## Key Files

| Path | Purpose |
|------|---------|
| `web/app/layout.tsx` | Root layout with providers |
| `web/app/page.tsx` | Home page |
| `web/app/study/[trackId]/page.tsx` | Study screen |
| `web/lib/database/` | RxDB setup |
| `web/lib/sync/` | Replication configuration |
| `web/locales/he/common.json` | Hebrew translations |

## Reference Documents

- **TDD Section 10.3**: Web implementation
- **TDD Section 3**: Design System
- **PRD Section 6**: User Experience
- **PRD Section 7**: Core App Flow
- **PRD Section 11**: Web Platform
