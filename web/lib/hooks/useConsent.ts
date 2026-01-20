'use client';

import { useState, useEffect, useCallback } from 'react';
import { applyGPCIfDetected } from '@/lib/privacy/gpc';
import { supabase } from '@/lib/supabase/client';

export interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const CONSENT_STORAGE_KEY = 'halomed_consent';
const CONSENT_VERSION = '1.0';

/**
 * Sync consent preferences to the backend
 * This ensures GDPR compliance by persisting consent server-side
 */
async function syncConsentToBackend(preferences: ConsentPreferences): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      // User not authenticated, skip backend sync
      // Consent is still stored in localStorage
      return;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/set-consent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          analytics_consent: preferences.analytics,
          marketing_consent: preferences.marketing,
          functional_consent: preferences.functional,
          consent_version: CONSENT_VERSION,
        }),
      }
    );

    if (!response.ok) {
      console.warn('[Consent] Failed to sync to backend:', await response.text());
    } else {
      console.log('[Consent] Successfully synced to backend');
    }
  } catch (error) {
    // Don't block on backend errors - localStorage is the primary store
    console.warn('[Consent] Backend sync error:', error);
  }
}

export function useConsent() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [gpcDetected, setGpcDetected] = useState<boolean>(false);

  useEffect(() => {
    // Check GPC first
    const { gpcDetected: detected, preferencesApplied } = applyGPCIfDetected();
    setGpcDetected(detected);
    
    if (preferencesApplied) {
      setHasConsented(true);
      setConsent({ analytics: false, marketing: false, functional: true });
      // Sync GPC preferences to backend
      syncConsentToBackend({ analytics: false, marketing: false, functional: true });
      return;
    }
    
    // Then check existing consent
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConsent(parsed.preferences);
        setHasConsented(true);
      } catch {
        setHasConsented(false);
      }
    } else {
      setHasConsented(false);
    }
  }, []);

  const saveConsent = useCallback((preferences: ConsentPreferences) => {
    const data = {
      preferences,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(data));
    setConsent(preferences);
    setHasConsented(true);
    window.dispatchEvent(new CustomEvent('consent-updated', { detail: preferences }));
    
    // Sync to backend for GDPR compliance
    syncConsentToBackend(preferences);
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({ analytics: true, marketing: true, functional: true });
  }, [saveConsent]);

  const acceptEssentialOnly = useCallback(() => {
    saveConsent({ analytics: false, marketing: false, functional: false });
  }, [saveConsent]);

  const revokeConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    setConsent(null);
    setHasConsented(false);
    window.dispatchEvent(new CustomEvent('consent-updated', { detail: null }));
  }, []);

  return {
    consent,
    hasConsented,
    gpcDetected,
    saveConsent,
    acceptAll,
    acceptEssentialOnly,
    revokeConsent,
  };
}
