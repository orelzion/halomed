# Regulations Guide

## Purpose

The Regulations Guide ensures HaLomeid complies with privacy, data protection, accessibility, and cookie regulations across all target markets: **Europe (EU/EEA)**, **United States**, and **Israel**.

## Responsibilities

- GDPR compliance verification (EU)
- ePrivacy Directive / cookie consent compliance (EU)
- CCPA/CPRA compliance (California/US)
- Israel Privacy Protection Law (Amendment 13) compliance
- WCAG 2.2 accessibility compliance
- Israel SI 5568 accessibility compliance
- Privacy policy content validation
- Cookie consent banner implementation guidance

## Regulatory Frameworks Overview

### Privacy & Data Protection

| Region | Law | Key Requirements |
|--------|-----|------------------|
| EU/EEA | GDPR | Consent, transparency, data subject rights |
| EU/EEA | ePrivacy Directive | Cookie consent, tracking restrictions |
| US (CA) | CCPA/CPRA | Opt-out rights, privacy notices |
| Israel | Privacy Protection Law (Amd. 13) | GDPR-like requirements |

### Accessibility

| Region | Standard/Law | Level |
|--------|--------------|-------|
| International | WCAG 2.2 | AA |
| US | ADA Title II | WCAG 2.1 AA |
| Israel | SI 5568 | WCAG 2.0 AA |

## Cookie Consent (ePrivacy Directive)

### Requirements

1. **Prior Consent Required**
   - Non-essential cookies require explicit consent BEFORE placement
   - No pre-ticked boxes
   - Reject must be as easy as accept

2. **Strictly Necessary Exception**
   - Session management cookies: exempt
   - Security cookies: exempt
   - Analytics/advertising: NOT exempt

### Cookie Banner Implementation

| Category | Description | Required | Examples |
|----------|-------------|----------|----------|
| Strictly Necessary | Required for core functionality | Yes | auth_token, session_id |
| Functional | Remembers preferences | No | user_preferences, locale |
| Analytics | Helps understand usage | No | _ga, _gid |

### Banner UI Requirements

- Reject button must be equally prominent as Accept
- No dark patterns
- Granular control per category
- Accessible (keyboard navigable, screen reader compatible)

## WCAG 2.2 Accessibility Compliance

### Target Level: AA

### Key Requirements

1. **Keyboard Navigation**
   - All interactive elements focusable
   - Logical tab order
   - Visible focus indicators

2. **Screen Reader Support**
   - Semantic HTML structure
   - ARIA labels where needed
   - Meaningful alt text for images

3. **Visual Design**
   - Color contrast >= 4.5:1 (text)
   - Text resizable to 200%
   - No color-only information

4. **Touch Targets**
   - Minimum 44px x 44px
   - Adequate spacing between targets

### Web Implementation

```tsx
// Accessible button example
<button
  onClick={handleClick}
  aria-label={t('done_button')}
  className="min-w-[44px] min-h-[44px]"
>
  {t('done_button')}
</button>
```

## Israel SI 5568 Accessibility

### Requirements (Based on WCAG 2.0 AA)

- Keyboard navigation without mouse
- Alternative text for images
- Semantic HTML structure
- Sufficient color contrast
- Screen reader compatibility

### Additional Israel-Specific Requirements

1. **Accessibility Declaration**
   - Published on website/app
   - Details of accessibility adjustments made
   - Accessibility coordinator contact info

2. **Hebrew RTL Support**
   - Full RTL layout support
   - Proper Hebrew text rendering

## Compliance Validation Checklist

### Before Launch

**Privacy & Data Protection**
- [ ] Privacy policy live (EN, HE)
- [ ] Cookie consent banner functional
- [ ] Data subject request process documented

**Accessibility**
- [ ] WCAG 2.2 AA audit passed
- [ ] Accessibility declaration published
- [ ] Screen reader testing completed
- [ ] Keyboard navigation verified
- [ ] Focus indicators visible
- [ ] Touch targets >= 44px

**Israel-Specific**
- [ ] Hebrew privacy notice
- [ ] SI 5568 compliance verified
- [ ] Accessibility coordinator designated

## Reference Documents

- **TDD Section 11**: Security & Privacy
- **PRD Section 10**: Legal Requirements
- **WCAG 2.2**: https://www.w3.org/TR/WCAG22/
- **GDPR Text**: https://gdpr.eu/
