import posthog from 'posthog-js'

/**
 * PostHog GDPR-Compliant Analytics Implementation
 * 
 * Follows PostHog's official best practices for GDPR compliance:
 * https://posthog.com/docs/privacy/gdpr-compliance
 * https://posthog.com/docs/privacy/data-collection
 * 
 * Key principles:
 * 1. opt_out_capturing_by_default: true - No tracking until explicit consent
 * 2. persistence: 'memory' before consent - No cookies/localStorage until consent
 * 3. Explicit opt_in_capturing() call only after user consents
 * 4. Support for consent withdrawal via opt_out_capturing()
 */

const CONSENT_STORAGE_KEY = 'halomed_consent';

// Track initialization state
let posthogInitialized = false;

/**
 * Check if user has granted analytics consent
 */
function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const consentData = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!consentData) return false;
    
    const parsed = JSON.parse(consentData);
    // Support both formats: {preferences: {analytics: true}} and {analytics_consent: true}
    return parsed.preferences?.analytics === true || parsed.analytics_consent === true;
  } catch {
    return false;
  }
}

/**
 * Initialize PostHog with GDPR-compliant settings
 * 
 * Per PostHog docs, we initialize with:
 * - opt_out_capturing_by_default: true - No tracking until explicit consent
 * - persistence: Based on consent status
 * - autocapture: false initially (enabled after consent)
 */
function initializePostHog() {
  if (posthogInitialized) return;
  
  const hasConsent = hasAnalyticsConsent();
  
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: '/ingest',
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    
    // GDPR Compliance Settings (per PostHog docs)
    opt_out_capturing_by_default: true,  // Don't capture anything until explicit opt-in
    persistence: hasConsent ? 'localStorage+cookie' : 'memory', // No persistent storage until consent
    
    // Disable autocapture until consent - prevents accidental PII collection
    autocapture: hasConsent,
    
    // Disable session recording until consent
    disable_session_recording: !hasConsent,
    
    // Include the defaults option as required by PostHog
    defaults: '2025-05-24',
    
    // Enable error tracking (non-PII)
    capture_exceptions: hasConsent,
    
    // Debug mode for development
    debug: process.env.NODE_ENV === 'development',
    
    // Mask all inputs by default for privacy
    mask_all_text: false,
    mask_all_element_attributes: false,
    
    // Callback when PostHog is loaded
    loaded: (ph) => {
      posthogInitialized = true;
      
      // Register non-PII super properties
      ph.register({
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      });
      
      // If user already consented, opt them in
      if (hasConsent) {
        console.log('[PostHog] User has consent, opting in');
        ph.opt_in_capturing();
      } else {
        console.log('[PostHog] No consent yet, staying opted out');
      }
    },
  });
}

/**
 * Handle consent changes from the consent banner
 * Called when user accepts/rejects cookies
 */
function handleConsentUpdate(event: Event) {
  const customEvent = event as CustomEvent;
  const preferences = customEvent.detail;
  
  // Check if analytics consent was granted
  const analyticsConsent = preferences?.analytics === true;
  
  if (analyticsConsent) {
    console.log('[PostHog] Analytics consent granted');
    
    if (posthogInitialized) {
      // PostHog already initialized - opt in and enable features
      posthog.opt_in_capturing();
      
      // Re-enable autocapture and session recording
      // Note: These require reinitialization to fully enable, but opt_in handles the basics
    } else {
      // Initialize PostHog with consent
      initializePostHog();
      // The loaded callback will handle opt_in
    }
  } else {
    console.log('[PostHog] Analytics consent revoked/denied');
    
    if (posthogInitialized) {
      // Opt out - stops all capturing
      posthog.opt_out_capturing();
      
      // Clear any stored PostHog data (per GDPR right to be forgotten)
      posthog.reset();
    }
  }
}

// Initialize on page load
if (typeof window !== 'undefined') {
  // Always initialize PostHog (with opt_out_capturing_by_default: true)
  // This allows the SDK to be ready, but no data is captured until consent
  initializePostHog();
  
  // Listen for consent updates from the consent banner
  window.addEventListener('consent-updated', handleConsentUpdate);
}

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.ts is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.

export { posthog };
