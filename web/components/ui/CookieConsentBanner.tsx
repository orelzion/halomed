'use client';

import { useState, useEffect, useRef } from 'react';
import { useConsent, ConsentPreferences } from '@/lib/hooks/useConsent';
import { useTranslation } from '@/lib/i18n';

export function CookieConsentBanner() {
  const { hasConsented, acceptAll, acceptEssentialOnly, saveConsent, consent, gpcDetected } = useConsent();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsOnly, setShowSettingsOnly] = useState(false); // For when opened from footer (user already consented)
  const [tempPreferences, setTempPreferences] = useState<ConsentPreferences>({
    analytics: false,
    marketing: false,
    functional: false,
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Initialize temp preferences with current consent if available
  useEffect(() => {
    if (consent) {
      setTempPreferences(consent);
    }
  }, [consent]);

  // Listen for 'open-consent-settings' event from Footer (Do Not Sell/Share button)
  useEffect(() => {
    const handleOpenSettings = () => {
      // Initialize with current consent or defaults
      if (consent) {
        setTempPreferences(consent);
      }
      setShowSettings(true);
      setShowSettingsOnly(true); // Mark that we're showing settings only, not the banner
    };
    
    window.addEventListener('open-consent-settings', handleOpenSettings);
    return () => window.removeEventListener('open-consent-settings', handleOpenSettings);
  }, [consent]);

  // Focus management for modal
  useEffect(() => {
    if (showSettings && modalRef.current) {
      // Focus first focusable element when modal opens
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [showSettings]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
        setShowSettingsOnly(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showSettings]);

  // Determine if we should show the banner (not consented yet) or just the modal (settings opened from footer)
  const showBanner = hasConsented === false && !showSettingsOnly;
  
  // Don't render anything if: no banner needed AND settings modal not open
  if (!showBanner && !showSettings) {
    return null;
  }

  const handleToggle = (key: keyof ConsentPreferences) => {
    setTempPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveSettings = () => {
    saveConsent(tempPreferences);
    setShowSettings(false);
    setShowSettingsOnly(false);
  };

  const handleCloseModal = () => {
    setShowSettings(false);
    setShowSettingsOnly(false);
  };

  return (
    <>
      {/* Banner - only show if user hasn't consented yet */}
      {showBanner && <div
        role="dialog"
        aria-labelledby="consent-banner-title"
        aria-describedby="consent-banner-description"
        className="fixed bottom-0 left-0 right-0 z-50 bg-desert-oasis-card dark:bg-desert-oasis-dark-card border-t-2 border-desert-oasis-accent/30 shadow-lg"
      >
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h2
                id="consent-banner-title"
                className="font-source font-bold text-lg text-[var(--text-primary)] mb-2"
              >
                {t('consent_banner_title')}
              </h2>
              <p
                id="consent-banner-description"
                className="font-explanation text-sm text-[var(--text-secondary)]"
              >
                {t('consent_banner_description')}
              </p>
              {gpcDetected && (
                <p
                  className="font-explanation text-xs text-[var(--text-secondary)] mt-2 italic"
                  role="status"
                  aria-live="polite"
                >
                  {t('consent_gpc_notice')}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap w-full sm:w-auto">
              <button
                onClick={acceptEssentialOnly}
                className="px-4 py-2 rounded-lg font-explanation text-sm bg-gray-200 dark:bg-gray-700 text-[var(--text-primary)] hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {t('consent_essential_only')}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 rounded-lg font-explanation text-sm bg-gray-200 dark:bg-gray-700 text-[var(--text-primary)] hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {t('consent_manage')}
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 rounded-lg font-explanation text-sm bg-desert-oasis-accent text-white hover:bg-desert-oasis-accent/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                ref={firstFocusableRef}
              >
                {t('consent_accept_all')}
              </button>
            </div>
          </div>
        </div>
      </div>}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-modal-title"
        >
          <div
            ref={modalRef}
            className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2
                  id="consent-modal-title"
                  className="font-source font-bold text-xl text-[var(--text-primary)]"
                >
                  {t('consent_modal_title')}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-[var(--text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                  aria-label="סגור"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Consent Options */}
              <div className="space-y-6 mb-6">
                {/* Analytics */}
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="consent-analytics"
                      className="block font-explanation font-semibold text-[var(--text-primary)] mb-1 cursor-pointer"
                    >
                      {t('consent_analytics')}
                    </label>
                    <p className="font-explanation text-sm text-[var(--text-secondary)]">
                      {t('consent_analytics_description')}
                    </p>
                  </div>
                  <button
                    id="consent-analytics"
                    type="button"
                    role="switch"
                    aria-checked={tempPreferences.analytics}
                    onClick={() => handleToggle('analytics')}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      ${tempPreferences.analytics
                        ? 'bg-desert-oasis-accent'
                        : 'bg-gray-300 dark:bg-gray-600'
                      }
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${tempPreferences.analytics ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>

                {/* Marketing */}
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="consent-marketing"
                      className="block font-explanation font-semibold text-[var(--text-primary)] mb-1 cursor-pointer"
                    >
                      {t('consent_marketing')}
                    </label>
                    <p className="font-explanation text-sm text-[var(--text-secondary)]">
                      {t('consent_marketing_description')}
                    </p>
                  </div>
                  <button
                    id="consent-marketing"
                    type="button"
                    role="switch"
                    aria-checked={tempPreferences.marketing}
                    onClick={() => handleToggle('marketing')}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      ${tempPreferences.marketing
                        ? 'bg-desert-oasis-accent'
                        : 'bg-gray-300 dark:bg-gray-600'
                      }
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${tempPreferences.marketing ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>

                {/* Functional */}
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="consent-functional"
                      className="block font-explanation font-semibold text-[var(--text-primary)] mb-1 cursor-pointer"
                    >
                      {t('consent_functional')}
                    </label>
                    <p className="font-explanation text-sm text-[var(--text-secondary)]">
                      {t('consent_functional_description')}
                    </p>
                  </div>
                  <button
                    id="consent-functional"
                    type="button"
                    role="switch"
                    aria-checked={tempPreferences.functional}
                    onClick={() => handleToggle('functional')}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      ${tempPreferences.functional
                        ? 'bg-desert-oasis-accent'
                        : 'bg-gray-300 dark:bg-gray-600'
                      }
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${tempPreferences.functional ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-desert-oasis-muted dark:border-desert-oasis-dark-card pt-4">
                <p className="font-explanation text-xs text-[var(--text-secondary)] mb-4 text-center">
                  {t('consent_withdraw')}
                </p>
                <button
                  onClick={handleSaveSettings}
                  className="w-full px-4 py-3 rounded-lg font-explanation text-base bg-desert-oasis-accent text-white hover:bg-desert-oasis-accent/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {t('consent_save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
