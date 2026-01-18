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
        'source': ['var(--font-source)', 'serif'],
        'explanation': ['var(--font-explanation)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
