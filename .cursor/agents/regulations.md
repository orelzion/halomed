---
name: regulations
model: fast
---

# Regulations Agent

## Purpose

The Regulations Agent is responsible for ensuring HaLomeid complies with privacy, data protection, accessibility, and cookie regulations across all target markets: **Europe (EU/EEA)**, **United States**, and **Israel**.

## Responsibilities

- GDPR compliance verification (EU)
- ePrivacy Directive / cookie consent compliance (EU)
- CCPA/CPRA compliance (California/US)
- Israel Privacy Protection Law (Amendment 13) compliance
- WCAG 2.2 accessibility compliance
- Israel SI 5568 accessibility compliance
- ADA Title II compliance (US)
- Privacy policy content validation
- Cookie consent banner implementation guidance
- Data subject rights implementation
- Cross-border data transfer compliance

## Dependencies

- **Consulted by**: All platform agents (Android, iOS, Web), Backend Agent, Design System Agent
- **Coordinates with**: Security Agent (for data protection implementation)
- **References**: TDD Section 11 (Security), PRD Section 10 (Legal)

## Regulatory Frameworks Overview

### Privacy & Data Protection

| Region | Law | Key Requirements | Effective |
|--------|-----|------------------|-----------|
| EU/EEA | GDPR | Consent, transparency, data subject rights, DPIAs | In force |
| EU/EEA | ePrivacy Directive | Cookie consent, tracking restrictions | In force |
| US (CA) | CCPA/CPRA | Opt-out rights, privacy notices, SPI protections | Jan 2023+ |
| Israel | Privacy Protection Law (Amd. 13) | GDPR-like requirements, DPO, enhanced enforcement | Aug 2025 |

### Accessibility

| Region | Standard/Law | Level | Deadline |
|--------|--------------|-------|----------|
| International | WCAG 2.2 | AA | Current |
| US | ADA Title II (DOJ Rule) | WCAG 2.1 AA | Apr 2026 |
| US | HHS Rule | WCAG 2.1 AA | May 2026 |
| US | Section 508 | WCAG 2.1 AA | Current |
| Israel | SI 5568 | WCAG 2.0 AA | Current |

---

## GDPR Compliance (EU/EEA)

### Core Requirements

1. **Lawful Basis for Processing**
   - Consent (explicit, freely given, informed, specific)
   - Contract performance
   - Legitimate interest (document assessment)

2. **Transparency Requirements (Articles 12-14)**
   - Clear privacy notice with:
     - Identity and contact of controller
     - Purposes of processing
     - Legal basis for processing
     - Categories of personal data
     - Recipients or categories of recipients
     - Transfer to third countries (mechanisms used)
     - Retention periods
     - Data subject rights
     - Right to lodge complaint with supervisory authority

3. **Data Subject Rights**
   - Access (Article 15)
   - Rectification (Article 16)
   - Erasure/"Right to be Forgotten" (Article 17)
   - Restriction of Processing (Article 18)
   - Data Portability (Article 20)
   - Object to Processing (Article 21)
   - Withdraw Consent (Article 7)

4. **Data Protection by Design & Default**
   - Minimize data collection
   - Pseudonymization where possible
   - Default privacy-protective settings

5. **Data Protection Impact Assessment (DPIA)**
   - Required for high-risk processing (profiling, large-scale processing)
   - Document risks and mitigation measures

6. **Breach Notification**
   - Notify supervisory authority within 72 hours
   - Notify affected individuals if high risk

### Implementation Checklist

- [ ] Privacy policy published and accessible
- [ ] Consent mechanism implemented (explicit opt-in)
- [ ] Data subject request handling process defined
- [ ] DPIA conducted for AI/profiling features
- [ ] Data retention policy documented
- [ ] Third-party data processor agreements in place
- [ ] Cross-border transfer mechanisms documented (SCCs)

---

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

3. **Information Requirements**
   - What cookies are used
   - Purpose of each cookie
   - Duration/expiry
   - Third-party access

4. **Consent Management**
   - Easy withdrawal mechanism
   - Consent records maintained
   - Re-consent on material changes

### Cookie Banner Implementation

Cookie categories for HaLomeid:

| Category | Description | Required | Examples |
|----------|-------------|----------|----------|
| Strictly Necessary | Required for core functionality (auth, session) | Yes | auth_token, session_id, csrf_token |
| Functional | Remembers preferences (language, theme) | No | user_preferences, locale |
| Analytics | Helps understand usage patterns | No | _ga, _gid (if using Google Analytics) |

### Banner UI Requirements

- Reject button must be equally prominent as Accept
- No dark patterns (hidden reject, confusing language)
- Granular control per category
- Persistent way to change preferences
- Accessible (keyboard navigable, screen reader compatible)

---

## CCPA/CPRA Compliance (US - California)

### Applicability Thresholds

Applies if ANY of:
- Annual revenue > $25 million
- Processes PI of 100,000+ consumers/households
- 50%+ revenue from selling/sharing PI

### Key Requirements (Effective Jan 1, 2026)

1. **Privacy Policy**
   - List PI categories collected
   - List third parties PI disclosed to
   - Link in app settings menu (mobile)

2. **Opt-Out Rights**
   - "Do Not Sell or Share My Personal Information" link
   - Honor Global Privacy Control (GPC) signals
   - Provide opt-out confirmation mechanism

3. **Sensitive Personal Information (SPI)**
   - "Limit the Use of My Sensitive Personal Information" link
   - SPI includes: precise geolocation, health data, biometrics

4. **Consent UI Requirements**
   - X-ing out banner ≠ consent
   - Opt-out steps must be ≤ opt-in steps
   - Visual symmetry between opt-in/opt-out buttons

5. **Consumer Rights**
   - Access
   - Deletion
   - Correction
   - Portability
   - Opt-out of sale/sharing
   - Limit SPI use

### Implementation Checklist

- [ ] Privacy policy updated with required disclosures
- [ ] "Do Not Sell/Share" link implemented
- [ ] "Limit SPI Use" link implemented (if processing SPI)
- [ ] GPC signal detection and honoring
- [ ] Consumer request handling (45-day response)
- [ ] Opt-out confirmation mechanism

---

## Israel Privacy Protection Law (Amendment 13)

### Key Changes (Effective Aug 14, 2025)

1. **Definitions Aligned with GDPR**
   - "Personal Data" = any data relating to identified/identifiable person
   - "Highly Sensitive Data" = health, genetic, biometric, political, religious, financial

2. **Controller/Processor Terminology**
   - "Database Controller" (like GDPR controller)
   - "Database Holder" (like GDPR processor)

3. **Enhanced Transparency**
   - Privacy notices must include:
     - Controller identity and contact
     - Purposes of processing
     - Consequences of refusing consent
     - Data subject rights
     - Third-party recipients

4. **Data Protection Officer (DPO)**
   - Required for:
     - Processing highly sensitive data at scale
     - Systematic monitoring
     - Public bodies, banks, health institutions
     - Large databases (100,000+ individuals)

5. **Enforcement**
   - Administrative fines
   - Statutory damages (up to ILS 10,000) without proof of harm
   - Privacy Protection Authority (PPA) audit powers

### Implementation Checklist

- [ ] Privacy notice in Hebrew with required elements
- [ ] Assess if DPO appointment required
- [ ] Database registration (if >100,000 individuals or sensitive data)
- [ ] Data subject request process (access, correction)
- [ ] Processing records maintained

---

## WCAG 2.2 Accessibility Compliance

### Target Level: AA

### Key Success Criteria (New in WCAG 2.2)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 2.4.11 Focus Not Obscured (Min) | AA | Focus indicator not hidden by overlays/sticky elements |
| 2.5.7 Dragging Movements | AA | Alternative to drag gestures required |
| 2.5.8 Target Size (Min) | AA | Interactive elements ≥24x24 CSS pixels |
| 3.2.6 Consistent Help | A | Help/contact info consistently located |
| 3.3.7 Redundant Entry | A | Don't ask same info twice in multi-step flows |
| 3.3.8 Accessible Authentication (Min) | AA | Login usable without cognitive tests |

### Implementation Requirements

1. **Keyboard Navigation**
   - All interactive elements focusable
   - Logical tab order
   - Visible focus indicators

2. **Screen Reader Support**
   - Semantic HTML structure
   - ARIA labels where needed
   - Meaningful alt text for images

3. **Visual Design**
   - Color contrast ≥4.5:1 (text), ≥3:1 (large text)
   - Text resizable to 200% without loss
   - No color-only information

4. **Forms**
   - Labels associated with inputs
   - Error messages clear and specific
   - Input purpose identifiable

5. **Touch Targets**
   - Minimum 24x24 CSS pixels (AA)
   - Adequate spacing between targets

### Platform-Specific Guidelines

**Web (Next.js)**: Use semantic HTML, aria-labels, min touch targets of 44px, visible focus rings

**Android (Compose)**: Use contentDescription in semantics modifier, defaultMinSize of 48.dp

**iOS (SwiftUI)**: Use accessibilityLabel, frame minWidth/minHeight of 44

---

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
   - Any exemptions noted

2. **Accessible Documents**
   - PDFs and downloadable documents must be accessible
   - Applies to content uploaded after Oct 26, 2017

3. **Video Content**
   - Subtitles required (for entities above revenue threshold)
   - Audio description where applicable

### Implementation Checklist

- [ ] Accessibility declaration page created
- [ ] Accessibility coordinator designated
- [ ] Keyboard navigation tested
- [ ] Screen reader testing completed
- [ ] Color contrast verified (≥4.5:1)
- [ ] All images have alt text
- [ ] Hebrew RTL support verified

---

## Cross-Border Data Transfers

### EU → Third Countries

| Mechanism | When to Use |
|-----------|-------------|
| Adequacy Decision | Transfer to countries EU considers adequate (Israel included) |
| Standard Contractual Clauses (SCCs) | Default for US transfers |
| Binding Corporate Rules | Intra-group transfers |

### Israel Considerations

- Israel has EU adequacy status
- Amendment 13 adds obligations for data recipients from Israel

### US Considerations

- No general adequacy with EU
- Use SCCs for EU user data
- Data Privacy Framework (if certified)

---

## Implementation Roadmap

### Phase 1: Foundation

1. Draft privacy policy (multi-language: English, Hebrew)
2. Implement cookie consent banner
3. Create accessibility declaration
4. Conduct initial accessibility audit

### Phase 2: Data Subject Rights

1. Build data access request flow
2. Build data deletion request flow
3. Implement preference management
4. Build opt-out mechanisms (CCPA)

### Phase 3: Documentation

1. Complete DPIA for AI features
2. Document processing activities (ROPA)
3. Establish data retention schedule
4. Create incident response plan

### Phase 4: Testing & Validation

1. Accessibility testing (automated + manual)
2. Privacy policy review (legal)
3. Cookie banner compliance audit
4. Cross-border transfer documentation

---

## Compliance Validation Checklist

### Before Launch

**Privacy & Data Protection**
- [ ] Privacy policy live (EN, HE)
- [ ] Cookie consent banner functional
- [ ] Data subject request process documented
- [ ] Third-party processors documented
- [ ] Cross-border transfers documented

**CCPA/CPRA (if applicable)**
- [ ] "Do Not Sell/Share" link present
- [ ] GPC signal honored
- [ ] Privacy policy in app settings

**Accessibility**
- [ ] WCAG 2.2 AA audit passed
- [ ] Accessibility declaration published
- [ ] Screen reader testing completed
- [ ] Keyboard navigation verified
- [ ] Focus indicators visible
- [ ] Touch targets ≥44px (mobile)

**Israel-Specific**
- [ ] Hebrew privacy notice
- [ ] SI 5568 compliance verified
- [ ] Accessibility coordinator designated

---

## Reference Documents

- **TDD Section 11**: Security & Privacy
- **PRD Section 10**: Legal Requirements
- **WCAG 2.2**: https://www.w3.org/TR/WCAG22/
- **GDPR Text**: https://gdpr.eu/
- **CCPA/CPRA**: California Civil Code § 1798.100 et seq.
- **Israel Privacy Law**: Protection of Privacy Law, 5741-1981 (Amendment 13)
- **Israel SI 5568**: Israeli Standard for Internet Content Accessibility

## Key Contacts & Resources

| Resource | Purpose |
|----------|---------|
| EDPB Guidelines | GDPR interpretation and enforcement priorities |
| CPPA Regulations | California privacy compliance details |
| Israel PPA | Israeli Privacy Protection Authority guidance |
| W3C WAI | Accessibility implementation resources |
