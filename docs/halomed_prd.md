# Product Requirements Document (PRD)
## HaLomeid (הלומד)

**Version:** 1.2  
**Status:** Ready for Implementation  
**Product Pillar:** Daily Learning  
**Theme:** Desert Oasis  

---

## 1. Executive Summary

**HaLomeid** is an offline-first daily learning application designed for religious and traditional users who seek a consistent, calm, and meaningful Torah study habit.

The app delivers a single, clearly defined daily learning unit per track, enhanced by AI-generated explanations grounded in classical Jewish commentaries.  
Learning availability is determined by **track-specific scheduling rules**, rather than user enforcement, ensuring a respectful and low-friction experience.

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

### 4.1 Tracks
- Each **Track** represents an independent learning path with its own scheduling rules.
- MVP includes a single track: **Mishnah – Daily Chapter (Weekdays Only)**.
- Users may join a track **at any point**, without a fixed global start date.

---

### 4.2 Track Scheduling

- Learning units are generated **server-side** based on the track’s scheduling definition.
- For the MVP Mishnah track:
  - Units are generated **only on weekdays**
  - **Shabbat and Jewish holidays are excluded**
- If a track has no unit scheduled for a given day:
  - No learning unit is shown
  - No completion is expected
  - No streak impact occurs

Clients (mobile and web) are **fully passive** and render only the scheduled units provided by the backend.

---

### 4.3 Daily Learning Unit Structure

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
- Completion is **per track and per scheduled unit**
- “Done” can be toggled on/off
- Retroactive completion is allowed
- Retroactive marking **does not affect the streak**

---

## 8. Streak Logic

- Streaks are calculated **per track**
- A streak represents consecutive **scheduled units** that were completed
- Days without a scheduled unit:
  - Do not increment the streak
  - Do not break the streak

The streak is derived solely from completion of scheduled units, without any special calendar enforcement.

---

## 9. Offline-First Behavior

- The app syncs a rolling **14-day window** (±14 days from current date) of scheduled units
- All platforms (Web, Android, iOS) implement consistent sync behavior
- Content generation ensures all lessons and quizzes in the window are available
- Offline mode supports:
  - Reading content
  - Marking completion
  - Local streak calculation
- Sync occurs automatically when connectivity resumes
- Non-intrusive sync indicator shows sync status without blocking UI
- Network connectivity is required only for initial authentication and account upgrades

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