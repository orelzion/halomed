/**
 * Simple i18n implementation for App Router
 * Loads translations from locales/he/common.json
 */

import common from '@/locales/he/common.json';

export type TranslationKey = keyof typeof common;

export function useTranslation(namespace: string = 'common') {
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let translation = common[key] || key;
    
    // Replace parameters {{param}} with actual values
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translation = translation.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }
    }
    
    return translation;
  };
  
  return { t };
}

// For use in Server Components
export function getTranslation(namespace: string = 'common') {
  return (key: TranslationKey, params?: Record<string, string | number>): string => {
    let translation = common[key] || key;
    
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translation = translation.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }
    }
    
    return translation;
  };
}
