'use client';

import { useTheme } from 'next-themes';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex gap-2" data-testid="theme_toggle">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1 rounded ${
          theme === 'light' ? 'bg-desert-oasis-accent text-white' : 'bg-gray-200 dark:bg-gray-700'
        }`}
        aria-label={t('theme_light')}
      >
        {t('theme_light')}
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1 rounded ${
          theme === 'dark' ? 'bg-desert-oasis-accent text-white' : 'bg-gray-200 dark:bg-gray-700'
        }`}
        aria-label={t('theme_dark')}
      >
        {t('theme_dark')}
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`px-3 py-1 rounded ${
          theme === 'system' ? 'bg-desert-oasis-accent text-white' : 'bg-gray-200 dark:bg-gray-700'
        }`}
        aria-label={t('theme_system')}
      >
        {t('theme_system')}
      </button>
    </div>
  );
}
