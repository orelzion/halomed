# HaLomeid Web App

Progressive Web App for daily Torah learning, built with Next.js 16, React, RxDB, and Supabase.

## Features

- ✅ **Offline-First**: RxDB with IndexedDB and Supabase replication
- ✅ **Authentication**: Anonymous, Google, and Apple OAuth
- ✅ **PWA**: Installable with offline support
- ✅ **Theme**: Light/Dark/System theme support
- ✅ **i18n**: Hebrew translations (no hardcoded strings)
- ✅ **Design System**: Desert Oasis theme with custom fonts

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **UI**: React 19.2.3
- **Styling**: Tailwind CSS 3.4.19
- **Database**: RxDB (IndexedDB with Supabase sync)
- **Auth**: Supabase Auth JS
- **PWA**: next-pwa 5.6.0
- **Theme**: next-themes 0.4.6
- **i18n**: Custom i18n hook

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Environment Variables

Create a `.env.local` file in the `web/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
cd web
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

Note: PWA requires webpack build (use `npm run build` which includes `--webpack` flag).

## Project Structure

```
web/
├── app/                    # Next.js App Router pages
│   ├── (auth)/login/      # Login page
│   ├── auth/callback/     # OAuth callback
│   ├── study/[trackId]/   # Study screen
│   └── page.tsx           # Home page
├── components/
│   ├── providers/         # Context providers
│   ├── screens/           # Screen components
│   └── ui/                # UI components
├── lib/
│   ├── hooks/             # Custom React hooks
│   ├── database/          # RxDB database setup
│   ├── sync/              # Supabase replication
│   ├── supabase/          # Supabase client & auth
│   └── i18n.ts            # i18n hook
├── locales/he/            # Hebrew translations
└── public/                # Static assets
```

## Testing

Maestro E2E tests are located in `tests/maestro/flows/web/`:

```bash
# Run Maestro tests (requires Maestro CLI)
maestro test tests/maestro/flows/web/
```

## Reference

- **PRD**: `docs/halomed_prd.md`
- **TDD**: `docs/halomed_tdd.md`
- **Web Agent**: `.cursor/agents/web.md`
- **Design System**: `.cursor/agents/design-system.md`
