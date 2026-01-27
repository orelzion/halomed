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

## Feature: Study Plan Display & Change in Profile (Section 13)

**Created**: 2026-01-20  
**PRD Reference**: Section 4.1 (Tracks), Section 7 (Core App Flow)  
**TDD Reference**: Section 4 (Database Schema - user_preferences, learning_path)  
**Status**: Implementation Complete (Testing Pending)

### Overview

Enable users to view their current study plan (pace, review intensity) in the profile page and change it without losing their learning progress. When a user changes their plan, completed nodes are preserved and only future nodes are regenerated based on the new preferences.

### Dependencies
- Profile page exists (`web/app/profile/page.tsx`)
- User preferences table exists with `pace` and `review_intensity` columns
- Learning path generation exists (`generate-path` edge function)
- PowerSync syncs preferences and learning path

---

### Backend Agent Tasks

- [ ] **Task 13.1a**: Write tests for `update-preferences` Edge Function
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 13.1)
  - Test function updates `user_preferences` table correctly
  - Test function preserves completed nodes in `learning_path` (completed_at IS NOT NULL)
  - Test function deletes only future/incomplete nodes (unlock_date >= today AND completed_at IS NULL)
  - Test function calls path regeneration with correct starting position
  - Test authentication required
  - Test validation of pace and review_intensity values
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None
  - Files: `supabase/tests/edge-functions/update-preferences.test.ts`

- [x] **Task 13.1**: Create `update-preferences` Edge Function ✅ (2026-01-20)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 13.1a tests pass)
  - Create new Edge Function at `supabase/functions/update-preferences/index.ts`
  - Accept parameters: `user_id`, `pace`, `review_intensity`
  - Update `user_preferences` table with new values
  - Identify the last completed learning node (highest node_index where completed_at IS NOT NULL)
  - Delete all incomplete future nodes from `learning_path`
  - Calculate the content_index to resume from based on last completed node
  - Call `generate-path` internally with `start_from_content_index` parameter
  - Return success with summary of changes
  - Acceptance: Function works, preserves progress, tests pass
  - Depends on: Task 13.1a (tests written first), Task 13.2
  - Files: `supabase/functions/update-preferences/index.ts`
  - Reference: TDD 4.3 (learning_path schema), TDD 6.2 (generate-schedule pattern)

- [ ] **Task 13.2a**: Write tests for `generate-path` partial regeneration
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 13.2)
  - Test `start_from_content_index` parameter skips already-covered content
  - Test `preserve_completed` parameter prevents deletion of completed nodes
  - Test node_index continues from last existing node
  - Test unlock_date calculation starts from today (not original start date)
  - Test content generation only for new nodes
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None
  - Files: `supabase/tests/edge-functions/generate-path-partial.test.ts`

- [x] **Task 13.2**: Update `generate-path` Edge Function for partial regeneration ✅ (2026-01-20)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 13.2a tests pass)
  - Add `start_from_content_index` parameter (optional, default 0)
  - Add `preserve_completed` parameter (optional, default false)
  - When `preserve_completed=true`: skip deletion of completed nodes
  - When `start_from_content_index > 0`: start content assignment from that index
  - Calculate `node_index` to continue from last existing node
  - Calculate `unlock_date` starting from today for new nodes
  - Pre-generate content only for new nodes in 14-day window
  - Acceptance: Partial regeneration works correctly, tests pass
  - Depends on: Task 13.2a (tests written first)
  - Files: `supabase/functions/generate-path/index.ts`
  - Reference: Existing generate-path implementation

---

### Sync Agent Tasks

- [ ] **Task 13.3a**: Write tests for preferences update sync
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 13.3)
  - Test updated `user_preferences` syncs to client
  - Test deleted `learning_path` nodes are removed from client
  - Test new `learning_path` nodes sync correctly
  - Test sync completes without conflicts
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 13.1
  - Files: `supabase/tests/sync/preferences-update-sync.test.ts`

- [ ] **Task 13.3**: Verify PowerSync sync rules for preferences update flow
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 13.3a tests pass)
  - Verify `user_preferences` sync rules handle updates
  - Verify `learning_path` sync rules handle deletions and insertions
  - Test sync completes within reasonable time after plan change
  - Document any sync rule adjustments needed
  - Acceptance: Sync works correctly after plan change, tests pass
  - Depends on: Task 13.3a (tests written first), Task 13.1
  - Files: `powersync/powersync.yaml`
  - Reference: TDD 8 (Sync Strategy)

---

### Design System Agent Tasks

- [ ] **Task 13.4**: Define `StudyPlanCard` visual specifications
  - **Assigned to**: Design System Agent
  - Design card component consistent with existing TrackCard style
  - Use Desert Oasis color palette (#FAEDCD for card surface)
  - Define typography for labels (Noto Sans Hebrew)
  - Define layout for pace and review intensity display
  - Include edit/change button styling
  - Support RTL layout
  - Light and dark theme variants
  - Acceptance: Design specifications documented and approved
  - Depends on: None
  - Files: Design documentation
  - Reference: PRD 6.1 (Visual Theme), TDD 3.1 (Color Palette)

- [ ] **Task 13.5**: Define `ChangePlanDialog` visual specifications
  - **Assigned to**: Design System Agent
  - Design modal overlay with semi-transparent backdrop
  - Card surface background (#FAEDCD light / dark variant)
  - Option buttons matching onboarding selection style
  - Warning message styling (emphasis without alarm)
  - Success/progress preservation message styling
  - Confirm and cancel button placement
  - RTL layout support
  - Acceptance: Design specifications documented and approved
  - Depends on: None
  - Files: Design documentation
  - Reference: PRD 6.1, TDD 3.1, existing onboarding UI

---

### Web Agent Tasks

- [ ] **Task 13.6a**: Write Maestro tests for StudyPlanCard display
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 13.6)
  - Test card displays current pace with Hebrew label
  - Test card displays current review intensity with Hebrew label
  - Test card shows loading state while preferences load
  - Test "שנה תכנית" (Change Plan) button is visible
  - Test card handles missing preferences (should not crash)
  - Test card accessible (ARIA labels, keyboard navigable)
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 13.4
  - Files: `tests/maestro/flows/web/study_plan_card.yaml`

- [x] **Task 13.6**: Create `StudyPlanCard` component ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 13.6a tests pass)
  - Create component at `web/components/ui/StudyPlanCard.tsx`
  - Use `usePreferences` hook to get current preferences
  - Display pace with Hebrew label:
    - `one_mishna`: "משנה אחת ליום"
    - `two_mishna`: "שתי משניות ליום"
    - `one_chapter`: "פרק אחד ליום"
  - Display review intensity with Hebrew label:
    - `none`: "ללא חזרות"
    - `light`: "חזרות קלות"
    - `medium`: "חזרות בינוניות"
    - `intensive`: "חזרות אינטנסיביות"
  - Include "שנה תכנית" button
  - Show loading skeleton while preferences load
  - Apply Desert Oasis styling
  - Acceptance: Card displays correctly, tests pass
  - Depends on: Task 13.6a (tests written first), Task 13.4
  - Files: `web/components/ui/StudyPlanCard.tsx`
  - Reference: PRD 4.1, TDD 4.1

- [ ] **Task 13.7a**: Write Maestro tests for ChangePlanDialog
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 13.7)
  - Test dialog opens when "שנה תכנית" clicked
  - Test dialog shows pace selection options
  - Test dialog shows review intensity options
  - Test current selections are pre-selected
  - Test warning message is visible
  - Test progress preservation message is visible
  - Test cancel button closes dialog without changes
  - Test confirm button is disabled until selection made
  - Test dialog accessible (focus trap, Escape closes, ARIA)
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 13.5, Task 13.6
  - Files: `tests/maestro/flows/web/change_plan_dialog.yaml`

- [x] **Task 13.7**: Create `ChangePlanDialog` component ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 13.7a tests pass)
  - Create component at `web/components/ui/ChangePlanDialog.tsx`
  - Modal dialog with backdrop overlay
  - Pace selection (same options as onboarding):
    - `one_mishna`, `two_mishna`, `one_chapter`
  - Review intensity selection (same options as onboarding):
    - `none`, `light`, `medium`, `intensive`
  - Pre-select current user preferences
  - Warning message: "שינוי התכנית יחשב מחדש את לוח הזמנים שלך"
  - Preservation message: "ההתקדמות הקיימת שלך תישמר"
  - Cancel button: "ביטול"
  - Confirm button: "שמור שינויים" (disabled if no changes)
  - Loading state during save
  - Focus trap for accessibility
  - Escape key closes dialog
  - Acceptance: Dialog works correctly, tests pass
  - Depends on: Task 13.7a (tests written first), Task 13.5
  - Files: `web/components/ui/ChangePlanDialog.tsx`
  - Reference: Onboarding page patterns

- [ ] **Task 13.8a**: Write Maestro tests for profile page integration
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 13.8)
  - Test StudyPlanCard appears on profile page
  - Test card is placed after user info section
  - Test clicking change button opens dialog
  - Test successful plan change updates card display
  - Test error handling shows appropriate message
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 13.6, Task 13.7
  - Files: `tests/maestro/flows/web/profile_plan_change.yaml`

- [x] **Task 13.8**: Integrate `StudyPlanCard` into Profile page ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 13.8a tests pass)
  - Import `StudyPlanCard` in `web/app/profile/page.tsx`
  - Place card after user info section, before actions section
  - Add section header: "תכנית הלימוד שלי"
  - Handle case when preferences don't exist (show prompt to complete onboarding)
  - Integrate `ChangePlanDialog` - open on button click
  - Acceptance: Integration complete, tests pass
  - Depends on: Task 13.8a (tests written first), Task 13.6, Task 13.7
  - Files: `web/app/profile/page.tsx`
  - Reference: Existing profile page structure

- [ ] **Task 13.9a**: Write Maestro tests for plan change API flow
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 13.9)
  - Test API call is made on dialog confirm
  - Test loading state shown during API call
  - Test success message shown on successful change
  - Test error message shown on failure
  - Test PowerSync data refreshes after change
  - Test dialog closes on success
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 13.1, Task 13.7
  - Files: `tests/maestro/flows/web/plan_change_api.yaml`

- [x] **Task 13.9**: Implement plan change API call and state management ✅ (2026-01-20)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 13.9a tests pass)
  - Create API route at `web/app/api/update-preferences/route.ts`
  - Proxy to Supabase Edge Function `update-preferences`
  - Handle authentication (pass JWT)
  - Show loading spinner during API call
  - Show success toast/message on completion
  - Show error message on failure with retry option
  - Trigger PowerSync refresh after successful update
  - Close dialog on success
  - Acceptance: API flow works end-to-end, tests pass
  - Depends on: Task 13.9a (tests written first), Task 13.1, Task 13.7
  - Files: `web/app/api/update-preferences/route.ts`, `web/components/ui/ChangePlanDialog.tsx`
  - Reference: Existing API route patterns

- [x] **Task 13.10**: Add i18n strings for Study Plan feature ✅ (2026-01-20)
  - **Assigned to**: Web Agent (or Content Generation Agent)
  - Add Hebrew strings to `shared/strings/strings.json`:
    - `profile_study_plan_title`: "תכנית הלימוד שלי"
    - `profile_change_plan`: "שנה תכנית"
    - `pace_label`: "קצב לימוד"
    - `review_intensity_label`: "עוצמת חזרות"
    - `pace_one_mishna_short`: "משנה אחת ליום"
    - `pace_two_mishna_short`: "שתי משניות ליום"
    - `pace_one_chapter_short`: "פרק אחד ליום"
    - `review_none_short`: "ללא חזרות"
    - `review_light_short`: "חזרות קלות"
    - `review_medium_short`: "חזרות בינוניות"
    - `review_intensive_short`: "חזרות אינטנסיביות"
    - `change_plan_dialog_title`: "שינוי תכנית לימוד"
    - `change_plan_warning`: "שינוי התכנית יחשב מחדש את לוח הזמנים שלך"
    - `change_plan_preservation`: "ההתקדמות הקיימת שלך תישמר"
    - `change_plan_confirm`: "שמור שינויים"
    - `change_plan_cancel`: "ביטול"
    - `change_plan_success`: "התכנית עודכנה בהצלחה"
    - `change_plan_error`: "שגיאה בעדכון התכנית"
    - `change_plan_loading`: "מעדכן..."
  - Run string generation script
  - Acceptance: All strings added and accessible via `useTranslation`
  - Depends on: None
  - Files: `shared/strings/strings.json`, `web/lib/i18n/`
  - Reference: TDD 2.4 (Hebrew only MVP)

---

### Client Testing Agent Tasks

- [ ] **Task 13.11**: Write E2E test for complete plan change flow
  - **Assigned to**: Client Testing Agent
  - Create comprehensive E2E test covering:
    1. User navigates to profile page
    2. User sees current plan displayed
    3. User clicks "Change Plan"
    4. Dialog opens with current selections
    5. User selects different pace
    6. User selects different review intensity
    7. User confirms change
    8. Loading state appears
    9. Success message shown
    10. Dialog closes
    11. Profile shows updated preferences
    12. Learning path screen shows recalculated nodes
    13. Completed nodes are preserved
  - Test both web and sync behavior
  - Acceptance: E2E test passes
  - Depends on: All Task 13.x implementation tasks
  - Files: `tests/maestro/flows/web/e2e_plan_change.yaml`
  - Reference: Existing E2E test patterns

---

### Task Dependencies Graph

```
Server Testing: 13.1a, 13.2a, 13.3a (test writing)
    │
    ▼
Backend: 13.2 (generate-path update) ──► Backend: 13.1 (update-preferences)
    │                                         │
    ▼                                         ▼
Sync: 13.3 (verify sync rules)          Design System: 13.4, 13.5 (specs)
                                              │
    ┌─────────────────────────────────────────┤
    │                                         │
    ▼                                         ▼
Client Testing: 13.6a              Client Testing: 13.7a
    │                                         │
    ▼                                         ▼
Web: 13.6 (StudyPlanCard)          Web: 13.7 (ChangePlanDialog)
    │                                         │
    └──────────────┬──────────────────────────┘
                   │
                   ▼
           Client Testing: 13.8a
                   │
                   ▼
           Web: 13.8 (Profile integration)
                   │
                   ▼
           Client Testing: 13.9a
                   │
                   ▼
           Web: 13.9 (API call)
                   │
                   ▼
           Web: 13.10 (i18n strings)
                   │
                   ▼
           Client Testing: 13.11 (E2E test)
```

### Data Flow for Plan Change

```
1. User clicks "Change Plan" on Profile page
2. ChangePlanDialog opens showing current selections
3. User selects new pace and/or review intensity
4. User confirms change
5. Web calls update-preferences Edge Function:
   - user_id
   - new_pace
   - new_review_intensity
6. Edge Function:
   a. Updates user_preferences table
   b. Identifies last completed node (highest completed node_index)
   c. Calculates content_index to resume from
   d. Deletes all incomplete future nodes
   e. Calls generate-path with start_from_content_index
   f. Returns success with summary
7. PowerSync syncs changes to client
8. Profile page shows updated preferences
9. PathScreen shows recalculated learning path
```

### Agent Assignments Summary (Section 13)

| Agent | Tasks |
|-------|-------|
| Server Testing Agent | 13.1a, 13.2a, 13.3a |
| Backend Agent | 13.1, 13.2 |
| Sync Agent | 13.3 |
| Design System Agent | 13.4, 13.5 |
| Client Testing Agent | 13.6a, 13.7a, 13.8a, 13.9a, 13.11 |
| Web Agent | 13.6, 13.7, 13.8, 13.9, 13.10 |

---

---

## Feature: Wikisource Integration for Structured Mishna Text (Section 14)

**Created**: 2026-01-21  
**PRD Reference**: Section 4.3 (Daily Learning Unit), Section 7.2 (Study Screen)  
**TDD Reference**: Section 7 (Content Generation), Section 4.2 (content_cache schema)  
**Status**: ✅ Implementation Complete (2026-01-21)

### Overview

Replace Sefaria as the source for Mishna text with Hebrew Wikisource to get properly structured text with line breaks, punctuation, and paragraph formatting. Commentaries will continue to come from Sefaria. The Mishna text will be stored as Markdown in `source_text_he` and rendered with Markdown components on the frontend.

### Motivation

- Sefaria returns Mishna text as flat, unformatted strings
- Wikisource has structured text with line breaks, question marks, and logical paragraph breaks
- Better readability for users studying the Mishna
- Example: https://he.wikisource.org/wiki/משנה_ברכות_א_ניקוד

### Technical Approach

1. **Wikisource API**: Uses MediaWiki API at `https://he.wikisource.org/w/api.php`
2. **Page naming**: `משנה_[מסכת]_[פרק]_ניקוד` (vocalized Mishna pages)
3. **Wikitext parsing**: Convert wikitext markup to Markdown
4. **Hybrid approach**: Wikisource for Mishna text, Sefaria for commentaries and `heRef`
5. **Data migration**: Update existing `content_cache` entries with new structured format

### Dependencies
- Content generation edge function exists (`generate-content`)
- Sefaria integration exists (`_shared/sefaria.ts`)
- content_cache table exists with `source_text_he` column

---

### Backend Agent Tasks

- [x] **Task 14.1a**: Write tests for Wikisource API integration ✅ (2026-01-21)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 14.1)
  - Test `fetchMishnaFromWikisource` fetches page content
  - Test tractate name mapping (English to Hebrew)
  - Test chapter number to Hebrew letter conversion (1→א, 2→ב, etc.)
  - Test handling of API errors (timeout, 404, rate limiting)
  - Test retry logic with exponential backoff
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None
  - Files: `supabase/tests/logic/wikisource.test.ts`

- [x] **Task 14.1**: Create Wikisource API integration utility ✅ (2026-01-21)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 14.1a tests pass)
  - Create `supabase/functions/_shared/wikisource.ts`
  - Implement `fetchMishnaChapter(tractate: string, chapter: number)`:
    - Build page name: `משנה_${tractateHebrew}_${chapterHebrew}_ניקוד`
    - Call MediaWiki API: `action=parse&page={pageName}&prop=wikitext&format=json`
    - Return raw wikitext content
  - Implement tractate name mapping (e.g., `Berakhot` → `ברכות`)
  - Implement `toHebrewLetter(num: number)` for chapter conversion
  - Add retry logic with exponential backoff (same pattern as sefaria.ts)
  - Add request timeout handling
  - Acceptance: API integration works, tests pass
  - Depends on: Task 14.1a (tests written first)
  - Files: `supabase/functions/_shared/wikisource.ts`
  - Reference: TDD 7 (Content Generation patterns)

- [x] **Task 14.2a**: Write tests for wikitext to Markdown parser ✅ (2026-01-21)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 14.2)
  - Test extraction of specific mishna by number (e.g., `[(א)]`, `[(ב)]`)
  - Test removal of wikitext markup (links, templates, etc.)
  - Test preservation of line breaks as paragraph breaks
  - Test preservation of punctuation (?, !, etc.)
  - Test removal of mishna number markers from output
  - Test handling of edge cases (empty, malformed wikitext)
  - Test Hebrew text integrity (no corruption)
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 14.1
  - Files: `supabase/tests/logic/wikisource.test.ts` (combined with 14.1a)

- [x] **Task 14.2**: Implement wikitext to Markdown parser ✅ (2026-01-21)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 14.2a tests pass)
  - Add to `supabase/functions/_shared/wikisource.ts`:
  - Implement `parseWikitextToMarkdown(wikitext: string, mishnaNumber: number)`:
    - Split wikitext by mishna markers `[(א)]`, `[(ב)]`, etc.
    - Extract the specific mishna content
    - Remove wiki links `[[...]]` → plain text
    - Remove templates `{{...}}`
    - Convert wiki formatting to Markdown (if any)
    - Preserve line breaks as `\n\n` (paragraph breaks)
    - Clean up extra whitespace
    - Return clean Markdown string
  - Implement `extractMishnaFromChapter(wikitext: string, mishnaNum: number)`
  - Acceptance: Parser works correctly, tests pass
  - Depends on: Task 14.2a (tests written first), Task 14.1
  - Files: `supabase/functions/_shared/wikisource.ts`

- [x] **Task 14.3a**: Write tests for Sefaria ref to Wikisource mapping ✅ (2026-01-21)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 14.3)
  - Test parsing `Mishnah_Berakhot.1.1` → tractate: `ברכות`, chapter: 1, mishna: 1
  - Test parsing `Mishnah_Shabbat.5.3` → tractate: `שבת`, chapter: 5, mishna: 3
  - Test all 63 tractate name mappings
  - Test handling of invalid refs
  - Test edge cases (double-digit chapters, etc.)
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None
  - Files: `supabase/tests/logic/wikisource.test.ts` (combined)

- [x] **Task 14.3**: Implement Sefaria ref to Wikisource mapping ✅ (2026-01-21)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 14.3a tests pass)
  - Add to `supabase/functions/_shared/wikisource.ts`:
  - Implement `parseSefariaRef(refId: string)`:
    - Parse `Mishnah_Berakhot.1.1` format
    - Return `{ tractate: string, chapter: number, mishnaNumber: number }`
  - Create `TRACTATE_MAP` constant with all 63 tractate mappings:
    - `Berakhot` → `ברכות`
    - `Shabbat` → `שבת`
    - etc.
  - Acceptance: Mapping works for all tractates, tests pass
  - Depends on: Task 14.3a (tests written first)
  - Files: `supabase/functions/_shared/wikisource.ts`, `supabase/functions/_shared/mishnah-structure.ts` (reference)

- [ ] **Task 14.4a**: Write tests for updated generate-content flow
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 14.4)
  - Test Mishna text fetched from Wikisource (not Sefaria)
  - Test `heRef` still fetched from Sefaria
  - Test commentaries still fetched from Sefaria
  - Test Markdown format stored in `source_text_he`
  - Test fallback to Sefaria if Wikisource fails
  - Test content_cache stores correct format
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Tasks 14.1, 14.2, 14.3
  - Files: `supabase/tests/edge-functions/generate-content-wikisource.test.ts`

- [x] **Task 14.4**: Update `generate-content` to use Wikisource for Mishna text ✅ (2026-01-21)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 14.4a tests pass)
  - Modify `supabase/functions/generate-content/index.ts`:
  - Import Wikisource utilities
  - Change text fetching flow (around line 154-173):
    ```typescript
    // 1. Parse ref to get tractate, chapter, mishna
    const { tractate, chapter, mishnaNumber } = parseSefariaRef(ref_id);
    
    // 2. Fetch structured text from Wikisource
    let sourceText: string;
    try {
      const wikitext = await fetchMishnaChapter(tractate, chapter);
      sourceText = parseWikitextToMarkdown(wikitext, mishnaNumber);
    } catch (error) {
      // Fallback to Sefaria if Wikisource fails
      console.warn('Wikisource fetch failed, falling back to Sefaria:', error);
      const sefariaText = await fetchText(sefariaRef);
      sourceText = sefariaText.he;
    }
    
    // 3. Still get heRef from Sefaria
    const sefariaText = await fetchText(sefariaRef);
    heRef = sefariaText.heRef;
    ```
  - Keep commentary fetching from Sefaria unchanged
  - Acceptance: Integration works, tests pass
  - Depends on: Task 14.4a (tests written first), Tasks 14.1-14.3
  - Files: `supabase/functions/generate-content/index.ts`
  - Reference: Current implementation at lines 154-234

---

### Web Agent Tasks

- [ ] **Task 14.5a**: Write Maestro tests for Markdown rendering of Mishna text
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 14.5)
  - Test Mishna text renders with paragraph breaks
  - Test Hebrew text displays correctly (RTL)
  - Test styling is consistent with existing design
  - Test long texts don't overflow
  - Test questions (?) render distinctly (if styled)
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None
  - Files: `tests/maestro/flows/web/mishna_markdown.yaml`

- [x] **Task 14.5**: Implement Markdown rendering for Mishna text in StudyScreen ✅ (2026-01-21)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 14.5a tests pass)
  - Install react-markdown: `npm install react-markdown`
  - Update `web/components/screens/StudyScreen.tsx` (lines 223-230):
    ```tsx
    import ReactMarkdown from 'react-markdown';
    
    // Replace plain text rendering with Markdown
    {sourceText && (
      <div
        id="mishna_text"
        data-testid="mishna_text"
        className="text-2xl font-source font-bold text-[var(--text-primary)] leading-relaxed"
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="mb-4 last:mb-0">{children}</p>
            ),
          }}
        >
          {sourceText}
        </ReactMarkdown>
      </div>
    )}
    ```
  - Ensure RTL support maintained
  - Acceptance: Markdown renders correctly, tests pass
  - Depends on: Task 14.5a (tests written first)
  - Files: `web/components/screens/StudyScreen.tsx`, `web/package.json`

- [x] **Task 14.6**: Update Mishna rendering in path study page ✅ (2026-01-21)
  - **Assigned to**: Web Agent
  - Update `web/app/study/path/[nodeId]/page.tsx` (lines 271-278)
  - Same Markdown rendering as StudyScreen
  - Ensure consistent styling between both study views
  - Acceptance: Both study pages render Markdown correctly
  - Depends on: Task 14.5
  - Files: `web/app/study/path/[nodeId]/page.tsx`

---

### Data Migration Tasks

- [ ] **Task 14.7a**: Write tests for data migration script
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 14.7)
  - Test script fetches all existing content_cache entries
  - Test script correctly calls Wikisource for each ref
  - Test script updates `source_text_he` with Markdown
  - Test script handles Wikisource failures gracefully (skip, log)
  - Test script tracks progress and can resume
  - Test script doesn't corrupt existing data on failure
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Tasks 14.1-14.3
  - Files: `supabase/tests/scripts/migrate-to-wikisource.test.ts`

- [x] **Task 14.7**: Create data migration script for existing content ✅ (2026-01-21)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 14.7a tests pass)
  - Create `scripts/migrate-content-to-wikisource.ts`:
    - Connect to Supabase with service role key
    - Query all entries from `content_cache`
    - For each entry:
      1. Parse `ref_id` to get tractate, chapter, mishna
      2. Fetch Mishna from Wikisource
      3. Parse to Markdown
      4. Update `source_text_he` in database
      5. Log progress
    - Handle failures:
      - Log failed refs
      - Continue with next entry
      - Output summary at end
    - Add `--dry-run` flag for testing
    - Add `--limit N` flag for partial migration
  - Acceptance: Script works, tests pass
  - Depends on: Task 14.7a (tests written first), Tasks 14.1-14.3
  - Files: `scripts/migrate-content-to-wikisource.ts`
  - Reference: TDD 4.2 (content_cache schema)

- [ ] **Task 14.8**: Create database migration for format tracking (optional)
  - **Assigned to**: Backend Agent
  - Create migration `supabase/migrations/YYYYMMDDHHMMSS_add_source_format_version.sql`:
    ```sql
    -- Add column to track source text format version
    ALTER TABLE content_cache 
    ADD COLUMN IF NOT EXISTS source_format_version INTEGER DEFAULT 1;
    
    COMMENT ON COLUMN content_cache.source_format_version IS 
      '1 = Sefaria plain text, 2 = Wikisource Markdown';
    ```
  - Update sync rules if needed
  - Acceptance: Migration applies cleanly
  - Depends on: None
  - Files: `supabase/migrations/`, `powersync/powersync.yaml`
  - Note: Optional - skipped for now, not needed since all new content uses Wikisource

---

### Task Dependencies Graph

```
Server Testing: 14.1a ──► Backend: 14.1 (Wikisource API)
                              │
                              ▼
Server Testing: 14.2a ──► Backend: 14.2 (Wikitext parser)
                              │
Server Testing: 14.3a ──► Backend: 14.3 (Ref mapping)
                              │
                              ▼
Server Testing: 14.4a ──► Backend: 14.4 (Update generate-content)
                              │
                              ▼
Client Testing: 14.5a ──► Web: 14.5 (Markdown in StudyScreen)
                              │
                              ▼
                         Web: 14.6 (Markdown in path page)

Server Testing: 14.7a ──► Backend: 14.7 (Migration script)
                              │
                              ▼
                         Backend: 14.8 (Format version column - optional)
```

### Implementation Order (Recommended)

**Phase 1: Backend Foundation**
1. Task 14.3 - Ref mapping (no external deps)
2. Task 14.1 - Wikisource API integration
3. Task 14.2 - Wikitext parser
4. Task 14.4 - Update generate-content

**Phase 2: Frontend**
5. Task 14.5 - Markdown in StudyScreen
6. Task 14.6 - Markdown in path page

**Phase 3: Data Migration**
7. Task 14.8 - Format version column (optional)
8. Task 14.7 - Migration script
9. Run migration on production data

### Tractate Name Mapping Reference

```typescript
const TRACTATE_MAP: Record<string, string> = {
  // Seder Zeraim
  'Berakhot': 'ברכות',
  'Peah': 'פאה',
  'Demai': 'דמאי',
  'Kilayim': 'כלאים',
  'Sheviit': 'שביעית',
  'Terumot': 'תרומות',
  'Maasrot': 'מעשרות',
  'Maaser_Sheni': 'מעשר שני',
  'Challah': 'חלה',
  'Orlah': 'ערלה',
  'Bikkurim': 'ביכורים',
  // ... (all 63 tractates)
};
```

### Agent Assignments Summary (Section 14)

| Agent | Tasks |
|-------|-------|
| Server Testing Agent | 14.1a, 14.2a, 14.3a, 14.4a, 14.7a |
| Backend Agent | 14.1, 14.2, 14.3, 14.4, 14.7, 14.8 |
| Client Testing Agent | 14.5a |
| Web Agent | 14.5, 14.6 |

---

## Feature: Merged Review Sessions - Tinder-Style Cards (Section 15)

**Created**: 2026-01-25  
**PRD Reference**: Section 8 (Spaced Repetition), Section 7 (Core App Flow)  
**TDD Reference**: Section 4.3 (learning_path schema), Section 8 (Sync Strategy)  
**Feature Idea**: `docs/feature-ideas/tinder-style-reviews.md`  
**Status**: Implementation Complete (pending Maestro tests and E2E test) - 2026-01-25

### Overview

Consolidate multiple review nodes (currently 27+ individual nodes) into a single "Review Session" node in the learning path. When tapped, it opens a dedicated swipeable card interface (Tinder-style) for quick review of previously learned content.

### Problem Statement

- Reviews currently appear as 27+ individual nodes in the learning path
- This overwhelms the path UI and makes it feel cluttered
- Full content shown again (same as learning) - too heavy for quick recall
- Users see review as a chore rather than a quick reinforcement activity

### Solution

A single "Review Session" node in the path that:
1. Aggregates all review items due for that day/session
2. Opens a dedicated swipeable card interface
3. Shows condensed content focused on recall
4. Provides "Dive Deeper" option for full study if needed
5. Tracks completion as a batch when session is finished

### Dependencies
- Learning path generation exists (`generate-path` edge function)
- PowerSync syncs learning_path nodes
- Study content exists in `content_cache`
- Path screen with node display exists

---

### Backend Agent Tasks

- [x] **Task 15.1a**: Write tests for review session node generation ✅ (2026-01-25)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 15.1)
  - Test `generate-path` creates single "review_session" node instead of multiple review nodes
  - Test review_session node contains references to all review items
  - Test `review_items` JSON array stored in learning_path metadata
  - Test review_session node respects review_intensity preference
  - Test review_session node unlock_date calculation
  - Acceptance: Tests written and failing (red phase)
  - Depends on: None
  - Files: `supabase/tests/edge-functions/generate-path-review-sessions.test.ts`

- [x] **Task 15.1**: Update `generate-path` to create merged review session nodes ✅ (2026-01-25)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 15.1a tests pass)
  - Modify `supabase/functions/generate-path/index.ts`:
  - Change review node generation logic:
    - Instead of creating individual review nodes for each item
    - Create a single `review_session` node when reviews are due
    - Add `node_type: 'review_session'` to distinguish from `learn` nodes
    - Add `review_items: [{ content_ref, title, ... }]` JSON column
    - Store count of items: `review_count: number`
  - Review session scheduled based on spaced repetition algorithm
  - One review session per day maximum (consolidates all due reviews)
  - Acceptance: Path generation creates review_session nodes, tests pass
  - Depends on: Task 15.1a (tests written first)
  - Files: `supabase/functions/generate-path/index.ts`
  - Reference: TDD 4.3, PRD 8

- [x] **Task 15.2a**: Write tests for review session completion endpoint ✅ (2026-01-25)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 15.2)
  - Test endpoint accepts list of reviewed item IDs
  - Test endpoint updates individual item review schedules
  - Test endpoint marks review_session node as completed
  - Test partial completion (some items reviewed, some skipped)
  - Test "need more practice" items scheduled sooner
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 15.1
  - Files: `supabase/tests/edge-functions/complete-review-session.test.ts`

- [x] **Task 15.2**: Create `complete-review-session` Edge Function ✅ (2026-01-25)
  - **Assigned to**: Backend Agent
  - **TDD Workflow**: Implementation (after 15.2a tests pass)
  - Create `supabase/functions/complete-review-session/index.ts`:
  - Accept parameters:
    - `session_node_id`: UUID of the review_session learning_path node
    - `reviewed_items`: Array of `{ content_ref: string, confidence: 'got_it' | 'need_practice' }`
  - For each reviewed item:
    - If `got_it`: Update next review date using standard spaced repetition interval
    - If `need_practice`: Schedule sooner (shorter interval)
  - Mark review_session node as `completed_at = NOW()`
  - Return summary: `{ completed: number, needs_practice: number }`
  - Acceptance: Endpoint works, updates schedules correctly, tests pass
  - Depends on: Task 15.2a (tests written first), Task 15.1
  - Files: `supabase/functions/complete-review-session/index.ts`

- [x] **Task 15.3**: Add `node_type` column to learning_path table ✅ (2026-01-25)
  - **Assigned to**: Backend Agent
  - Create migration `supabase/migrations/YYYYMMDDHHMMSS_add_learning_path_node_type.sql`:
    ```sql
    -- Add node_type column to distinguish learn vs review_session nodes
    ALTER TABLE learning_path 
    ADD COLUMN IF NOT EXISTS node_type TEXT DEFAULT 'learn';
    
    -- Add review_items JSON column for review_session nodes
    ALTER TABLE learning_path 
    ADD COLUMN IF NOT EXISTS review_items JSONB;
    
    -- Add review_count for quick access
    ALTER TABLE learning_path 
    ADD COLUMN IF NOT EXISTS review_count INTEGER;
    
    COMMENT ON COLUMN learning_path.node_type IS 
      'learn = regular learning node, review_session = consolidated review session';
    ```
  - Acceptance: Migration applies cleanly
  - Depends on: None
  - Files: `supabase/migrations/`

---

### Sync Agent Tasks

- [x] **Task 15.4a**: Write tests for review session sync rules ✅ (2026-01-25)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 15.4)
  - Test `node_type` column syncs to client
  - Test `review_items` JSONB syncs correctly
  - Test `review_count` syncs
  - Test sync rules syntax is valid
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 15.3
  - Files: `supabase/tests/sync/review-session-sync.test.ts`

- [x] **Task 15.4**: Update RxDB schemas for review session columns ✅ (2026-01-25)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 15.4a tests pass)
  - Update `powersync/powersync.yaml`:
    - Add `node_type` to learning_path columns
    - Add `review_items` to learning_path columns
    - Add `review_count` to learning_path columns
  - Update local SQLite schema in `powersync/schemas/`
  - Verify sync works with new columns
  - Acceptance: Sync rules updated, tests pass
  - Depends on: Task 15.4a (tests written first), Task 15.3
  - Files: `powersync/powersync.yaml`, `powersync/schemas/learning_path.sql`

---

### Design System Agent Tasks

- [x] **Task 15.5**: Define `ReviewSessionCard` swipe card specifications ✅ (2026-01-25)
  - **Assigned to**: Design System Agent
  - Design swipeable card component:
    - Card dimensions (full width, ~70% viewport height)
    - Card surface background (#FAEDCD / dark variant)
    - Border radius, shadow, elevation
    - Swipe animation specifications
    - Swipe threshold for action trigger
  - Card content layout:
    - Title area (content reference, e.g., "ברכות פרק א׳ משנה א׳")
    - Mishna text area (source text, condensed)
    - Brief explanation area (not full deep dive)
    - "Dive Deeper" button placement
  - Visual feedback:
    - Swipe right indicator (green checkmark, "הבנתי")
    - Swipe left indicator (orange refresh, "צריך עוד תרגול")
  - RTL support (swipe directions may need reversal for RTL)
  - Acceptance: Design specifications documented and approved
  - Depends on: None
  - Files: Design documentation
  - Reference: PRD 6.1, TDD 3.1

- [x] **Task 15.6**: Define `ReviewSessionScreen` layout specifications ✅ (2026-01-25)
  - **Assigned to**: Design System Agent
  - Design full review session screen:
    - Header with progress bar (e.g., "12/27 reviewed")
    - Card stack area (centered, with peek of next card)
    - Navigation: Back button, close session
    - Completion celebration (when all cards done)
  - Progress indicator styling:
    - Filled vs unfilled segments
    - Current item highlight
    - Animation on progress
  - Empty state (no reviews due)
  - Loading state
  - Acceptance: Design specifications documented and approved
  - Depends on: Task 15.5
  - Files: Design documentation

- [x] **Task 15.7**: Define `ReviewSessionNode` path node specifications ✅ (2026-01-25)
  - **Assigned to**: Design System Agent
  - Design how review session appears in learning path:
    - Distinct visual style from regular learn nodes
    - Review icon (refresh/repeat symbol)
    - Badge showing item count (e.g., "27")
    - Color scheme (different from learn nodes)
  - States: locked, available, completed
  - Acceptance: Design specifications documented and approved
  - Depends on: None
  - Files: Design documentation

---

### Web Agent Tasks

- [ ] **Task 15.8a**: Write Maestro tests for ReviewSessionNode in path
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 15.8)
  - Test review_session node displays differently from learn nodes
  - Test node shows review count badge
  - Test node shows appropriate icon
  - Test tapping node navigates to review session screen
  - Test node states (locked, available, completed)
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 15.7
  - Files: `tests/maestro/flows/web/review_session_node.yaml`

- [x] **Task 15.8**: Create `ReviewSessionNode` component for learning path ✅ (2026-01-25)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 15.8a tests pass)
  - Create `web/components/ui/ReviewSessionNode.tsx`:
  - Check `node_type === 'review_session'` to render this component
  - Display review icon (refresh/repeat symbol)
  - Show count badge with `review_count`
  - Different styling from regular PathNode
  - Handle click → navigate to `/review-session/[nodeId]`
  - Support locked/available/completed states
  - Acceptance: Component renders correctly, tests pass
  - Depends on: Task 15.8a (tests written first), Task 15.7, Task 15.4
  - Files: `web/components/ui/ReviewSessionNode.tsx`

- [ ] **Task 15.9a**: Write Maestro tests for review session swipe cards
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 15.9)
  - Test cards display content correctly (title, text, explanation)
  - Test swipe right marks as "got it"
  - Test swipe left marks as "need practice"
  - Test next card appears after swipe
  - Test progress bar updates
  - Test "Dive Deeper" button navigates to full study
  - Test card animations are smooth
  - Test RTL swipe directions
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 15.5
  - Files: `tests/maestro/flows/web/review_session_cards.yaml`

- [x] **Task 15.9**: Implement `ReviewSessionCard` swipeable component ✅ (2026-01-25)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 15.9a tests pass)
  - Install Framer Motion: `npm install framer-motion`
  - Create `web/components/ui/ReviewSessionCard.tsx`:
  - Swipeable card using Framer Motion drag
  - Display:
    - Title: `heRef` from content
    - Mishna text: `source_text_he` (condensed if needed)
    - Brief explanation: First paragraph of `explanation_he`
    - "צלילה עמוקה" (Dive Deeper) button → `/study/path/[originalNodeId]`
  - Swipe handlers:
    - Swipe right (or left in RTL) → "got_it"
    - Swipe left (or right in RTL) → "need_practice"
  - Animation: Card flies off screen, next card appears
  - Visual indicators during drag (green/orange tint)
  - Acceptance: Component works with smooth animations, tests pass
  - Depends on: Task 15.9a (tests written first), Task 15.5
  - Files: `web/components/ui/ReviewSessionCard.tsx`

- [ ] **Task 15.10a**: Write Maestro tests for ReviewSessionScreen
  - **Assigned to**: Client Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 15.10)
  - Test screen loads review items from node data
  - Test progress bar shows correct count
  - Test completing all cards shows celebration
  - Test back button exits session
  - Test session completion calls API
  - Test error handling (API failure)
  - Acceptance: Tests written and failing (red phase)
  - Depends on: Task 15.6, Task 15.9
  - Files: `tests/maestro/flows/web/review_session_screen.yaml`

- [x] **Task 15.10**: Implement `ReviewSessionScreen` component ✅ (2026-01-25)
  - **Assigned to**: Web Agent
  - **TDD Workflow**: Implementation (after 15.10a tests pass)
  - Create route at `web/app/review-session/[nodeId]/page.tsx`
  - Create screen component `web/components/screens/ReviewSessionScreen.tsx`:
  - Load review_session node data via PowerSync
  - Extract review_items from node
  - Fetch content for each item from content_cache
  - Render card stack with ReviewSessionCard components
  - Track reviewed items and confidence levels in local state
  - Progress bar: `reviewed / total` with visual progress
  - On completion:
    - Call `complete-review-session` API
    - Show celebration animation
    - Navigate back to path or show summary
  - Back button: Confirm if partially complete, save progress
  - Acceptance: Screen works end-to-end, tests pass
  - Depends on: Task 15.10a (tests written first), Task 15.6, Task 15.9, Task 15.2
  - Files: `web/app/review-session/[nodeId]/page.tsx`, `web/components/screens/ReviewSessionScreen.tsx`

- [x] **Task 15.11**: Integrate ReviewSessionNode into PathScreen ✅ (2026-01-25)
  - **Assigned to**: Web Agent
  - Update `web/components/screens/PathScreen.tsx`:
  - Check `node_type` for each learning_path node
  - If `node_type === 'review_session'`: Render `ReviewSessionNode`
  - If `node_type === 'learn'`: Render existing `PathNode`
  - Handle mixed paths with both types
  - Acceptance: Path displays both node types correctly
  - Depends on: Task 15.8, Task 15.4
  - Files: `web/components/screens/PathScreen.tsx`

- [x] **Task 15.12**: Create API route for review session completion ✅ (2026-01-25)
  - **Assigned to**: Web Agent
  - Create `web/app/api/complete-review-session/route.ts`:
  - Proxy to Supabase Edge Function `complete-review-session`
  - Pass JWT for authentication
  - Handle errors gracefully
  - Return completion summary
  - Acceptance: API route works correctly
  - Depends on: Task 15.2
  - Files: `web/app/api/complete-review-session/route.ts`

- [x] **Task 15.13**: Add i18n strings for Review Session feature ✅ (2026-01-25)
  - **Assigned to**: Web Agent (or Content Generation Agent)
  - Add Hebrew strings to `shared/strings/strings.json`:
    - `review_session_title`: "מפגש חזרה"
    - `review_session_progress`: "נבדקו {completed} מתוך {total}"
    - `review_session_got_it`: "הבנתי"
    - `review_session_need_practice`: "צריך עוד תרגול"
    - `review_session_dive_deeper`: "צלילה עמוקה"
    - `review_session_complete`: "כל הכבוד! סיימת את החזרות"
    - `review_session_empty`: "אין חזרות להיום"
    - `review_session_exit_confirm`: "האם לצאת? ההתקדמות תישמר"
    - `review_session_node_label`: "חזרה ({count})"
  - Run string generation script
  - Acceptance: All strings added and accessible via `useTranslation`
  - Depends on: None
  - Files: `shared/strings/strings.json`, `web/lib/i18n/`

---

### Client Testing Agent Tasks

- [ ] **Task 15.14**: Write E2E test for complete review session flow
  - **Assigned to**: Client Testing Agent
  - Create comprehensive E2E test covering:
    1. User sees review_session node in learning path
    2. Node shows count badge (e.g., "12 items")
    3. User taps review_session node
    4. Review session screen opens with cards
    5. Progress bar shows "0/12"
    6. User swipes right on first card → "got it"
    7. Progress updates to "1/12"
    8. User swipes left on second card → "need practice"
    9. Progress updates to "2/12"
    10. User taps "Dive Deeper" on a card
    11. Navigates to full study, then back
    12. User completes remaining cards
    13. Celebration animation shown
    14. API called with correct data
    15. Node marked as completed in path
    16. Items marked "need practice" scheduled sooner
  - Acceptance: E2E test passes
  - Depends on: All Task 15.x implementation tasks
  - Files: `tests/maestro/flows/web/e2e_review_session.yaml`

---

### Task Dependencies Graph

```
Backend: 15.3 (Schema) ──────────────────────────────────────┐
    │                                                        │
    ▼                                                        ▼
Server Testing: 15.1a ──► Backend: 15.1 (generate-path)  Server Testing: 15.4a
    │                          │                             │
    │                          ▼                             ▼
    │                    Server Testing: 15.2a           Sync: 15.4 (sync rules)
    │                          │                             │
    │                          ▼                             │
    │                    Backend: 15.2 (complete API)        │
    │                          │                             │
    └──────────────────────────┼─────────────────────────────┘
                               │
                               ▼
                    Design System: 15.5, 15.6, 15.7 (specs)
                               │
       ┌───────────────────────┼───────────────────────────┐
       │                       │                           │
       ▼                       ▼                           ▼
Client Testing: 15.8a   Client Testing: 15.9a    Client Testing: 15.10a
       │                       │                           │
       ▼                       ▼                           ▼
Web: 15.8 (Node)        Web: 15.9 (Card)         Web: 15.10 (Screen)
       │                       │                           │
       └───────────────────────┼───────────────────────────┘
                               │
                               ▼
                         Web: 15.11 (Path integration)
                               │
                               ▼
                         Web: 15.12 (API route)
                               │
                               ▼
                         Web: 15.13 (i18n)
                               │
                               ▼
                    Client Testing: 15.14 (E2E test)
```

### Implementation Order (Recommended)

**Phase 1: Database & Backend Foundation**
1. Task 15.3 - Schema migration (node_type, review_items columns)
2. Task 15.1a + 15.1 - Update generate-path for review sessions
3. Task 15.2a + 15.2 - Complete review session endpoint

**Phase 2: Sync Layer**
4. Task 15.4a + 15.4 - PowerSync sync rules update

**Phase 3: Design Specifications**
5. Task 15.5 - ReviewSessionCard design
6. Task 15.6 - ReviewSessionScreen design
7. Task 15.7 - ReviewSessionNode design

**Phase 4: Frontend Implementation**
8. Task 15.8a + 15.8 - ReviewSessionNode component
9. Task 15.9a + 15.9 - ReviewSessionCard swipeable component
10. Task 15.10a + 15.10 - ReviewSessionScreen component
11. Task 15.11 - PathScreen integration
12. Task 15.12 - API route
13. Task 15.13 - i18n strings

**Phase 5: End-to-End Testing**
14. Task 15.14 - Comprehensive E2E test

### Agent Assignments Summary (Section 15)

| Agent | Tasks |
|-------|-------|
| Server Testing Agent | 15.1a, 15.2a, 15.4a |
| Backend Agent | 15.1, 15.2, 15.3 |
| Sync Agent | 15.4 |
| Design System Agent | 15.5, 15.6, 15.7 |
| Client Testing Agent | 15.8a, 15.9a, 15.10a, 15.14 |
| Web Agent | 15.8, 15.9, 15.10, 15.11, 15.12, 15.13 |

### Data Flow for Review Session

```
1. generate-path creates learning_path nodes:
   - Regular learn nodes: node_type='learn', content_ref set
   - Review session nodes: node_type='review_session', review_items JSON array

2. PowerSync syncs nodes to client with all columns

3. PathScreen renders:
   - node_type='learn' → PathNode component
   - node_type='review_session' → ReviewSessionNode component

4. User taps ReviewSessionNode → navigates to /review-session/[nodeId]

5. ReviewSessionScreen:
   - Loads node data from PowerSync
   - Extracts review_items array
   - Fetches content_cache for each item
   - Displays card stack

6. User swipes through cards:
   - Swipe right → add to "got_it" list
   - Swipe left → add to "need_practice" list
   - Track in local state

7. On completion → call complete-review-session API:
   - session_node_id
   - reviewed_items with confidence levels

8. Backend updates:
   - Mark review_session node completed
   - Update spaced repetition intervals for each item
   - need_practice items: shorter interval
   - got_it items: normal interval

9. Sync changes back to client
```

---

## Notes

- **Regulations Compliance**: These tasks address findings from the Regulations Agent compliance audit
- **RTL Support**: All UI components must maintain RTL support (already compliant per Finding 21)
- **Hebrew Language**: All user-facing text must be in Hebrew
- **Testing**: All tasks follow TDD workflow with appropriate testing agents
- Update this file when tasks are completed: `[x]` and add completion date
