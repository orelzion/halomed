/**
 * Global Privacy Control (GPC) detection for CCPA/CPRA compliance
 * https://globalprivacycontrol.org/
 */

export function detectGPC(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check navigator.globalPrivacyControl
  // @ts-expect-error - GPC is not yet in TypeScript DOM types
  if (navigator.globalPrivacyControl === true) {
    return true;
  }
  
  // Check DoNotTrack as fallback
  if (navigator.doNotTrack === '1') {
    return true;
  }
  
  return false;
}

export function applyGPCIfDetected(): { gpcDetected: boolean; preferencesApplied: boolean } {
  const gpcDetected = detectGPC();
  
  if (gpcDetected) {
    // GPC signal detected - apply privacy preferences
    // This should disable analytics and marketing by default
    const CONSENT_STORAGE_KEY = 'halomed_consent';
    const existingConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    
    if (!existingConsent) {
      // No consent yet - apply GPC preferences (opt-out of analytics/marketing)
      const gpcPreferences = {
        preferences: {
          analytics: false,
          marketing: false,
          functional: true, // Allow functional cookies
        },
        version: '1.0',
        timestamp: new Date().toISOString(),
        gpcApplied: true,
      };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(gpcPreferences));
      
      // Dispatch event so other components know
      window.dispatchEvent(new CustomEvent('consent-updated', { 
        detail: gpcPreferences.preferences 
      }));
      
      return { gpcDetected: true, preferencesApplied: true };
    }
  }
  
  return { gpcDetected, preferencesApplied: false };
}
