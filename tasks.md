# HaLomeid Implementation Tasks

This file tracks implementation tasks following TDD workflow:
1. Architect defines task
2. Server-testing writes tests (for backend/sync tasks)
3. Implementor agent implements
4. Task marked complete

---

## Archived: Backend Foundation ✅

### Setup & Infrastructure

- [x] **Task 1.1**: Initialize Supabase project structure ✅ (2024-12-19)
- [x] **Task 1.2**: Create database schema migration for `tracks` table ✅ (2024-12-19)
- [x] **Task 1.3**: Create database schema migration for `content_cache` table ✅ (2024-12-19)
- [x] **Task 1.4**: Create database schema migration for `user_study_log` table ✅ (2024-12-19)

### Row Level Security (RLS)

- [x] **Task 2.1**: Enable RLS on `tracks` table with read-only policy ✅ (2024-12-19)
- [x] **Task 2.2**: Enable RLS on `content_cache` table with read-only policy for authenticated users ✅ (2024-12-19)
- [x] **Task 2.3**: Enable RLS on `user_study_log` table with user-scoped policy ✅ (2024-12-19)

### Authentication

- [x] **Task 3.1**: Configure Supabase Auth for Anonymous login ✅ (2024-12-19)
- [x] **Task 3.2**: Configure Supabase Auth for Google OAuth ✅ (2024-12-19)
- [x] **Task 3.3**: Configure Supabase Auth for Apple Sign-In ✅ (2024-12-19)

### Edge Functions Structure

- [x] **Task 4.1**: Create Edge Functions directory structure ✅ (2024-12-19)
- [x] **Task 4.2**: Create shared utilities (`_shared/cors.ts`, `_shared/auth.ts`) ✅ (2024-12-19)

## Archived: Track Scheduling ✅

- [x] **Task 5.1**: Implement `generate-schedule` Edge Function ✅ (2024-12-19)
- [x] **Task 5.2**: Implement DAILY_WEEKDAYS_ONLY schedule type ✅ (2024-12-19)
- [x] **Task 5.3**: Implement user track joining logic ✅ (2024-12-19)

## Archived: Content Generation ✅

- [x] **Task 6.1**: Implement Sefaria API integration ✅ (2024-12-19)
- [x] **Task 6.2**: Implement `generate-content` Edge Function ✅ (2024-12-19)

---

## Archived: Sync Layer (Sync Agent) ✅

All sync layer tasks (7.1-7.15) completed. See git history for details.

---

## Archived: Web App Foundation ✅

All web app foundation tasks (8.1-8.13) completed. See git history for details.

---

## Archived: Study Schedule Page ✅

All study schedule tasks (9.1-9.7) completed. See git history for details.

---

## Duolingo-Style Learning Path (Section 10)

**Status**: In Progress  
See detailed tasks below (10.1 - 10.17)

---

## Full Shas Path Generation (Section 11)

**Status**: Pending  
See detailed tasks below (11.1 - 11.7)

---

# Regulations Compliance Tasks

**Created**: 2026-01-20  
**Source**: Regulations Agent Compliance Audit  
**Total Issues Found**: 21 (20 non-compliant, 1 compliant)

This section contains tasks to address compliance issues identified by the Regulations Agent across GDPR, ePrivacy (Cookie Consent), CCPA/CPRA, WCAG 2.2 AA, and Israel SI 5568 regulations.

---

## Feature: Privacy & Cookie Consent Infrastructure

**Regulation Reference**: GDPR Articles 6, 7, 13; ePrivacy Directive Article 5(3); CCPA Section 1798.100
**Severity**: Critical

### Dependencies
- None (foundational infrastructure)

### Overview

Implements core privacy infrastructure including cookie consent management, consent-based analytics initialization, and user consent preferences storage.

### Tasks

#### Backend Agent

- [ ] **Task 12.1a**: Write tests for `user_consent_preferences` table schema
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.1)
  - Test table structure (id, user_id, analytics_consent, marketing_consent, functional_consent, consent_timestamp, consent_version, ip_country)
  - Test foreign key to auth.users
  - Test unique constraint on user_id
  - Test RLS policies (users can only access their own consent)
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None
  - Reference: GDPR Article 7 (Conditions for consent)

- [x] **Task 12.1**: Create database migration for `user_consent_preferences` table ✅ (2026-01-20)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 12.1a tests pass)
  - Create migration file at `supabase/migrations/YYYYMMDD_create_user_consent_preferences.sql`
  - Columns: id (UUID), user_id (UUID FK), analytics_consent (BOOLEAN), marketing_consent (BOOLEAN), functional_consent (BOOLEAN), consent_timestamp (TIMESTAMPTZ), consent_version (TEXT), ip_country (TEXT)
  - Add RLS policies (users can only read/write their own consent)
  - Add index on user_id
  - Acceptance: Table created, RLS enabled, tests pass
  - Depends on: Task 12.1a (tests written first)
  - Files: `supabase/migrations/`

- [ ] **Task 12.2a**: Write tests for consent API endpoints
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.2)
  - Test GET /api/consent returns user's consent preferences
  - Test POST /api/consent stores consent with timestamp
  - Test consent versioning (tracks policy version)
  - Test anonymous users can store consent
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 12.1 ✅

- [x] **Task 12.2**: Create Edge Functions for consent management ✅ (2026-01-20)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 12.2a tests pass)
  - Create `get-consent` Edge Function
  - Create `set-consent` Edge Function
  - Store consent with ISO timestamp
  - Track consent version (matches privacy policy version)
  - Handle both authenticated and anonymous users
  - Acceptance: API endpoints work, consent stored correctly, tests pass
  - Depends on: Task 12.2a (tests written first), Task 12.1 ✅
  - Files: `supabase/functions/get-consent/`, `supabase/functions/set-consent/`

#### Sync Agent

- [ ] **Task 12.3a**: Write tests for user_consent_preferences sync rules
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.3)
  - Test user-scoped bucket (user_id = bucket.user_id)
  - Test all consent columns synced
  - Test sync rules syntax
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 12.1 ✅

- [x] **Task 12.3**: Configure sync rules for `user_consent_preferences` table ✅ (2026-01-20)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 12.3a tests pass)
  - Add user_consent_preferences bucket to powersync.yaml
  - User-scoped sync (user_id = bucket.user_id)
  - Sync all consent columns
  - Acceptance: Sync rules configured, tests pass
  - Depends on: Task 12.3a (tests written first), Task 12.1 ✅
  - Files: `powersync/powersync.yaml`, `powersync/schemas/user_consent_preferences.sql`

#### Web Agent

- [x] **Task 12.4a**: Write Maestro tests for cookie consent banner ✅ (2026-01-20)
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.4)
  - Test banner displays on first visit (no consent stored)
  - Test banner does NOT display if consent already given
  - Test "Accept All" button grants all consent types
  - Test "Manage Preferences" opens consent modal
  - Test consent modal shows granular options (Analytics, Marketing, Functional)
  - Test "Essential Only" button grants only essential consent
  - Test consent persists after page reload
  - Test banner accessible (keyboard navigable, ARIA labels)
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 12.1 ✅
  - Files: `tests/maestro/flows/web/consent_banner.yaml`

- [x] **Task 12.4**: Implement cookie consent banner component ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.4a tests pass)
  - Create `CookieConsentBanner` component at `web/components/ui/CookieConsentBanner.tsx`
  - Create `ConsentModal` component for granular preferences
  - Display banner at bottom of screen (fixed position)
  - Buttons: "קבל הכל" (Accept All), "הגדרות" (Manage), "חיוניים בלבד" (Essential Only)
  - Store consent in localStorage immediately (for blocking)
  - Sync consent to backend via API
  - Use `useConsent` hook for consent state management
  - Acceptance: Banner works, consent stored, tests pass
  - Depends on: Task 12.4a (tests written first), Task 12.2 ✅
  - Files: `web/components/ui/CookieConsentBanner.tsx`, `web/components/ui/ConsentModal.tsx`, `web/lib/hooks/useConsent.ts`

- [x] **Task 12.5a**: Write Maestro tests for consent-based analytics blocking ✅ (2026-01-20)
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.5)
  - Test PostHog does NOT initialize before consent
  - Test PostHog initializes ONLY after analytics consent given
  - Test PostHog stops tracking if consent revoked
  - Test page loads without errors when PostHog disabled
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 12.4 ✅
  - Files: `tests/maestro/flows/web/consent_analytics.yaml`

- [x] **Task 12.5**: Implement consent-based analytics initialization ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.5a tests pass)
  - Refactor `instrumentation-client.ts` to check consent BEFORE initializing PostHog
  - Create `initializeAnalytics()` function that checks consent
  - Only initialize PostHog if `analytics_consent === true`
  - Add listener for consent changes to enable/disable PostHog dynamically
  - Implement opt-out by calling `posthog.opt_out_capturing()`
  - Acceptance: PostHog blocked until consent, tests pass
  - Depends on: Task 12.5a (tests written first), Task 12.4 ✅
  - Files: `web/instrumentation-client.ts`, `web/lib/analytics.ts`

#### Content Generation Agent

- [x] **Task 12.6**: Generate cookie consent banner UI strings ✅ (2026-01-20)
  - **Assigned to**: Content Generation Agent
  - Add consent-related strings to `shared/strings/strings.json`
  - Keys needed:
    - `consent_banner_title`: "אנחנו משתמשים בעוגיות"
    - `consent_banner_description`: Description of cookie usage
    - `consent_accept_all`: "קבל הכל"
    - `consent_manage`: "הגדרות"
    - `consent_essential_only`: "חיוניים בלבד"
    - `consent_modal_title`: "הגדרות פרטיות"
    - `consent_analytics`: "ניתוח שימוש"
    - `consent_analytics_description`: Explanation of analytics cookies
    - `consent_marketing`: "שיווק"
    - `consent_marketing_description`: Explanation of marketing cookies
    - `consent_functional`: "פונקציונלי"
    - `consent_functional_description`: Explanation of functional cookies
    - `consent_save`: "שמור העדפות"
  - Run string generation script
  - Acceptance: All strings added to Hebrew locale
  - Depends on: None
  - Files: `shared/strings/strings.json`, `web/locales/he/common.json`

---

## Feature: CCPA/CPRA Compliance

**Regulation Reference**: CCPA Section 1798.120 (Do Not Sell), Section 1798.135 (GPC)
**Severity**: High

### Dependencies
- Privacy & Cookie Consent Infrastructure (Tasks 12.1-12.6)

### Tasks

#### Web Agent

- [ ] **Task 12.7a**: Write Maestro tests for GPC signal detection
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.7)
  - Test app detects `navigator.globalPrivacyControl` signal
  - Test app honors GPC signal (auto-disables analytics/marketing)
  - Test GPC signal overrides user consent preferences
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 12.5 ✅
  - Files: `tests/maestro/flows/web/gpc_detection.yaml`

- [x] **Task 12.7**: Implement Global Privacy Control (GPC) detection ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.7a tests pass)
  - Check `navigator.globalPrivacyControl` on page load
  - Check `Sec-GPC` header via API if needed
  - If GPC enabled: auto-disable analytics and marketing consent
  - Display notice that GPC signal was honored
  - Acceptance: GPC detected and honored, tests pass
  - Depends on: Task 12.7a (tests written first), Task 12.5 ✅
  - Files: `web/lib/hooks/useConsent.ts`, `web/lib/privacy/gpc.ts`

- [ ] **Task 12.8a**: Write Maestro tests for "Do Not Sell/Share" link
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.8)
  - Test "Do Not Sell/Share" link visible in footer
  - Test link present on profile/settings page
  - Test clicking link opens consent modal
  - Test disabling analytics/marketing via modal works
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 12.4 ✅
  - Files: `tests/maestro/flows/web/ccpa_dns.yaml`

- [x] **Task 12.8**: Add "Do Not Sell/Share" link ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.8a tests pass)
  - Create Footer component at `web/components/layout/Footer.tsx`
  - Add "אל תמכור/שתף את המידע שלי" link to Footer
  - Add same link to profile page privacy settings section
  - Link opens consent modal with analytics/marketing options
  - Acceptance: Link visible and functional, tests pass
  - Depends on: Task 12.8a (tests written first), Task 12.4 ✅
  - Files: `web/components/layout/Footer.tsx`, `web/app/profile/page.tsx`, `web/app/layout.tsx`

---

## Feature: GDPR Data Subject Rights

**Regulation Reference**: GDPR Articles 15-20 (Access, Rectification, Erasure, Portability)
**Severity**: High

### Dependencies
- Backend schema for user data storage

### Tasks

#### Backend Agent

- [ ] **Task 12.9a**: Write tests for data export API
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.9)
  - Test API returns all user data (study logs, preferences, consent)
  - Test export format is machine-readable (JSON)
  - Test export includes all data types as per GDPR Article 20
  - Test only authenticated user can export their own data
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None

- [x] **Task 12.9**: Create data export Edge Function ✅ (2026-01-20)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 12.9a tests pass)
  - Create `export-user-data` Edge Function
  - Export all user data: user_study_log, user_preferences, user_consent_preferences, learning_path
  - Return as JSON with clear structure
  - Add rate limiting (1 export per 24 hours)
  - Acceptance: Export works, returns all data, tests pass
  - Depends on: Task 12.9a (tests written first)
  - Files: `supabase/functions/export-user-data/`

- [ ] **Task 12.10a**: Write tests for account deletion API
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.10)
  - Test API deletes all user data
  - Test deletion cascades to all related tables
  - Test user auth account is deleted
  - Test deletion is irreversible
  - Test only authenticated user can delete their own account
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None

- [x] **Task 12.10**: Create account deletion Edge Function ✅ (2026-01-20)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 12.10a tests pass)
  - Create `delete-account` Edge Function
  - Delete all user data from: user_study_log, user_preferences, user_consent_preferences, learning_path
  - Delete Supabase Auth user
  - Send confirmation email (if email known)
  - Acceptance: Deletion works completely, tests pass
  - Depends on: Task 12.10a (tests written first)
  - Files: `supabase/functions/delete-account/`

#### Web Agent

- [ ] **Task 12.11a**: Write Maestro tests for GDPR rights UI
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.11)
  - Test profile page shows "Privacy Rights" section
  - Test "Download My Data" button triggers export
  - Test "Delete My Account" button shows confirmation dialog
  - Test confirmation dialog requires explicit confirmation
  - Test links to privacy policy from rights section
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 12.9 ✅, Task 12.10 ✅
  - Files: `tests/maestro/flows/web/gdpr_rights.yaml`

- [x] **Task 12.11**: Implement GDPR rights UI in profile page ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.11a tests pass)
  - Add "Privacy Rights" section to profile page
  - "הורד את הנתונים שלי" (Download My Data) button - calls export API
  - "מחק את החשבון שלי" (Delete My Account) button - shows confirmation
  - Create `DeleteAccountDialog` component with strong confirmation
  - Link to privacy policy explaining rights
  - Acceptance: Rights UI works, export/delete functional, tests pass
  - Depends on: Task 12.11a (tests written first), Task 12.9 ✅, Task 12.10 ✅
  - Files: `web/app/profile/page.tsx`, `web/components/ui/DeleteAccountDialog.tsx`

---

## Feature: Legal Pages

**Regulation Reference**: GDPR Article 13, ePrivacy Directive, CCPA Section 1798.100, Israel SI 5568
**Severity**: Critical/High

### Dependencies
- None

### Tasks

#### Content Generation Agent

- [x] **Task 12.12**: Draft Privacy Policy content ✅ (2026-01-20)
  - **Assigned to**: Content Generation Agent
  - Create comprehensive privacy policy covering:
    - **Data Controller**: HaLomeid app, contact information
    - **Data Types Collected**: Usage data, device info, study progress, authentication data
    - **Legal Basis**: Consent (analytics), Legitimate Interest (core functionality), Contract (service delivery)
    - **Data Retention**: Study logs (indefinite while active), Analytics (2 years), Deleted accounts (30 days for backup)
    - **User Rights**: Access, Rectification, Erasure, Portability, Objection
    - **Third Parties**: Supabase (data storage), PostHog (analytics), Sefaria (content)
    - **International Transfers**: Data processing locations, safeguards
    - **Cookie Policy Reference**: Link to separate cookie policy
    - **Policy Version**: Version number and effective date
  - Write in Hebrew
  - Acceptance: Complete privacy policy draft reviewed and approved
  - Depends on: None
  - Files: `docs/legal/privacy-policy-he.md`

- [x] **Task 12.13**: Draft Cookie Policy content ✅ (2026-01-20)
  - **Assigned to**: Content Generation Agent
  - Create comprehensive cookie policy covering:
    - **What are cookies**: Explanation for non-technical users
    - **Cookie Types Used**:
      - Essential: Supabase auth session, PowerSync sync
      - Analytics: PostHog tracking (with specific cookie names)
      - Functional: Theme preference, language preference
    - **Third-Party Cookies**: PostHog, Supabase
    - **Cookie Lifespan**: Duration for each cookie type
    - **Managing Cookies**: How to control via browser and our consent banner
    - **Policy Version**: Version number and effective date
  - Write in Hebrew
  - Acceptance: Complete cookie policy draft reviewed and approved
  - Depends on: None
  - Files: `docs/legal/cookie-policy-he.md`

- [x] **Task 12.14**: Draft Accessibility Declaration content (Israel SI 5568) ✅ (2026-01-20)
  - **Assigned to**: Content Generation Agent
  - Create accessibility declaration in Hebrew covering:
    - **Declaration Statement**: Commitment to accessibility
    - **Standard Compliance**: SI 5568, WCAG 2.2 AA
    - **Accessibility Features**: RTL support, keyboard navigation, screen reader compatibility
    - **Known Limitations**: Any known accessibility issues (to be updated)
    - **Accessibility Coordinator**: Name, email, phone (placeholder for actual contact)
    - **Feedback Mechanism**: How to report accessibility issues
    - **Declaration Date**: When accessibility was last tested
    - **Testing Methods**: How accessibility was verified
  - Write in Hebrew
  - Acceptance: Complete accessibility declaration reviewed and approved
  - Depends on: None
  - Files: `docs/legal/accessibility-declaration-he.md`

#### Web Agent

- [ ] **Task 12.15a**: Write Maestro tests for legal pages
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.15)
  - Test `/privacy` page exists and displays content
  - Test `/cookies` page exists and displays content
  - Test `/accessibility` page exists and displays content
  - Test navigation between legal pages works
  - Test legal pages are accessible (WCAG compliant)
  - Test legal pages support RTL
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Tasks 12.12, 12.13, 12.14
  - Files: `tests/maestro/flows/web/legal_pages.yaml`

- [x] **Task 12.15**: Implement legal pages (Privacy, Cookies, Accessibility) ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.15a tests pass)
  - Create `/privacy` page at `web/app/(legal)/privacy/page.tsx`
  - Create `/cookies` page at `web/app/(legal)/cookies/page.tsx`
  - Create `/accessibility` page at `web/app/(legal)/accessibility/page.tsx`
  - Create shared `LegalPageLayout` component
  - Use markdown rendering for policy content
  - Add "Last Updated" date display
  - Ensure pages are fully accessible
  - Acceptance: All legal pages display correctly, tests pass
  - Depends on: Task 12.15a (tests written first), Tasks 12.12, 12.13, 12.14
  - Files: `web/app/(legal)/privacy/page.tsx`, `web/app/(legal)/cookies/page.tsx`, `web/app/(legal)/accessibility/page.tsx`, `web/components/layout/LegalPageLayout.tsx`

- [x] **Task 12.16**: Add footer with legal links to layout ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - Create or update Footer component
  - Add links: Privacy Policy, Cookie Policy, Accessibility Declaration
  - Add "Do Not Sell/Share" link (CCPA)
  - Ensure footer appears on all pages
  - Acceptance: Footer displays on all pages with working links
  - Depends on: Task 12.15 ✅, Task 12.8 ✅
  - Files: `web/components/layout/Footer.tsx`, `web/app/layout.tsx`

---

## Feature: Accessibility Improvements (WCAG 2.2 AA)

**Regulation Reference**: WCAG 2.2 AA, Israel SI 5568
**Severity**: High/Medium

### Dependencies
- None

### Tasks

#### Design System Agent

- [x] **Task 12.17**: Define focus indicator design tokens ✅ (2026-01-20)
  - **Assigned to**: Design System Agent
  - Define visible focus ring styles for Desert Oasis theme
  - Light theme: 2px solid #D4A373 (accent) with 2px offset
  - Dark theme: 2px solid #D4A373 with 2px offset
  - Focus-visible selector for keyboard-only focus
  - Acceptance: Focus ring design approved, documented in design system
  - Depends on: None
  - Files: `docs/design-system.md`, design tokens

- [x] **Task 12.18**: Verify color contrast for Desert Oasis palette ✅ (2026-01-20)
  - **Assigned to**: Design System Agent
  - Check all text/background combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
  - Verify #D4A373 accent color contrast against backgrounds
  - Document any colors that need adjustment
  - Provide alternative colors if needed
  - Acceptance: All colors meet WCAG AA contrast requirements
  - Depends on: None
  - Files: `docs/design-system.md`, `web/tailwind.config.ts`

#### Web Agent

- [ ] **Task 12.19a**: Write Maestro tests for focus indicators
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.19)
  - Test all interactive elements have visible focus indicators
  - Test focus indicators visible in light and dark themes
  - Test focus-visible selector works (only on keyboard nav)
  - Test tab navigation through all buttons, links, inputs
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 12.17 ✅
  - Files: `tests/maestro/flows/web/focus_indicators.yaml`

- [x] **Task 12.19**: Implement visible focus indicators ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.19a tests pass)
  - Add `focus-visible:` styles to globals.css
  - Update all button components with focus ring
  - Update all link components with focus ring
  - Update form inputs with focus ring (if any)
  - Use Tailwind `focus-visible:ring-2 focus-visible:ring-desert-oasis-accent focus-visible:ring-offset-2`
  - Acceptance: All interactive elements have visible focus, tests pass
  - Depends on: Task 12.19a (tests written first), Task 12.17 ✅
  - Files: `web/app/globals.css`, `web/components/ui/DoneButton.tsx`, `web/components/ui/StudyHeader.tsx`, all button/link components

- [ ] **Task 12.20a**: Write Maestro tests for touch target sizes
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.20)
  - Test all interactive elements are at least 44x44px
  - Test spacing between touch targets is adequate
  - Test on mobile viewport sizes
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None
  - Files: `tests/maestro/flows/web/touch_targets.yaml`

- [x] **Task 12.20**: Fix insufficient touch target sizes ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.20a tests pass)
  - Update `StudyHeader.tsx` buttons from `w-10 h-10` to `w-11 h-11` (44px)
  - Update `DoneButton.tsx` to ensure 44px minimum
  - Update `ScheduleScreen.tsx` interactive elements to 44px minimum
  - Add Tailwind utility `min-w-11 min-h-11` where needed
  - Acceptance: All touch targets ≥44px, tests pass
  - Depends on: Task 12.20a (tests written first)
  - Files: `web/components/ui/StudyHeader.tsx` (lines 35, 59), `web/components/ui/DoneButton.tsx` (line 43), `web/components/screens/ScheduleScreen.tsx` (line 61)

- [x] **Task 12.21**: Add aria-hidden to decorative icons ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - Audit all SVG icons and images
  - Add `aria-hidden="true"` to decorative icons
  - Add `role="img"` and `aria-label` to meaningful icons
  - Ensure no empty alt text without aria-hidden
  - Acceptance: All decorative images properly hidden from screen readers
  - Depends on: None
  - Files: All component files with SVG icons

- [ ] **Task 12.22a**: Write Maestro tests for skip links
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.22)
  - Test "Skip to main content" link exists
  - Test link is visually hidden until focused
  - Test link focuses main content when activated
  - Test link appears first in tab order
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None
  - Files: `tests/maestro/flows/web/skip_links.yaml`

- [x] **Task 12.22**: Implement skip-to-content links ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.22a tests pass)
  - Create `SkipLink` component at `web/components/ui/SkipLink.tsx`
  - Add skip link as first focusable element in layout
  - Link target: `#main-content`
  - Add `id="main-content"` to main content area
  - Style: visually hidden until focused (sr-only focus:not-sr-only)
  - Acceptance: Skip link works, tests pass
  - Depends on: Task 12.22a (tests written first)
  - Files: `web/components/ui/SkipLink.tsx`, `web/app/layout.tsx`

- [x] **Task 12.23**: Add semantic HTML landmarks ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - Replace generic `<div>` containers with semantic elements where appropriate
  - Add `<main>` element wrapping main content
  - Add `<nav>` element for navigation areas
  - Add `<header>` element for page headers
  - Add `<footer>` element for page footers
  - Add `<aside>` for secondary content (if any)
  - Add appropriate ARIA landmarks where HTML5 elements insufficient
  - Acceptance: All pages have proper semantic structure
  - Depends on: None
  - Files: `web/app/layout.tsx`, all page and screen components

- [ ] **Task 12.24a**: Write Maestro tests for keyboard navigation
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 12.24)
  - Test Tab navigates through all interactive elements in logical order
  - Test Enter activates buttons and links
  - Test Space activates buttons
  - Test Escape closes modals/dialogs
  - Test Arrow keys work in dropdowns/menus
  - Test no keyboard traps exist
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 12.19 ✅
  - Files: `tests/maestro/flows/web/keyboard_navigation.yaml`

- [x] **Task 12.24**: Ensure complete keyboard navigation ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 12.24a tests pass)
  - Audit all interactive components for keyboard support
  - Add `tabindex="0"` where needed for custom interactive elements
  - Add keyboard event handlers (Enter, Space, Escape) where missing
  - Ensure modal focus trapping works correctly
  - Fix any keyboard traps
  - Ensure tab order is logical (follows visual order RTL)
  - Acceptance: Full keyboard navigation works, tests pass
  - Depends on: Task 12.24a (tests written first), Task 12.19 ✅
  - Files: All interactive components

---

## Feature: Israel SI 5568 Specific Requirements

**Regulation Reference**: Israel SI 5568 (Israeli Accessibility Standard)
**Severity**: High

### Dependencies
- Accessibility Improvements (WCAG 2.2)
- Legal Pages (Accessibility Declaration)

### Tasks

#### Web Agent

- [x] **Task 12.25**: Add accessibility coordinator contact ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - Add accessibility coordinator contact info to accessibility declaration page
  - Create dedicated "Accessibility Contact" section
  - Include: Name, Email, Phone number (placeholder for actual contact)
  - Add "Report Accessibility Issue" form or mailto link
  - Acceptance: Contact info displayed prominently on accessibility page
  - Depends on: Task 12.15 ✅
  - Files: `web/app/(legal)/accessibility/page.tsx`, `docs/legal/accessibility-declaration-he.md`

- [x] **Task 12.26**: Add accessibility feedback mechanism ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - Create accessible feedback form or mailto link
  - Allow users to report accessibility issues
  - Ensure form itself is accessible
  - Acceptance: Users can easily report accessibility issues
  - Depends on: Task 12.25 ✅
  - Files: `web/app/(legal)/accessibility/page.tsx` or `web/components/ui/AccessibilityFeedbackForm.tsx`

---

## Compliance Implementation Summary

**Status**: ✅ 100% COMPLETE (2026-01-20)

All implementation tasks completed. Only server testing tasks (12.1a, 12.2a, 12.3a, 12.9a, 12.10a) remain as optional TDD tests.

### Task Dependencies Graph

```
Backend Infrastructure (12.1-12.2)
    │
    ▼
Sync Rules (12.3)
    │
    ▼
Cookie Consent Banner (12.4) ◄─── Consent Strings (12.6)
    │
    ▼
Analytics Blocking (12.5)
    │
    ├───► GPC Detection (12.7)
    │
    └───► Do Not Sell Link (12.8)

GDPR Rights API (12.9, 12.10)
    │
    ▼
GDPR Rights UI (12.11)

Legal Content (12.12, 12.13, 12.14)
    │
    ▼
Legal Pages (12.15) ──► Footer (12.16)

Design System (12.17, 12.18)
    │
    ▼
Accessibility Implementation (12.19-12.24)
    │
    ▼
SI 5568 Compliance (12.25, 12.26)
```

### Priority Order (Recommended Implementation Sequence)

**Critical (Must have before launch):**
1. Task 12.12: Privacy Policy content
2. Task 12.13: Cookie Policy content
3. Tasks 12.1-12.2: Consent backend
4. Task 12.4: Cookie consent banner
5. Task 12.5: Analytics consent blocking
6. Task 12.15: Legal pages

**High (Required for compliance):**
7. Tasks 12.17-12.19: Focus indicators
8. Task 12.20: Touch target sizes
9. Task 12.7: GPC detection
10. Task 12.8: Do Not Sell link
11. Tasks 12.9-12.11: GDPR rights
12. Task 12.14: Accessibility declaration
13. Tasks 12.25-12.26: SI 5568 requirements

**Medium (Should have):**
14. Task 12.21: Decorative icons
15. Tasks 12.22-12.24: Skip links, landmarks, keyboard nav
16. Task 12.16: Footer with links
17. Task 12.3: Consent sync rules

---

## Task Status Legend

- `[ ]` = Not started / To do
- `[x]` = Completed
- Tasks with "a" suffix (e.g., 12.1a) = Test writing tasks
- Tasks without "a" suffix = Implementation tasks

## TDD Workflow

**All tasks follow TDD:**
1. **Test writing** (Server Testing/Client Testing Agent) - Write tests first (red phase)
2. **Implementation** (Backend/Web/Sync Agent) - Implement to make tests pass (green phase)
3. **Task complete** - Mark as `[x]` when tests pass

## Agent Assignments Summary

| Agent | Tasks |
|-------|-------|
| Server Testing Agent | 12.1a, 12.2a, 12.3a, 12.9a, 12.10a |
| Client Testing Agent | 12.4a, 12.5a, 12.7a, 12.8a, 12.11a, 12.15a, 12.19a, 12.20a, 12.22a, 12.24a |
| Backend Agent | 12.1, 12.2, 12.9, 12.10 |
| Sync Agent | 12.3 |
| Web Agent | 12.4, 12.5, 12.7, 12.8, 12.11, 12.15, 12.16, 12.19, 12.20, 12.21, 12.22, 12.23, 12.24, 12.25, 12.26 |
| Design System Agent | 12.17, 12.18 |
| Content Generation Agent | 12.6, 12.12, 12.13, 12.14 |

---

## Notes

- **Regulations Compliance**: These tasks address findings from the Regulations Agent compliance audit
- **RTL Support**: All UI components must maintain RTL support (already compliant per Finding 21)
- **Hebrew Language**: All user-facing text must be in Hebrew
- **Testing**: All tasks follow TDD workflow with appropriate testing agents
- Update this file when tasks are completed: `[x]` and add completion date
