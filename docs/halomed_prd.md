# Product Requirements Document (PRD)
## HaLomeid (הלומד)

**Version:** 2.0
**Status:** Current Implementation
**Product Pillar:** Daily Learning
**Theme:** Desert Oasis  

---

## 1. Executive Summary

**HaLomeid** is an offline-first daily learning application designed for religious and traditional users who seek a consistent, calm, and meaningful Torah study habit.

The app guides users through the complete Mishnah (Shas) at their own pace, with AI-generated explanations grounded in classical Jewish commentaries.
Learning availability is determined by **user preferences and scheduling rules**, rather than user enforcement, ensuring a respectful and low-friction experience.

Users set their own:
- **Pace**: How many mishnayot to learn per day
- **Review intensity**: Spaced repetition frequency for retention
- **Start date**: When they began their journey

The app generates a personalized learning path with unlock dates for each unit, review sessions, and weekly quizzes.

---

## 2. Target Audience

- Primary users:
  - Religious (observant) users
  - Traditional users seeking a daily connection to Jewish learning
- Language (MVP): **Hebrew only**
- Multi-language support: **Out of MVP scope**, but architecturally considered

---

## 3. Core Value Proposition

> *A clear, calm, and consistent daily learning experience — without overload, guilt, or enforcement.*

---

## 4. Learning Model

### 4.1 Learning Path

HaLomeid guides users through the complete Mishnah (Shas) - all 6 orders, 63 tractates, and 4,506 mishnayot.

**Key Features:**
- **Single sequence**: All users follow the same canonical order of Mishnah
- **Personal pace**: Each user sets their own learning speed
- **Unlock dates**: Content becomes available based on user's start date and pace
- **No fixed schedule**: Users can start at any time and progress at their own rate

### 4.2 User Preferences

During onboarding, users configure their learning experience:

**Pace Options:**
- **Two Mishnayot** (default): ~6 years to complete
- **One Chapter**: ~1.5 years to complete
- **Seder per Year**: Complete one order (seder) every year

**Review Intensity:**
- **None**: No reviews (just forward progress)
- **Light**: Review at 7 and 30 days after learning
- **Medium**: Review at 3, 7, and 30 days
- **Intensive**: Review at 1, 3, 7, 14, and 30 days

**Study Days:**
- Weekdays (Sunday-Thursday) by default
- Friday: Optional
- Saturday (Shabbat): Always skipped
- Jewish holidays: Automatically skipped

---

### 4.3 Path Generation

The learning path is computed **client-side** when a user views their learning journey. The shared `path-generator.ts` library calculates the complete path from user preferences.

Path computation includes:
- **Learning nodes**: Sequential Mishnah content
- **Review sessions**: Spaced repetition based on intensity setting
- **Weekly quizzes**: Assessments on Fridays covering the week's content
- **Completion markers**: Visual celebrations for finishing chapters/tractates

Each node has a **unlock date** calculated from the user's start date and pace. Content becomes available on its unlock date, not dependent on completing previous items.

**Server-side role:** Edge Functions pre-generate content (Mishnah text + AI explanations) for upcoming nodes, ensuring offline availability.

---

### 4.4 Daily Learning Unit Structure

Each daily unit contains:

1. **Source Text** (Mishnah) — bold and visually dominant  
2. **Clear Explanation (AI)** — immediately following the source  
3. **Expandable Section (Collapsed by default):**
   - “Summary of Commentaries”

---

## 5. AI Explanation Philosophy

### 5.1 Sources
- AI explanations are based on **all available classical commentaries from Sefaria**.
- No single commentator is treated as authoritative by default.

### 5.2 Explanation Rules

#### Clear Explanation
- Presents **one coherent interpretation**
- Selected based on:
  - Simplicity
  - Conceptual clarity
  - Internal consistency across the unit
- Avoids mixing contradictory interpretations within the same explanation

#### Summary of Commentaries
- Presents multiple interpretive approaches
- Clearly separated from the main explanation
- Intended for optional deeper exploration

### 5.3 Scope Limitations (MVP)
- No free-form AI questions
- No chat interface
- No community or discussion features  
*(All explicitly reserved for future versions)*

---

## 6. User Experience & Design System

### 6.1 Visual Theme — “Desert Oasis”

A calm, warm design inspired by parchment and quiet study spaces.

| Element | Hex Code | Usage |
|------|------|------|
| Primary Background | `#FEFAE0` | Study Screen |
| Secondary Background | `#E9EDC9` | Home & Headers |
| Card Surface | `#FAEDCD` | Track Cards |
| Accent / Streak | `#D4A373` | Streak Flame, Done Button |
| Muted Accent | `#CCD5AE` | Icons, Dividers |

### 6.2 Typography
- **Source Text:** Frank Ruhl Libre (Bold)
- **AI Explanation:** Noto Sans Hebrew (Regular)

---

## 7. Core App Flow

### 7.1 Home Screen
- Displays active track cards
- Per-track streak counter
- Interactive widget:
  - If a unit is scheduled and incomplete: *“Have you studied today?”*
  - If completed: *“Well done! Today’s study is complete.”*
  - If no unit is scheduled: no prompt is shown

---

### 7.2 Study Screen
- Vertical continuous scroll
- Source text followed immediately by explanation
- “Done” button appears only when a unit is scheduled
- Button is fixed at the absolute bottom of the scroll

**On Done:**
- Haptic feedback
- Study completion is recorded

---

### 7.3 Completion Logic
- Completion is **per learning node**
- "Done" can be toggled on/off
- Retroactive completion is allowed (can mark past units as completed)
- Retroactive marking **does not affect the streak**
- Completing a learning node advances the user's position (unlocks next content)

---

## 7.4 Quiz System

### 7.4.1 Question Types

The quiz features two distinct question types to assess different aspects of learning:

#### הלכה למעשה (Halacha L'Maaseh) — Scenario Questions
- **Purpose:** Test practical application of halacha in real-world scenarios
- **Format:** Present a modern-day scenario with characters and settings
- **Focus:** What should a person do in this situation?
- **Example:** "דני שכח להניח תפילין בזמן שהתפלל שחרית. מה הדין?"

#### סברא/ביאור (Sevara/Be'ur) — Concept Questions
- **Purpose:** Test understanding of the logic and reasoning behind rulings
- **Format:** Open-ended conceptual questions
- **Focus:** Why does the halacha work this way? What is the underlying principle?
- **Example:** "מדוע המשנה פוסלת את העירוב במקרה זה? מה הסברא?"

### 7.4.2 Quiz Assembly Algorithm

**Question Count Rules:**
1. **Halacha questions:** 1 question per Mishnah studied that week (no cap)
2. **Sevara questions:** Fill remaining slots to reach 20 total questions
3. **Cap exception:** If >20 Mishnayot studied in a week, show all halacha questions (exceeds 20)

**Ordering:**
- Questions grouped by Mishnah in chronological study order
- Within each Mishnah group: Halacha questions first, then Sevara questions

### 7.4.3 UI Features

**Question Type Badges:**
- **הלכה למעשה:** Amber badge (bg-amber-100 text-amber-800)
- **סברא:** Blue badge (bg-blue-100 text-blue-800)

Badges appear above each question to help users understand the question type.

### 7.4.4 Analytics

**PostHog Events:**
- Track `quiz_question_viewed` with property `question_type` (halacha/sevara)
- Track `quiz_question_answered` with properties:
  - `question_type` (halacha/sevara)
  - `is_correct` (boolean)
- Track `quiz_completed` with properties:
  - `total_questions`
  - `halacha_correct`
  - `sevara_correct`

---

## 8. Streak Logic

- Streaks represent consecutive **study days** with completed learning
- Only **learning nodes** (not reviews or quizzes) count toward the streak
- Days without study (Shabbat, holidays, Fridays if skipped) do not affect the streak
- Streak increments only when:
  - A learning node is completed
  - Completion occurs on or before the node's unlock date
- Late completion (retroactive) does not contribute to the streak

The streak is derived from completion timestamps, encouraging daily consistency without enforcement.

---

## 9. Offline-First Behavior

- The app syncs a rolling **14-day window** (±14 days from current date) of learning path nodes
- All platforms (Web, Android, iOS) implement consistent sync behavior
- Content generation ensures all lessons and quizzes in the window are available
- Offline mode supports:
  - Reading content for unlocked nodes
  - Marking completion
  - Local streak calculation
  - Viewing learning path and upcoming content
- Sync occurs automatically when connectivity resumes
- Non-intrusive sync indicator shows sync status without blocking UI
- Network connectivity is required only for:
  - Initial authentication
  - Path generation (onboarding or preference changes)
  - Account upgrades and linking

---

## 10. User Accounts & Authentication

### 10.1 Authentication Model
- All users start with **Supabase Anonymous (Guest) Authentication**
- Guest users receive a persistent server-side user ID
- All progress, study logs, and streak data are stored in the backend

### 10.2 Account Upgrade
- Guest users may upgrade their account using:
  - Google
  - Apple
- Upon upgrade:
  - Existing progress and streak data are preserved
  - No data migration is required

---

## 11. Web Platform

- Web is a **fully functional product**, not a companion view
- Users can:
  - Read content
  - Mark completion
  - Maintain streaks
- Web uses the **same backend schema, scheduling, and logic** as mobile clients

---

## 12. Non-Goals (Explicitly Out of Scope for MVP)

- Social features
- Community discussion
- Comments
- Ratings
- Notifications / reminders
- AI chat or Q&A
- Multimedia content

---

## 13. Product Definition (One Sentence)

**HaLomeid is a calm, offline-first app for maintaining a daily Torah learning habit through clearly scheduled study units.**