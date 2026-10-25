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
        // Study page tokens, defined per theme in globals.css
        'study-ink': 'var(--study-ink)',
        'study-rule': 'var(--study-rule)',
        'study-soft': 'var(--study-soft)',
      },
      fontFamily: {
        'source': ['var(--font-source)', 'serif'],
        'explanation': ['var(--font-explanation)', 'sans-serif'],
        // Notes under a mishna: serif like the source. Set --font-notes (e.g. to var(--font-explanation)) to change it.
        'notes': ['var(--font-notes, var(--font-source))', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
