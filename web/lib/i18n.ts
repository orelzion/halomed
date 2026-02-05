/**
 * Simple i18n implementation for App Router
 * Loads translations from locales/he/*.json
 */

import common from '@/locales/he/common.json';
import admin from '@/locales/he/admin.json';

const translations: Record<string, Record<string, unknown>> = {
  common,
  admin,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function useTranslation(namespace: string = 'common') {
  const t = (key: string, params?: Record<string, string | number>): string => {
    const translationSet = translations[namespace] || {};
    let translation = getNestedValue(translationSet, key) || key;
    
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
  return (key: string, params?: Record<string, string | number>): string => {
    const translationSet = translations[namespace] || {};
    let translation = getNestedValue(translationSet, key) || key;
    
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translation = translation.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }
    }
    
    return translation;
  };
}
